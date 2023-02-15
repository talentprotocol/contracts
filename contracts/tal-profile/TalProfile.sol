pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract TalentProfile is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(address => string) _whitelistedHandles;

    constructor(address _owner, string memory _ticker) ERC721("Talent Protocol Profile", _ticker) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    /**
        this function whitelists an address to mint a specific handle
     */
    function whitelistHandle(address account, string memory handle) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _whitelistedHandles[account] = handle;
    }

    /**
        isWhitelisted should only be called if the getPublicStageFlag is false
        This means the public can't freely mint Talent NFT's

        returns bool according to the whitlist value of the account
     */
    function isWhitelisted(address account) public view returns (bool) {
        return bytes(_whitelistedHandles[account]).length > 0;
    }

    function mint(string memory uri) public {
        require(isWhitelisted(msg.sender), "Sender not whitelisted");
        require(balanceOf(msg.sender) == 0, "Address has already minted one Profile NFT");

        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
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

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
}
