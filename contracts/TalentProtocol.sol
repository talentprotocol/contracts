// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC1363Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1363Upgradeable.sol";

import {ERC1363Upgradeable} from "./tokens/ERC1363Upgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/// @title The Talent Protocol's platform token.
///
/// @notice This is a simple, fixed-supply ERC20 token with ERC1363 capabilities.

contract TalentProtocol is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlUpgradeable,
    ERC1363Upgradeable,
    UUPSUpgradeable
{
    function initialize(uint256 startingAmount) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC20_init_unchained("Talent Protocol", "TAL");
        __AccessControl_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        if (startingAmount > 0) {
            _mint(msg.sender, startingAmount);
        }
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override(UUPSUpgradeable)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165Upgradeable, AccessControlUpgradeable, ERC1363Upgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC20Upgradeable).interfaceId ||
            interfaceId == type(IERC1363Upgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
