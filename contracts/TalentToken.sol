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

import {ERC1363Upgradeable} from "./tokens/ERC1363Upgradeable.sol";

interface ITalentToken is IERC20Upgradeable {
    function mint(address _owner, uint256 _amount) external;

    function burn(address _owner, uint256 _amount) external;

    function mintingFinishedAt() external returns (uint256);

    function mintingAvailability() external returns (uint256);
}

/// @title The base contract for Talent Tokens
///
/// @notice a standard ERC20 contract, upgraded with ERC1363 functionality, and
/// upgradeability and AccessControl functions from OpenZeppelin
///
/// @notice Minting:
///   A TalentToken has a fixed MAX_SUPPLY, after which no more minting can occur
///   Minting & burning is only allowed by a specific role, assigned on initialization
///
/// @notice Burning:
///   If tokens are burnt before MAX_SUPPLY is ever reached, they are added
///   back into the `mintingAvailability` pool /   If MAX_SUPPLY has already been
///   reached at some point, then future burns can no longer be minted back,
///   effectively making the burn permanent
contract TalentToken is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlUpgradeable,
    ERC1363Upgradeable,
    ITalentToken
{
    /// minter role
    bytes32 public constant ROLE_MINTER_BURNER = keccak256("MINTER_BURNER");

    uint256 public constant MAX_SUPPLY = 100000 ether;

    // amount available to be minted
    uint256 public override(ITalentToken) mintingAvailability;

    // timestamp at which minting reached MAX_SUPPLY
    uint256 public override(ITalentToken) mintingFinishedAt;

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _talent,
        address _minter_burner
    ) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC20_init_unchained(_name, _symbol);
        __AccessControl_init_unchained();

        _setupRole(ROLE_MINTER_BURNER, _minter_burner);
        _mint(_talent, _initialSupply);
        mintingAvailability = MAX_SUPPLY - _initialSupply;
    }

    /// Mints new supply
    ///
    /// @notice Only accessible to the role MINTER_BURNER
    ///
    /// @param _to Recipient of the new tokens
    /// @param _amount Amount to mint
    function mint(address _to, uint256 _amount) public override(ITalentToken) onlyRole(ROLE_MINTER_BURNER) {
        require(mintingAvailability >= _amount);
        mintingAvailability -= _amount;

        if (mintingAvailability == 0) {
            mintingFinishedAt = block.timestamp;
        }

        _mint(_to, _amount);
    }

    /// Burns existing supply
    ///
    /// @notice Only accessible to the role MINTER_BURNER
    ///
    /// @param _from Owner of the tokens to burn
    /// @param _amount Amount to mint
    function burn(address _from, uint256 _amount) public override(ITalentToken) onlyRole(ROLE_MINTER_BURNER) {
        // if we have already reached MAX_SUPPLY, we don't ever want to allow
        // minting, even if a burn has occured afterwards
        if (mintingAvailability > 0) {
            mintingAvailability += _amount;
        }

        _burn(_from, _amount);
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
