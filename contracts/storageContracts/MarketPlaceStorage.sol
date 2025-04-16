// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./BaseStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IResourceManagement.sol";

/**
 * @title MarketPlaceStorage
 * @dev Manages resource storage for marketplace trades and pending deliveries
 */
contract MarketPlaceStorage is BaseStorage {
    using Strings for string;

    // Constants
    uint256 public constant DEFAULT_ORDER_CAPACITY = 1000000; // 1M units per order
    uint256 public constant DEFAULT_ISLAND_CAPACITY = 10000000; // 10M units per island
    
    // Maximum number of distinct resource types tracked per island
    uint256 public constant MAX_RESOURCE_TYPES = 50;
    
    // Tracking for resource types (only needed for efficiently retrieving lists of types)
    mapping(uint256 => string[]) public islandPendingResourceTypes;
    mapping(uint256 => mapping(string => bool)) private isResourceTypePending;

    // Events for consolidated storage
    event PendingResourceAdded(uint256 indexed islandId, string resourceType, uint256 amount, uint256 timestamp);
    event PendingResourceRemoved(uint256 indexed islandId, string resourceType, uint256 amount);
    event PendingResourceTypeTracked(uint256 indexed islandId, string resourceType);

    constructor(
        address _centralAuthorizationRegistry,
        address _nftCollectionAddress,
        bool _isNft721
    ) BaseStorage(_centralAuthorizationRegistry, _nftCollectionAddress, _isNft721, keccak256("MarketPlaceStorage")) {}

    /**
     * @dev Creates storage for a new trade order
     * @param orderId The ID of the trade order
     * @param capacity The storage capacity for this order
     */
    function createOrderStorage(uint256 orderId, uint256 capacity) external onlyAuthorized {
        require(storageCapacities[orderId] == 0, "Order storage already exists");
        storageCapacities[orderId] = capacity > 0 ? capacity : DEFAULT_ORDER_CAPACITY;
        emit StorageCapacityUpdated(orderId, storageCapacities[orderId]);
    }

    /**
     * @dev Removes storage for a completed or cancelled order
     * @param orderId The ID of the trade order
     */
    function removeOrderStorage(uint256 orderId) external onlyAuthorized {
        require(storageCapacities[orderId] > 0, "Order storage does not exist");
        delete storageCapacities[orderId];
        emit StorageCapacityUpdated(orderId, 0);
    }

    /**
     * @dev Returns the storage capacity for a given order or island
     * @param tokenId The ID to check capacity for (can be order ID or island ID)
     */
    function getStorageCapacity(uint256 tokenId) public view override returns (uint256) {
        uint256 capacity = storageCapacities[tokenId];
        if (capacity > 0) {
        return capacity;
        }
        
        // For island IDs without explicit capacity, use default island capacity
        return DEFAULT_ISLAND_CAPACITY;
    }

    /**
     * @dev Checks if an order or island has enough storage capacity for resources
     * @param tokenId The token ID to check (can be order ID or island ID)
     * @param amount The amount of resources to check for
     */
    function hasStorageCapacity(uint256 tokenId, uint256 amount) external view returns (bool) {
        return amount <= getStorageCapacity(tokenId);
    }

    /**
     * @dev Adds a pending resource delivery for an island
     * @param islandId The island ID
     * @param resourceType The type of resource
     * @param amount The amount of resource
     */
    function addPendingResource(uint256 islandId, string calldata resourceType, uint256 amount) external onlyAuthorized {
        // Track the resource type if it's not already tracked
        if (!isResourceTypePending[islandId][resourceType]) {
            require(bytes(resourceType).length > 0 && bytes(resourceType).length <= 32, "Invalid resource type length");
            require(islandPendingResourceTypes[islandId].length < MAX_RESOURCE_TYPES, "Too many resource types");
            
            islandPendingResourceTypes[islandId].push(resourceType);
            isResourceTypePending[islandId][resourceType] = true;
            
            emit PendingResourceTypeTracked(islandId, resourceType);
        }
        
        // Use the central ResourceManagement to add resources
        IResourceManagement resourceManagement = getResourceManagement();
        resourceManagement.addResource(
            address(this),
            islandId,
            address(this),
            resourceType,
            amount
        );
        
        emit PendingResourceAdded(islandId, resourceType, amount, block.timestamp);
    }
    
    /**
     * @dev Removes pending resources for an island
     * @param islandId The island ID
     * @param resourceType The type of resource
     * @param amount The amount to remove
     */
    function removePendingResource(uint256 islandId, string calldata resourceType, uint256 amount) external onlyAuthorized {
        IResourceManagement resourceManagement = getResourceManagement();
        uint256 pendingAmount = resourceManagement.getResourceBalance(address(this), islandId, resourceType);
        require(pendingAmount >= amount, "Insufficient pending resources");
        
        // Burn the resources from internal tracking
        resourceManagement.burnResource(
            address(this),
            islandId,
            address(this),
            resourceType,
            amount
        );
        
        // If no more resources of this type, remove from tracking
        pendingAmount = resourceManagement.getResourceBalance(address(this), islandId, resourceType);
        if (pendingAmount == 0) {
            isResourceTypePending[islandId][resourceType] = false;
            
            // Find and remove from the array of resource types
            for (uint256 i = 0; i < islandPendingResourceTypes[islandId].length; i++) {
                if (keccak256(bytes(islandPendingResourceTypes[islandId][i])) == keccak256(bytes(resourceType))) {
                    // Replace with the last element and pop
                    islandPendingResourceTypes[islandId][i] = islandPendingResourceTypes[islandId][islandPendingResourceTypes[islandId].length - 1];
                    islandPendingResourceTypes[islandId].pop();
                    break;
                }
            }
        }
        
        emit PendingResourceRemoved(islandId, resourceType, amount);
    }
    
    /**
     * @dev Get pending resource amount for an island
     * @param islandId The island ID
     * @param resourceType The type of resource
     * @return The amount of pending resources
     */
    function getPendingResourceAmount(uint256 islandId, string calldata resourceType) external view returns (uint256) {
        return this.getResourceBalance(islandId, resourceType);
    }
    
    /**
     * @dev Get all pending resource types for an island
     * @param islandId The island ID
     * @return Array of resource types that have pending deliveries
     */
    function getPendingResourceTypes(uint256 islandId) external view returns (string[] memory) {
        return islandPendingResourceTypes[islandId];
    }
    
    /**
     * @dev Check if a resource type has pending deliveries for an island
     * @param islandId The island ID
     * @param resourceType The resource type to check
     * @return Whether the resource type has pending deliveries
     */
    function hasResourceTypePending(uint256 islandId, string calldata resourceType) external view returns (bool) {
        return isResourceTypePending[islandId][resourceType];
    }
}
