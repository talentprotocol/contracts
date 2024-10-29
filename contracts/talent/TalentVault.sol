// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../passport/PassportBuilderScore.sol";

error InvalidAddress();
error InvalidDepositAmount();
error InsufficientBalance();
error InsufficientAllowance();
error TransferFailed();
error NoDepositFound();
error ContractInsolvent();

/// Based on WLDVault.sol from Worldcoin
///   ref: https://optimistic.etherscan.io/address/0x21c4928109acb0659a88ae5329b5374a3024694c#code
/// @title Talent Vault Contract
/// @author Francisco Leal
/// @notice Allows any $TALENT holders to deposit their tokens and earn interest.
contract TalentVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Emitted when a user deposits tokens
    /// @param user The address of the user who deposited tokens
    /// @param amount The amount of tokens deposited
    event Deposited(address indexed user, uint256 amount);

    /// @notice Emitted when a user withdraws tokens
    /// @param user The address of the user who withdrew tokens
    /// @param amount The amount of tokens withdrawn
    event Withdrawn(address indexed user, uint256 amount);

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
    /// @param amount The amount of tokens deposited, plus any accrued interest
    /// @param depositedAmount The amount of tokens that were deposited, excluding interest
    /// @param lastInterestCalculation The timestamp of the last interest calculation for this deposit
    struct Deposit {
        uint256 amount;
        uint256 depositedAmount;
        uint256 lastInterestCalculation;
        address user;
    }

    /// @notice The number of seconds in a year
    uint256 public constant SECONDS_PER_YEAR = 31536000;

    /// @notice The maximum yield rate that can be set, represented as a percentage.
    uint256 public constant ONE_HUNDRED_PERCENT = 100_00;

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
    mapping(address => Deposit) public getDeposit;

    /// @notice Create a new Talent Vault contract
    /// @param _token The token that will be deposited into the contract
    /// @param _yieldSource The wallet paying for the yield
    /// @param _maxYieldAmount The maximum amount of tokens that can be used to calculate interest
    /// @param _passportBuilderScore The Passport Builder Score contract
    constructor(
        IERC20 _token,
        address _yieldSource,
        uint256 _maxYieldAmount,
        PassportBuilderScore _passportBuilderScore,
        uint256 _initialOwnerBalance
    ) ERC4626(_token) ERC20("TalentVault", "TALENTVAULT") Ownable(msg.sender) {
        if (
            address(_token) == address(0) ||
            address(_yieldSource) == address(0) ||
            address(_passportBuilderScore) == address(0)
        ) {
            revert InvalidAddress();
        }

        token = _token;
        yieldRateBase = 10_00;
        yieldRateProficient = 15_00;
        yieldRateCompetent = 20_00;
        yieldRateExpert = 25_00;
        yieldSource = _yieldSource;
        maxYieldAmount = _maxYieldAmount;
        passportBuilderScore = _passportBuilderScore;
    }

    /// @notice Deposit tokens into a user's account, which will start accruing interest.
    /// @param account The address of the user to deposit tokens for
    /// @param amount The amount of tokens to deposit
    function depositForAddress(address account, uint256 amount) public {
        if (amount <= 0) {
            revert InvalidDepositAmount();
        }

        if (token.balanceOf(msg.sender) < amount) {
            revert InsufficientBalance();
        }

        if (token.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientAllowance();
        }

        try token.transferFrom(msg.sender, address(this), amount) {
            // Transfer was successful; no further action needed
        } catch {
            // If the transfer failed, revert with a custom error message
            revert TransferFailed();
        }

        Deposit storage userDeposit = getDeposit[account];

        if (userDeposit.amount > 0) {
            uint256 interest = calculateInterest(userDeposit);
            userDeposit.amount += interest;
        }

        userDeposit.amount += amount;
        userDeposit.depositedAmount += amount;
        userDeposit.lastInterestCalculation = block.timestamp;
        userDeposit.user = account;

        emit Deposited(account, amount);
    }

    /// @notice Deposit tokens into the contract, which will start accruing interest.
    /// @param amount The amount of tokens to deposit
    function deposit(uint256 amount) public {
        depositForAddress(msg.sender, amount);
    }

    /// @notice Calculate any accrued interest.
    /// @param account The address of the user to refresh
    function refreshForAddress(address account) public {
        Deposit storage userDeposit = getDeposit[account];
        if (userDeposit.amount <= 0) {
            revert NoDepositFound();
        }

        refreshInterest(userDeposit);
    }

    /// @notice Calculate any accrued interest.
    function refresh() external {
        refreshForAddress(msg.sender);
    }

    /// @notice Returns the balance of the user, including any accrued interest.
    /// @param user The address of the user to check the balance of
    function balanceOf(address user) public view returns (uint256) {
        Deposit storage userDeposit = getDeposit[user];
        if (userDeposit.amount == 0) return 0;

        uint256 interest = calculateInterest(userDeposit);

        return userDeposit.amount + interest;
    }

    /// @notice Withdraws the requested amount from the user's balance.
    function withdraw(uint256 amount) external nonReentrant {
        _withdraw(msg.sender, amount);
    }

    /// @notice Withdraws all of the user's balance, including any accrued interest.
    function withdrawAll() external nonReentrant {
        _withdraw(msg.sender, balanceOf(msg.sender));
    }

    function recoverDeposit() external {
        Deposit storage userDeposit = getDeposit[msg.sender];
        if (userDeposit.amount <= 0) {
            revert NoDepositFound();
        }

        refreshInterest(userDeposit);
        uint256 amount = userDeposit.depositedAmount;

        userDeposit.amount -= amount;
        userDeposit.depositedAmount = 0;

        if (token.balanceOf(address(this)) < amount) {
            revert ContractInsolvent();
        }

        try token.transfer(msg.sender, amount) {} catch {
            revert TransferFailed();
        }

        emit Withdrawn(msg.sender, amount);
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
        if (builderScore < 50) return yieldRateProficient;
        if (builderScore < 75) return yieldRateCompetent;
        return yieldRateExpert;
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

    /// @dev Calculates the interest accrued on the deposit
    /// @param userDeposit The user's deposit
    /// @return The amount of interest accrued
    function calculateInterest(Deposit memory userDeposit) internal view returns (uint256) {
        if (userDeposit.amount > maxYieldAmount) {
            userDeposit.amount = maxYieldAmount;
        }

        uint256 endTime;
        if (yieldAccrualDeadline != 0 && block.timestamp > yieldAccrualDeadline) {
            endTime = yieldAccrualDeadline;
        } else {
            endTime = block.timestamp;
        }

        uint256 timeElapsed;
        if (block.timestamp > endTime) {
            timeElapsed = endTime > userDeposit.lastInterestCalculation
                ? endTime - userDeposit.lastInterestCalculation
                : 0;
        } else {
            timeElapsed = block.timestamp - userDeposit.lastInterestCalculation;
        }

        uint256 yieldRate = getYieldRateForScore(userDeposit.user);
        return (userDeposit.amount * yieldRate * timeElapsed) / (SECONDS_PER_YEAR * ONE_HUNDRED_PERCENT);
    }

    /// @dev Refreshes the interest on a user's deposit
    /// @param userDeposit The user's deposit
    function refreshInterest(Deposit storage userDeposit) internal {
        if (userDeposit.amount == 0) return;

        uint256 interest = calculateInterest(userDeposit);
        userDeposit.amount += interest;
        userDeposit.lastInterestCalculation = block.timestamp;
    }

    /// @dev Withdraws the user's balance, including any accrued interest
    /// @param user The address of the user to withdraw the balance of
    /// @param amount The amount of tokens to withdraw
    function _withdraw(address user, uint256 amount) internal {
        Deposit storage userDeposit = getDeposit[user];
        if (userDeposit.amount <= 0) {
            revert NoDepositFound();
        }

        refreshInterest(userDeposit);
        require(userDeposit.amount >= amount, "Not enough balance");

        uint256 contractBalance = token.balanceOf(address(this));
        uint256 fromContractAmount = amount < userDeposit.depositedAmount ? amount : userDeposit.depositedAmount;
        uint256 fromYieldSourceAmount = amount - fromContractAmount;

        require(contractBalance >= fromContractAmount, "Contract insolvent");

        userDeposit.amount -= amount;
        userDeposit.depositedAmount -= fromContractAmount;

        emit Withdrawn(user, amount);

        if (fromContractAmount > 0) {
            require(token.transfer(user, fromContractAmount), "Transfer failed");
        }

        if (fromYieldSourceAmount > 0) {
            require(token.transferFrom(yieldSource, user, fromYieldSourceAmount), "Transfer failed");
        }
    }
}
