// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../passport/PassportBuilderScore.sol";

/// @title Talent Protocol Vault Token Contract
/// @author Talent Protocol - Francisco Leal, Panagiotis Matsinopoulos
/// @notice Allows any $TALENT holders to deposit their tokens and earn rewards.
/// @dev This is an ERC4626 compliant contract.
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

    error CantWithdrawWithinTheLockPeriod();
    error ContractInsolvent();
    error InsufficientAllowance();
    error InsufficientBalance();
    error InvalidAddress();
    error InvalidDepositAmount();
    error NoDepositFound();
    error TalentVaultNonTransferable();
    error TransferFailed();

    /// @notice Represents user's balance meta data
    /// @param depositedAmount The amount of tokens that were deposited, excluding rewards
    /// @param lastRewardCalculation The timestamp (seconds since Epoch) of the last rewards calculation
    struct UserBalanceMeta {
        uint256 depositedAmount;
        uint256 lastRewardCalculation;
        uint256 lastDepositAt;
    }

    /// @notice The amount of days that your deposits are locked and can't be withdrawn.
    /// Lock period end-day is calculated base on the last datetime user did a deposit.
    uint256 public lockPeriod;

    /// @notice The number of seconds in a day
    uint256 internal constant SECONDS_WITHIN_DAY = 86400;

    /// @notice The number of seconds in a year
    uint256 internal constant SECONDS_PER_YEAR = 31536000;

    /// @notice The maximum yield rate that can be set, represented as a percentage.
    uint256 internal constant ONE_HUNDRED_PERCENT = 100_00;

    /// @notice The number of seconds in a year multiplied by 100% (to make it easier to calculate rewards)
    uint256 internal constant SECONDS_PER_YEAR_x_ONE_HUNDRED_PERCENT = SECONDS_PER_YEAR * ONE_HUNDRED_PERCENT;

    /// @notice The token that will be deposited into the contract
    IERC20 public immutable token;

    /// @notice The wallet paying for the yield
    address public yieldSource;

    /// @notice The yield base rate for the contract, represented as a percentage.
    /// @dev Represented with 2 decimal places, e.g. 10_00 for 10%
    uint256 public yieldRateBase;

    /// @notice The maximum amount of tokens that can be used to calculate reward.
    uint256 public maxYieldAmount;

    /// @notice The time at which the users of the contract will stop accruing rewards
    uint256 public yieldAccrualDeadline;

    /// @notice Whether the contract is accruing rewards or not
    bool public yieldRewardsFlag;

    /// @notice The Passport Builder Score contract
    PassportBuilderScore public passportBuilderScore;

    /// @notice A mapping of user addresses to their deposits
    mapping(address => UserBalanceMeta) public userBalanceMeta;

    /// @notice Whether the max deposit limit is enabled for an address or not
    mapping(address => bool) private maxDepositLimitFlags;

    /// @notice The maximum deposit amount for an address (if there is one)
    mapping(address => uint256) private maxDeposits;

    /// @notice Create a new Talent Vault contract
    /// @param _token The token that will be deposited into the contract
    /// @param _yieldSource The wallet paying for the yield
    /// @param _maxYieldAmount The maximum amount of tokens that can be used to calculate rewards
    /// @param _passportBuilderScore The Passport Builder Score contract
    constructor(
        IERC20 _token,
        address _yieldSource,
        uint256 _maxYieldAmount,
        PassportBuilderScore _passportBuilderScore
    ) ERC4626(_token) ERC20("TalentProtocolVaultToken", "TALENTVAULT") Ownable(msg.sender) {
        if (
            address(_token) == address(0) ||
            address(_yieldSource) == address(0) ||
            address(_passportBuilderScore) == address(0)
        ) {
            revert InvalidAddress();
        }

        token = _token;
        yieldRateBase = 0;
        yieldSource = _yieldSource;
        yieldRewardsFlag = true;
        maxYieldAmount = _maxYieldAmount;
        passportBuilderScore = _passportBuilderScore;
        lockPeriod = 7 days;
    }

    // ------------------- EXTERNAL --------------------------------------------

    /// @notice Set the lock period for the contract
    /// @dev Can only be called by the owner
    /// @param _lockPeriod The lock period in days
    function setLockPeriod(uint256 _lockPeriod) external onlyOwner {
        lockPeriod = _lockPeriod * SECONDS_WITHIN_DAY;
    }

    /// @notice Set the maximum deposit amount for an address
    /// @dev Can only be called by the owner
    /// @param receiver The address to set the maximum deposit amount for
    /// @param shares The maximum deposit amount
    function setMaxMint(address receiver, uint256 shares) external onlyOwner {
        setMaxDeposit(receiver, shares);
    }

    /// @notice Remove the maximum deposit limit for an address
    /// @dev Can only be called by the owner
    /// @param receiver The address to remove the maximum deposit limit for
    function removeMaxMintLimit(address receiver) external onlyOwner {
        removeMaxDepositLimit(receiver);
    }

    /// @notice Calculate any accrued rewards for the caller
    function refresh() external {
        refreshForAddress(msg.sender);
    }

    /// @notice Withdraws all of the user's balance, including any accrued rewards.
    function withdrawAll() external nonReentrant {
        refreshForAddress(msg.sender);
        redeem(balanceOf(msg.sender), msg.sender, msg.sender);
    }

    /// @notice Update the base yield rate for the contract
    /// @dev Can only be called by the owner
    /// @param _yieldRate The new yield rate
    function setYieldRate(uint256 _yieldRate) external onlyOwner {
        require(_yieldRate > yieldRateBase, "Yield rate cannot be decreased");

        yieldRateBase = _yieldRate;
        emit YieldRateUpdated(_yieldRate);
    }

    /// @notice Update the maximum amount of tokens that can be used to calculate rewards
    /// @dev Can only be called by the owner
    /// @param _maxYieldAmount The new maximum yield amount
    function setMaxYieldAmount(uint256 _maxYieldAmount) external onlyOwner {
        maxYieldAmount = _maxYieldAmount;

        emit MaxYieldAmountUpdated(_maxYieldAmount);
    }

    /// @notice Update the time at which the users of the contract will stop accruing rewards
    /// @dev Can only be called by the owner
    /// @param _yieldAccrualDeadline The new yield accrual deadline
    function setYieldAccrualDeadline(uint256 _yieldAccrualDeadline) external onlyOwner {
        require(_yieldAccrualDeadline > block.timestamp, "Invalid yield accrual deadline");

        yieldAccrualDeadline = _yieldAccrualDeadline;

        emit YieldAccrualDeadlineUpdated(_yieldAccrualDeadline);
    }

    /// @notice Stop the contract from accruing rewards
    /// @dev Can only be called by the owner
    function stopYieldingRewards() external onlyOwner {
        yieldRewardsFlag = false;
    }

    /// @notice Start the contract accruing rewards
    /// @dev Can only be called by the owner
    function startYieldingRewards() external onlyOwner {
        yieldRewardsFlag = true;
    }

    /// @notice Set the yield source for the contract
    /// @dev Can only be called by the owner
    /// @param _yieldSource The new yield source
    function setYieldSource(address _yieldSource) external onlyOwner {
        yieldSource = _yieldSource;
    }

    // ------------------------- PUBLIC ----------------------------------------------------

    /// @notice Get the maximum deposit amount for an address
    /// @param receiver The address to get the maximum deposit amount for
    function maxDeposit(address receiver) public view virtual override returns (uint256) {
        if (maxDepositLimitFlags[receiver]) {
            return maxDeposits[receiver];
        } else {
            return type(uint256).max;
        }
    }

    /// @notice Get the maximum deposit amount for an address
    /// @param receiver The address to get the maximum deposit amount for
    function maxMint(address receiver) public view virtual override returns (uint256) {
        return maxDeposit(receiver);
    }

    /// @notice Deposit tokens into the contract
    /// @param assets The amount of tokens to deposit
    /// @param receiver The address to deposit the tokens for
    function deposit(uint256 assets, address receiver) public virtual override returns (uint256) {
        if (assets <= 0) {
            revert InvalidDepositAmount();
        }

        refreshForAddress(receiver);

        uint256 shares = super.deposit(assets, receiver);

        UserBalanceMeta storage balanceMeta = userBalanceMeta[receiver];

        balanceMeta.depositedAmount += assets;

        balanceMeta.lastDepositAt = block.timestamp;

        return shares;
    }

    /// @notice Deposit tokens into the contract
    /// @param shares The amount of shares to deposit
    /// @param receiver The address to deposit the shares for
    function mint(uint256 shares, address receiver) public virtual override returns (uint256) {
        return deposit(shares, receiver);
    }

    /// @notice Calculate any accrued rewards for an address and update
    ///         the deposit meta data including minting any rewards
    /// @param account The address of the user to refresh
    function refreshForAddress(address account) public {
        if (balanceOf(account) <= 0) {
            UserBalanceMeta storage balanceMeta = userBalanceMeta[account];
            balanceMeta.lastRewardCalculation = block.timestamp;
            return;
        }

        yieldRewards(account);
    }

    /// @notice Get the yield rate for the contract for a given user
    /// @param user The address of the user to get the yield rate for
    function getYieldRateForScore(address user) public view returns (uint256) {
        /// @TODO: Update to use the PassportWalletRegistry instead for calculating the passport id
        uint256 passportId = passportBuilderScore.passportRegistry().passportId(user);
        uint256 builderScore = passportBuilderScore.getScore(passportId);

        if (builderScore < 50) return yieldRateBase;
        if (builderScore < 75) return yieldRateBase + 5_00;
        if (builderScore < 100) return yieldRateBase + 10_00;
        return yieldRateBase + 15_00;
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

    /// @notice Calculate the accrued rewards for an address
    /// @param user The address to calculate the accrued rewards for
    function calculateRewards(address user) public view returns (uint256) {
        UserBalanceMeta storage balanceMeta = userBalanceMeta[user];

        if (!yieldRewardsFlag) {
            return 0;
        }

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

        uint256 timeElapsed;

        if (block.timestamp > endTime) {
            timeElapsed = endTime > balanceMeta.lastRewardCalculation
                ? endTime - balanceMeta.lastRewardCalculation
                : 0;
        } else {
            timeElapsed = block.timestamp - balanceMeta.lastRewardCalculation;
        }

        uint256 yieldRate = getYieldRateForScore(user);

        return (userBalance * yieldRate * timeElapsed) / (SECONDS_PER_YEAR_x_ONE_HUNDRED_PERCENT);
    }

    // ---------- INTERNAL --------------------------------------

    /// @notice Set the maximum deposit amount for an address
    /// @dev Can only be called by the owner
    /// @param receiver The address to set the maximum deposit amount for
    /// @param assets The maximum deposit amount
    function setMaxDeposit(address receiver, uint256 assets) internal onlyOwner {
        maxDeposits[receiver] = assets;
        maxDepositLimitFlags[receiver] = true;
    }

    /// @notice Remove the maximum deposit limit for an address
    /// @dev Can only be called by the owner
    /// @param receiver The address to remove the maximum deposit limit for
    function removeMaxDepositLimit(address receiver) internal onlyOwner {
        delete maxDeposits[receiver];
        delete maxDepositLimitFlags[receiver];
    }

    /// @notice Calculate the accrued rewards for an address and mint any rewards
    /// @param user The address to calculate the accrued rewards for
    function yieldRewards(address user) internal {
        UserBalanceMeta storage balanceMeta = userBalanceMeta[user];
        uint256 rewards = calculateRewards(user);
        balanceMeta.lastRewardCalculation = block.timestamp;

        _deposit(yieldSource, user, rewards, rewards);
    }

    /// @notice Withdraws tokens from the contract
    /// @param caller The address of the caller
    /// @param receiver The address of the receiver
    /// @param owner The address of the owner
    /// @param assets The amount of tokens to withdraw
    /// @param shares The amount of shares to withdraw
    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        UserBalanceMeta storage receiverUserBalanceMeta = userBalanceMeta[receiver];

        if (receiverUserBalanceMeta.lastDepositAt + lockPeriod > block.timestamp) {
            revert CantWithdrawWithinTheLockPeriod();
        }

        super._withdraw(caller, receiver, owner, assets, shares);
    }
}
