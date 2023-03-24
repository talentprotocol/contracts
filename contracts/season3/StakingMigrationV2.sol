// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import {StakingMigration} from "../StakingMigration.sol";

contract StakingMigrationV2 is StakingMigration {
    function setFactory(address _factory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        factory = _factory;
    }
}
