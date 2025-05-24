// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title MockIslandStorage
 * @notice Mock contract for testing island storage functionality
 */
contract MockIslandStorage {
    // Mock storage
    mapping(uint256 => address) private islandOwners;
    mapping(uint256 => mapping(string => bool)) private islandBuildings;
    mapping(uint256 => mapping(string => uint256)) private islandResources;
    
    // Events for testing
    event IslandCreated(uint256 indexed islandId, address indexed owner);
    
    /**
     * @notice Set an island's owner
     * @param islandId Island ID
     * @param owner Owner address
     */
    function setIslandOwner(uint256 islandId, address owner) external {
        islandOwners[islandId] = owner;
        emit IslandCreated(islandId, owner);
    }
    
    /**
     * @notice Set whether an island has a specific building
     * @param islandId Island ID
     * @param buildingType Building type
     * @param hasBuilding True if the island has the building
     */
    function setIslandBuilding(
        uint256 islandId,
        string memory buildingType,
        bool hasBuilding
    ) external {
        islandBuildings[islandId][buildingType] = hasBuilding;
    }
    
    /**
     * @notice Set island resource amount
     * @param islandId Island ID
     * @param resourceType Resource type
     * @param amount Resource amount
     */
    function setIslandResource(
        uint256 islandId,
        string memory resourceType,
        uint256 amount
    ) external {
        islandResources[islandId][resourceType] = amount;
    }
    
    /**
     * @notice Check if an address owns an island
     * @param islandId Island ID
     * @param owner Address to check
     * @return True if owner
     */
    function ownsIsland(uint256 islandId, address owner) external view returns (bool) {
        return islandOwners[islandId] == owner;
    }
    
    /**
     * @notice Get an island's owner
     * @param islandId Island ID
     * @return Owner address
     */
    function getIslandOwner(uint256 islandId) external view returns (address) {
        return islandOwners[islandId];
    }
    
    /**
     * @notice Check if an island has a specific building
     * @param islandId Island ID
     * @param buildingType Building type
     * @return True if the island has the building
     */
    function hasBuilding(
        uint256 islandId,
        string memory buildingType
    ) external view returns (bool) {
        return islandBuildings[islandId][buildingType];
    }
    
    /**
     * @notice Get island resource amount
     * @param islandId Island ID
     * @param resourceType Resource type
     * @return Resource amount
     */
    function getIslandResource(
        uint256 islandId,
        string memory resourceType
    ) external view returns (uint256) {
        return islandResources[islandId][resourceType];
    }
} 