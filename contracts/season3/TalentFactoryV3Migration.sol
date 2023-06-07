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

    function migrateMappings(
        address _token,
        address _talent,
        string memory _symbol
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        /// maps each talent's address to their talent token
        talentsToTokens[_talent] = _token;

        /// maps each talent tokens' address to their talent
        tokensToTalents[_token] = _talent;

        /// maps each token's symbol to the token address
        symbolsToTokens[_symbol] = _token;
    }

    function migrateImplementationBeacon(address _implementationBeacon) external onlyRole(DEFAULT_ADMIN_ROLE) {
        implementationBeacon = _implementationBeacon;
    }
}
