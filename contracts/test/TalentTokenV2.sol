// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentToken} from "../TalentToken.sol";

contract TalentTokenV2 is TalentToken {
    function version() public pure virtual returns (uint256) {
        return 2;
    }

    function addNewMinter(address _newMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ROLE_MINTER, _newMinter);
    }

    function removeMinter(address _oldMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ROLE_MINTER, _oldMinter);
    }
}
