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

import {ERC1363Upgradeable} from "./tokens/ERC1363Upgradeable.sol";

interface ITalentToken is IERC20Upgradeable {
    // mints new talent tokens
    function mint(address _owner, uint256 _amount) external;

    // burns existing talent tokens
    function burn(address _owner, uint256 _amount) external;

    // talent's wallet
    function talent() external view returns (address);

    // timestamp at which MAX_SUPPLY was reached (or 0 if never reached)
    function mintingFinishedAt() external view returns (uint256);

    // how much is available to be minted
    function mintingAvailability() external view returns (uint256);
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
    UUPSUpgradeable,
    ITalentToken
{
    /// Talent role
    bytes32 public constant ROLE_TALENT = keccak256("TALENT");

    /// Minter role
    bytes32 public constant ROLE_MINTER = keccak256("MINTER");

    uint256 public constant MAX_SUPPLY = 1000000 ether;

    // amount available to be minted
    uint256 public override(ITalentToken) mintingAvailability;

    // timestamp at which minting reached MAX_SUPPLY
    uint256 public override(ITalentToken) mintingFinishedAt;

    // talent's wallet
    address public override(ITalentToken) talent;

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _talent,
        address _minter,
        address _admin
    ) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC20_init_unchained(_name, _symbol);
        __AccessControl_init_unchained();

        talent = _talent;

        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(ROLE_TALENT, _talent);
        _setupRole(ROLE_MINTER, _minter);

        _setRoleAdmin(ROLE_TALENT, ROLE_TALENT);

        _mint(_talent, _initialSupply);
        mintingAvailability = MAX_SUPPLY - _initialSupply;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override(UUPSUpgradeable)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    /// Mints new supply
    ///
    /// @notice Only accessible to the role MINTER
    ///
    /// @param _to Recipient of the new tokens
    /// @param _amount Amount to mint
    function mint(address _to, uint256 _amount) public override(ITalentToken) onlyRole(ROLE_MINTER) {
        require(mintingAvailability >= _amount, "_amount exceeds minting availability");
        mintingAvailability -= _amount;

        if (mintingAvailability == 0) {
            mintingFinishedAt = block.timestamp;
        }

        _mint(_to, _amount);
    }

    /// Burns existing supply
    ///
    /// @notice Only accessible to the role MINTER
    ///
    /// @param _from Owner of the tokens to burn
    /// @param _amount Amount to mint
    function burn(address _from, uint256 _amount) public override(ITalentToken) onlyRole(ROLE_MINTER) {
        // if we have already reached MAX_SUPPLY, we don't ever want to allow
        // minting, even if a burn has occured afterwards
        if (mintingAvailability > 0) {
            mintingAvailability += _amount;
        }

        _burn(_from, _amount);
    }

    /// Changes the talent's wallet
    ///
    /// @notice Callable by the talent to chance his own ownership address
    ///
    /// @notice onlyRole() is not needed here, since the equivalent check is
    /// already done by `grantRole`, which only allows the role's admin, which
    /// is the TALENT role itself, to grant the role.
    ///
    /// @param _newTalent address for the new talent's wallet
    function transferTalentWallet(address _newTalent) public {
        talent = _newTalent;
        grantRole(ROLE_TALENT, _newTalent);
        revokeRole(ROLE_TALENT, msg.sender);
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
