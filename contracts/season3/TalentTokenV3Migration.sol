// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {TalentTokenV3} from "./TalentTokenV3.sol";

contract TalentTokenV3Migration is TalentTokenV3 {
    function transferState(
        address _talent,
        address _factory,
        uint256 _mintingAvailability
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_talent != address(0x0), "talent address must be set");
        require(_factory != address(0x0), "factory address must be set");
        require(_mintingAvailability > 0, "mintingAvailability > 0");

        talent = _talent;
        factory = _factory;

        mintingFinishedAt = 0;
        mintingAvailability = _mintingAvailability;
    }

    function emitTransferEvent(address from, address to, uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(from != address(0x0), "talent address must be set");
        require(to != address(0x0), "factory address must be set");

        emit Transfer(from, to, amount);
    }
}
