// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../passport/PassportBuilderScore.sol";

import "hardhat/console.sol";

error ContractInsolvent();
error InsufficientAllowance();
error InsufficientBalance();
error InvalidAddress();
error InvalidDepositAmount();
error NoDepositFound();
error TalentVaultNonTransferable();
error TransferFailed();

/// Based on WLDVault.sol from Worldcoin
///   ref: https://optimistic.etherscan.io/address/0x21c4928109acb0659a88ae5329b5374a3024694c#code
/// @title Talent Vault Contract
/// @author Francisco Leal
/// @notice Allows any $TALENT holders to deposit their tokens and earn interest.
contract TalentVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Emitted when the yield rate is updated
    /// @param yieldRate The new yield rate
    event YieldRateUpdated(uint256 yieldRate);

    /// @notice Emitted when the maximum yield amount is updated
    /// @param maxYieldAmount The new maximum yield amount
    event MaxYieldAmountUpdated(uint256 maxYieldAmount);

    /// @notice Emitted when the yield accrual deadline is updated
    /// @param yieldAccrualDeadline The new yield accrual deadline
    event YieldAccrualDeadlineUpdated(uint256 yieldAccrualDeadline);

    /// @notice Represents a user's deposit
    /// @param depositedAmount The amount of tokens that were deposited, excluding interest
    /// @param lastInterestCalculation The timestamp of the last interest calculation for this deposit
    struct UserBalanceMeta {
        uint256 depositedAmount;
        uint256 lastInterestCalculation;
    }

    /// @notice The number of seconds in a year
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    /// @notice The maximum yield rate that can be set, represented as a percentage.
    uint256 public constant ONE_HUNDRED_PERCENT = 100_00;

    uint256 public constant SECONDS_PER_YEAR_x_ONE_HUNDRED_PERCENT = SECONDS_PER_YEAR * ONE_HUNDRED_PERCENT;

    /// @notice The token that will be deposited into the contract
    IERC20 public immutable token;

    /// @notice The wallet paying for the yield
    address public yieldSource;

    /// @notice The yield base rate for the contract, represented as a percentage.
    /// @dev Represented with 2 decimal places, e.g. 10_00 for 10%
    uint256 public yieldRateBase;

    /// @notice The yield rate for the contract for competent builders, represented as a percentage.
    /// @dev Represented with 2 decimal places, e.g. 10_00 for 10%
    uint256 public yieldRateCompetent;

    /// @notice The yield rate for the contract for proficient builders, represented as a percentage.
    /// @dev Represented with 2 decimal places, e.g. 10_00 for 10%
    uint256 public yieldRateProficient;

    /// @notice The yield rate for the contract for expert builders, represented as a percentage.
    /// @dev Represented with 2 decimal places, e.g. 10_00 for 10%
    uint256 public yieldRateExpert;

    /// @notice The maximum amount of tokens that can be used to calculate interest.
    uint256 public maxYieldAmount;

    /// @notice The time at which the users of the contract will stop accruing interest
    uint256 public yieldAccrualDeadline;

    PassportBuilderScore public passportBuilderScore;

    /// @notice A mapping of user addresses to their deposits
    mapping(address => UserBalanceMeta) public userBalanceMeta;

    mapping(address => bool) private maxDepositLimitFlags;
    mapping(address => uint256) private maxDeposits;

    /// @notice Create a new Talent Vault contract
    /// @param _token The token that will be deposited into the contract
    /// @param _yieldSource The wallet paying for the yield
    /// @param _maxYieldAmount The maximum amount of tokens that can be used to calculate interest
    /// @param _passportBuilderScore The Passport Builder Score contract
    constructor(
        IERC20 _token,
        address _yieldSource,
        uint256 _maxYieldAmount,
        PassportBuilderScore _passportBuilderScore
    )
        // uint256 _initialOwnerBalance // added this for the needs to test
        ERC4626(_token)
        ERC20("TalentProtocolVaultToken", "TALENTVAULT")
        Ownable(msg.sender)
    {
        if (
            address(_token) == address(0) ||
            address(_yieldSource) == address(0) ||
            address(_passportBuilderScore) == address(0)
        ) {
            revert InvalidAddress();
        }

        token = _token;
        yieldRateBase = 10_00;
        yieldSource = _yieldSource;
        maxYieldAmount = _maxYieldAmount;
        passportBuilderScore = _passportBuilderScore;
    }

    function setMaxDeposit(address receiver, uint256 assets) public onlyOwner {
        maxDeposits[receiver] = assets;
        maxDepositLimitFlags[receiver] = true;
    }

    function setMaxMint(address receiver, uint256 shares) public onlyOwner {
        setMaxDeposit(receiver, shares);
    }

    function removeMaxDepositLimit(address receiver) public onlyOwner {
        delete maxDeposits[receiver];
        delete maxDepositLimitFlags[receiver];
    }

    function removeMaxMintLimit(address receiver) public onlyOwner {
        removeMaxDepositLimit(receiver);
    }

    function maxDeposit(address receiver) public view virtual override returns (uint256) {
        if (maxDepositLimitFlags[receiver]) {
            return maxDeposits[receiver];
        } else {
            return type(uint256).max;
        }
    }

    function maxMint(address receiver) public view virtual override returns (uint256) {
        return maxDeposit(receiver);
    }

    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        if (assets <= 0) {
            revert InvalidDepositAmount();
        }

        refreshForAddress(receiver);

        uint256 shares = super.deposit(assets, receiver);

        UserBalanceMeta storage balanceMeta = userBalanceMeta[receiver];

        // This we don't need it only for reporting purposes.
        // Note that the +assets+ is $TALENT that is moved from
        // +receiver+ wallet to +address(this)+ wallet.
        // But this one here, it gives us an easy way to find out
        // how much $TALENT a +receiveruserBalanceMetadeposited.

        balanceMeta.depositedAmount += assets;

        return shares;
    }

    function mint(uint256 shares, address receiver) public virtual override returns (uint256) {
        return deposit(shares, receiver);
    }

    /// @notice Calculate any accrued interest.
    /// @param account The address of the user to refresh
    function refreshForAddress(address account) public {
        if (balanceOf(account) <= 0) {
            UserBalanceMeta storage balanceMeta = userBalanceMeta[account];
            balanceMeta.lastInterestCalculation = block.timestamp;
            return;
        }

        yieldInterest(account);
    }

    /// @notice Calculate any accrued interest.
    function refresh() external {
        refreshForAddress(msg.sender);
    }

    /// @notice Withdraws all of the user's balance, including any accrued interest.
    function withdrawAll() external nonReentrant {
        refreshForAddress(msg.sender);
        redeem(balanceOf(msg.sender), msg.sender, msg.sender);
    }

    /// @notice Update the yield rate for the contract
    /// @dev Can only be called by the owner
    function setYieldRate(uint256 _yieldRate) external onlyOwner {
        require(_yieldRate > yieldRateBase, "Yield rate cannot be decreased");

        yieldRateBase = _yieldRate;
        emit YieldRateUpdated(_yieldRate);
    }

    /// @notice Get the yield rate for the contract for a given user
    /// @param user The address of the user to get the yield rate for
    function getYieldRateForScore(address user) public view returns (uint256) {
        uint256 passportId = passportBuilderScore.passportRegistry().passportId(user);
        uint256 builderScore = passportBuilderScore.getScore(passportId);

        if (builderScore < 25) return yieldRateBase;
        if (builderScore < 50) return yieldRateBase + 5_00;
        if (builderScore < 75) return yieldRateBase + 10_00;
        return yieldRateBase + 15_00;
    }

    /// @notice Update the maximum amount of tokens that can be used to calculate interest
    /// @dev Can only be called by the owner
    function setMaxYieldAmount(uint256 _maxYieldAmount) external onlyOwner {
        maxYieldAmount = _maxYieldAmount;

        emit MaxYieldAmountUpdated(_maxYieldAmount);
    }

    /// @notice Update the time at which the users of the contract will stop accruing interest
    /// @dev Can only be called by the owner
    function setYieldAccrualDeadline(uint256 _yieldAccrualDeadline) external onlyOwner {
        require(_yieldAccrualDeadline > block.timestamp, "Invalid yield accrual deadline");

        yieldAccrualDeadline = _yieldAccrualDeadline;

        emit YieldAccrualDeadlineUpdated(_yieldAccrualDeadline);
    }

    /// @notice Prevents the owner from renouncing ownership
    /// @dev Can only be called by the owner
    function renounceOwnership() public view override onlyOwner {
        revert("Cannot renounce ownership");
    }

    /// @notice Set the Passport Builder Score contract
    /// @dev Can only be called by the owner
    function setPassportBuilderScore(PassportBuilderScore _passportBuilderScore) external onlyOwner {
        passportBuilderScore = _passportBuilderScore;
    }

    /// @notice This reverts because TalentVault is non-transferable
    /// @dev reverts with TalentVaultNonTransferable
    function transfer(address, uint256) public virtual override(ERC20, IERC20) returns (bool) {
        revert TalentVaultNonTransferable();
    }

    /// @notice This reverts because TalentVault is non-transferable
    /// @dev reverts with TalentVaultNonTansferable
    function transferFrom(address, address, uint256) public virtual override(ERC20, IERC20) returns (bool) {
        revert TalentVaultNonTransferable();
    }

    // ---------- INTERNAL --------------------------------------

    function calculateInterest(address user) internal returns (uint256) {
        uint256 userBalance = balanceOf(user);

        if (userBalance > maxYieldAmount) {
            userBalance = maxYieldAmount;
        }

        uint256 endTime;

        if (yieldAccrualDeadline != 0 && block.timestamp > yieldAccrualDeadline) {
            endTime = yieldAccrualDeadline;
        } else {
            endTime = block.timestamp;
        }

        UserBalanceMeta storage balanceMeta = userBalanceMeta[user];

        uint256 timeElapsed;

        if (block.timestamp > endTime) {
            timeElapsed = endTime > balanceMeta.lastInterestCalculation
                ? endTime - balanceMeta.lastInterestCalculation
                : 0;
        } else {
            timeElapsed = block.timestamp - balanceMeta.lastInterestCalculation;
        }

        uint256 yieldRate = getYieldRateForScore(user);

        balanceMeta.lastInterestCalculation = block.timestamp;

        return (userBalance * yieldRate * timeElapsed) / (SECONDS_PER_YEAR_x_ONE_HUNDRED_PERCENT);
    }

    /// @dev Refreshes the balance of an address
    function yieldInterest(address user) internal {
        uint256 interest = calculateInterest(user);

        _deposit(yieldSource, user, interest, interest);
    }
}
