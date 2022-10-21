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
    bool private _publicStageFlag = false;

    constructor(address _owner, string memory _ticker) ERC721("Talent Protocol NFT Collection", _ticker) {
      _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    function assignRole(address _to, TIERS tier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(decodeFromTierEnum(tier), _to);
    }

    function hasWhitelistedRoles(address account) private returns (bool) {
        return hasRole("ASD", account) || hasRole("ASD2", account);
    }

    function mint(address _to) public {
        if (!hasWhitelistedRoles(_to)) {
            require(false, "Minting not allowed for account roles");
        }

        _tokenIds.increment();
        uint256 id = _tokenIds.current();
        _safeMint(msg.sender, id);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIExtended;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        string memory base = _baseURI();
        require(bytes(base).length != 0, "Base URI not set");
        return base;
    }

    function setBaseURI(string memory baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURIExtended = baseURI_;
    }

    function addOwner(address _newOwner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setupRole(DEFAULT_ADMIN_ROLE, _newOwner);
    }

    function getPublicStageFlag() public view returns (bool) {
        return _publicStageFlag;
    }

    function setPublicStageFlag(bool newFlagValue) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _publicStageFlag = newFlagValue;
    }

    // Disable transfering this NFT
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override {
        require(false, "Talent NFT is non-transferable");
    }

    // Disable transfering this NFT
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
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
