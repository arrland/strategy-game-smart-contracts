// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IStorageManagement {
    event StorageCapacityUpdated(address indexed contractAddress, uint256 indexed tokenId, uint256 newCapacity);
    event StorageContractAdded(address indexed collectionAddress, address indexed contractAddress);
    event StorageContractRemoved(address indexed contractAddress);

    function storageContracts(address collectionAddress) external view returns (address);
    function storageContractNames(uint256 index) external view returns (string memory);
    function storageContractCount() external view returns (uint256);

    function removeStorageContract(address collectionAddress) external;
    function getStorageCapacity(address collectionAddress, uint256 tokenId) external view returns (uint256);
    function getTotalResourcesInStorage(address collectionAddress, uint256 tokenId) external view returns (uint256);
    function checkStorageLimit(address collectionAddress, uint256 tokenId, uint256 amount) external view returns (bool);
    function updateStorageCapacity(address collectionAddress, uint256 tokenId, uint256 newCapacity) external;
    function isStorageEntity(address entity) external view returns (bool);
    function getStorageByCollection(address collectionAddress) external view returns (address);
    function getAllStorageContracts() external view returns (address[] memory collectionAddresses, address[] memory storageAddresses);
}
