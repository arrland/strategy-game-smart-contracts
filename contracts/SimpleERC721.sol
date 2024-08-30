// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract SimpleERC721 is ERC721, Ownable, ERC721Enumerable {
    using Strings for uint256;

    uint256 private _tokenIds;
    string private _baseTokenURI;

    constructor(string memory name, string memory symbol, string memory baseTokenURI, address initialOwner) ERC721(name, symbol) Ownable(initialOwner) {
        _baseTokenURI = baseTokenURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function mint(address to) public onlyOwner {
        _tokenIds++;
        _safeMint(to, _tokenIds);
    }

    function setBaseURI(string memory baseTokenURI) public onlyOwner {
        _baseTokenURI = baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {        
        return string(abi.encodePacked(_baseURI(), tokenId.toString()));
    }

    function getTokenIdsByOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokenIds;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function totalSupply() public view override returns (uint256) {
        return super.totalSupply();
    }

    function tokenByIndex(uint256 index) public view override returns (uint256) {
        return super.tokenByIndex(index);
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) public view override returns (uint256) {
        return super.tokenOfOwnerByIndex(owner, index);
    }
    function _update(address to, uint256 tokenId, address auth) internal virtual override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }
    function _increaseBalance(address account, uint128 value) internal virtual override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}