// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import {IRewardCalculatorV2} from "../RewardCalculatorV2.sol";
import {StableThenToken} from "../../staking_helpers/StableThenToken.sol";
import {ITalentToken} from "../../TalentToken.sol";
import {ITalentFactoryV3} from "../TalentFactoryV3.sol";
import {IVirtualTAL} from "../VirtualTAL.sol";
import {StakingV3State} from "./StakingV3State.sol";

contract StakingV3 is StakingV3State {
    /// re-entrancy guard for `updatesAdjustedShares`
    bool private isAlreadyUpdatingAdjustedShares;

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

    /// @param _owner The talent from which rewards are to be claimed
    /// @param _talent The talent token from which rewards are to be claimed
    /// @return rewards if operation succeeds
    function _talentRewards(address _owner, address _talent) internal returns (uint256) {
        // only the talent himself can redeem their own rewards
        require(_owner == ITalentToken(_talent).talent(), "only owner can withdraw shares");

        uint256 rewards = ((talentS - talentsToTalentS[_talent]) *
            ((mintedThroughStaking(_talent) * IRewardCalculatorV2(rewardCalculator).mul()) / totalTokensStaked) *
            mintedThroughStaking(_talent)) /
            (IRewardCalculatorV2(rewardCalculator).mul() * IRewardCalculatorV2(rewardCalculator).mul());

        talentsToTalentS[_talent] = talentS;

        return rewards;
    }

    /// Redeems a talent's share of the staking rewards to Virtual TAL
    ///
    /// @notice When stakers claim rewards, a share of those is reserved for
    ///   the talent to redeem for himself through this function
    ///
    /// @param _talent The talent token from which rewards are to be claimed
    function withdrawTalentRewardsToVirtualTAL(address _talent) public stablePhaseOnly {
        IVirtualTAL(virtualTAL).adminMint(msg.sender, _talentRewards(msg.sender, _talent));
    }

    /// Redeems a talent's share of the staking rewards
    ///
    /// @notice When stakers claim rewards, a share of those is reserved for
    ///   the talent to redeem for himself through this function
    ///
    /// @param _talent The talent token from which rewards are to be claimed
    function withdrawTalentRewards(address _talent) public tokenPhaseOnly {
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), msg.sender, _talentRewards(msg.sender, _talent));
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

    /// Queries how much TAL can currently be staked on a given talent token
    ///
    /// @notice The limit of this value is enforced by the tokens' `mintingAvailability()`
    ///   (see `TalentToken` contract)
    ///
    /// @notice Stakes that exceed this amount will be rejected
    ///
    /// @param _talent Talent token to query
    /// @return How much TAL can be staked on the given talent token, before depleting minting supply
    function stakeAvailability(address _talent) public view returns (uint256) {
        require(_isTalentToken(_talent), "not a valid talent token");

        uint256 talentAmount = ITalentToken(_talent).mintingAvailability();

        return convertTalentToToken(talentAmount);
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
    ) external override(StakingV3State) onlyWhileStakingEnabled returns (bytes4) {
        if (_isToken(msg.sender)) {
            // if input is TAL, this is a stake since TAL deposits are enabled when
            // `setToken` is called, no additional check for `tokenPhaseOnly` is
            // necessary here
            address talent = bytesToAddress(data);

            _checkpointAndStake(_sender, talent, _amount, RewardAction.WITHDRAW);

            emit Stake(_sender, talent, _amount, false);

            return ERC1363_RECEIVER_RET;
        } else if (_isTalentToken(msg.sender)) {
            require(_isTokenSet(), "TAL token not yet set");

            // if it's a registered Talent Token, this is a refund
            address talent = msg.sender;

            uint256 tokenAmount = _checkpointAndUnstake(_sender, talent, _amount, RewardAction.WITHDRAW);

            emit Unstake(_sender, talent, tokenAmount);

            return ERC1363_RECEIVER_RET;
        } else {
            revert("Unrecognized ERC1363 token received");
        }
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
    // Internal Interface for V2 use
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
        require(_isTalentToken(_talent), "not a valid talent token");
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
    /// @param _talentAmount Talent token amount to unstake
    /// @param _action reward action name
    function _checkpointAndUnstake(
        address _owner,
        address _talent,
        uint256 _talentAmount,
        RewardAction _action
    ) internal updatesAdjustedShares(_owner) returns (uint256) {
        require(_isTalentToken(_talent), "not a valid talent token");
        require(_talentAmount > 0, "amount cannot be zero");

        _checkpoint(_owner, _action);

        GlobalStakeData storage globalStake = globalStakes[_owner];
        StakeData storage stake = stakes[_owner][_talent];

        require(globalStake.lastCheckpointAt > 0, "stake does not exist");
        require(stake.talentAmount >= _talentAmount);

        // calculate TAL amount proportional to how many talent tokens are
        // being deposited if stake has 100 deposited TAL + 1 TAL earned from
        // rewards, then returning 1 Talent Token should result in 50.5 TAL
        // being returned, instead of the 50 that would be given under the set
        // exchange rate
        uint256 proportion = SafeMath.div(
            SafeMath.mul(_talentAmount, IRewardCalculatorV2(rewardCalculator).mul()),
            stake.talentAmount
        );
        uint256 tokenAmount = SafeMath.div(
            SafeMath.mul(stake.tokenAmount, proportion),
            IRewardCalculatorV2(rewardCalculator).mul()
        );

        if (_action == RewardAction.WITHDRAW) {
            require(IERC20Upgradeable(token).balanceOf(address(this)) >= tokenAmount, "not enough TAL to withdraw");
        }

        stake.talentAmount = stake.talentAmount - _talentAmount;
        stake.tokenAmount = stake.tokenAmount - tokenAmount;
        globalStake.tokenAmount = globalStake.tokenAmount - tokenAmount;
        totalTokensStaked = totalTokensStaked - tokenAmount;

        if (ITalentFactoryV3(factory).hasTalentToken(_owner)) {
            totalTalentTALInvested = totalTalentTALInvested - tokenAmount;
        } else {
            totalSupporterTALInvested = totalSupporterTALInvested - tokenAmount;
        }

        // if stake is over, it has to  decrease the counter
        if (stake.tokenAmount == 0) {
            activeStakes = activeStakes - 1;
        }

        if (_action == RewardAction.VIRTUAL_TAL_WITHDRAW) {
            ITalentToken(_talent).burn(msg.sender, _talentAmount);
            IVirtualTAL(virtualTAL).adminMint(msg.sender, tokenAmount);
        } else {
            _burnTalent(_talent, _talentAmount);
            _withdrawToken(_owner, tokenAmount);
        }

        return tokenAmount;
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
        uint256 talentAmount = convertTokenToTalent(_tokenAmount);

        StakeData storage stake = stakes[_owner][_talent];
        GlobalStakeData storage globalStake = globalStakes[_owner];

        // if it's a new stake, increase stake count
        if (stake.tokenAmount == 0) {
            activeStakes = activeStakes + 1;
            stake.firstPurchaseTimestamp = block.timestamp;
        }

        if (talentsToTalentS[_talent] == 0) {
            talentsToTalentS[_talent] = talentS;
        }

        stake.lastPurchaseTimestamp = block.timestamp;
        globalStake.tokenAmount = globalStake.tokenAmount + _tokenAmount;
        stake.tokenAmount = stake.tokenAmount + _tokenAmount;
        stake.talentAmount = stake.talentAmount + talentAmount;
        totalTALInvested = totalTALInvested + _tokenAmount;

        if (ITalentFactoryV3(factory).hasTalentToken(_owner)) {
            totalTalentTALInvested = totalTalentTALInvested + _tokenAmount;
        } else {
            totalSupporterTALInvested = totalSupporterTALInvested + _tokenAmount;
        }

        totalTokensStaked = totalTokensStaked + _tokenAmount;

        _mintTalent(_owner, _talent, talentAmount);
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
        (uint256 stakerRewards, uint256 talentRewards) = _updateStakeRewards(_owner);

        // if staking is disabled decrease activeStakes
        // this forces admins to finish accumulation of all stakes, via `claimRewardsOnBehalf`
        // before withdrawing any remaining TAL from the reward pool
        if (disabled) {
            activeStakes = activeStakes - 1;
        }

        // no need to proceed if there's no rewards yet
        if (stakerRewards + talentRewards == 0) {
            return;
        }

        // Only possible in token phase
        if (_action == RewardAction.WITHDRAW) {
            // transfer staker rewards
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), _owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards, talentRewards);
        } else if (_action == RewardAction.VIRTUAL_TAL_WITHDRAW) {
            // transfer staker rewards
            IVirtualTAL(virtualTAL).adminMint(_owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards, talentRewards);
        } else {
            revert("Unrecognized checkpoint action");
        }
    }

    function _claimCheckpoint(address _owner, RewardAction _action) internal updatesAdjustedShares(_owner) {
        _updateS();

        (uint256 stakerRewards, uint256 talentRewards) = _updateStakeRewards(_owner);

        // Only possible in token phase
        if (_action == RewardAction.WITHDRAW) {
            SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), _owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards, talentRewards);
        } else if (_action == RewardAction.VIRTUAL_TAL_WITHDRAW) {
            IVirtualTAL(virtualTAL).adminMint(_owner, stakerRewards);

            emit RewardWithdrawal(_owner, stakerRewards, talentRewards);
        } else {
            revert("Unrecognized checkpoint action");
        }
    }

    function _updateStakeRewards(address _owner) internal returns (uint256, uint256) {
        GlobalStakeData storage globalStake = globalStakes[_owner];

        (uint256 stakerRewards, uint256 talentRewards) = IRewardCalculatorV2(rewardCalculator).calculateReward(
            globalStake.tokenAmount,
            globalStake.S,
            S,
            totalSupporterTALInvested,
            totalTalentTALInvested
        );

        rewardsGiven = rewardsGiven + stakerRewards + talentRewards;
        globalStake.S = S;
        globalStake.lastCheckpointAt = block.timestamp;
        if (totalTokensStaked > 0) {
            talentS = SafeMath.add(
                talentS,
                SafeMath.div(
                    SafeMath.mul(talentRewards, IRewardCalculatorV2(rewardCalculator).mul()),
                    totalTokensStaked
                )
            );
        }

        return (stakerRewards, talentRewards);
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
                IRewardCalculatorV2(rewardCalculator).calculateGlobalReward(
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

    function calculateEstimatedReturns(
        address _owner,
        uint256 _currentTime
    ) public view returns (uint256 stakerRewards, uint256 talentRewards) {
        GlobalStakeData storage globalStake = globalStakes[_owner];
        uint256 newS = SafeMath.add(
            S,
            SafeMath.div(
                (
                    IRewardCalculatorV2(rewardCalculator).calculateGlobalReward(
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

        (uint256 sRewards, uint256 tRewards) = IRewardCalculatorV2(rewardCalculator).calculateReward(
            globalStake.tokenAmount,
            globalStake.S,
            newS,
            totalSupporterTALInvested,
            totalTalentTALInvested
        );

        return (sRewards, tRewards);
    }

    /// mints a given amount of a given talent token
    /// to be used within a staking update (re-stake or new deposit)
    ///
    /// @notice The staking update itself is assumed to happen on the caller
    function _mintTalent(address _owner, address _talent, uint256 _amount) private {
        ITalentToken(_talent).mint(_owner, _amount);
    }

    /// burns a given amount of a given talent token
    /// to be used within a staking update (withdrawal or refund)
    ///
    /// @notice The staking update itself is assumed to happen on the caller
    ///
    /// @notice Since withdrawal functions work via ERC1363 and receive the
    /// Talent token prior to calling `onTransferReceived`, /   by this point,
    /// the contract is the owner of the tokens to be burnt, not the owner
    function _burnTalent(address _talent, uint256 _amount) private {
        ITalentToken(_talent).burn(address(this), _amount);
    }

    /// returns a given amount of TAL to an owner
    function _withdrawToken(address _owner, uint256 _amount) private {
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(token), _owner, _amount);
    }

    function version() public pure virtual returns (uint256) {
        return 3;
    }

    /// Creates stake and burns virtual TAL
    ///
    /// @param _talentTokenAddress The talent address
    /// @param _amount The TAL amount
    function createStakeWithVirtualTAL(
        address _talentTokenAddress,
        uint256 _amount
    ) public onlyWhileStakingEnabled stablePhaseOnly updatesAdjustedShares(msg.sender) {
        require(IVirtualTAL(virtualTAL).getBalance(msg.sender) >= _amount, "not enough TAL");

        _checkpointAndStake(msg.sender, _talentTokenAddress, _amount, RewardAction.VIRTUAL_TAL_WITHDRAW);

        IVirtualTAL(virtualTAL).adminBurn(msg.sender, _amount);

        emit Stake(msg.sender, _talentTokenAddress, _amount, true);
    }

    /// Sells talent tokens and mints virtual TAL
    ///
    /// @param _talentTokenAddress The talent address
    /// @param _amount The talent tokens amount
    function sellTalentTokenForVirtualTAL(
        address _talentTokenAddress,
        uint256 _amount
    ) public onlyWhileStakingEnabled stablePhaseOnly {
        require(!disabled, "staking has been disabled");
        require(IERC20Upgradeable(_talentTokenAddress).balanceOf(msg.sender) >= _amount, "not enough amount");

        uint256 tokenAmount = _checkpointAndUnstake(
            msg.sender,
            _talentTokenAddress,
            _amount,
            RewardAction.VIRTUAL_TAL_WITHDRAW
        );

        emit Unstake(_talentTokenAddress, msg.sender, tokenAmount);
    }

    function mintedThroughStaking(address _talent) public view returns (uint256) {
        uint256 amount = IERC20Upgradeable(_talent).totalSupply() -
            ITalentFactoryV3(factory).tokensInitialSupply(_talent);

        return convertTalentToToken(amount);
    }

    /// Same function as _talentRewards but does not change the state and returns the value instead
    /// @param _talent The talent token from which rewards are to be claimed
    /// @return rewards if operation succeeds
    function calculateTalentRewards(address _talent) public view returns (uint256) {
        uint256 rewards = ((talentS - talentsToTalentS[_talent]) *
            ((mintedThroughStaking(_talent) * IRewardCalculatorV2(rewardCalculator).mul()) / totalTokensStaked) *
            mintedThroughStaking(_talent)) /
            (IRewardCalculatorV2(rewardCalculator).mul() * IRewardCalculatorV2(rewardCalculator).mul());

        return rewards;
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
            uint256 toDeduct = IRewardCalculatorV2(rewardCalculator).sqrt(globalStakes[_owner].tokenAmount);

            _;

            // calculated adjusted shares again, now with rewards included, and
            // excluding the previously computed amount to be deducted
            // (replaced by the new one)
            totalAdjustedShares =
                totalAdjustedShares +
                IRewardCalculatorV2(rewardCalculator).sqrt(globalStakes[_owner].tokenAmount) -
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

    /// Converts a given TAL amount to a Talent Token amount
    ///
    /// @param _tal The amount of TAL to convert
    /// @return The converted Talent Token amount
    function convertTokenToTalent(uint256 _tal) public view returns (uint256) {
        return SafeMath.div(SafeMath.mul(_tal, 1 ether), talentPrice);
    }

    /// Converts a given Talent Token amount to TAL
    ///
    /// @param _talent The amount of Talent Tokens to convert
    /// @return The converted TAL amount
    function convertTalentToToken(uint256 _talent) public view returns (uint256) {
        return SafeMath.div(SafeMath.mul(_talent, talentPrice), 1 ether);
    }

    /// Converts a given USD amount to Talent token
    ///
    /// @param _usd The amount of USD, in cents, to convert
    /// @return The converted Talent token amount
    function convertUsdToTalent(uint256 _usd) public view returns (uint256) {
        return convertTokenToTalent(convertUsdToToken(_usd));
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
