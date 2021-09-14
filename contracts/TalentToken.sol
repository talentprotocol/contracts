// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import { ERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC165 } from "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import "hardhat/console.sol";

/// @title The base contract for Talent Tokens
contract TalentToken is ERC20, ERC165, AccessControl {
  /// minter role
  bytes32 public constant ROLE_MINTER_BURNER = keccak256("MINTER_BURNER");

  constructor(
    string memory _name,
    string memory _symbol,
    uint _initialSupply,
    address _talent,
    address _minter_burner
  ) ERC20(_name, _symbol) {
    _mint(_talent, _initialSupply);

    _setupRole(ROLE_MINTER_BURNER, _minter_burner);
  }

  /// @inheritdoc ERC165
  function supportsInterface(bytes4 interfaceId) public view override(ERC165, AccessControl) returns (bool) {
    return interfaceId == type(IERC20).interfaceId || super.supportsInterface(interfaceId);
  }

  /// Mints new supply
  ///
  /// @notice Only accessible to the role MINTER_BURNER
  ///
  /// @param _to Recipient of the new tokens
  /// @param _amount Amount to mint
  function mint(address _to, uint _amount) public onlyRole(ROLE_MINTER_BURNER) {
    _mint(_to, _amount);
  }

  /// Burns existing supply
  ///
  /// @notice Only accessible to the role MINTER_BURNER
  ///
  /// @param _from Owner of the tokens to burn
  /// @param _amount Amount to mint
  function burn(address _from, uint _amount) public onlyRole(ROLE_MINTER_BURNER) {
    _burn(_from, _amount);
  }
}
