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

import {StableThenToken} from "../../staking_helpers/StableThenToken.sol";
import {IRewardCalculatorV2} from "../RewardCalculatorV2.sol";
import {ITalentToken} from "../../TalentToken.sol";
import {ITalentFactory} from "../../TalentFactory.sol";
import {ITalentFactoryV3} from "../TalentFactoryV3.sol";
import {IVirtualTAL} from "../VirtualTAL.sol";
import {StateStakingV3} from "./StateStakingV3.sol";

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

contract StakingMigrationV3 is StateStakingV3 {
    function transferStake(
        address _owner,
        address _token,
        StakeData memory _stake,
        uint256 timestamp
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_token != address(0x0), "Address must be set");
        require(_owner != address(0x0), "Address must be set");
        require(_isTalentToken(_token), "Token must be a valid talent token");

        StakeData storage stake = stakes[_owner][_token];
        GlobalStakeData storage globalStake = globalStakes[_owner];

        if (stake.tokenAmount == 0) {
            stake.firstPurchaseTimestamp = timestamp;
        }

        stake.tokenAmount = stake.tokenAmount + _stake.tokenAmount;
        stake.talentAmount = stake.talentAmount + _stake.talentAmount;
        stake.lastPurchaseTimestamp = timestamp;

        globalStake.tokenAmount = globalStake.tokenAmount + _stake.tokenAmount;

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

    function setTalentState(address _talent, uint256 _talentRewards) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_talent != address(0x0), "Address must be set");
        require(_isTalentToken(_talent), "Token must be a valid talent token");
        talentRedeemableRewards[_talent] = _talentRewards;
    }

    function emitStakeEvent(
        address _owner,
        address _talentToken,
        uint256 _talAmount,
        bool _stable
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        emit Stake(_owner, _talentToken, _talAmount, _stable);
    }
}
