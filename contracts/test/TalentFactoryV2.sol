// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentFactory} from "../TalentFactory.sol";
import {TalentTokenV2} from "./TalentTokenV2.sol";

contract TalentFactoryV2 is TalentFactory {
    function isV2() public pure returns (bool) {
        return true;
    }
}
