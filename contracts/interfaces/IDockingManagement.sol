// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IDockingManagement {
    event ShipDocked(uint256 indexed shipId, uint256 indexed islandId, address indexed owner, uint256 timestamp, uint256 slotsUsed);
    event ShipUndocked(uint256 indexed shipId, uint256 indexed islandId, address indexed owner, uint256 timestamp, uint256 slotsFreed);
    event ShipRebased(uint256 indexed shipId, uint256 indexed oldIslandId, uint256 indexed newIslandId, address owner, uint256 timestamp, uint256 slotsUsed);

    // Query slot requirement for a ship class
    function getSlotRequirementForShipClass(string calldata shipClass) external view returns (uint256);

    // Query available slots for an island (reads from Building/Port contract)
    function getAvailableSlots(uint256 islandId) external view returns (uint256);

    // Query all docked ship IDs for an island
    function getDockedShips(uint256 islandId) external view returns (uint256[] memory);

    // Query the island a ship is currently docked at (0 if not docked)
    function getShipDockedIsland(uint256 shipId) external view returns (uint256);

    // Check if a ship can dock at an island (enough slots)
    function canDock(uint256 islandId, uint256 slotsRequired) external view returns (bool);

    // Dock a ship (onlyAuthorized)
    function dockShip(uint256 shipId, uint256 islandId, address owner, string calldata shipClass) external;

    // Undock a ship (onlyAuthorized)
    function undockShip(uint256 shipId, uint256 islandId, address owner, string calldata shipClass) external;

    // Rebase a ship to a new island (onlyAuthorized)
    function rebaseShip(uint256 shipId, uint256 oldIslandId, uint256 newIslandId, address owner, string calldata shipClass) external;
} 