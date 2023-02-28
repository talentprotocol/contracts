// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract CommunityMember is ERC721Enumerable, AccessControl {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    string private _baseURIExtended;
    mapping(uint256 => string) _tokenURIs;

    constructor(address _owner, string memory _ticker) ERC721("Talent Protocol Community Member", _ticker) {
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
    }

    // Airdrop tokens to addresses
    function airdrop(address[] memory addresses) public onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < addresses.length; i++) {
            require(addresses[i] != address(0), "Can't add the null address");

            _tokenIds.increment();
            uint256 id = _tokenIds.current();

            _safeMint(addresses[i], id);
        }
    }

    function mint(address _to) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _tokenIds.increment();
        uint256 id = _tokenIds.current();

        _safeMint(_to, id);
    }

    function burn(uint256 _id) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _burn(_id);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIExtended;
    }

    function setBaseURI(string memory baseURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseURIExtended = baseURI_;
    }

    function setTokenURI(uint256 tokenId, string memory tokenURI_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        _tokenURIs[tokenId] = tokenURI_;
    }

    function addOwner(address _newOwner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(DEFAULT_ADMIN_ROLE, _newOwner);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory baseURI = _baseURI();

        require(bytes(baseURI).length != 0, "Base URI not set");

        string memory uri = _tokenURIs[tokenId];

        if (bytes(uri).length != 0) {
            return uri;
        } else {
            return baseURI;
        }
    }

    // Disable transfering this NFT
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public pure override(ERC721, IERC721) {
        require(false, "Community member NFT is non-transferable");
    }

    // Disable transfering this NFT
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) {
        require(false, "Community member NFT is non-transferable");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual {
        super._beforeTokenTransfer(from, to, tokenId, 1);
    }
}
