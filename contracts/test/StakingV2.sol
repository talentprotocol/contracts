// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {Staking} from "../Staking.sol";

contract StakingV2 is Staking {
    function version() public pure virtual returns (uint256) {
        return 2;
    }
}
