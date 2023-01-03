// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

import {ITalentToken} from "./TalentToken.sol";
import {IVirtualTAL} from "./VirtualTAL.sol";
import {Staking} from "./Staking.sol";

contract StakingV2 is Staking {
    function isV2() public pure virtual returns (bool) {
        return true;
    }

    /// Creates stake and burns virtual TAL
    ///
    /// @param _talentTokenAddress The talent address
    /// @param _amount The TAL amount
    /// @return bool
    function createStakeWithVirtualTAL(address _talentTokenAddress, uint256 _amount)
        public
        onlyWhileStakingEnabled
        stablePhaseOnly
        updatesAdjustedShares(msg.sender, _talentTokenAddress)
        returns (bool)
    {
        require(IVirtualTAL(virtualTALAddress).getBalance(msg.sender) >= _amount, "not enough TAL");

        _checkpointAndStake(msg.sender, _talentTokenAddress, _amount);

        IVirtualTAL(virtualTALAddress).adminBurn(msg.sender, _amount);

        emit Stake(msg.sender, _talentTokenAddress, _amount, true);

        return true;
    }

    /// Sells talent tokens and mints virtual TAL
    ///
    /// @param _talentTokenAddress The talent address
    /// @param _amount The talent tokens amount
    /// @return bool
    function sellTalentTokenWithVirtualTAL(address _talentTokenAddress, uint256 _amount)
        public
        onlyWhileStakingEnabled
        stablePhaseOnly
        returns (bool)
    {
        require(!disabled, "staking has been disabled");
        require(IERC20(_talentTokenAddress).balanceOf(msg.sender) >= _amount, "not enough amount");

        uint256 tokenAmount = _checkpointAndUnstake(msg.sender, _talentTokenAddress, _amount, true);

        emit Unstake(_talentTokenAddress, msg.sender, tokenAmount);

        return true;
    }
}
