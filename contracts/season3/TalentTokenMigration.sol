// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {TalentTokenV2} from "contracts/test/TalentTokenV2.sol";
import {TalentFactoryV3} from "contracts/season3/TalentFactoryV3.sol";

contract TalentTokenMigration is TalentTokenV2 {
    function setInternalState(address _factory, address _newMinter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        mintingAvailability = MAX_SUPPLY - totalSupply();
        talent = TalentFactoryV3(_factory).tokensToTalents(address(this));
        factory = _factory;
        grantRole(ROLE_MINTER, _newMinter);
    }
}
