// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

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

import {ITalentFactoryV3} from "./TalentFactoryV3.sol";

import {TalentToken} from "../TalentToken.sol";
import {TalentTokenV2} from "../test/TalentTokenV2.sol";

interface ITalentTokenV3 is IERC20Upgradeable {
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

    // proposed talent's wallet
    function proposedTalent() external view returns (address);

    // factory's address
    function factory() external view returns (address);
}

/// @title The base contract for Talent Tokens
///
/// @notice a standard ERC20 contract, upgraded with ERC1363 functionality, and
/// upgradeability and AccessControl functions from OpenZeppelin
///
/// @notice Minting:
///   A TalentTokenV3 has a fixed MAX_SUPPLY, after which no more minting can occur
///   Minting & burning is only allowed by a specific role, assigned on initialization
///
/// @notice Burning:
///   If tokens are burnt before MAX_SUPPLY is ever reached, they are added
///   back into the `mintingAvailability` pool /   If MAX_SUPPLY has already been
///   reached at some point, then future burns can no longer be minted back,
///   effectively making the burn permanent
contract TalentTokenV3 is TalentTokenV2 {
    // talent's proposed address to change ownership
    address public proposedTalent;

    // factory's address
    address public factory;

    event OwnershipTransferred(address talent, address proposedTalent);

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _talent,
        address _minter,
        address _admin
    ) public override(TalentToken) initializer {
        super.initialize(_name, _symbol, _initialSupply, _talent, _minter, _admin);

        factory = msg.sender;
    }

    /// Proposes a new wallet to change ownership
    ///
    /// @notice Callable by the talent to change their own proposed address
    ///
    /// @param _proposedTalent address for the new talent's wallet
    function proposeTalent(address _proposedTalent) external onlyRole(ROLE_TALENT) {
        require(msg.sender != _proposedTalent, "talent is already the owner");

        proposedTalent = _proposedTalent;
    }

    /// Claims talent ownership
    ///
    /// @notice Callable by the proposed talent to claim ownership
    function claimTalentOwnership() external {
        require(msg.sender == proposedTalent, "talent is not proposed owner");

        ITalentFactoryV3(factory).setNewMappingValues(talent, proposedTalent);

        _grantRole(ROLE_TALENT, proposedTalent);
        _revokeRole(ROLE_TALENT, talent);

        emit OwnershipTransferred(talent, proposedTalent);

        talent = proposedTalent;
        proposedTalent = address(0);
    }

    function setFactory(address _newFactory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        factory = _newFactory;
    }

    function version() public pure virtual override(TalentTokenV2) returns (uint256) {
        return 3;
    }
}
