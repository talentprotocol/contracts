// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {IERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";
import {IERC1363Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC1363Upgradeable.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {ERC1363Upgradeable} from "../tokens/ERC1363Upgradeable.sol";

interface IVirtualTAL is IERC20Upgradeable {
    // admin mints TAL from address
    function adminMint(address _owner, uint256 _amount) external;

    // admin burns existing TAL from address
    function adminBurn(address _owner, uint256 _amount) external;

    // talent's wallet
    function getBalance(address _owner) external view returns (uint256);
}

/// @title The base contract for Virtual TAL
contract VirtualTAL is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlUpgradeable,
    ERC1363Upgradeable,
    UUPSUpgradeable,
    IVirtualTAL
{
    /// maps each talent's address to their TAL amount
    mapping(address => uint256) public addressToTAL;

    event AdminMinted(address owner, uint256 amount);

    event AdminBurned(address owner, uint256 amount);

    function initialize() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __ERC20_init_unchained("Virtual TAL", "vTAL");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override(UUPSUpgradeable)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    function setAdminRole(address _address) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEFAULT_ADMIN_ROLE, _address);
    }

    /// Mints new supply
    ///
    /// @notice Only accessible to the role ADMIN
    ///
    /// @param _to Recipient of the new TAL
    /// @param _amount Amount to mint
    function adminMint(address _to, uint256 _amount) public override(IVirtualTAL) onlyRole(DEFAULT_ADMIN_ROLE) {
        addressToTAL[_to] = addressToTAL[_to] + _amount;

        emit AdminMinted(_to, _amount);
    }

    /// Burns existing supply
    ///
    /// @notice Only accessible to the role ADMIN
    ///
    /// @param _from Owner of the TAL to burn
    /// @param _amount Amount to mint
    function adminBurn(address _from, uint256 _amount) public override(IVirtualTAL) onlyRole(DEFAULT_ADMIN_ROLE) {
        require(addressToTAL[_from] >= _amount, "not enough amount to burn");

        addressToTAL[_from] = addressToTAL[_from] - _amount;

        emit AdminBurned(_from, _amount);
    }

    function getBalance(address _owner) public view override(IVirtualTAL) returns (uint256) {
        return addressToTAL[_owner];
    }

    //
    // Begin: ERC165
    //

    /// @inheritdoc ERC165Upgradeable
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

    //
    // End: ERC165
    //
}
