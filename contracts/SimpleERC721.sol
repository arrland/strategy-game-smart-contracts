// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SimpleERC721 is ERC721, Ownable {
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
}