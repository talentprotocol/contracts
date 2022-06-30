// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentProtocol} from "../TalentProtocol.sol";

contract TalentProtocolV2 is TalentProtocol {
    function isV2() public pure returns (bool) {
        return true;
    }

    function version() public pure returns(uint256) {
        return 2;
    }

    function adminMint(uint256 _amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _mint(msg.sender, _amount);
    }
}
