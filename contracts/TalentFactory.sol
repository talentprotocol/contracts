// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

import { TalentToken } from "./TalentToken.sol";

contract TalentFactory is ERC165, AccessControl {
  /// creator role
  bytes32 public constant ROLE_CREATOR = keccak256("CREATOR");

  /// initial supply of each new token minted
  uint constant public INITIAL_SUPPLY = 1000 ether;

  // maps each talent's address to their talent token
  mapping(address => address) talents;

  // minter for new tokens
  address public minter;

  event TalentCreated(
    address indexed talent,
    address indexed token
  );

  /// @param _minter The contract who will be eligible to mint talent tokens after initial creation
  constructor(address _minter) {
    minter = _minter;
    _setupRole(ROLE_CREATOR, _minter);
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
  ) public onlyRole(ROLE_CREATOR) returns (address) {
    require(talents[_talent] == address(0x0), "address already has a token");

    address token = address(new TalentToken(_name, _symbol, INITIAL_SUPPLY, _talent, minter));

    talents[_talent] = token;

    emit TalentCreated(_talent, token);

    return token;
  }

  /// @inheritdoc ERC165
  function supportsInterface(bytes4 interfaceId) public view override(ERC165, AccessControl) returns (bool) {
    return AccessControl.supportsInterface(interfaceId);
  }
}
