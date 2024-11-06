// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/storageContracts/BaseStorage.sol";
import "contracts/CentralAuthorizationRegistry.sol";
import "contracts/interfaces/IResourceFarming.sol";
import "contracts/interfaces/storage/IIslandStorage.sol";

contract PirateStorage is BaseStorage {
    uint256 public constant DEFAULT_STORAGE_CAPACITY = 50 * 10 ** 18;

    event StorageAssigned(address indexed primaryCollection, uint256 indexed primaryTokenId, uint256 storageTokenId);
    event StorageUnassigned(address indexed primaryCollection, uint256 indexed primaryTokenId);

    constructor(
        address _centralAuthorizationRegistry,
        address _nftCollectionAddress,
        bool _isNft721,
        address _optionalStorageContractAddress
    )
        BaseStorage(_centralAuthorizationRegistry, _nftCollectionAddress, _isNft721, keccak256("IPirateStorage"))
    {
        // Set required storage if an optional storage contract address is provided
        if (_optionalStorageContractAddress != address(0)) {
            _setRequiredStorage(true, _optionalStorageContractAddress);
        } else {
            _setRequiredStorage(false, address(0));
        }
    }

    function getStorageCapacity(uint256 tokenId) public view override returns (uint256) {
        if (requiredStorage && _isStorageAssigned(tokenId)) {
            uint256 storageTokenId = _getAssignedStorage(tokenId);
            uint256 capacity = getStorageManagement().getStorageCapacity(requiredStorageContract, storageTokenId);
            return capacity == 0 ? DEFAULT_STORAGE_CAPACITY : capacity;
        } else {
            uint256 capacity = storageCapacities[tokenId];
            return capacity == 0 ? DEFAULT_STORAGE_CAPACITY : capacity;
        }
    }

    function dumpResource(uint256 tokenId, address owner, string memory resource, uint256 amount) external override onlyAuthorized {
        _checkOwnership(tokenId, owner);
        if (requiredStorage && _isStorageAssigned(tokenId)) {
            uint256 storageTokenId = _getAssignedStorage(tokenId);
            require(this.checkUserOwnsRequiredStorageNFT(owner, storageTokenId), "Caller does not own the required storage NFT");

            address storageContract = getStorageManagement().getStorageByCollection(requiredStorageContract);
            BaseStorage(storageContract).dumpResource(storageTokenId, owner, resource, amount);
        } else {
            IResourceManagement resourceManagement = getResourceManagement();
            resourceManagement.burnResource(address(this), tokenId, owner, resource, amount);
        }
    }

    function addResource(uint256 tokenId, address user, string memory resource, uint256 amount) external override onlyAuthorized {
        _checkOwnership(tokenId, user);
        if (requiredStorage && _isStorageAssigned(tokenId)) {
            uint256 storageTokenId = _getAssignedStorage(tokenId);
            require(this.checkUserOwnsRequiredStorageNFT(user, storageTokenId), "Caller does not own the required storage NFT");

            getStorageManagement().addResource(requiredStorageContract, storageTokenId, user, resource, amount);
        } else {
            IResourceManagement resourceManagement = getResourceManagement();
            resourceManagement.addResource(address(this), tokenId, user, resource, amount);
        }
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
        if (requiredStorage && _isStorageAssigned(fromTokenId)) {
            uint256 fromStorageTokenId = _getAssignedStorage(fromTokenId);
            require(address(this) != toStorageContract, "Cannot transfer to the same contract");
            address storageContract = getStorageManagement().getStorageByCollection(requiredStorageContract);
            BaseStorage(storageContract).transferResource(fromStorageTokenId, fromOwner, toTokenId, toOwner, toStorageContract, resource, amount);
        } else {
            IResourceManagement resourceManagement = getResourceManagement();
            resourceManagement.transferResource(address(this), fromTokenId, fromOwner, toStorageContract, toTokenId, toOwner, resource, amount);
        }
    }

    function getTotalResourcesInStorage(uint256 tokenId) external view override returns (uint256) {
        if (requiredStorage && _isStorageAssigned(tokenId)) {
            uint256 storageTokenId = _getAssignedStorage(tokenId);
            return getStorageManagement().getTotalResourcesInStorage(requiredStorageContract, storageTokenId);
        } else {
            IResourceManagement resourceManagement = getResourceManagement();
            return resourceManagement.getTotalResourcesInStorage(address(this), tokenId);
        }
    }

    function getResourceBalance(uint256 tokenId, string memory resource) external view override returns (uint256) {
        if (requiredStorage && _isStorageAssigned(tokenId)) {
            uint256 storageTokenId = _getAssignedStorage(tokenId);
            return getStorageManagement().getResourceBalance(requiredStorageContract, storageTokenId, resource);
        } else {
            IResourceManagement resourceManagement = getResourceManagement();
            return resourceManagement.getResourceBalance(address(this), tokenId, resource);
        }
    }

    function getAllResourceBalances(uint256 tokenId) external view override returns (string[] memory, uint256[] memory) {
        if (requiredStorage && _isStorageAssigned(tokenId)) {
            uint256 storageTokenId = _getAssignedStorage(tokenId);
            return getStorageManagement().getAllResourceBalances(requiredStorageContract, storageTokenId);
        } else {
            IResourceManagement resourceManagement = getResourceManagement();
            return resourceManagement.getAllResourceBalances(address(this), tokenId);
        }
    }

    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external override onlyAuthorized {
        if (requiredStorage && _isStorageAssigned(tokenId)) {
            uint256 storageTokenId = _getAssignedStorage(tokenId);
            getStorageManagement().updateStorageCapacity(requiredStorageContract, storageTokenId, newCapacity);
        } else {
            storageCapacities[tokenId] = newCapacity;
            emit StorageCapacityUpdated(tokenId, newCapacity);
        }
    }

    function _checkOwnership(uint256 tokenId, address owner) private view {
        IResourceFarming resourceFarming = getResourceFarming();
        if (isNft721) {
            require(
                nftCollection721.ownerOf(tokenId) == owner ||
                resourceFarming.isPirateStakedByOwner(nftCollectionAddress, tokenId, owner),
                "Caller does not own the NFT or it is not staked in ResourceFarming"
            );
        } else {
            require(
                nftCollection1155.balanceOf(owner, tokenId) > 0 ||
                resourceFarming.isPirateStakedByOwner(nftCollectionAddress, tokenId, owner),
                "Caller does not own the NFT or it is not staked in ResourceFarming"
            );
        }
    }

    function _isStorageAssigned(uint256 tokenId) internal view returns (bool) {
        return primaryToStorage[nftCollectionAddress][tokenId] != 0;
    }

    function _getAssignedStorage(uint256 tokenId) internal view returns (uint256) {
        return primaryToStorage[nftCollectionAddress][tokenId];
    }

    function _getPlotNumber(uint256 storageTokenId) internal view returns (uint256) {
        return IIslandStorage(getStorageManagement().getStorageByCollection(requiredStorageContract)).getPlotNumber(storageTokenId);
    }

    function assignStorageToPrimary(address primaryCollection, uint256 primaryTokenId, uint256 storageTokenId) external override onlyAuthorized {                
        require(_getPlotNumber(storageTokenId) > storageToPrimaryTokens[storageTokenId].length, "Max storage assignments reached");
        primaryToStorage[primaryCollection][primaryTokenId] = storageTokenId;
        storageToPrimaryTokens[storageTokenId].push(primaryTokenId);
        emit StorageAssigned(primaryCollection, primaryTokenId, storageTokenId);
    }

    function unassignStorageFromPrimary(address primaryCollection, uint256 primaryTokenId) external override onlyAuthorized {
        uint256 storageTokenId = primaryToStorage[primaryCollection][primaryTokenId];
        require(storageTokenId != 0, "No storage token assigned");

        primaryToStorage[primaryCollection][primaryTokenId] = 0;
        emit StorageUnassigned(primaryCollection, primaryTokenId);

        // Remove primaryTokenId from the list
        uint256[] storage primaryTokens = storageToPrimaryTokens[storageTokenId];
        for (uint256 i = 0; i < primaryTokens.length; i++) {
            if (primaryTokens[i] == primaryTokenId) {
                primaryTokens[i] = primaryTokens[primaryTokens.length - 1];
                primaryTokens.pop();
                break;
            }
        }
    }
}