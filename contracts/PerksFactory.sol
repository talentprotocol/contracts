// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {IAccessControlEnumerableUpgradeable, AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {Perk} from "./Perk.sol";

interface IPerksFactory {
    /// Returns true is a given address corresponds to a registered Perk
    ///
    /// @param addr address of the perk to find
    /// @return true if the address corresponds to a perk
    function isPerk(address addr) external view returns (bool);
}

/// @title Factory in charge of deploying Perk contracts
///
/// @notice This contract relies on ERC1167 proxies to cheaply deploy perks
///
/// @notice beacon:
///   Perks are implemented with BeaconProxies, allowing an update of
///   the underlying beacon, to target all existing perks.
contract PerksFactory is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlEnumerableUpgradeable,
    IPerksFactory
{
    /// maps each perk address to their talent
    mapping(address => address) public perksToTalents;

    /// implementation template to clone
    address public implementationBeacon;

    event PerkCreated(address indexed talent, address indexed token);

    function initialize() public virtual initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControlEnumerable_init_unchained();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new Perk()));
        _beacon.transferOwnership(msg.sender);
        implementationBeacon = address(_beacon);
    }

    /// Creates a new perk ERC721
    ///
    /// @param _talent The talent's address
    /// @param _name The new token's name
    /// @param _symbol The new token's symbol
    function createPerk(
        address _talent,
        string memory _name,
        string memory _symbol,
        uint256 _max_supply,
        uint256 _cost,
        bool _usable
    ) public returns (address) {
        BeaconProxy proxy = new BeaconProxy(
            implementationBeacon,
            abi.encodeWithSelector(
                Perk(address(0x0)).initialize.selector,
                _name,
                _symbol,
                _max_supply,
                _usable,
                _talent,
                _cost,
                getRoleMember(DEFAULT_ADMIN_ROLE, 0)
            )
        );

        address perk = address(proxy);
        perksToTalents[perk] = _talent;

        emit PerkCreated(_talent, perk);

        return perk;
    }

    //
    // Begin: ERC165
    //

    /// @inheritdoc ERC165Upgradeable
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC165Upgradeable, AccessControlEnumerableUpgradeable)
        returns (bool)
    {
        return AccessControlEnumerableUpgradeable.supportsInterface(interfaceId);
    }

    //
    // End: ERC165
    //

    //
    // Begin: IPerk
    //

    function isPerk(address addr) public view override(IPerksFactory) returns (bool) {
        return perksToTalents[addr] != address(0x0);
    }

    //
    // End: IPerk
    //
}
