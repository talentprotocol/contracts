// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IVaultOption.sol";

/**
 * @dev A super-simplistic “10% APY” strategy. 
 *      Assumes no compounding. Tracks each user’s deposit time & amount.
 *      On withdrawal, calculates pro-rata interest and sends to the vault.
 */
contract BaseAPY is IVaultOption {
  IERC20 public immutable talentToken;
  address public immutable vault; // The vault that interacts with this strategy

  uint256 private constant YEAR_IN_SECONDS = 365 days;
  uint256 private constant APY = 10_00; // 10%
  uint256 private constant APY_PRECISION = 100_00; // 100%

  // Track deposit details for each user
  struct DepositInfo {
    uint256 amount;       // How many TALENT deposited
    uint256 depositTime;  // When it was deposited
  }
  mapping(address => DepositInfo) public deposits;

  event DepositOption(address indexed user, uint256 amount);
  event WithdrawOption(address indexed user, uint256 amount);

  modifier onlyVault() {
    require(msg.sender == vault, "Not authorized");
    _;
  }

  // TODO:
  // 1. add min/max deposit amounts
  // 2. add lock period
  // 3. add max number of deposits
  constructor(address _talentToken, address _vault) {
    require(_talentToken != address(0), "Invalid token");
    require(_vault != address(0), "Invalid vault");

    talentToken = IERC20(_talentToken);
    vault = _vault;
  }

  /**
   * @notice Vault calls this when user deposits TALENT into the strategy.
   */
  function depositIntoVaultOption(address user, uint256 amount) external override onlyVault {
    require(amount > 0, "Cannot deposit zero");

    // Transfer TALENT from vault to this strategy
    bool success = talentToken.transferFrom(vault, address(this), amount);
    require(success, "Transfer failed");

    // If user already had some deposit, we add to it and recalc partial interest.
    if (deposits[user].amount > 0) {
      uint256 timeElapsed = block.timestamp - deposits[user].depositTime;
      uint256 interest = (deposits[user].amount * APY * timeElapsed) / (APY_PRECISION * YEAR_IN_SECONDS);
      deposits[user].amount += interest;
    }
    deposits[user].amount += amount;
    deposits[user].depositTime = block.timestamp;

    emit DepositOption(user, amount);
  }

  /**
   * @notice Vault calls this when user withdraws from the strategy.
   * @return interest The total TALENT owed to the user (principal + yield).
   */
  function withdrawFromVaultOption(address user) external override onlyVault returns (uint256 interest) {
    DepositInfo memory info = deposits[user];
    require(info.amount > 0, "No deposit for user");

    // Calculate how long the user has been in the strategy
    uint256 timeElapsed = block.timestamp - info.depositTime;

    // Simple interest = principal * APY * (timeElapsed / YEAR_IN_SECONDS)
    // APY = 10% => factor = 0.10
    // but we keep math in integer form: interest = (amount * 10 * timeElapsed) / (100 * YEAR_IN_SECONDS)
    interest = (info.amount * APY * timeElapsed) / (APY_PRECISION * YEAR_IN_SECONDS);

    uint256 totalOwed = info.amount + interest;

    // Reset the user deposit
    deposits[user].amount = 0;
    deposits[user].depositTime = 0;

    // Transfer TALENT to the vault (the vault will handle final distribution to user)
    bool success = talentToken.transfer(vault, totalOwed);
    require(success, "Transfer failed");

    emit WithdrawOption(user, interest);

    return interest;
  }

  /**
   * @notice Preview how much TALENT (principal + yield) user would get if they withdraw now.
   */
  function previewRewards(address user) external view override returns (uint256) {
    DepositInfo memory info = deposits[user];
    if (info.amount == 0) {
      return 0;
    }
    uint256 timeElapsed = block.timestamp - info.depositTime;
    uint256 interest = (info.amount * APY * timeElapsed) / (APY_PRECISION * YEAR_IN_SECONDS);
    return info.amount + interest;
  }
}