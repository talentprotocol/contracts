// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentToken} from "../TalentToken.sol";

contract TalentTokenV2 is TalentToken {
    function isV2() public pure returns (bool) {
        return true;
    }

    function addNewMinter(address _newMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ROLE_MINTER, _newMinter);
    }

    function removeMinter(address _oldMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ROLE_MINTER, _oldMinter);
    }
}
