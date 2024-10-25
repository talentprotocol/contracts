// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// Based on WLDVault.sol from Worldcoin
///   ref: https://optimistic.etherscan.io/address/0x21c4928109acb0659a88ae5329b5374a3024694c#code
/// @title Talent Vault Contract
/// @author Francisco Leal
/// @notice Allows any $TALENT holders to deposit their tokens and earn interest.
contract TalentVault is Ownable {
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
  }

  ///////////////////////////////////////////////////////////////////////////////
  ///                              CONFIG STORAGE                            ///
  //////////////////////////////////////////////////////////////////////////////

  /// @notice The number of seconds in a year
  uint256 public constant SECONDS_PER_YEAR = 31536000;

  /// @notice The maximum yield rate that can be set, represented as a percentage.
  uint256 public constant ONE_HUNDRED_PERCENT = 100_00;

  /// @notice The token that will be deposited into the contract
  IERC20 public immutable token;

  /// @notice The wallet paying for the yield
  address public yieldSource;

  /// @notice The yield rate for the contract, represented as a percentage.
  /// @dev Represented with 2 decimal places, e.g. 10_00 for 10%
  uint256 public yieldRate;

  /// @notice The maximum amount of tokens that can be used to calculate interest.
  uint256 public maxYieldAmount;

  /// @notice The time at which the users of the contract will stop accruing interest
  uint256 public yieldAccrualDeadline;

  /// @notice A mapping of user addresses to their deposits
  mapping(address => Deposit) public getDeposit;

  /// @notice Create a new Talent Vault contract
  /// @param _token The token that will be deposited into the contract
  /// @param _yieldRate The yield rate for the contract, with 2 decimal places (e.g. 10_00 for 10%)
  /// @param _yieldSource The wallet paying for the yield
  /// @param _maxYieldAmount The maximum amount of tokens that can be used to calculate interest
  constructor(
      IERC20 _token,
      uint256 _yieldRate,
      address _yieldSource,
      uint256 _maxYieldAmount
  ) Ownable(msg.sender) {
    require(
      address(_token) != address(0) &&
      address(_yieldSource) != address(0),
      "Invalid address"
    );

    token = _token;
    yieldRate = _yieldRate;
    yieldSource = _yieldSource;
    maxYieldAmount = _maxYieldAmount;
  }

  /// @notice Deposit tokens into a user's account, which will start accruing interest.
  /// @param account The address of the user to deposit tokens for
  /// @param amount The amount of tokens to deposit
  function depositForAddress(address account, uint256 amount) public {
    require(amount > 0, "Invalid deposit amount");
    require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");
    require(token.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");

    Deposit storage userDeposit = getDeposit[account];

    if (userDeposit.amount > 0) {
      uint256 interest = calculateInterest(userDeposit);
      userDeposit.amount += interest;
    }

    userDeposit.amount += amount;
    userDeposit.depositedAmount += amount;
    userDeposit.lastInterestCalculation = block.timestamp;

    emit Deposited(account, amount);

    require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
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
    require(userDeposit.amount > 0, "No deposit found");
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
  function withdraw(uint256 amount) external {
    _withdraw(msg.sender, amount);
  }

  /// @notice Withdraws all of the user's balance, including any accrued interest.
  function withdrawAll() external {
    _withdraw(msg.sender, balanceOf(msg.sender));
  }

  function recoverDeposit() external {
    Deposit storage userDeposit = getDeposit[msg.sender];
    require(userDeposit.amount > 0, "No deposit found");

    refreshInterest(userDeposit);
    uint256 amount = userDeposit.depositedAmount;

    userDeposit.amount -= amount;
    userDeposit.depositedAmount = 0;

    emit Withdrawn(msg.sender, amount);
    require(token.balanceOf(address(this)) >= amount, "Contract insolvent");
    require(token.transfer(msg.sender, amount), "Transfer failed");
  }

  /// @notice Update the yield rate for the contract
  /// @dev Can only be called by the owner
  function setYieldRate(uint256 _yieldRate) external onlyOwner {
    require(_yieldRate > yieldRate, "Yield rate cannot be decreased");

    yieldRate = _yieldRate;
    emit YieldRateUpdated(_yieldRate);
  }

  /// @notice Update the maximum amount of tokens that can be used to calculate interest
  /// @dev Can only be called by the owner
  function setMaxYieldAmount(uint256 _maxYieldAmount) external onlyOwner {
    maxYieldAmount = _maxYieldAmount;

    emit MaxYieldAmountUpdated(_maxYieldAmount);
  }

  /// @notice Update the time at which the users of the contract will stop accruing interest
  /// @dev Can only be called by the owner
  function setYieldAccrualDeadline(
      uint256 _yieldAccrualDeadline
  ) external onlyOwner {
    require(_yieldAccrualDeadline > block.timestamp, "Invalid yield accrual deadline");

    yieldAccrualDeadline = _yieldAccrualDeadline;

    emit YieldAccrualDeadlineUpdated(_yieldAccrualDeadline);
  }

  /// @notice Prevents the owner from renouncing ownership
  /// @dev Can only be called by the owner
  function renounceOwnership() public view override onlyOwner {
    revert("Cannot renounce ownership");
  }

  /// @dev Calculates the interest accrued on the deposit
  /// @param userDeposit The user's deposit
  /// @return The amount of interest accrued
  function calculateInterest(
      Deposit memory userDeposit
  ) internal view returns (uint256) {
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

    return
      (userDeposit.amount * yieldRate * timeElapsed) /
      (SECONDS_PER_YEAR * ONE_HUNDRED_PERCENT);
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
    require(userDeposit.amount > 0, "No deposit found");

    refreshInterest(userDeposit);
    require(userDeposit.amount >= amount, "Not enough balance");

    uint256 contractBalance = token.balanceOf(address(this));
    uint256 fromContractAmount = amount < userDeposit.depositedAmount
      ? amount
      : userDeposit.depositedAmount;
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