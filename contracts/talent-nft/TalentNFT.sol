pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "./model/Tiers.sol";

contract TalentNFT is ERC721, ERC721Enumerable, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    string private _baseURIExtended;
    mapping (uint256 => string) _tokenURIs;
    mapping(string => uint256) _NFTCombinationToToken;
    bool private _publicStageFlag = false;
    mapping(address => TIERS) _whitelist;
    mapping(string => TIERS) private _codeWhitelist;

    constructor(address _owner, string memory _ticker) ERC721("Talent Protocol NFT Collection", _ticker) {
      _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    }
    /**
        public stage status setter
        set's _publicStageFlag
     */
    function setPublicStageFlag(bool newFlagValue) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFlagValue != _publicStageFlag, 
            "Unable to change _publicStageFlag value because the new value is the same as the current one");
        _publicStageFlag = newFlagValue;
    }

    /**
        public stage status getter
        returns _publicStageFlag from contract state
     */
    function getPublicStageFlag() public view returns (bool) {
        return _publicStageFlag;
    }

    /**
        allows to check the account tier

        returns associated TIER with the account if the account is whitelisted
            OR TIERS.PUBLIC_STAGE if public stage is active
            OR TIERS.UNDEFINED if the account is not whitelisted
     */
    function checkAccountOrCodeTier(address account, string memory code) public view returns (TIERS) {
        if (_publicStageFlag) {
            return TIERS.PUBLIC_STAGE;
        }
        if (bytes(code).length > 0) {
            if (_codeWhitelist[code] == TIERS.UNDEFINED) {
                return TIERS.UNDEFINED;
            } else {
                return _codeWhitelist[code];
            }
        }
        if (_whitelist[account] == TIERS.UNDEFINED) {
            return TIERS.UNDEFINED;
        }
        return _whitelist[account];
    }

    /**
        this function whitelists an address
        requires - DEFAULT_ADMIN_ROLE

        returns associated TIER with the account if the account is whitelisted
            OR TIERS.PUBLIC_STAGE if public stage is active
            OR TIERS.UNDEFINED if the account is not whitelisted
     */
    function whitelistAddress(address _to, TIERS tier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tier > TIERS.PUBLIC_STAGE, "The tier given needs to be greater than TIERS.PUBLIC_STAGE");
        _whitelist[_to] = tier;
    }

    /**
        this function whitelists a code
        requires - DEFAULT_ADMIN_ROLE

        returns associated TIER with the code if the code is valid
            OR TIERS.PUBLIC_STAGE if public stage is active
            OR TIERS.UNDEFINED if the code is not whitelisted
     */
    function whitelistCode(string memory code, TIERS tier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tier > TIERS.PUBLIC_STAGE, "The tier given needs to be greater than TIERS.PUBLIC_STAGE");
        _codeWhitelist[code] = tier;
    }

    /**
        isWhitelisted should only be called if the getPublicStageFlag is false
        This means the public can't freely mint Talent NFT's

        returns bool according to the whitlist value of the account
     */
    function isWhitelisted(address account, string memory code) public view returns (bool) {
        return checkAccountOrCodeTier(account, code) > TIERS.UNDEFINED || _publicStageFlag;
    }

    function isCombinationAvailable(string memory combination) public view returns (bool) {
        return _NFTCombinationToToken[combination] == 0;
    }

    function mint(string memory code) public {
        require(isWhitelisted(msg.sender, code), "Minting not allowed with current sender roles");
        require(balanceOf(msg.sender) == 0, "Address has already minted one Talent NFT");

        if(bytes(code).length > 0 && _codeWhitelist[code] != TIERS.UNDEFINED) {
            delete _codeWhitelist[code];
        }

        _tokenIds.increment();
        uint256 id = _tokenIds.current();
        _safeMint(msg.sender, id);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        string memory base = _baseURI();
        require(bytes(base).length != 0, "Base URI not set");
        string memory uri = _tokenURIs[tokenId];

        if (bytes(uri).length != 0) {
          return uri;
        } else {
          return base;
        }
    }

    // Clear a token URI so that a user can change their NFT
    function clearTokenURI(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        delete _tokenURIs[tokenId];
    }

    function setTokenURI(
        uint256 tokenId,
        string memory tokenMetadataURI,
        string memory combination,
        address owner,
        uint256 selectedSkin
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(selectedSkin <= 5 + uint256(_whitelist[owner]) - uint256(TIERS.USER), 
            "Selected skin is locked for the account tier");
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        require(bytes(_tokenURIs[tokenId]).length == 0, "Metadata was already defined for this token");
        require(isCombinationAvailable(combination), "This combination was already minted");
        _NFTCombinationToToken[combination] = tokenId;
        _tokenURIs[tokenId] = tokenMetadataURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIExtended;
    }

    function setBaseURI(string memory baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURIExtended = baseURI_;
    }

    function addOwner(address _newOwner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setupRole(DEFAULT_ADMIN_ROLE, _newOwner);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
