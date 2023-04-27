// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC1363ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1363ReceiverUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {StableThenToken} from "../../staking_helpers/StableThenToken.sol";
import {ITalentFactoryV3} from "../TalentFactoryV3.sol";

/// StakingV3 contract
///
/// @notice During phase 1, accepts USDT or Virtual TAL, which is automatically
///   converted into an equivalent TAL amount.
///   Once phase 2 starts (after a TAL address has been set), only TAL deposits are accepted
///
/// @notice StakingV3:
///   Each stake results in minting a set supply of the corresponding talent token
///   Talent tokens are immediately transfered to the staker, and TAL is locked into the stake
///
/// @notice Checkpoints:
///   Any action on a stake triggers a checkpoint. Checkpoints accumulate
///   all rewards since the last checkpoint until now. A new stake amount is
///   calculated, and reward calculation starts again from the checkpoint's
///   timestamp.
///
/// @notice Unstaking:
///   By sending back an amount of talent token, you can recover an amount of
///   TAL previously staked (or earned through staking rewards), in proportion to
///   your stake and amount of talent tokens. e.g.: if you have a stake of 110 TAL
///   and have minted 2 Talent Tokens, sending 1 Talent Token gets you 55 TAL back.
///   This process also burns the sent Talent Token
///
/// @notice Re-stake:
///   Stakers can at any moment strengthen their position by sending in more TAL to an existing stake.
///   This will cause a checkpoint, accumulate rewards in the virtual TAL wallet, and mint new Talent Token
///
/// @notice Claim rewards:
///   Stakers can, at any moment, claim whatever rewards are pending from their stake.
///   Rewards are only calculated from the moment of their last checkpoint.
///   Claiming rewards adds the calculated amount of TAL to the staker virtual TAL wallet
///
/// @notice Withdraw rewards:
///   Stakers can, at any moment, claim whatever rewards are pending from their stake.
///   Rewards are only calculated from the moment of their last checkpoint.
///   Withdrawing rewards sends the calculated amount of TAL to the staker's wallet.
///   No Talent Token is minted in this scenario
///
/// @notice Rewards:
///   given based on the logic from `RewardCalculatorV2`, which
///   relies on a continuous `totalAdjustedShares` being updated on every
///   stake/withdraw. See `RewardCalculatorV2` for more details
///
/// @notice Disabling staking:
///   The team reserves the ability to halt staking & reward accumulation,
///   to use if the tokenomics model or contracts don't work as expected, and need to be rethough.
///   In this event, any pending rewards must still be valid and redeemable by stakers.
///   New stakes must not be allowed, and existing stakes will not accumulate new rewards past the disabling block
///
/// @notice Withdrawing remaining rewards:
///   If staking is disabled, or if the end timestamp has been reached, the team can then
///   intervene on stakes to accumulate their rewards on their behalf, in order to reach an `activeStakes` count of 0.
///   Once 0 is reached, since no more claims will ever be made,
///   the remaining TAL from the reward pool can be safely withdrawn back to the team

