// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TalentProtocolToken.sol";
import "../passport/PassportBuilderScore.sol";

contract TalentRewardClaim is Ownable, ReentrancyGuard {
  using Math for uint256;

  TalentProtocolToken public talentToken;
  PassportBuilderScore public passportBuilderScore;
  address public holdingWallet;
  uint256 public constant WEEKLY_CLAIM_AMOUNT = 2000 ether;
  uint256 public constant WEEK_DURATION = 7 days;
  uint256 public constant MAX_CLAIM_WEEKS = 96;
  bool public setupComplete = false;  // Setup flag
  uint256 public startTime;  // Track the start time

  struct UserInfo {
    uint256 amountOwed;
    uint256 lastClaimed;
  }

  mapping(address => UserInfo) public userInfo;

  event TokensClaimed(address indexed user, uint256 amount);
  event TokensBurned(address indexed user, uint256 amount);
  event SetupComplete();
  event StartTimeSet(uint256 startTime);

  constructor(
    TalentProtocolToken _talentToken,
    PassportBuilderScore _passportBuilderScore,
    address _holdingWallet,
    address initialOwner
  ) Ownable(initialOwner) {
    talentToken = _talentToken;
    passportBuilderScore = _passportBuilderScore;
    holdingWallet = _holdingWallet;
  }

  function initializeUsers(address[] memory users, uint256[] memory amounts) external onlyOwner {
    require(users.length == amounts.length, "Users and amounts length mismatch");
    require(!setupComplete, "Setup is already complete");

    for (uint256 i = 0; i < users.length; i++) {
      userInfo[users[i]] = UserInfo({
        amountOwed: amounts[i],
        lastClaimed: 0
      });
    }
  }

  function finalizeSetup() external onlyOwner {
    setupComplete = true;
    emit SetupComplete();
  }

  function setStartTime(uint256 _startTime) external onlyOwner {
    // require(startTime == 0, "Start time already set");

    startTime = _startTime;
    emit StartTimeSet(_startTime);
  }

  function claimTokens() external nonReentrant {
    require(setupComplete, "Setup is not complete");
    require(startTime > 0, "Start time not set");

    UserInfo storage user = userInfo[msg.sender];
    require(user.amountOwed > 0, "No tokens owed");

    uint256 passportId = passportBuilderScore.passportRegistry().passportId(msg.sender);
    uint256 builderScore = passportBuilderScore.getScore(passportId);

    uint256 claimMultiplier = (builderScore > 40) ? 5 : 1;
    uint256 maxPerWeekAmountForUser = WEEKLY_CLAIM_AMOUNT * claimMultiplier;

    // calculate number of weeks that have passed since start time
    uint256 weeksPassed = (block.timestamp - startTime) / WEEK_DURATION;
    uint256 weeksSinceLastClaim = 0;

    if (user.lastClaimed != 0) {
      weeksSinceLastClaim = (block.timestamp - user.lastClaimed) / WEEK_DURATION;
      require(weeksSinceLastClaim > 0, "Can only claim once per week");
    } else {
      weeksSinceLastClaim = weeksPassed;
    }

    if (weeksPassed >= MAX_CLAIM_WEEKS) {
      // Calculate the number of weeks missed
      uint256 weeksMissed = 0;
      if (user.lastClaimed != 0) {
        weeksMissed = weeksPassed - weeksSinceLastClaim;
      } else {
        weeksMissed = weeksPassed;
      }

      // Burn the equivalent amount of tokens for the missed weeks
      uint256 amountToBurn = Math.min(WEEKLY_CLAIM_AMOUNT * weeksMissed, user.amountOwed);
      user.amountOwed -= amountToBurn;

      // Transfer the remaining owed amount to the user
      uint256 amountToTransfer = user.amountOwed;
      user.amountOwed = 0;
      user.lastClaimed = block.timestamp;

      talentToken.transferFrom(holdingWallet, msg.sender, amountToTransfer);
      emit TokensClaimed(msg.sender, amountToTransfer);

      if (amountToBurn > 0) {
        talentToken.burnFrom(holdingWallet, amountToBurn);
        emit TokensBurned(msg.sender, amountToBurn);
      }
    } else {
      uint256 amountToBurn = Math.min(WEEKLY_CLAIM_AMOUNT * (weeksSinceLastClaim - 1), user.amountOwed);
      user.amountOwed -= amountToBurn;

      uint256 amountToTransfer = Math.min(maxPerWeekAmountForUser, user.amountOwed);
      user.amountOwed -= amountToTransfer;

      user.lastClaimed = block.timestamp;

      if (amountToTransfer > 0) {
        talentToken.transferFrom(holdingWallet, msg.sender, amountToTransfer);
        emit TokensClaimed(msg.sender, amountToTransfer);
      }
      if (amountToBurn > 0) {
        talentToken.burnFrom(holdingWallet, amountToBurn);
        emit TokensBurned(msg.sender, amountToBurn);
      }
    }
}



  function tokensOwed(address user) external view returns (uint256) {
    return userInfo[user].amountOwed;
  }

  function lastClaimed(address user) external view returns (uint256) {
    return userInfo[user].lastClaimed;
  }
}
