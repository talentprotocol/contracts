// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {IERC1363ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1363ReceiverUpgradeable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {StableThenToken} from "../staking_helpers/StableThenToken.sol";
import {IRewardCalculatorV3} from "./RewardCalculatorV3.sol";
import {IVirtualTAL} from "./VirtualTAL.sol";

/// StakingV4 contract
///
/// @notice During phase 1, accepts USDT or Virtual TAL, which is automatically
///   converted into an equivalent TAL amount.
///   Once phase 2 starts (after a TAL address has been set), only TAL deposits are accepted
///
/// @notice StakingV4:
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
///   given based on the logic from `RewardCalculatorV3`, which
///   relies on a continuous `totalAdjustedShares` being updated on every
///   stake/withdraw. See `RewardCalculatorV3` for more details
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

contract StakingV4 is
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

    /// The Reward Calculator contract (IRewardCalculator)
    address public rewardCalculator;

    /// The price (in USD cents) of a single TAL token
    uint256 public tokenPrice;

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

    // Timestamp at which S was last updated
    uint256 public SAt;

    // Total value of TAL invested by all supporters
    uint256 public totalTALInvested;

    /// address for Virtual TAL smart contract
    address public virtualTAL;

    /// re-entrancy guard for `updatesAdjustedShares`
    bool private isAlreadyUpdatingAdjustedShares;

    //
    // Begin: Events
    //

    // emitted when a new stake is created
    event Stake(address indexed owner, address indexed talentToken, uint256 talAmount, bool stable);

    // emitted when stake rewards are withdrawn
    event RewardWithdrawal(address indexed owner, uint256 stakerReward);

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
    /// @param _tokenPrice The price of a tal token in the give stable-coin (50 means 1 TAL = 0.50USD)
    /// @param _rewardCalculator IRewardCalculatorV3 instance

    function initialize(
        uint256 _start,
        uint256 _end,
        uint256 _rewardsMax,
        address _stableCoin,
        uint256 _tokenPrice,
        address _rewardCalculator,
        address _virtualTAL
    ) public virtual initializer {
        require(_tokenPrice > 0, "_tokenPrice cannot be 0");
        require(_end > _start, "start cannot be after end");

        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControlEnumerable_init_unchained();

        __StableThenToken_init(_stableCoin);

        start = _start;
        end = _end;
        rewardsMax = _rewardsMax;
        tokenPrice = _tokenPrice;
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

    /// Creates a new stake from an amount of stable coin.
    /// The USD amount will be converted to the equivalent amount in TAL, according to the pre-determined rate
    ///
    /// @param _amount The amount of stable coin to stake
    ///
    /// @notice The contract must be previously approved to spend _amount on behalf of `msg.sender`
    function stakeStable(
        address _talent,
        uint256 _amount
    ) public onlyWhileStakingEnabled stablePhaseOnly updatesAdjustedShares(msg.sender) {
        uint256 tokenAmount = convertUsdToToken(_amount);

        _checkpointAndStake(msg.sender, _talent, tokenAmount, RewardAction.VIRTUAL_TAL_WITHDRAW);

        totalStableStored = totalStableStored + _amount;

        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(stableCoin), msg.sender, address(this), _amount);

        emit Stake(msg.sender, _talent, tokenAmount, true);
    }

    /// Redeems rewards since last checkpoint and withdraws to Virtual TAL
    function claimRewardsToVirtualTAL() public stablePhaseOnly {
        claimRewardsOnBehalf(msg.sender);
    }

    /// Redeems rewards for a given staker and withdraws to Virtual TAL
    ///
    /// @param _owner owner of the stake to process
    function claimRewardsOnBehalf(address _owner) public stablePhaseOnly {
        _claimCheckpoint(_owner, RewardAction.VIRTUAL_TAL_WITHDRAW);
    }

    /// Redeems rewards since last checkpoint, and withdraws them to the owner's wallet
    ///
    function withdrawRewards() public tokenPhaseOnly {
        _claimCheckpoint(msg.sender, RewardAction.WITHDRAW);
    }

    /// Calculates stable coin balance of the contract
    ///
    /// @return the stable coin balance
    function stableCoinBalance() public view returns (uint256) {
        return IERC20Upgradeable(stableCoin).balanceOf(address(this));
    }

    /// Calculates TAL token balance of the contract
    ///
    /// @return the amount of TAL tokens
    function tokenBalance() public view returns (uint256) {
        return IERC20Upgradeable(token).balanceOf(address(this));
    }

    /// Deposits TAL in exchange for the equivalent amount of stable coin stored in the contract
    ///
    /// @notice Meant to be used by the contract owner to retrieve stable coin
    /// from phase 1, and provide the equivalent TAL amount expected from stakers
    ///
    /// @param _stableAmount amount of stable coin to be retrieved.
    ///
    /// @notice Corresponding TAL amount will be enforced based on the set price
    function swapStableForToken(uint256 _stableAmount) public onlyRole(DEFAULT_ADMIN_ROLE) tokenPhaseOnly {
        require(_stableAmount <= totalStableStored, "not enough stable in contract");

        uint256 tokenAmount = convertUsdToToken(_stableAmount);
        totalStableStored = totalStableStored - _stableAmount;

        SafeERC20Upgradeable.safeTransferFrom(IERC20Upgradeable(token), msg.sender, address(this), tokenAmount);
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(stableCoin), msg.sender, _stableAmount);
    }

    //
    // Begin: IERC1363Receiver
    //

    function onTransferReceived(
        address, // _operator
        address _sender,
        uint256 _amount,
        bytes calldata data
    ) external override(IERC1363ReceiverUpgradeable) onlyWhileStakingEnabled returns (bytes4) {
        if (_isToken(msg.sender)) {
            // if input is TAL, this is a stake since TAL deposits are enabled when
            // `setToken` is called, no additional check for `tokenPhaseOnly` is
            // necessary here
            address talent = bytesToAddress(data);

            _checkpointAndStake(_sender, talent, _amount, RewardAction.WITHDRAW);

            emit Stake(_sender, talent, _amount, false);

            return ERC1363_RECEIVER_RET;
        } else {
            revert("Unrecognized ERC1363 token received");
        }
    }

    function _isToken(address _address) internal view returns (bool) {
        return _address == token;
    }

    //
    // End: IERC1363Receivber
    //

    //
    // Begin: IRewardParameters
    //

    function totalShares() public view returns (uint256) {
        return totalTokensStaked;
    }

    function rewardsLeft() public view returns (uint256) {
        return rewardsMax - rewardsGiven - rewardsAdminWithdrawn;
    }

    /// Panic button, if we decide to halt the staking process for some reason
    ///
    /// @notice This feature should halt further accumulation of rewards, and prevent new stakes from occuring
    /// Existing stakes will still be able to perform all usual operations on existing stakes.
    /// They just won't accumulate new TAL rewards (i.e.: they can still restake rewards and mint new talent tokens)
    function disable() public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!disabled, "already disabled");

        _updateS();
        disabled = true;
    }

    /// Allows the admin to withdraw whatever is left of the reward pool
    function adminWithdraw() public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(disabled || block.timestamp < end, "disabled OR not end of staking");
        require(activeStakes == 0, "there are still active stakes");

        uint256 amount = rewardsLeft();
        require(amount > 0, "nothing left to withdraw");

        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), msg.sender, amount);
        rewardsAdminWithdrawn = rewardsAdminWithdrawn + amount;
    }

    function setTokenPrice(uint256 _price) public onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenPrice = _price;
    }

    //
    // End: IRewardParameters
    //

    //
    // Internal Interface for V4 use
    //

    /// Creates a checkpoint, and then stakes adds the given TAL amount to the stake,
    ///   minting Talent token in the process
    ///
    /// @dev This function assumes tokens have been previously transfered by
    ///   the caller function or via `ERC1363Receiver` or `stableStake`
    ///
    /// @param _owner Owner of the stake
    /// @param _talent Talent token to stake on
    /// @param _tokenAmount TAL amount to stake
    function _checkpointAndStake(
        address _owner,
        address _talent,
        uint256 _tokenAmount,
        RewardAction _action
    ) internal updatesAdjustedShares(_owner) {
        require(_tokenAmount > 0, "amount cannot be zero");
        require(!disabled, "staking has been disabled");

        _checkpoint(_owner, _action);
        _stake(_owner, _talent, _tokenAmount);
    }

    /// Creates a checkpoint, and then unstakes the given TAL amount,
    ///   burning Talent token in the process
    ///
    /// @dev This function assumes tokens have been previously transfered by
    ///   the caller function or via `ERC1363Receiver` or `stableStake`
    ///
    /// @param _owner Owner of the stake
    /// @param _talent Talent token to uliasnstake from
    /// @param _tokenAmount Talent token amount to unstake
    /// @param _action reward action name
    function _checkpointAndUnstake(
        address _owner,
        address _talent,
        uint256 _tokenAmount,
        RewardAction _action
    ) internal updatesAdjustedShares(_owner) returns (uint256) {
        require(_tokenAmount > 0, "amount cannot be zero");

        _checkpoint(_owner, _action);

        GlobalStakeData storage globalStake = globalStakes[_owner];
        StakeData storage stake = stakes[_owner][_talent];

        require(globalStake.lastCheckpointAt > 0, "stake does not exist");

        if (_action == RewardAction.WITHDRAW) {
            require(IERC20Upgradeable(token).balanceOf(address(this)) >= _tokenAmount, "not enough TAL to withdraw");
        }

        stake.tokenAmount = stake.tokenAmount - _tokenAmount;
        globalStake.tokenAmount = globalStake.tokenAmount - _tokenAmount;
        totalTokensStaked = totalTokensStaked - _tokenAmount;

        // if stake is over, it has to  decrease the counter
        if (stake.tokenAmount == 0) {
            activeStakes = activeStakes - 1;
        }

        if (_action == RewardAction.VIRTUAL_TAL_WITHDRAW) {
            IVirtualTAL(virtualTAL).adminMint(msg.sender, _tokenAmount);
        } else {
            _withdrawToken(_owner, _tokenAmount);
        }

        return _tokenAmount;
    }

    /// Adds the given TAL amount to the stake, minting Talent token in the process
    ///
    /// @dev This function assumes tokens have been previously transfered by
    ///   the caller function or via `ERC1363Receiver` or `stableStake`
    ///
    /// @param _owner Owner of the stake
    /// @param _talent Talent token to stake on
    /// @param _tokenAmount TAL amount to stake
    function _stake(address _owner, address _talent, uint256 _tokenAmount) private {
        StakeData storage stake = stakes[_owner][_talent];
        GlobalStakeData storage globalStake = globalStakes[_owner];

        // if it's a new stake, increase stake count
        if (stake.tokenAmount == 0) {
            activeStakes = activeStakes + 1;
            stake.firstPurchaseTimestamp = block.timestamp;
        }

        stake.lastPurchaseTimestamp = block.timestamp;
        globalStake.tokenAmount = globalStake.tokenAmount + _tokenAmount;
        stake.tokenAmount = stake.tokenAmount + _tokenAmount;
        totalTALInvested = totalTALInvested + _tokenAmount;
        totalTokensStaked = totalTokensStaked + _tokenAmount;
    }

    /// Performs a new checkpoint for a given stake
    ///
    /// Internal Interface for V2 use
    ///
    /// Calculates all pending rewards since the last checkpoint, and accumulates them
    /// @param _owner Owner of the stake
    /// @param _action Whether to withdraw or restake rewards
    function _checkpoint(address _owner, RewardAction _action) internal updatesAdjustedShares(_owner) {
        _updateS();

        // calculate rewards since last checkpoint
        // if the talent token has been fully minted, rewards can only be
        // considered up until that timestamp (or S, according to the math)
        // so end date of reward is
        // truncated in that case
        //
        // this will enforce that rewards past this checkpoint will always be
        // 0, effectively ending the stake
        uint256 stakerRewards = _updateStakeRewards(_owner);

        // if staking is disabled decrease activeStakes
        // this forces admins to finish accumulation of all stakes, via `claimRewardsOnBehalf`
        // before withdrawing any remaining TAL from the reward pool
        if (disabled) {
            activeStakes = activeStakes - 1;
        }

        // no need to proceed if there's no rewards yet
        if (stakerRewards == 0) {
            return;
        }

        // Only possible in token phase
        if (_action == RewardAction.WITHDRAW) {
            // transfer staker rewards
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), _owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards);
        } else if (_action == RewardAction.VIRTUAL_TAL_WITHDRAW) {
            // transfer staker rewards
            IVirtualTAL(virtualTAL).adminMint(_owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards);
        } else {
            revert("Unrecognized checkpoint action");
        }
    }

    function _claimCheckpoint(address _owner, RewardAction _action) internal updatesAdjustedShares(_owner) {
        _updateS();

        uint256 stakerRewards = _updateStakeRewards(_owner);

        // Only possible in token phase
        if (_action == RewardAction.WITHDRAW) {
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), _owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards);
        } else if (_action == RewardAction.VIRTUAL_TAL_WITHDRAW) {
            IVirtualTAL(virtualTAL).adminMint(_owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards);
        } else {
            revert("Unrecognized checkpoint action");
        }
    }

    function _updateStakeRewards(address _owner) internal returns (uint256) {
        GlobalStakeData storage globalStake = globalStakes[_owner];

        uint256 stakerRewards = IRewardCalculatorV3(rewardCalculator).calculateReward(
            globalStake.tokenAmount,
            globalStake.S,
            S
        );

        rewardsGiven = rewardsGiven + stakerRewards;
        globalStake.S = S;
        globalStake.lastCheckpointAt = block.timestamp;

        return stakerRewards;
    }

    function _updateS() private {
        if (disabled) {
            return;
        }

        if (totalTokensStaked == 0) {
            return;
        }

        S =
            S +
            (
                IRewardCalculatorV3(rewardCalculator).calculateGlobalReward(
                    start,
                    end,
                    SAt,
                    block.timestamp,
                    rewardsMax
                )
            ) /
            totalAdjustedShares;
        SAt = block.timestamp;
    }

    function calculateEstimatedReturns(address _owner, uint256 _currentTime) public view returns (uint256) {
        GlobalStakeData storage globalStake = globalStakes[_owner];
        uint256 newS = SafeMath.add(
            S,
            SafeMath.div(
                (
                    IRewardCalculatorV3(rewardCalculator).calculateGlobalReward(
                        start,
                        end,
                        SAt,
                        _currentTime,
                        rewardsMax
                    )
                ),
                totalAdjustedShares
            )
        );

        uint256 stakerRewards = IRewardCalculatorV3(rewardCalculator).calculateReward(
            globalStake.tokenAmount,
            globalStake.S,
            newS
        );

        return stakerRewards;
    }

    /// returns a given amount of TAL to an owner
    function _withdrawToken(address _owner, uint256 _amount) private {
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), _owner, _amount);
    }

    function version() public pure virtual returns (uint256) {
        return 4;
    }

    /// Creates stake and burns virtual TAL
    ///
    /// @param _talent The talent address
    /// @param _tokenAmount The TAL amount
    function createStakeWithVirtualTAL(
        address _talent,
        uint256 _tokenAmount
    ) public onlyWhileStakingEnabled stablePhaseOnly updatesAdjustedShares(msg.sender) {
        require(IVirtualTAL(virtualTAL).getBalance(msg.sender) >= _tokenAmount, "not enough TAL");

        _checkpointAndStake(msg.sender, _talent, _tokenAmount, RewardAction.VIRTUAL_TAL_WITHDRAW);

        IVirtualTAL(virtualTAL).adminBurn(msg.sender, _tokenAmount);

        emit Stake(msg.sender, _talent, _tokenAmount, true);
    }

    /// Sells talent tokens and mints virtual TAL
    ///
    /// @param _talent The talent address
    /// @param _tokenAmount The TAL amount
    function sellTALForVirtualTAL(
        address _talent,
        uint256 _tokenAmount
    ) public onlyWhileStakingEnabled stablePhaseOnly {
        require(!disabled, "staking has been disabled");
        require(IERC20Upgradeable(_talent).balanceOf(msg.sender) >= _tokenAmount, "not enough amount");

        uint256 tokenAmount = _checkpointAndUnstake(
            msg.sender,
            _talent,
            _tokenAmount,
            RewardAction.VIRTUAL_TAL_WITHDRAW
        );

        emit Unstake(_talent, msg.sender, tokenAmount);
    }

    modifier updatesAdjustedShares(address _owner) {
        if (isAlreadyUpdatingAdjustedShares) {
            // works like a re-entrancy guard, to prevent sqrt calculations
            // from happening twice
            _;
        } else {
            isAlreadyUpdatingAdjustedShares = true;
            // calculate current adjusted shares for this stake
            // we don't deduct it directly because other computations wrapped by this modifier depend on the original
            // value (e.g. reward calculation)
            // therefore, we just keep track of it, and do a final update to the stored value at the end;
            // temporarily deduct from adjusted shares
            uint256 toDeduct = IRewardCalculatorV3(rewardCalculator).sqrt(globalStakes[_owner].tokenAmount);

            _;

            // calculated adjusted shares again, now with rewards included, and
            // excluding the previously computed amount to be deducted
            // (replaced by the new one)
            totalAdjustedShares =
                totalAdjustedShares +
                IRewardCalculatorV3(rewardCalculator).sqrt(globalStakes[_owner].tokenAmount) -
                toDeduct;
            isAlreadyUpdatingAdjustedShares = false;
        }
    }

    modifier onlyWhileStakingEnabled() {
        require(block.timestamp >= start, "staking period not yet started");
        require(block.timestamp <= end, "staking period already finished");
        _;
    }

    /// Converts a given USD amount to TAL
    ///
    /// @param _usd The amount of USD, in cents, to convert
    /// @return The converted TAL amount
    function convertUsdToToken(uint256 _usd) public view returns (uint256) {
        return SafeMath.div(SafeMath.mul(_usd, 1 ether), tokenPrice);
    }

    /// Converts a byte sequence to address
    ///
    /// @dev This function requires the byte sequence to have 20 bytes of length
    ///
    /// @dev I didn't understand why using `calldata` instead of `memory` doesn't work,
    ///   or what would be the correct assembly to work with it.
    function bytesToAddress(bytes memory bs) private pure returns (address addr) {
        require(bs.length == 20, "invalid data length for address");

        assembly {
            addr := mload(add(bs, 20))
        }
    }
}
