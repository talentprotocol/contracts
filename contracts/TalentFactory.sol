// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {
    IAccessControlEnumerableUpgradeable,
    AccessControlEnumerableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";

import {TalentToken} from "./TalentToken.sol";

interface ITalentFactory {
    /// Returns true is a given address corresponds to a registered Talent Token
    ///
    /// @param addr address of the token to find
    /// @return true if the address corresponds to a talent token
    function isTalentToken(address addr) external view returns (bool);

    /// Returns true is a given symbol corresponds to a registered Talent Token
    ///
    /// @param symbol Symbol of the token to find
    /// @return true if the symbol corresponds to an existing talent token
    function isSymbol(string memory symbol) external view returns (bool);
}

/// @title Factory in charge of deploying Talent Token contracts
///
/// @notice This contract relies on ERC1167 proxies to cheaply deploy talent tokens
///
/// @notice Roles:
///   A minter role defines who is allowed to deploy talent tokens. Deploying
///   a talent token grants you the right to mint that talent token, meaning the
///   same deployer will be granted that role
///
/// @notice beacon:
///   TalentTokens are implemented with BeaconProxies, allowing an update of
///   the underlying beacon, to target all existing talent tokens.
contract TalentFactory is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlEnumerableUpgradeable,
    ITalentFactory
{
    /// creator role
    bytes32 public constant ROLE_MINTER = keccak256("MINTER");

    /// initial supply of each new token minted
    uint256 public constant INITIAL_SUPPLY = 2000 ether;

    /// maps each talent's address to their talent token
    mapping(address => address) public talentsToTokens;

    /// maps each talent tokens' address to their talent
    mapping(address => address) public tokensToTalents;

    /// maps each token's symbol to the token address
    mapping(string => address) public symbolsToTokens;

    /// minter for new tokens
    address public minter;

    /// implementation template to clone
    address public implementationBeacon;

    event TalentCreated(address indexed talent, address indexed token);

    function initialize() public virtual initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControlEnumerable_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new TalentToken()));
        _beacon.transferOwnership(msg.sender);
        implementationBeacon = address(_beacon);
    }

    function setMinter(address _minter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minter == address(0x0), "minter already set");

        minter = _minter;
        _grantRole(ROLE_MINTER, _minter);
    }

    /// Creates a new talent token
    ///
    /// @param _talent The talent's address
    /// @param _name The new token's name
    /// @param _symbol The new token's symbol
    function createTalent(
        address _talent,
        string memory _name,
        string memory _symbol
    ) public returns (address) {
        require(!isSymbol(_symbol), "symbol already exists");
        require(_isMinterSet(), "minter not yet set");

        BeaconProxy proxy = new BeaconProxy(
            implementationBeacon,
            abi.encodeWithSelector(
                TalentToken(address(0x0)).initialize.selector,
                _name,
                _symbol,
                INITIAL_SUPPLY,
                _talent,
                minter,
                getRoleMember(DEFAULT_ADMIN_ROLE, 0)
            )
        );
        // address token = ClonesUpgradeable.clone(implementation);
        // TalentToken(token).initialize(
        //     _name,
        //     _symbol,
        //     INITIAL_SUPPLY,
        //     _talent,
        //     minter,
        //     getRoleMember(DEFAULT_ADMIN_ROLE, 0)
        // );

        address token = address(proxy);

        symbolsToTokens[_symbol] = token;
        tokensToTalents[token] = _talent;
        /// Added for V2
        talentsToTokens[_talent] = token;

        emit TalentCreated(_talent, token);

        return token;
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
    // Begin: ITalentFactory
    //

    function isTalentToken(address addr) public view override(ITalentFactory) returns (bool) {
        return tokensToTalents[addr] != address(0x0);
    }

    function isSymbol(string memory _symbol) public view override(ITalentFactory) returns (bool) {
        return symbolsToTokens[_symbol] != address(0x0);
    }

    //
    // End: ITalentFactory
    //

    function _isMinterSet() private view returns (bool) {
        return minter != address(0x0);
    }
}
