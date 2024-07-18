// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IStorageManagement {
    event StorageCapacityUpdated(address indexed contractAddress, uint256 indexed tokenId, uint256 newCapacity);
    event StorageContractAdded(address indexed collectionAddress, address indexed contractAddress);
    event StorageContractRemoved(address indexed contractAddress);

    function storageContracts(address collectionAddress) external view returns (address);
    function storageContractCount() external view returns (uint256);

    function addStorageContract(address collectionAddress, address contractAddress) external;
    function removeStorageContract(address collectionAddress) external;
    function getStorageCapacity(address collectionAddress, uint256 tokenId) external view returns (uint256);
    function getTotalResourcesInStorage(address collectionAddress, uint256 tokenId) external view returns (uint256);
    function checkStorageLimit(address collectionAddress, uint256 tokenId, uint256 amount) external view returns (bool);
    function updateStorageCapacity(address collectionAddress, uint256 tokenId, uint256 newCapacity) external;
    function isStorageEntity(address entity) external view returns (bool);
    function getStorageByCollection(address collectionAddress) external view returns (address);
    function getAllStorageContracts() external view returns (address[] memory collectionAddresses, address[] memory storageAddresses);
    function getResourceBalance(address collectionAddress, uint256 tokenId, string memory resource) external view returns (uint256);
    function getAllResourceBalances(address collectionAddress, uint256 tokenId) external view returns (string[] memory, uint256[] memory);
    function dumpResource(address collectionAddress, uint256 tokenId, string memory resource, uint256 amount) external;
    function getStorageDetails(address collectionAddress, uint256 tokenId) external view returns (uint256 totalResourcesInStorage, uint256 storageCapacity, string[] memory resourceTypes, uint256[] memory resourceBalances);
    function addResource(address collectionAddress, uint256 tokenId, address user, string memory resource, uint256 amount) external;
}
