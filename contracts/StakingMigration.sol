// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {Staking} from "./Staking.sol";

contract StakingMigration is Staking {
    function initialize(
        uint256 _start,
        uint256 _end,
        uint256 _rewardsMax,
        address _stableCoin,
        address _factory,
        uint256 _tokenPrice,
        uint256 _talentPrice
    ) public override(Staking) initializer {
        Staking.initialize(_start, _end, _rewardsMax, _stableCoin, _factory, _tokenPrice, _talentPrice);
    }

    function transferStake(
        address _owner,
        address _token,
        StakeData memory _stake
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_token != address(0x0), "Address must be set");
        require(_owner != address(0x0), "Address must be set");
        require(_isTalentToken(_token), "Token must be a valid talent token");

        StakeData storage stake = stakes[_owner][_token];

        stake.tokenAmount = stake.tokenAmount + _stake.tokenAmount;
        stake.talentAmount = stake.talentAmount + _stake.talentAmount;
        stake.lastCheckpointAt = _stake.lastCheckpointAt;
        stake.S = _stake.S;
        stake.finishedAccumulating = _stake.finishedAccumulating;
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

    function setTalentState(
        address _talent,
        uint256 _talentRewards,
        uint256 _maxSTalent
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_talent != address(0x0), "Address must be set");
        require(_isTalentToken(_talent), "Token must be a valid talent token");
        talentRedeemableRewards[_talent] = _talentRewards;
        maxSForTalent[_talent] = _maxSTalent;
    }

    function emitStakeEvent(
        address _owner,
        address _talentToken,
        uint256 _talAmount,
        bool _stable
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        emit Stake(_owner, _talentToken, _talAmount, _stable);
    }

    function emitRewardsClaimEvent(
        address _owner,
        address _talentToken,
        uint256 _stakerReward,
        uint256 _talentReward
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardClaim(_owner, _talentToken, _stakerReward, _talentReward);
    }
}
