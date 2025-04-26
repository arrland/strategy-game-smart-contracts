// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IBuildingStorage
 * @notice Interface for the building storage contract
 * @dev This is a simplified mock version for use with MissionRequirements
 */
interface IBuildingStorage {
    enum BuildingState {
        NotBuilt,
        UnderConstruction,
        Operational,
        Damaged,
        Destroyed
    }

    struct BuildingInfo {
        uint256 id;
        uint256 buildingType;
        uint256 level;
        BuildingState state;
        uint256 constructionStartTime;
        uint256 constructionEndTime;
        address owner;
    }

    /**
     * @notice Get building information for a specific building on an island
     * @param islandId ID of the island
     * @param buildingType Type of the building
     * @return BuildingInfo struct containing building data
     */
    function getBuilding(
        uint256 islandId,
        uint256 buildingType
    ) external view returns (BuildingInfo memory);

    /**
     * @notice Get maximum number of trade offers an island can have
     * @param islandId ID of the island
     * @return maxOffers Maximum number of trade offers allowed
     */
    function getMaxTradeOffers(uint256 islandId) external view returns (uint256);

    /**
     * @notice Check if an island has the required buildings for a mission
     * @param islandId ID of the island
     * @param requiredBuildingTypes Array of required building types
     * @param requiredLevels Array of required building levels
     * @return hasRequirements Whether the island meets the requirements
     */
    function hasRequiredBuildings(
        uint256 islandId,
        uint256[] calldata requiredBuildingTypes,
        uint256[] calldata requiredLevels
    ) external view returns (bool);

    /// @notice Returns the number of docking slots for an island (base + ports)
    function getDockingSlots(uint256 islandId) external view returns (uint256);

    /// @notice Returns the class of a ship by its ID
    function getShipClass(uint256 shipId) external view returns (string memory);
} 