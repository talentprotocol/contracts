// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {TalentFactoryV3} from "./TalentFactoryV3.sol";

contract TalentFactoryV3Migration is TalentFactoryV3 {
    function emitTalentCreatedEvent(address _talent, address _token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit TalentCreated(_talent, _token);
    }

    function transferMinter(address _newMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minter != address(0x0), "minter is not set");
        revokeRole(ROLE_MINTER, minter);

        minter = _newMinter;
        _grantRole(ROLE_MINTER, _newMinter);
    }
}
