// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../AuthorizationModifiers.sol";
import "../interfaces/IResourceManagement.sol";
import "../interfaces/IStorageManagement.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "../interfaces/IResourceFarming.sol";

abstract contract BaseStorage is AuthorizationModifiers {
    using Strings for string;

    IERC721 public nftCollection721;
    IERC1155 public nftCollection1155;
    address public nftCollectionAddress;
    bool public isNft721;
    bool public requiredStorage;
    address public requiredStorageContract; // nft collecton 

    // Locking mechanism for missions and resource management
    struct MissionLock {
        uint256 startTime;
        uint256 endTime;
        bool locked;
        address attacker;
        uint256 missionId; // Optional: to track which mission locked the resources
    }

    // Mapping to track locked resources
    mapping(uint256 => MissionLock) public missionLocks;

    // Events for lock status changes
    event ResourcesLocked(uint256 indexed tokenId, uint256 startTime, uint256 endTime, uint256 missionId);
    event ResourcesUnlocked(uint256 indexed tokenId);
    event ResourcesCaptured(uint256 indexed targetId, address attacker, string resource, uint256 amount);
    event ResourceTransferred(address indexed fromStorage, uint256 fromId, address indexed toStorage, uint256 toId, string resourceType, uint256 amount);

    // Mapping from token ID to storage capacity
    mapping(uint256 => uint256) public storageCapacities;

    // Mapping from primary token ID to storage token ID
    mapping(address => mapping(uint256 => uint256)) public primaryToStorage;

    mapping(uint256 => uint256[]) public storageToPrimaryTokens;

    event StorageCapacityUpdated(uint256 indexed tokenId, uint256 newCapacity);

    constructor(address _centralAuthorizationRegistry, address _nftCollectionAddress, bool _isNft721, bytes32 _interfaceId) AuthorizationModifiers(_centralAuthorizationRegistry, _interfaceId) {        
        nftCollectionAddress = _nftCollectionAddress;
        isNft721 = _isNft721;
        if (isNft721) {
            nftCollection721 = IERC721(_nftCollectionAddress);
        } else {
            nftCollection1155 = IERC1155(_nftCollectionAddress);
        }
        requiredStorage = false;
        requiredStorageContract = address(0);
    }

    /**
     * @notice Lock resources for a mission or other activity
     * @param tokenId The token ID to lock resources for
     * @param duration Duration of the lock in seconds
     * @param missionId Optional mission ID to associate with this lock
     */
    function lockResources(
        uint256 tokenId,
        uint256 duration,
        uint256 missionId
    ) external virtual onlyAuthorized {
        require(!missionLocks[tokenId].locked, "Resources already locked");

        missionLocks[tokenId] = MissionLock({
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            locked: true,
            attacker: address(0),
            missionId: missionId
        });

        emit ResourcesLocked(tokenId, block.timestamp, block.timestamp + duration, missionId);
    }

    /**
     * @notice Unlock resources after a mission or activity
     * @param tokenId The token ID to unlock resources for
     */
    function unlockResources(uint256 tokenId) external virtual onlyAuthorized {
        MissionLock storage lock = missionLocks[tokenId];
        require(lock.locked, "Resources not locked");
        require(block.timestamp >= lock.endTime, "Lock period not complete");
        require(lock.attacker == address(0), "Resources were captured");

        delete missionLocks[tokenId];

        emit ResourcesUnlocked(tokenId);
    }

    /**
     * @notice Check if resources are locked
     * @param tokenId The token ID to check
     * @return locked Whether the resources are locked
     */
    function isResourceLocked(uint256 tokenId) public view virtual returns (bool) {
        return missionLocks[tokenId].locked;
    }

    function getLockInfo(uint256 tokenId) external view virtual returns (
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint256 missionId
    ) {
        MissionLock memory lock = missionLocks[tokenId];
        return (
            lock.startTime,
            lock.endTime,
            lock.locked,
            lock.attacker,
            lock.missionId
        );
    }

    /**
     * @notice Capture resources from a locked token (for battle/pirate mechanics)
     * @param targetId The target token ID to capture resources from
     * @param attackerId The attacker's token ID
     * @param resourceType The type of resource to capture
     * @param amount The amount of resource to capture
     */
    function captureLockedResources(
        uint256 targetId,
        uint256 attackerId,
        string memory resourceType,
        uint256 amount
    ) external virtual onlyAuthorized {
        MissionLock storage lock = missionLocks[targetId];
        require(lock.locked, "Target not locked");
        require(lock.attacker == address(0), "Already captured");
        
        // Mark as captured
        lock.attacker = msg.sender;
        
        // The actual resource transfer is left to derived contracts to implement
        // as storage mechanisms might differ
        
        emit ResourcesCaptured(targetId, msg.sender, resourceType, amount);
    }

    /**
     * @notice Simplified helper to transfer resources between storage contracts
     * @param fromStorage Source storage contract address
     * @param fromId Source token ID
     * @param toStorage Destination storage contract address
     * @param toId Destination token ID
     * @param resourceType Type of resource to transfer
     * @param amount Amount of resource to transfer
     */
    function transferResourceBetweenStorages(
        address fromStorage,
        uint256 fromId,
        address toStorage, 
        uint256 toId,
        string memory resourceType,
        uint256 amount
    ) external onlyAuthorized {
        // Validate resource availability
        IResourceManagement resourceManagement = getResourceManagement();
        uint256 availableAmount = resourceManagement.getResourceBalance(
            fromStorage,
            fromId,
            resourceType
        );
        require(availableAmount >= amount, "Insufficient resources for transfer");
        
        // Validate destination capacity
        uint256 destinationUsed = resourceManagement.getTotalResourcesInStorage(toStorage, toId);
        uint256 destinationCapacity = BaseStorage(toStorage).getStorageCapacity(toId);
        require(destinationUsed + amount <= destinationCapacity, "Insufficient destination capacity");
        
        // Get owners if possible
        address fromOwner = getOwnerForStorage(fromStorage, fromId);
        address toOwner = getOwnerForStorage(toStorage, toId);
        
        // Perform the transfer
        resourceManagement.transferResource(
            fromStorage, fromId, fromOwner,
            toStorage, toId, toOwner,
            resourceType, amount
        );
        
        emit ResourceTransferred(fromStorage, fromId, toStorage, toId, resourceType, amount);
    }
    
    /**
     * @notice Helper function to get the owner of a token in a storage contract
     * @param storageContract Storage contract address
     * @param tokenId Token ID
     * @return owner Address of the token owner, or address(0) if unknown
     */
    function getOwnerForStorage(address storageContract, uint256 tokenId) internal view returns (address) {
        // Try to get owner through common owner retrieval methods
        try BaseStorage(storageContract).nftCollectionAddress() returns (address nftCollection) {
            if (nftCollection != address(0)) {
                try BaseStorage(storageContract).isNft721() returns (bool isNft721) {
                    if (isNft721) {
                        try IERC721(nftCollection).ownerOf(tokenId) returns (address owner) {
                            return owner;
                        } catch {}
                    }
                } catch {}
            }
        } catch {}
        
        // If that fails, return contract address as default owner
        return storageContract;
    }
    
    /**
     * @notice Simplified validation of storage capacity
     * @param tokenId Token ID to check
     * @param additionalAmount Additional amount to check for
     * @return True if the token has enough capacity
     */
    function hasAvailableCapacity(uint256 tokenId, uint256 additionalAmount) external view returns (bool) {
        uint256 capacity = getStorageCapacity(tokenId);
        uint256 used = this.getTotalResourcesInStorage(tokenId);
        return (used + additionalAmount <= capacity);
    }
    
    /**
     * @notice Get available storage capacity for a token
     * @param tokenId Token ID to check
     * @return availableCapacity Amount of unused capacity
     */
    function getAvailableCapacity(uint256 tokenId) external view returns (uint256) {
        uint256 capacity = getStorageCapacity(tokenId);
        uint256 used = this.getTotalResourcesInStorage(tokenId);
        return (used >= capacity) ? 0 : (capacity - used);
    }

    function _setRequiredStorage(bool _requiredStorage, address _requiredStorageContract) internal {
        requiredStorage = _requiredStorage;
        requiredStorageContract = _requiredStorageContract;
    }
    function setRequiredStorage(bool _requiredStorage, address _requiredStorageContract) external onlyAuthorized {
        _setRequiredStorage(_requiredStorage, _requiredStorageContract);
    }

    function getRequiredStorageContract() external view returns (address) {
        return requiredStorageContract;
    }

    function requiresOtherNFTForStorage() external view returns (bool) {
        return requiredStorage;
    }

    function assignStorageToPrimary(address primaryCollection, uint256 primaryTokenId, uint256 storageTokenId) external virtual onlyAuthorized {        
        primaryToStorage[primaryCollection][primaryTokenId] = storageTokenId;
    }

    function unassignStorageFromPrimary(address primaryCollection, uint256 primaryTokenId) external virtual onlyAuthorized {
        primaryToStorage[primaryCollection][primaryTokenId] = 0;
    }

    function isRequiredStorageAssigned(address primaryCollection, uint256 primaryTokenId) external view returns (bool) {
        return primaryToStorage[primaryCollection][primaryTokenId] != 0;
    }

    function getAssignedStorage(address primaryCollection, uint256 primaryTokenId) external view returns (uint256) {
        return primaryToStorage[primaryCollection][primaryTokenId];
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }

    function getTotalResourcesInStorage(uint256 tokenId) external view virtual returns (uint256) {
        IResourceManagement resourceManagement = getResourceManagement();
        uint256 totalResources = resourceManagement.getTotalResourcesInStorage(address(this), tokenId);
        return totalResources;
    }

    function getResourceBalance(uint256 tokenId, string memory resource) external view virtual returns (uint256) {
        IResourceManagement resourceManagement = getResourceManagement();
        uint256 resourceBalance = resourceManagement.getResourceBalance(address(this), tokenId, resource);
        return resourceBalance;
    }

    function addResource(uint256 tokenId, address user, string memory resource, uint256 amount) external virtual onlyAuthorized(){
        // Check if resources are locked
        require(!isResourceLocked(tokenId), "Resources are locked for mission");
        
        IResourceManagement resourceManagement = getResourceManagement();
        resourceManagement.addResource(address(this), tokenId, user, resource, amount);
    }

    function dumpResource(uint256 tokenId, address owner, string memory resource, uint256 amount) external virtual onlyAuthorized {
        // Check if resources are locked
        require(!isResourceLocked(tokenId), "Resources are locked for mission");
        
        if (isNft721) {            
            require(nftCollection721.ownerOf(tokenId) == owner, "Caller does not own the 721 token");
        } else {            
            require(nftCollection1155.balanceOf(owner, tokenId) > 0, "Caller does not own the 1155 token");
        }
        IResourceManagement resourceManagement = getResourceManagement();
        resourceManagement.burnResource(address(this), tokenId, owner, resource, amount);
    }

    function transferResource(
        uint256 fromTokenId,
        address fromOwner,
        uint256 toTokenId,
        address toOwner,
        address toStorageContract,
        string memory resource,
        uint256 amount
    ) external virtual onlyAuthorized {
        // Check if source resources are locked
        require(!isResourceLocked(fromTokenId), "Source resources are locked for mission");
        
        IResourceManagement resourceManagement = getResourceManagement();        
        require(fromOwner != address(0) && toOwner != address(0), "Invalid token ownership");

        resourceManagement.transferResource(
            address(this),
            fromTokenId,
            fromOwner,
            toStorageContract,
            toTokenId,
            toOwner,
            resource,
            amount
        );
    }

    function getAllResourceBalances(uint256 tokenId) external view virtual returns (string[] memory, uint256[] memory) {
        IResourceManagement resourceManagement = getResourceManagement();
        (string[] memory resourceNames, uint256[] memory resourceBalances) = resourceManagement.getAllResourceBalances(address(this), tokenId);
        return (resourceNames, resourceBalances);
    }
    
    function getStorageCapacity(uint256 tokenId) public view virtual returns (uint256) {
        return storageCapacities[tokenId];
    }

    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external virtual onlyAuthorized {
        storageCapacities[tokenId] = newCapacity;
        emit StorageCapacityUpdated(tokenId, newCapacity);
    }

    function _isERC1155(address collectionAddress) internal view returns (bool) {
        return IERC165(collectionAddress).supportsInterface(type(IERC1155).interfaceId);
    }

    function isERC1155(address collectionAddress) external view returns (bool) {
        return _isERC1155(collectionAddress);
    }

    function _isERC721(address collectionAddress) internal view returns (bool) {
        return IERC165(collectionAddress).supportsInterface(type(IERC721).interfaceId);
    }

    function isERC721(address collectionAddress) external view returns (bool) {
        return _isERC721(collectionAddress);
    }

    function checkUserOwnsRequiredStorageNFT(address user, uint256 requiredStorageTokenId) external view returns (bool) {
        if (_isERC1155(requiredStorageContract)) {
            return IERC1155(requiredStorageContract).balanceOf(user, requiredStorageTokenId) > 0;
        } else if (_isERC721(requiredStorageContract)) {
            return IERC721(requiredStorageContract).ownerOf(requiredStorageTokenId) == user;
        } else {
            revert("Conntract is not ERC1155 or ERC721");
        }
    }

    function getPrimaryTokensForStorage(uint256 storageTokenId) external view returns (uint256[] memory) {
        return storageToPrimaryTokens[storageTokenId];
    }

    function isStorageAssignedToPrimary(address primaryCollection, uint256 primaryTokenId) external view returns (bool) {
        return primaryToStorage[primaryCollection][primaryTokenId] != 0;
    }

    function getResourceFarming() internal view returns (IResourceFarming) {        
        return IResourceFarming(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceFarming")));
    }

    function _getTotalAssignmentsForStorage(uint256 storageTokenId) internal view returns (uint256) {
        address[] memory storageContracts = getStorageManagement().getStorageContractsForAssignableStorage();
        
        uint256 totalAssignments = 0;
        for (uint256 i = 0; i < storageContracts.length; i++) {
            BaseStorage storageContract = BaseStorage(storageContracts[i]);
            uint256[] memory primaryTokens = storageContract.getPrimaryTokensForStorage(storageTokenId);
            totalAssignments += primaryTokens.length;
        }
        
        return totalAssignments;
    }
}