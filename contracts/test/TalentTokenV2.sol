// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentToken} from "../TalentToken.sol";

contract TalentTokenV2 is TalentToken {
    function isV2() public pure returns (bool) {
        return true;
    }
}
