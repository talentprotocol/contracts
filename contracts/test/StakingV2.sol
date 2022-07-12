// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {Staking} from "../Staking.sol";

contract StakingV2 is Staking {
    function isV2() public pure returns (bool) {
        return true;
    }
}
