// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IBuildingStorage.sol";
import "../interfaces/IIslandStorage.sol";
import "../AuthorizationModifiers.sol";
import "hardhat/console.sol";

/**
 * @title MockBuildingStorage
 * @notice Mock implementation of IBuildingStorage that uses IslandStorage for base docking slots
 * @dev This mock implements only functions used by mission contracts and DockingManagement.
 */
contract MockBuildingStorage is IBuildingStorage, AuthorizationModifiers {
    // Constants
    uint256 private constant TRADING_POST_TYPE = 2;
    uint256 private constant GOVERNOR_HQ_TYPE = 1;
    uint256 private constant MAX_TRADE_OFFERS = 2;

    IIslandStorage public islandStorage;

    /**
     * @notice Constructor for MockBuildingStorage
     * @param _centralAuthorizationRegistry Address of the central authorization registry
     * @param _islandStorageAddress Address of the deployed IslandStorage contract
     */
    constructor(address _centralAuthorizationRegistry, address _islandStorageAddress)
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IBuildingStorage")) 
    {
        require(_islandStorageAddress != address(0), "Invalid IslandStorage address");
        islandStorage = IIslandStorage(_islandStorageAddress);
    }

    /**
     * @notice Get building information for a specific building on an island
     * @dev Always returns an operational building with maximum level
     * @param islandIdParam ID of the island (unused in mock)
     * @param buildingType Type of the building
     * @return BuildingInfo struct containing mock building data
     */
    function getBuilding(
        uint256 islandIdParam, // unused parameter
        uint256 buildingType
    ) external view override returns (BuildingInfo memory) {
        // Always return an operational building with level 10
        return BuildingInfo({
            id: 1,
            buildingType: buildingType,
            level: 10,
            state: BuildingState.Operational,
            constructionStartTime: 0,
            constructionEndTime: 0,
            owner: address(0)
        });
    }

    /**
     * @notice Get maximum number of trade offers an island can have
     * @dev Always returns 2 for now, will be based on trading post level in the future
     * @param islandId ID of the island
     * @return maxOffers Maximum number of trade offers allowed
     */
    function getMaxTradeOffers(uint256 islandId) external view override returns (uint256) {
        // For now, all islands have a max of 2 trade offers
        // In the future, this will be based on the trading post level
        return MAX_TRADE_OFFERS;
    }

    /**
     * @notice Check if an island has the required buildings for a mission
     * @dev Always returns true for now
     * @param islandId ID of the island
     * @param requiredBuildingTypes Array of required building types
     * @param requiredLevels Array of required building levels
     * @return hasRequirements Whether the island meets the requirements
     */
    function hasRequiredBuildings(
        uint256 islandId,
        uint256[] calldata requiredBuildingTypes,
        uint256[] calldata requiredLevels
    ) external view override returns (bool) {
        // Always return true for now
        // In the future, this will actually check if the island has the required buildings
        return true;
    }

    /**
     * @notice Get the base docking slots for an island based on its size from IslandStorage
     * @param islandId ID of the island
     * @return slots Base docking slots for the island's size
     */
    function getDockingSlots(uint256 islandId) external view override returns (uint256) {        
        // Explicitly reference the interface for the enum type
        IIslandStorage.IslandSize size = islandStorage.getIslandSize(islandId);
        
        if (size == IIslandStorage.IslandSize.ExtraSmall) {
            return 1;
        } else if (size == IIslandStorage.IslandSize.Small) {
            return 2;
        } else if (size == IIslandStorage.IslandSize.Medium) {
            return 3;
        } else if (size == IIslandStorage.IslandSize.Large) {
            return 4;
        } else if (size == IIslandStorage.IslandSize.Huge) { // Assuming Huge maps to XL
            return 5;
        } else {
            revert("Unknown island size");
        }
    }

} 