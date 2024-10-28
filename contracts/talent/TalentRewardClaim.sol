// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TalentProtocolToken.sol";
import "../passport/PassportBuilderScore.sol";
import "../passport/PassportWalletRegistry.sol";
import "../merkle/MerkleProof.sol";

contract TalentRewardClaim is Ownable, ReentrancyGuard {
  using Math for uint256;

  TalentProtocolToken public talentToken;
  PassportBuilderScore public passportBuilderScore;
  PassportWalletRegistry public passportWalletRegistry;
  address public holdingWallet;
  uint256 public constant WEEKLY_CLAIM_AMOUNT = 2000 ether;
  uint256 public constant WEEK_DURATION = 7 days;
  uint256 public constant MAX_CLAIM_WEEKS = 104;
  uint256 public startTime;  // Track the start time
  bytes32 public merkleRoot; // Track the merkle root with the information of user owed amounts

  struct UserInfo {
    uint256 amountClaimed;
    uint256 lastClaimed;
  }

  mapping(address => UserInfo) public userInfo;

  event TokensClaimed(address indexed user, uint256 amount);
  event TokensBurned(address indexed user, uint256 amount);
  event StartTimeSet(uint256 startTime);
  event UserInitialized(address indexed user, uint256 amount, uint256 lastClaimed);

  constructor(
    TalentProtocolToken _talentToken,
    PassportBuilderScore _passportBuilderScore,
    PassportWalletRegistry _passportWalletRegistry,
    address _holdingWallet,
    address initialOwner,
    bytes32 _merkleRoot
  ) Ownable(initialOwner) {
    merkleRoot = _merkleRoot;
    talentToken = _talentToken;
    passportBuilderScore = _passportBuilderScore;
    passportWalletRegistry = _passportWalletRegistry;
    holdingWallet = _holdingWallet;
  }

  /**
    * @notice Initializes the user information via changing the root of the merkle tree.
    * @dev Can only be called by the owner. This function sets up the root of the merkle tree
    *   that was calculated with the wallet and amount owed for each user.
    * @param _newMerkleRoot The new merkle root to be set.
    */
  function setMerkleRoot(
    bytes32 _newMerkleRoot
  ) external onlyOwner {
    merkleRoot = _newMerkleRoot;
  }

  /**
    * @notice Sets the start time for token claims.
    * @dev Can only be called by the owner. This function initializes the startTime variable with the provided value.
    * @param _startTime The timestamp representing the start time for token claims.
    */
  function setStartTime(uint256 _startTime) external onlyOwner {
    startTime = _startTime;
    emit StartTimeSet(_startTime);
  }

  /**
    * @notice Allows users to claim their owed tokens.
    * @dev Can only be called once the setup is complete and the start time is set. This function calculates
    *      the number of weeks since the last claim and allows users to claim tokens based on their builder score.
    *      It also burns tokens for missed weeks if applicable.
    * @dev Uses the nonReentrant modifier to prevent reentrancy attacks.
    */
  function claimTokens(
    bytes32[] calldata merkleProof,
    uint256 amountAllocated
  ) external nonReentrant {
    require(startTime > 0, "Start time not set");

    verify(merkleProof, amountAllocated);

    address beneficiary = msg.sender;
    uint256 amountToClaim = calculate(beneficiary, amountAllocated);

    UserInfo storage user = userInfo[msg.sender];
    require(amountToClaim > 0, "No tokens owed");

    uint256 passportId = passportWalletRegistry.passportId(beneficiary);
    uint256 builderScore = passportBuilderScore.getScore(passportId);

    uint256 claimMultiplier = (builderScore > 40) ? 5 : 1;
    uint256 maxPerWeekAmountForUser = WEEKLY_CLAIM_AMOUNT * claimMultiplier;

    // calculate number of weeks that have passed since start time
    uint256 weeksPassed = (block.timestamp - startTime) / WEEK_DURATION;
    uint256 weeksSinceLastClaim = 0;

    if (user.lastClaimed != 0) {
      uint256 weeksForUser = (user.lastClaimed - startTime) / WEEK_DURATION;
      weeksSinceLastClaim = weeksPassed - weeksForUser;
      require(weeksSinceLastClaim > 0, "Can only claim once per week");
    } else {
      weeksSinceLastClaim = weeksPassed + 1;
    }

    uint256 amountToBurn = 0;
    uint256 amountToTransfer = 0;

    if (weeksPassed >= MAX_CLAIM_WEEKS) {
      // Calculate the number of weeks missed
      uint256 weeksMissed = 0;
      if (user.lastClaimed != 0) {
        weeksMissed = weeksPassed - weeksSinceLastClaim;
      } else {
        weeksMissed = weeksPassed;
      }

      // Burn the equivalent amount of tokens for the missed weeks
      amountToBurn = Math.min(WEEKLY_CLAIM_AMOUNT * weeksMissed, amountToClaim);
      user.amountClaimed += amountToBurn;

      // Transfer the remaining owed amount to the user
      amountToTransfer = amountToClaim - amountToBurn;
      user.amountClaimed += amountToTransfer;
      user.lastClaimed = block.timestamp;
    } else {
      amountToBurn = Math.min(WEEKLY_CLAIM_AMOUNT * (weeksSinceLastClaim - 1), amountToClaim);
      user.amountClaimed += amountToBurn;

      amountToTransfer = Math.min(maxPerWeekAmountForUser, amountToClaim - amountToBurn);
      user.amountClaimed += amountToTransfer;

      user.lastClaimed = block.timestamp;
    }

    if (amountToTransfer > 0) {
      talentToken.transferFrom(holdingWallet, msg.sender, amountToTransfer);
      emit TokensClaimed(msg.sender, amountToTransfer);
    }
    if (amountToBurn > 0) {
      talentToken.burnFrom(holdingWallet, amountToBurn);
      emit TokensBurned(msg.sender, amountToBurn);
    }
  }

  function tokensClaimed(address user) external view returns (uint256) {
    return userInfo[user].amountClaimed;
  }

  function lastClaimed(address user) external view returns (uint256) {
    return userInfo[user].lastClaimed;
  }

  function verify(
    bytes32[] calldata proof,
    uint256 amountAllocated
  ) internal view {
    // Computing proof using leaf double hashing
    // https://flawed.net.nz/2018/02/21/attacking-merkle-trees-with-a-second-preimage-attack/

    bytes32 root = merkleRoot;
    bytes32 leaf = keccak256(
      bytes.concat(keccak256(abi.encode(msg.sender, amountAllocated)))
    );

    require(MerkleProof.verify(proof, root, leaf), "Invalid Allocation Proof");
  }

  function calculate(
    address beneficiary,
    uint256 amountAllocated
  ) internal view returns (uint256 amountToClaim) {
    UserInfo storage user = userInfo[beneficiary];
    assert(user.amountClaimed <= amountAllocated);

    amountToClaim = amountAllocated - user.amountClaimed;
  }
}