contract StakingV3State is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlEnumerableUpgradeable,
    StableThenToken,
    IERC1363ReceiverUpgradeable
{
    //
    // Begin: Declarations
    //

    /// Details of each individual stake
    struct StakeData {
        /// Amount of TAL currently staked per talent
        uint256 tokenAmount;
        /// Talent tokens minted as part of this stake
        uint256 talentAmount;
        uint256 firstPurchaseTimestamp;
        uint256 lastPurchaseTimestamp;
    }

    /// Details of investor's global stake
    struct GlobalStakeData {
        /// Amount of all TAL currently staked
        uint256 tokenAmount;
        /// Latest checkpoint for this stake. Staking rewards should only be
        /// calculated from this moment forward. Anything past it should already
        /// be accounted for in `tokenAmount`
        uint256 lastCheckpointAt;
        uint256 S;
    }

    /// Possible actions when a checkpoint is being triggered to withdraw rewards
    enum RewardAction {
        WITHDRAW,
        VIRTUAL_TAL_WITHDRAW
    }

    //
    // Begin: Constants
    //

    bytes4 constant ERC1363_RECEIVER_RET = bytes4(keccak256("onTransferReceived(address,address,uint256,bytes)"));

    //
    // Begin: State
    //

    /// List of all stakes (investor => talent => Stake)
    mapping(address => mapping(address => StakeData)) public stakes;

    /// List of all stakes (investor => StakeV2)
    mapping(address => GlobalStakeData) public globalStakes;

    // How many stakes are there in total
    uint256 public activeStakes;

    // How many stakes have finished accumulating rewards
    uint256 finishedAccumulatingStakeCount;

    // Ability for admins to disable further stakes and rewards
    bool public disabled;

    /// The Talent Token Factory contract (ITalentFactory)
    address public factory;

    /// The Reward Calculator contract (IRewardCalculator)
    address public rewardCalculator;

    /// The price (in USD cents) of a single TAL token
    uint256 public tokenPrice;

    /// The price (in TAL tokens) of a single Talent Token
    uint256 public talentPrice;

    /// How much stablecoin was staked, but without yet depositing the expected TAL equivalent
    ///
    /// @notice After TAL is deployed, `swapStableForToken(uint256)` needs to be
    /// called by an admin, to withdraw any stable coin stored in the contract,
    /// and replace it with the TAL equivalent
    uint256 public totalStableStored;

    // How much TAL is currently staked (not including rewards)
    uint256 public totalTokensStaked;

    // How many has been withdrawn by the admin at the end of staking
    uint256 rewardsAdminWithdrawn;

    /// Sum of sqrt(tokenAmount) for each stake
    /// Used to compute adjusted reward values
    uint256 public totalAdjustedShares;

    // How much TAL is to be given in rewards
    uint256 public rewardsMax;

    // How much TAL has already been given/reserved in rewards
    uint256 public rewardsGiven;

    /// Start date for staking period
    uint256 public start;

    /// End date for staking period
    uint256 public end;

    // Continuously growing value used to compute reward distributions
    uint256 public S;

    // Continuously growing value used to compute talent reward distributions
    uint256 public talentS;

    // Timestamp at which S was last updated
    uint256 public SAt;

    // Total value of TAL invested by all supporters
    uint256 public totalTALInvested;

    // Total value of TAL invested only by talents
    uint256 public totalTalentTALInvested;

    // Total value of TAL invested only by supporters
    uint256 public totalSupporterTALInvested;

    /// address for Virtual TAL smart contract
    address public virtualTAL;

    mapping(address => uint256) public talentsToTalentS;

    //
    // Begin: Events
    //

    // emitted when a new stake is created
    event Stake(address indexed owner, address indexed talentToken, uint256 talAmount, bool stable);

    // emitted when stake rewards are withdrawn
    event RewardWithdrawal(address indexed owner, uint256 stakerReward, uint256 talentReward);

    // emitted when a talent withdraws his share of rewards
    event TalentRewardWithdrawal(address indexed talentToken, address indexed talentTokenWallet, uint256 reward);

    // emitted when a withdrawal is made from an existing stake
    event Unstake(address indexed owner, address indexed talentToken, uint256 talAmount);

    //
    // Begin: Implementation
    //

    /// @param _start Timestamp at which staking begins
    /// @param _end Timestamp at which staking ends
    /// @param _rewardsMax Total amount of TAL to be given in rewards
    /// @param _stableCoin The USD-pegged stable-coin contract to use
    /// @param _factory ITalentFactory instance
    /// @param _tokenPrice The price of a tal token in the give stable-coin (50 means 1 TAL = 0.50USD)
    /// @param _talentPrice The price of a talent token in TAL (50 means 1 Talent Token = 50 TAL)
    /// @param _rewardCalculator IRewardCalculatorV2 instance

    function initialize(
        uint256 _start,
        uint256 _end,
        uint256 _rewardsMax,
        address _stableCoin,
        address _factory,
        uint256 _tokenPrice,
        uint256 _talentPrice,
        address _rewardCalculator,
        address _virtualTAL
    ) public virtual initializer {
        require(_tokenPrice > 0, "_tokenPrice cannot be 0");
        require(_talentPrice > 0, "_talentPrice cannot be 0");
        require(_end > _start, "start cannot be after end");

        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControlEnumerable_init_unchained();

        __StableThenToken_init(_stableCoin);

        start = _start;
        end = _end;
        rewardsMax = _rewardsMax;
        factory = _factory;
        tokenPrice = _tokenPrice;
        talentPrice = _talentPrice;
        SAt = _start;
        rewardCalculator = _rewardCalculator;
        virtualTAL = _virtualTAL;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    //
    // Begin: ERC165
    //

    /// @inheritdoc ERC165Upgradeable
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165Upgradeable, AccessControlEnumerableUpgradeable) returns (bool) {
        return AccessControlEnumerableUpgradeable.supportsInterface(interfaceId);
    }

    function onTransferReceived(
        address, // _operator
        address _sender,
        uint256 _amount,
        bytes calldata data
    ) external virtual override(IERC1363ReceiverUpgradeable) returns (bytes4) {}

    function _isToken(address _address) internal view returns (bool) {
        return _address == token;
    }

    function _isTalentToken(address _address) internal view returns (bool) {
        return ITalentFactoryV3(factory).isTalentToken(_address);
    }
}
