// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

interface IIslandNft is IERC721, IERC721Enumerable, IERC2981, IAccessControl {
    function MINTER_ROLE() external view returns (bytes32);
    
    function getBaseURI() external view returns (string memory);
    
    function setBaseURI(string memory newBaseURI) external;
    
    function safeMint(address to, uint256 tokenId) external;
    
    function batchMint(address[] memory to, uint256[] memory tokenIds) external;
    
    function setDefaultRoyalty(address recipient, uint96 feeNumerator) external;
    
    function setTokenRoyalty(uint256 tokenId, address recipient, uint96 feeNumerator) external;
    
    function setTokenRoyalties(uint256[] calldata tokenIds, address recipient, uint96 feeNumerator) external;
    
    function getAllMintedTokenIds() external view returns (uint256[] memory);
    
    function getTokenIdsByOwner(address owner) external view returns (uint256[] memory);
    
    function getAllOwners() external view returns (address[] memory);
}
