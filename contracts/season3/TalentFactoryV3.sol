// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

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

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {TalentTokenV3, ITalentTokenV3} from "./TalentTokenV3.sol";

interface ITalentFactoryV3 {
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

    /// Returns true is a given address has a registered Talent Token
    ///
    /// @param addr address of the talent
    /// @return true if the address has a talent token
    function hasTalentToken(address addr) external view returns (bool);

    /// @param _oldTalent address of the old talent
    /// @param _newTalent address of the new talent
    function setNewMappingValues(address _oldTalent, address _newTalent) external;

    function tokensInitialSupply(address _token) external view returns (uint256);
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
contract TalentFactoryV3 is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlEnumerableUpgradeable,
    ITalentFactoryV3
{
    /// creator role
    bytes32 public constant ROLE_MINTER = keccak256("MINTER");

    /// role to add address to whitelist
    bytes32 public constant WHITELISTER_ROLE = keccak256("WHITELISTER");

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

    /// maps address to a bool that says if address is whitelisted to create talent token
    mapping(address => bool) public whitelist;

    /// maps talent's address to their initial supply
    mapping(address => uint256) public tokensInitialSupply;

    event TalentCreated(address indexed talent, address indexed token);

    function initialize() public virtual initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControlEnumerable_init_unchained();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        UpgradeableBeacon _beacon = new UpgradeableBeacon(address(new TalentTokenV3()));
        _beacon.transferOwnership(msg.sender);
        implementationBeacon = address(_beacon);
    }

    function setMinter(address _minter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minter == address(0x0), "minter already set");

        minter = _minter;
        _grantRole(ROLE_MINTER, _minter);
    }

    function setWhitelister(address _whitelister) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(WHITELISTER_ROLE, _whitelister);
    }

    function revokeWhitelister(address _whitelister) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(WHITELISTER_ROLE, _whitelister);
    }

    /// Creates a new talent token
    ///
    /// @param _talent The talent's address
    /// @param _name The new token's name
    /// @param _symbol The new token's symbol
    function createTalent(address _talent, string memory _name, string memory _symbol) public returns (address) {
        require(whitelist[_talent], "address needs to be whitelisted");
        require(msg.sender == minter || msg.sender == _talent, "talent must be minter or owner");
        require(talentsToTokens[_talent] == address(0x0), "talent already has talent token");
        require(!isSymbol(_symbol), "symbol already exists");
        require(_isMinterSet(), "minter not yet set");

        whitelist[_talent] = false;

        BeaconProxy proxy = new BeaconProxy(
            implementationBeacon,
            abi.encodeWithSelector(
                TalentTokenV3(address(0x0)).initialize.selector,
                _name,
                _symbol,
                INITIAL_SUPPLY,
                _talent,
                minter,
                getRoleMember(DEFAULT_ADMIN_ROLE, 0)
            )
        );

        address token = address(proxy);

        symbolsToTokens[_symbol] = token;
        tokensToTalents[token] = _talent;
        talentsToTokens[_talent] = token;
        tokensInitialSupply[token] = INITIAL_SUPPLY;

        emit TalentCreated(_talent, token);

        return token;
    }

    /// Whitelists an address
    ///
    /// @param _address The address to whitelist
    function whitelistAddress(address _address) public onlyRole(WHITELISTER_ROLE) {
        whitelist[_address] = true;
    }

    //
    // Begin: ITalentFactoryV3
    //

    function isTalentToken(address addr) public view override(ITalentFactoryV3) returns (bool) {
        return tokensToTalents[addr] != address(0x0);
    }

    function isSymbol(string memory _symbol) public view override(ITalentFactoryV3) returns (bool) {
        return symbolsToTokens[_symbol] != address(0x0);
    }

    //
    // End: ITalentFactoryV3
    //

    function hasTalentToken(address addr) public view override(ITalentFactoryV3) returns (bool) {
        return talentsToTokens[addr] != address(0x0);
    }

    function setNewMappingValues(address _oldTalent, address _newTalent) external override(ITalentFactoryV3) {
        address token = talentsToTokens[_oldTalent];

        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            require(msg.sender == token, "not called by talent token");
            require(tx.origin == _newTalent);
            require(tx.origin == ITalentTokenV3(token).proposedTalent());
        }

        tokensToTalents[token] = _newTalent;
        talentsToTokens[_oldTalent] = address(0);
        talentsToTokens[_newTalent] = token;
    }

    function version() public pure virtual returns (uint256) {
        return 3;
    }

    function _isMinterSet() private view returns (bool) {
        return minter != address(0x0);
    }

    //
    // Begin: ERC165
    //

    /// @inheritdoc ERC165Upgradeable
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC165Upgradeable, AccessControlEnumerableUpgradeable) returns (bool) {
        return AccessControlEnumerableUpgradeable.supportsInterface(interfaceId);
    }

    //
    // End: ERC165
    //

    /// https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps
    uint256[48] __gap;
}
