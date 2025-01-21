// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";


interface IInhabitantStorage {
    event StorageCapacityUpdated(uint256 indexed tokenId, uint256 newCapacity);

    function nftCollection721() external view returns (IERC721);
    function nftCollection1155() external view returns (IERC1155);
    function nftCollectionAddress() external view returns (address);
    function isNft721() external view returns (bool);
    function requiredStorage() external view returns (bool);
    function requiredStorageContract() external view returns (address);
    function storageCapacities(uint256 tokenId) external view returns (uint256);
    function primaryToStorage(address primaryCollection, uint256 primaryTokenId) external view returns (uint256);
    function getPrimaryTokensForStorage(uint256 storageTokenId) external view returns (uint256[] memory);
    function isStorageAssignedToPrimary(address primaryCollection, uint256 primaryTokenId) external view returns (bool);
    function assignStorageToPrimary(address primaryCollection, uint256 primaryTokenId, uint256 storageTokenId) external;
    function unassignStorageFromPrimary(address primaryCollection, uint256 primaryTokenId) external;
    function getAssignedStorage(address primaryCollection, uint256 primaryTokenId) external view returns (uint256);
    function getTotalResourcesInStorage(uint256 tokenId) external view returns (uint256);
    function getResourceBalance(uint256 tokenId, string memory resource) external view returns (uint256);
    function getAllResourceBalances(uint256 tokenId) external view returns (string[] memory, uint256[] memory);
    function getStorageCapacity(uint256 tokenId) external view returns (uint256);
    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external;
    function migrateStorageAssignmentsBatch(
        address nftCollection,
        uint256[] memory primaryTokenIds,
        uint256[] memory storageTokenIds
    ) external;
    
}