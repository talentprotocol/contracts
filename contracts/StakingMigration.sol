// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {Staking} from "./Staking.sol";

contract StakingMigration is Staking {
    function setInitialState(
        uint256 _start,
        uint256 _end,
        uint256 _tokenPrice,
        uint256 _talentPrice,
        uint256 _rewardsMax
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        start = _start;
        end = _end;
        tokenPrice = _tokenPrice;
        talentPrice = _talentPrice;
        rewardsMax = _rewardsMax;
        SAt = _start;
        S = 0;
        totalAdjustedShares = 0;
        totalTokensStaked = 0;
        activeStakes = 0;
        rewardsGiven = 0;
    }

    function transferStake(
        address _owner,
        address _token,
        uint256 _tokenAmount,
        uint256 _timestamp,
        bool firstStake
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_token != address(0x0), "Address must be set");
        require(_owner != address(0x0), "Address must be set");
        require(_isTalentToken(_token), "Token must be a valid talent token");

        StakeData storage stake = stakes[_owner][_token];

        if (firstStake) {
            stake.tokenAmount = 0;
            stake.talentAmount = 0;
        }

        if (totalTokensStaked != 0) {
            S = S + (calculateGlobalReward(SAt, _timestamp)) / totalAdjustedShares;
            SAt = _timestamp;
        }

        uint256 toDeduct = sqrt(stake.tokenAmount);

        if (stake.tokenAmount == 0) {
            activeStakes = activeStakes + 1;
        }

        stake.tokenAmount = stake.tokenAmount + _tokenAmount;
        stake.talentAmount = stake.talentAmount + convertTokenToTalent(_tokenAmount);
        stake.lastCheckpointAt = _timestamp;

        stake.S = S;
        stake.finishedAccumulating = false;
        totalTokensStaked = totalTokensStaked + _tokenAmount;

        totalAdjustedShares = totalAdjustedShares + sqrt(stake.tokenAmount) - toDeduct;
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

    function setClaimRewards(
        address _owner,
        address _talent,
        uint256 _timestamp,
        uint256 _stakerRewards,
        uint256 _talentRewards
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        StakeData storage stake = stakes[_owner][_talent];

        if (totalTokensStaked != 0) {
            S = S + (calculateGlobalReward(SAt, _timestamp)) / totalAdjustedShares;
            SAt = _timestamp;
        }

        uint256 toDeduct = sqrt(stake.tokenAmount);

        rewardsGiven = rewardsGiven + _stakerRewards + _talentRewards;
        stake.S = S;
        stake.lastCheckpointAt = _timestamp;

        stake.tokenAmount = stake.tokenAmount + _stakerRewards;
        stake.talentAmount = stake.talentAmount + convertTokenToTalent(_stakerRewards);

        totalTokensStaked = totalTokensStaked + _stakerRewards;

        talentRedeemableRewards[_talent] = talentRedeemableRewards[_talent] + _talentRewards;

        totalAdjustedShares = totalAdjustedShares + sqrt(stake.tokenAmount) - toDeduct;
    }

    function setTalentRedeemableRewards(address _talent) public onlyRole(DEFAULT_ADMIN_ROLE) {
        talentRedeemableRewards[_talent] = 0;
    }
}
