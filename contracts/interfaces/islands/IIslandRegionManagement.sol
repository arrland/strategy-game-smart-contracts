// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IIslandRegionManagement
 * @notice Interface for island region management
 */
interface IIslandRegionManagement {
    // Enums
    enum Distance { Short, Medium, Long }
    enum Region { North, South, East, West, Central }

    // Events
    event IslandRegionSet(uint256 indexed islandId, Region region);
    event IslandCoordinatesSet(uint256 indexed islandId, uint256 x, uint256 y);

    // Functions
    function setIslandRegion(uint256 islandId, Region region) external;
    function setIslandCoordinates(uint256 islandId, uint256 x, uint256 y) external;
    function getIslandRegion(uint256 islandId) external view returns (Region);
    function getIslandCoordinates(uint256 islandId) external view returns (uint256 x, uint256 y);
    function calculateDistance(uint256 fromIslandId, uint256 toIslandId) external view returns (Distance);
} 