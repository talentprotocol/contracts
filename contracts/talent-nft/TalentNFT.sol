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
    mapping(string => uint256) _tokenToNFTCombination;
    bool private _publicStageFlag = false;
    mapping(address => TIERS) _whitelist;

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
        isWhitelisted should only be called if the getPublicStageFlag is false
        This means the public can't freely mint Talent NFT's

        returns associated TIER with the account if the account is whitelisted
            OR TIERS.PUBLIC_STAGE if public stage is active
            OR TIERS.UNDEFINED if the account is not whitelisted
     */
    function checkAccountTier(address account) private view returns (TIERS) {
        if (_publicStageFlag) {
            return TIERS.PUBLIC_STAGE;
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

    function isWhitelisted(address account) public view returns (bool) {
        return checkAccountTier(account) > TIERS.UNDEFINED || _publicStageFlag;
    }

    function isCombinationaAvailable(string memory combination) public view returns (bool) {
        return _tokenToNFTCombination[combination] == 0;
    }

    function mint(string memory combination) public {
        require(isWhitelisted(msg.sender), "Minting not allowed with current sender roles");
        require(balanceOf(msg.sender) == 0, "Address has already minted one Talent NFT");
        if (_tokenToNFTCombination[combination] == 0) {
            _tokenIds.increment();
            _tokenToNFTCombination[combination] = _tokenIds.current();
            uint256 id = _tokenIds.current();
            _safeMint(msg.sender, id);
        } else {
            require(false, "This combination was already minted");
        }
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

    function setTokenURI(uint256 tokenId, string memory tokenURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        _tokenURIs[tokenId] = tokenURI_;
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

    // Disable transfering this NFT
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public pure override {
        require(false, "Talent NFT is non-transferable");
    }

    // Disable transfering this NFT
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public pure override {
        require(false, "Talent NFT is non-transferable");
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
