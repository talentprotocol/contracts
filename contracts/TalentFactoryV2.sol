// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentFactory} from "./TalentFactory.sol";

contract TalentFactoryV2 is TalentFactory {
    function isV2() public pure virtual returns (bool) {
        return true;
    }

    function transferMinter(address _newMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minter != address(0x0), "minter is not set");
        revokeRole(ROLE_MINTER, minter);

        minter = _newMinter;
        // grantRole(ROLE_MINTER, _newMinter);
        _setupRole(ROLE_MINTER, _newMinter);
    }
}
