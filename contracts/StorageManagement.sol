// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./CentralAuthorizationRegistry.sol";
import "./storageContracts/BaseStorage.sol";
import "./AuthorizationModifiers.sol";

contract StorageManagement is AuthorizationModifiers {
    // Central Authorization Registry Contract

    // Mapping from storage name to storage contract address
    mapping(address => BaseStorage) public storageContracts;
    // Array to store collection addresses
    address[] public collectionAddresses;
    // Counter to keep track of the number of storage contracts
    uint256 public storageContractCount;
    // Mapping to track registered storage addresses
    mapping(address => bool) public registeredStorageAddresses;

    event StorageCapacityUpdated(address indexed contractAddress, uint256 indexed tokenId, uint256 newCapacity);
    event StorageContractAdded(address indexed collectionAddress, address indexed contractAddress);
    event StorageContractRemoved(address indexed contractAddress);

    constructor(
        address _centralAuthorizationRegistry,
        address _genesisPiratesAddress,
        address _genesisIslandsAddress,
        address _pirateStorage,
        address _islandStorage
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IStorageManagement")) {        
        _addStorageContract(_genesisPiratesAddress, _pirateStorage);
        _addStorageContract(_genesisIslandsAddress, _islandStorage);        
    }

    function _addStorageContract(address collectionAddress, address contractAddress) internal {
        require(centralAuthorizationRegistry.isAuthorized(contractAddress), "Contract is not authorized");
        storageContracts[collectionAddress] = BaseStorage(contractAddress);
        registeredStorageAddresses[contractAddress] = true;
        collectionAddresses.push(collectionAddress);
        storageContractCount++;
        emit StorageContractAdded(collectionAddress, contractAddress);
    }

    function addStorageContract(address collectionAddress, address contractAddress) public onlyAdmin {
        _addStorageContract(collectionAddress, contractAddress);
    }

    function removeStorageContract(address collectionAddress) public onlyAdmin {
        address contractAddress = address(storageContracts[collectionAddress]);
        require(contractAddress != address(0), "Storage contract does not exist");
        delete storageContracts[collectionAddress];
        delete registeredStorageAddresses[contractAddress];
        
        // Remove collectionAddress from collectionAddresses array
        for (uint256 i = 0; i < collectionAddresses.length; i++) {
            if (collectionAddresses[i] == collectionAddress) {
                collectionAddresses[i] = collectionAddresses[collectionAddresses.length - 1];
                collectionAddresses.pop();
                break;
            }
        }

        storageContractCount--;
        emit StorageContractRemoved(collectionAddress);
    }

    function getStorageCapacity(address collectionAddress, uint256 tokenId) public view returns (uint256) {
        BaseStorage storageContract = storageContracts[collectionAddress];        
        return storageContract.getStorageCapacity(tokenId);
    }

    function getTotalResourcesInStorage(address collectionAddress, uint256 tokenId) public view returns (uint256) {
        BaseStorage storageContract = storageContracts[collectionAddress];
        return storageContract.getTotalResourcesInStorage(tokenId);
    }

    function checkStorageLimit(address collectionAddress, uint256 tokenId, uint256 amount) public view returns (bool) {
        return getTotalResourcesInStorage(collectionAddress, tokenId) + amount <= getStorageCapacity(collectionAddress, tokenId);
    }

    struct StorageDetails {
        uint256 totalResourcesInStorage;
        uint256 storageCapacity;
        string[] resourceTypes;
        uint256[] resourceBalances;
    }

    function getStorageDetails(address collectionAddress, uint256 tokenId) public view returns (StorageDetails memory) {
        BaseStorage storageContract = storageContracts[collectionAddress];
        
        uint256 totalResources = storageContract.getTotalResourcesInStorage(tokenId);
        uint256 capacity = storageContract.getStorageCapacity(tokenId);
        (string[] memory resourceTypes, uint256[] memory resourceBalances) = storageContract.getAllResourceBalances(tokenId);
        
        return StorageDetails({
            totalResourcesInStorage: totalResources,
            storageCapacity: capacity,
            resourceTypes: resourceTypes,
            resourceBalances: resourceBalances
        });
    }

    function updateStorageCapacity(address collectionAddress, uint256 tokenId, uint256 newCapacity) public onlyAuthorized {
        BaseStorage storageContract = storageContracts[collectionAddress];
        storageContract.updateStorageCapacity(tokenId, newCapacity);
        emit StorageCapacityUpdated(address(storageContract), tokenId, newCapacity);
    }

    function isStorageEntity(address entity) public view returns (bool) {
        return registeredStorageAddresses[entity];
    }

    function getResourceBalance(address collectionAddress, uint256 tokenId, string memory resource) public view returns (uint256) {
        BaseStorage storageContract = storageContracts[collectionAddress];
        return storageContract.getResourceBalance(tokenId, resource);
    }

    function getAllResourceBalances(address collectionAddress, uint256 tokenId) public view returns (string[] memory, uint256[] memory) {
        BaseStorage storageContract = storageContracts[collectionAddress];
        return storageContract.getAllResourceBalances(tokenId);
    }

    function getStorageByCollection(address collectionAddress) public view returns (address) {
        return address(storageContracts[collectionAddress]);
    }

    function dumpResource(address collectionAddress, uint256 tokenId, string memory resource, uint256 amount) public {
        BaseStorage storageContract = storageContracts[collectionAddress];
        if (storageContract.isNft721()) {
            require(storageContract.nftCollection721().ownerOf(tokenId) == msg.sender, "Caller does not own the token");
        } else {
            require(storageContract.nftCollection1155().balanceOf(msg.sender, tokenId) > 0, "Caller does not own the token");
        }
        storageContract.dumpResource(tokenId, resource, amount);
    }

    function getAllStorageContracts() public view returns (address[] memory, address[] memory) {
        address[] memory storageAddresses = new address[](collectionAddresses.length);
        for (uint256 i = 0; i < collectionAddresses.length; i++) {
            storageAddresses[i] = address(storageContracts[collectionAddresses[i]]);
        }
        return (collectionAddresses, storageAddresses);
    }
}
