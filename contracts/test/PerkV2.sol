// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {Perk} from "../Perk.sol";

contract PerkV2 is Perk {
    function isV2() public pure returns (bool) {
        return true;
    }
}
