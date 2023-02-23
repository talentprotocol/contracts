// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {TalentFactory} from "./TalentFactory.sol";

contract TalentFactoryV2 is TalentFactory {
    function version() public pure virtual returns (uint256) {
        return 2;
    }

    function transferMinter(address _newMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minter != address(0x0), "minter is not set");
        revokeRole(ROLE_MINTER, minter);

        minter = _newMinter;
        _setupRole(ROLE_MINTER, _newMinter);
    }
}
