// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";


contract InhabitantNFT is ERC721, ERC721Burnable, ERC721Enumerable, AccessControl, ERC2981 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string private _currentBaseURI;    

    constructor(address defaultAdmin, address _minter, address _royaltyRecipient) ERC721("Inhabitants of Arrland", "Inhabitants") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, _minter);
        _currentBaseURI = "https://arrland-media.s3-eu-central-1.amazonaws.com/meta/inhabitants/";
        _setDefaultRoyalty(_royaltyRecipient, 500);
    }

    function _baseURI() internal view override returns (string memory) {
        return _currentBaseURI;
    }

    function getBaseURI() public view returns (string memory) {
        return _baseURI();
    }

    function setBaseURI(string memory newBaseURI) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _currentBaseURI = newBaseURI;
    }

    function contractURI() public view returns (string memory) {
        return string.concat(_baseURI(), "contract.json");
    }

    function safeMint(address to, uint256 tokenId) public onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);        
    }

    function batchMint(address[] memory to, uint256[] memory tokenIds) public onlyRole(MINTER_ROLE) {
        require(to.length == tokenIds.length, "IslandNft: addresses and token IDs count mismatch");
        require(to.length > 0, "IslandNft: no addresses provided");

        for (uint256 i = 0; i < to.length; i++) {
            require(to[i] != address(0), "IslandNft: mint to the zero address");
            require(tokenIds[i] != 0, "IslandNft: token ID is zero");
            _safeMint(to[i], tokenIds[i]);
        }
    }

    function setDefaultRoyalty(address recipient, uint96 feeNumerator) public onlyRole(DEFAULT_ADMIN_ROLE) {        
        _setDefaultRoyalty(recipient, feeNumerator);
    }

    function setTokenRoyalty(uint256 tokenId, address recipient, uint96 feeNumerator) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokenRoyalty(tokenId, recipient, feeNumerator);
    }

    function setTokenRoyalties(uint256[] calldata tokenIds, address recipient, uint96 feeNumerator) public onlyRole(DEFAULT_ADMIN_ROLE) {        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _setTokenRoyalty(tokenIds[i], recipient, feeNumerator);
        }
    }

    function getAllMintedTokenIds() public view returns (uint256[] memory) {
        uint256 total = totalSupply();
        uint256[] memory tokenIds = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            tokenIds[i] = tokenByIndex(i);
        }
        return tokenIds;
    }

    function getTokenIdsByOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokenIds;
    }

    function getAllOwners() public view returns (address[] memory) {
        uint256 total = totalSupply();
        address[] memory tempOwners = new address[](total);
        uint256 uniqueCount = 0;

        for (uint256 i = 0; i < total; i++) {
            uint256 tokenId = tokenByIndex(i);
            address owner = ownerOf(tokenId);
            bool isUnique = true;

            // Check if the owner is already in the list
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (tempOwners[j] == owner) {
                    isUnique = false;
                    break;
                }
            }

            // If the owner is unique, add to the list
            if (isUnique) {
                tempOwners[uniqueCount] = owner;
                uniqueCount++;
            }
        }

        // Create a fixed-size array for unique owners
        address[] memory uniqueOwners = new address[](uniqueCount);
        for (uint256 i = 0; i < uniqueCount; i++) {
            uniqueOwners[i] = tempOwners[i];
        }

        return uniqueOwners;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl, ERC2981)
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