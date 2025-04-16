// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IMissionsStorage.sol";

/**
 * @title IMissionValidator
 * @notice Interface for validating mission requirements
 */
interface IMissionValidator {
    /**
     * @notice Validate that a ship meets base requirements for missions
     * @param shipId The ID of the ship to validate
     */
    function validateShipRequirements(uint256 shipId) external view;

    /**
     * @notice Validate that islands have required buildings for a mission type
     * @param fromIslandId Source island ID
     * @param toIslandId Destination island ID
     * @param missionType Type of mission
     */
    function validateIslandRequirements(
        uint256 fromIslandId, 
        uint256 toIslandId, 
        uint256 missionType
    ) external view;

    /**
     * @notice Check if a ship has sufficient capacity for resources
     * @param shipId The ID of the ship
     * @param amount The amount of resources to check capacity for
     * @return True if the ship has sufficient capacity
     */
    function validateShipCapacity(uint256 shipId, uint256 amount) external view returns (bool);

    /**
     * @notice Check if a ship is locked
     * @param shipId The ID of the ship to check
     * @return locked True if the ship is locked
     */
    function isShipLocked(uint256 shipId) external view returns (bool);

    /**
     * @notice Check if user is the owner of an island
     * @param islandId Island ID to check
     * @param user Address to check ownership against
     * @return True if the user is the owner of the island
     */
    function isIslandOwner(uint256 islandId, address user) external view returns (bool);

    /**
     * @notice Get the home island for a ship
     * @param shipId The ID of the ship
     * @return The ID of the ship's home island
     */
    function getShipHomeIsland(uint256 shipId) external view returns (uint256);

    /**
     * @notice Get the level of a ship
     * @param shipId The ID of the ship
     * @return The ship's level
     */
    function getShipLevel(uint256 shipId) external view returns (uint256);

    function validateAndBurnMissionStartResources(
        uint256 shipId,
        uint256 travelDays,
        uint256 intendedCargo,
        string calldata foodChoice,
        string calldata foodRationChoice,
        address user
    ) external;

    function getTotalCrewCount(uint256 shipId) external view returns (uint256);
} 