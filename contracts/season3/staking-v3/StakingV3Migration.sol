// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IRewardCalculatorV2} from "../RewardCalculatorV2.sol";
import {ITalentFactoryV3} from "../TalentFactoryV3.sol";
import {StakingV3State} from "./StakingV3State.sol";

contract StakingV3Migration is StakingV3State {
    struct OldStakeData {
        /// Amount currently staked
        uint256 tokenAmount;
        /// Talent tokens minted as part of this stake
        uint256 talentAmount;
        /// Latest checkpoint for this stake. Staking rewards should only be
        /// calculated from this moment forward. Anything past it should already
        /// be accounted for in `tokenAmount`
        uint256 lastCheckpointAt;
        uint256 S;
        bool finishedAccumulating;
    }

    function setFirstPurchaseTimestamp(
        address _owner,
        address _token,
        uint256 _timestamp
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        stakes[_owner][_token].firstPurchaseTimestamp = _timestamp;
    }

    function transferStake(
        address _owner,
        address _token,
        OldStakeData memory _stake
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_owner != address(0x0), "Address must be set");
        require(_isTalentToken(_token), "Token must be a valid talent token");

        StakeData storage stake = stakes[_owner][_token];

        if (stake.tokenAmount > 0) {
            return;
        }

        GlobalStakeData storage globalStake = globalStakes[_owner];

        stake.tokenAmount = _stake.tokenAmount;
        stake.talentAmount = _stake.talentAmount;
        stake.lastPurchaseTimestamp = _stake.lastCheckpointAt;

        globalStake.tokenAmount = globalStake.tokenAmount + _stake.tokenAmount;

        if (globalStake.lastCheckpointAt < _stake.lastCheckpointAt) {
            globalStake.lastCheckpointAt = _stake.lastCheckpointAt;
            globalStake.S = _stake.S;
        }

        totalTALInvested = totalTALInvested + _stake.tokenAmount;

        if (ITalentFactoryV3(factory).hasTalentToken(_owner)) {
            totalTalentTALInvested = totalTalentTALInvested + _stake.tokenAmount;
        } else {
            totalSupporterTALInvested = totalSupporterTALInvested + _stake.tokenAmount;
        }
    }

    function setAccumulatedState(
        uint256 _activeStakes,
        uint256 _totalStableStored,
        uint256 _totalTokensStaked,
        uint256 _rewardsGiven
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        activeStakes = _activeStakes;
        totalStableStored = _totalStableStored;
        totalTokensStaked = _totalTokensStaked;
        rewardsGiven = _rewardsGiven;
    }

    function setRealtimeState(
        uint256 _S,
        uint256 _SAt,
        uint256 _totalAdjustedShares
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        S = _S;
        SAt = _SAt;
        totalAdjustedShares = _totalAdjustedShares;
    }

    function setGlobalClaimRewards(uint256 _allTalentRewards) public onlyRole(DEFAULT_ADMIN_ROLE) {
        talentS = SafeMath.div(_allTalentRewards, totalTokensStaked);
    }

    function setClaimRewards(
        address _token,
        uint256 _talentRedeemableRewards,
        uint256 _allTalentRewards
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_isTalentToken(_token), "Token must be a valid talent token");

        // rewards = (talentS - talentsToTalentS[_talent]) * (mintedThroughStaking(_talent) / totalTokensStaked)
        // rewards / mintedThroughStaking(_talent) / (mintedThroughStaking(_talent) / totalTokensStaked) = talentS - talentsToTalentS[_talent]

        talentsToTalentS[_token] =
            talentS -
            (_talentRedeemableRewards / mintedThroughStaking(_token)) /
            (mintedThroughStaking(_token) / _allTalentRewards);
    }

    function emitStakeEvent(
        address _owner,
        address _talentToken,
        uint256 _talAmount,
        bool _stable
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        emit Stake(_owner, _talentToken, _talAmount, _stable);
    }

    function mintedThroughStaking(address _talent) public view returns (uint256) {
        uint256 amount = IERC20Upgradeable(_talent).totalSupply() -
            ITalentFactoryV3(factory).tokensInitialSupply(_talent);

        return convertTalentToToken(amount);
    }

    /// Converts a given Talent Token amount to TAL
    ///
    /// @param _talent The amount of Talent Tokens to convert
    /// @return The converted TAL amount
    function convertTalentToToken(uint256 _talent) public view returns (uint256) {
        return SafeMath.div(SafeMath.mul(_talent, talentPrice), 1 ether);
    }
}
