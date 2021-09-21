// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import {IAccessControl, AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

import {TalentToken} from "./TalentToken.sol";

interface ITalentFactory {
    /// Returns true is a given address corresponds to the creator of a Talent Token
    ///
    /// @param addr address of the Talent to find
    function isTalent(address addr) external view returns (bool);

    /// Returns true is a given address corresponds to a registered Talent Token
    ///
    /// @param addr address of the Token to find
    function isTalentToken(address addr) external view returns (bool);
}

contract TalentFactory is ERC165, AccessControl, ITalentFactory {
    /// creator role
    bytes32 public constant ROLE_MINTER = keccak256("MINTER");

    /// initial supply of each new token minted
    uint256 public constant INITIAL_SUPPLY = 1000 ether;

    // maps each talent's address to their talent token
    mapping(address => address) public talentsToTokens;
    mapping(address => address) public tokensToTalents;

    // minter for new tokens
    address public minter;

    // implementation template to clone
    address public immutable implementation;

    event TalentCreated(address indexed talent, address indexed token);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        implementation = address(new TalentToken());
    }

    function setMinter(address _minter) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minter == address(0x0), "minter already set");

        minter = _minter;
        _setupRole(ROLE_MINTER, _minter);
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
        require(!isTalent(_talent), "address already has a token");
        require(_isMinterSet(), "minter not yet set");

        address token = Clones.clone(implementation);
        TalentToken(token).initialize(_name, _symbol, INITIAL_SUPPLY, _talent, minter);

        talentsToTokens[_talent] = token;
        tokensToTalents[token] = _talent;

        emit TalentCreated(_talent, token);

        return token;
    }

    //
    // Begin: ERC165
    //

    /// @inheritdoc ERC165
    function supportsInterface(bytes4 interfaceId) public view override(ERC165, AccessControl) returns (bool) {
        return AccessControl.supportsInterface(interfaceId);
    }

    //
    // End: ERC165
    //

    //
    // Begin: ITalentFactory
    //

    function isTalent(address addr) public view override(ITalentFactory) returns (bool) {
        return talentsToTokens[addr] != address(0x0);
    }

    function isTalentToken(address addr) public view override(ITalentFactory) returns (bool) {
        return tokensToTalents[addr] != address(0x0);
    }

    //
    // End: ITalentFactory
    //

    function _isMinterSet() private view returns (bool) {
        return minter != address(0x0);
    }
}
