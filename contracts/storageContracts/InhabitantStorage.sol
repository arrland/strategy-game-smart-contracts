// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/storageContracts/BaseStorage.sol";
import "contracts/CentralAuthorizationRegistry.sol";
import "contracts/interfaces/IResourceFarming.sol";
import "contracts/interfaces/storage/IIslandStorage.sol";

contract InhabitantStorage is BaseStorage {
    uint256 public constant DEFAULT_STORAGE_CAPACITY = 50 * 10 ** 18;

    event StorageAssigned(address indexed primaryCollection, uint256 indexed primaryTokenId, uint256 storageTokenId);
    event StorageUnassigned(address indexed primaryCollection, uint256 indexed primaryTokenId);

    constructor(address _centralAuthorizationRegistry, address _nftCollectionAddress, bool _isNft721, address _islandNftCollectionAddress)
        BaseStorage(_centralAuthorizationRegistry, _nftCollectionAddress, _isNft721, keccak256("IPirateStorage")) {
        _setRequiredStorage(true, _islandNftCollectionAddress);
    }

    function getStorageCapacity(uint256 tokenId) public view override returns (uint256) {
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        uint256 capacity = getStorageManagement().getStorageCapacity(requiredStorageContract, storageTokenId);
        return capacity == 0 ? DEFAULT_STORAGE_CAPACITY : capacity;
    }

    function assignStorageToPrimary(address primaryCollection, uint256 primaryTokenId, uint256 storageTokenId) external override onlyAuthorized {        
        // Check if inhabitant is already in storageToPrimaryTokens for any storage
        uint256 existingStorage = primaryToStorage[primaryCollection][primaryTokenId];
        if (existingStorage != 0) {
            // If it exists in primaryToStorage, clean up the old storage assignment
            uint256[] storage oldPrimaryTokens = storageToPrimaryTokens[existingStorage];
            for (uint256 i = 0; i < oldPrimaryTokens.length; i++) {
                if (oldPrimaryTokens[i] == primaryTokenId) {
                    oldPrimaryTokens[i] = oldPrimaryTokens[oldPrimaryTokens.length - 1];
                    oldPrimaryTokens.pop();
                    break;
                }
            }
        }

        uint256 totalAssignments = _getTotalAssignmentsForStorage(storageTokenId);
        require(_getPlotNumber(storageTokenId) > totalAssignments, "Max storage assignments reached");
        
        // Update both mappings atomically
        primaryToStorage[primaryCollection][primaryTokenId] = storageTokenId;
        storageToPrimaryTokens[storageTokenId].push(primaryTokenId);
        emit StorageAssigned(primaryCollection, primaryTokenId, storageTokenId);
    }

    function migrateStorageAssignmentsBatch(
        address nftCollection,
        uint256[] memory primaryTokenIds,
        uint256[] memory storageTokenIds
    ) external onlyAuthorized {
        require(primaryTokenIds.length == storageTokenIds.length, "Array lengths must match");
        for (uint256 i = 0; i < primaryTokenIds.length; i++) {
            this.assignStorageToPrimary(nftCollection, primaryTokenIds[i], storageTokenIds[i]);
        }
    }

    function unassignStorageFromPrimary(address primaryCollection, uint256 primaryTokenId) external override onlyAuthorized {
        uint256 storageTokenId = primaryToStorage[primaryCollection][primaryTokenId];
        require(storageTokenId != 0, "No storage token assigned");

        // Clear the primary->storage mapping first
        primaryToStorage[primaryCollection][primaryTokenId] = 0;
        
        // Then remove from storage->primary array
        uint256[] storage primaryTokens = storageToPrimaryTokens[storageTokenId];
        for (uint256 i = 0; i < primaryTokens.length; i++) {
            if (primaryTokens[i] == primaryTokenId) {
                primaryTokens[i] = primaryTokens[primaryTokens.length - 1];
                primaryTokens.pop();
                break;
            }
        }
        
        emit StorageUnassigned(primaryCollection, primaryTokenId);
    }

    function _getPlotNumber(uint256 storageTokenId) internal view returns (uint256) {
        return IIslandStorage(getStorageManagement().getStorageByCollection(requiredStorageContract)).getPlotNumber(storageTokenId);
    }

    function getMaxStorageAssignments(uint256 tokenId) external view returns (uint256) {    
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        require(storageTokenId != 0, "No storage token assigned");
        return _getPlotNumber(storageTokenId);
    }

    function dumpResource(uint256 tokenId, address owner, string memory resource, uint256 amount) external override onlyAuthorized {
        _checkOwnership(tokenId, owner);
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        require(storageTokenId != 0, "No storage token assigned");
        require(this.checkUserOwnsRequiredStorageNFT(owner, storageTokenId), "Caller does not own the required storage NFT");
        
        address storageContract = getStorageManagement().getStorageByCollection(requiredStorageContract);
        BaseStorage(storageContract).dumpResource(storageTokenId, owner, resource, amount);        
    }

    function addResource(uint256 tokenId, address user, string memory resource, uint256 amount) external override onlyAuthorized {
        _checkOwnership(tokenId, user);
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        require(storageTokenId != 0, "No storage token assigned");
        require(this.checkUserOwnsRequiredStorageNFT(user, storageTokenId), "Caller does not own the required storage NFT");
        
        getStorageManagement().addResource(requiredStorageContract, storageTokenId, user, resource, amount);
    }

    function transferResource(
        uint256 fromTokenId,
        address fromOwner,
        uint256 toTokenId,
        address toOwner,
        address toStorageContract,
        string memory resource,
        uint256 amount
    ) external override onlyAuthorized {
        _checkOwnership(fromTokenId, fromOwner);
        uint256 fromStorageTokenId = _getAssignedStorage(fromTokenId);     
        require(fromStorageTokenId != 0, "No storage token assigned");   
        require(toStorageContract != address(this), "Cannot transfer to the same contract");
        address storageContract = getStorageManagement().getStorageByCollection(requiredStorageContract);
        BaseStorage(storageContract).transferResource(fromStorageTokenId, fromOwner, toTokenId, toOwner, toStorageContract, resource, amount);
    }

    function getTotalResourcesInStorage(uint256 tokenId) external view override returns (uint256) {
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        require(storageTokenId != 0, "No storage token assigned");
        return getStorageManagement().getTotalResourcesInStorage(requiredStorageContract, storageTokenId);
    }

    function getResourceBalance(uint256 tokenId, string memory resource) external view override returns (uint256) {
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        require(storageTokenId != 0, "No storage token assigned");
        return getStorageManagement().getResourceBalance(requiredStorageContract, storageTokenId, resource);
    }

    function _getAssignedStorage(uint256 tokenId) internal view returns (uint256) {
        return primaryToStorage[nftCollectionAddress][tokenId];
    }

    function getAllResourceBalances(uint256 tokenId) external view override returns (string[] memory, uint256[] memory) {
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        require(storageTokenId != 0, "No storage token assigned");
        return getStorageManagement().getAllResourceBalances(requiredStorageContract, storageTokenId);
    }

    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external override onlyAuthorized {
        uint256 storageTokenId = _getAssignedStorage(tokenId);
        require(storageTokenId != 0, "No storage token assigned");
        getStorageManagement().updateStorageCapacity(requiredStorageContract, storageTokenId, newCapacity);
    }

    function _checkOwnership(uint256 tokenId, address owner) private view {
        IResourceFarming resourceFarming = getResourceFarming();
        if (isNft721) {
            require(nftCollection721.ownerOf(tokenId) == owner || resourceFarming.isPirateStakedByOwner(nftCollectionAddress, tokenId, owner), "Caller does not own the NFT or it is not staked in ResourceFarming");
        } else {
            require(nftCollection1155.balanceOf(owner, tokenId) > 0 || resourceFarming.isPirateStakedByOwner(nftCollectionAddress, tokenId, owner), "Caller does not own the NFT or it is not staked in ResourceFarming");
        }
    }
}