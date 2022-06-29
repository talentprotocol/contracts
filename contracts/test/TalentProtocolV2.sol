// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentProtocol} from "../TalentProtocol.sol";

contract TalentProtocolV2 is TalentProtocol {
    function isV2() public pure returns (bool) {
        return true;
    }
}
