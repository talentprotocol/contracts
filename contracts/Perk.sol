// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC165Upgradeable.sol";

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC721EnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import {ERC165Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {UUPSUpgradeable} from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import {ITalentToken} from "./TalentToken.sol";

import "@openzeppelin/contracts/utils/Counters.sol";

interface IPerk is IERC721Upgradeable {}

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
contract Perk is
    Initializable,
    ContextUpgradeable,
    ERC165Upgradeable,
    AccessControlUpgradeable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    UUPSUpgradeable,
    IPerk
{
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    /// Talent role
    bytes32 public constant ROLE_TALENT = keccak256("TALENT");

    string private _baseURIExtended;

    // maximum number of token ids this perk can have
    uint256 public maxSupply;

    // talent's wallet
    address public talent;

    // talent token's address
    address public talentToken;

    // amount of talent tokens required to mint the perk
    uint256 public cost;

    // the default lock in period is 30 days 30*24*60*60
    uint256 public constant DEFAULT_LOCK_IN_PERIOD = 2592000;

    // lock in period of talent tokens
    uint256 public lockInPeriod;

    // should the token hold a used state
    bool public usable;

    // holds the date that each token was minted
    mapping(uint256 => uint256) mintDates;

    // holds the date that each token id locked amount was claimed
    mapping(uint256 => uint256) claimDates;

    // holds if the token id has been used;
    mapping(uint256 => bool) usedTokens;

    // emitted whenever a Perk is used
    event PerkUsed(uint256 id);

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _max_supply,
        bool _usable,
        address _talent,
        uint256 _cost,
        address _admin
    ) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC721_init_unchained(_name, _symbol);
        __AccessControl_init_unchained();

        talent = _talent;

        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(ROLE_TALENT, _talent);
        _setRoleAdmin(ROLE_TALENT, ROLE_TALENT);

        maxSupply = _max_supply;
        cost = _cost;
        lockInPeriod = DEFAULT_LOCK_IN_PERIOD;
        usable = _usable;
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override(UUPSUpgradeable)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    function changeLockInPeriod(uint256 _period) public onlyRole(DEFAULT_ADMIN_ROLE) {
      lockInPeriod = _period;
    }

    function setTokenUsedState(uint256 _id, bool _used) public onlyRole(DEFAULT_ADMIN_ROLE) {
      usedTokens[_id] = _used;

      if (_used && claimDates[_id] != 0x0) {
        ITalentToken(talentToken).transferFrom(address(this), msg.sender, cost);
        claimDates[_id] = block.timestamp;
      }

      emit PerkUsed(_id);
    }

    function setTokenUsed(uint256 _id) public onlyRole(ROLE_TALENT) {
      require(usedTokens[_id] == false, "token has already been used");

      usedTokens[_id] = true;

      if (claimDates[_id] != 0x0) {
        ITalentToken(talentToken).transferFrom(address(this), msg.sender, cost);
        claimDates[_id] = block.timestamp;
      }

      emit PerkUsed(_id);
    }

    function isTokenUsed(uint256 _id) public view returns (bool) {
        return usedTokens[_id];
    }

    function setTalentToken(address _token) public onlyRole(DEFAULT_ADMIN_ROLE) {
        talentToken = _token;
    }

    function mint(address _to) public {
        require(talentToken != address(0x0), "Talent token must be set");
        require(balanceOf(msg.sender) == 0, "sender already owns one of these perks");

        _tokenIds.increment();
        uint256 id = _tokenIds.current();

        require(id < maxSupply, "no more token ids are available to be claimed");
        require(ITalentToken(talentToken).balanceOf(msg.sender) >= cost, "Not enough balance to mint token");

        ITalentToken(talentToken).transferFrom(msg.sender, address(this), cost);

        mintDates[id] = block.timestamp;

        _safeMint(_to, id);
    }

    function claimLockedTokens(address _owner, uint256 _id) public {
      require(ownerOf(_id) == _owner, "sender is not the owner of the token");
      require(mintDates[_id] > 0, "token has not been minted yet");
      require(block.timestamp > (mintDates[_id] + lockInPeriod), "The lock in period hasn't finished yet");
      require(claimDates[_id] == 0, "locked tockens have already been claimed on this token");

      claimDates[_id] = block.timestamp;
      ITalentToken(talentToken).approve(address(this), cost);
      ITalentToken(talentToken).transferFrom(address(this), _owner, cost);
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
    function transferOwnership(address _newTalent) public {
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
        override(ERC165Upgradeable, IERC165Upgradeable, AccessControlUpgradeable, ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return
            interfaceId == type(IERC721Upgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    //
    // End: ERC165
    //

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIExtended;
    }

    function setBaseURI(string memory baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURIExtended = baseURI_;
    }

    function addOwner(address _newOwner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setupRole(DEFAULT_ADMIN_ROLE, _newOwner);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory base = _baseURI();

        require(bytes(base).length != 0, "Base URI not set");

        return base;
    }
}
