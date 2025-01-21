// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";

interface IPirateStorage {
    function nftCollectionAddress() external view returns (address);
    function getPrimaryTokensForStorage(uint256 storageTokenId) external view returns (uint256[] memory);
    function isStorageAssignedToPrimary(address primaryCollection, uint256 primaryTokenId) external view returns (bool);
    function assignStorageToPrimary(address primaryCollection, uint256 primaryTokenId, uint256 storageTokenId) external;
    function unassignStorageFromPrimary(address primaryCollection, uint256 primaryTokenId) external;
    
    
    // Storage capacity functions
    function getStorageCapacity(uint256 tokenId) external view returns (uint256);
    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external;
    
    // Resource management functions
    function dumpResource(uint256 tokenId, address owner, string memory resource, uint256 amount) external;
    function addResource(uint256 tokenId, address user, string memory resource, uint256 amount) external;
    function transferResource(uint256 fromTokenId, address fromOwner, uint256 toTokenId, address toOwner, address toStorageContract, string memory resource, uint256 amount) external;
    function getTotalResourcesInStorage(uint256 tokenId) external view returns (uint256);
    function getResourceBalance(uint256 tokenId, string memory resource) external view returns (uint256);
    function getAllResourceBalances(uint256 tokenId) external view returns (string[] memory, uint256[] memory);
    
    // NFT collection getters
    function getNftCollection721() external view returns (IERC721);
    function getNftCollection1155() external view returns (IERC1155);

    function migrateStorageAssignmentsBatch(
        address nftCollection,
        uint256[] memory primaryTokenIds,
        uint256[] memory storageTokenIds
    ) external;
}
