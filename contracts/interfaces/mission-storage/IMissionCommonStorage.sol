// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../IMissionsStorage.sol";

/**
 * @title IMissionCommonStorage
 * @notice Base interface for common mission storage functionality
 * @dev Follows Interface Segregation Principle by providing the common storage operations
 */
interface IMissionCommonStorage {
    /**
     * @notice Complete a mission
     * @param shipId Ship identifier
     */
    function completeMission(uint256 shipId) external;
    
    /**
     * @notice Check if a ship is on a mission
     * @param shipId Ship identifier
     * @return True if the ship is on an active mission
     */
    function isOnMission(uint256 shipId) external view returns (bool);
    
    /**
     * @notice Get the mission type for a ship
     * @param shipId Ship identifier
     * @return Mission type ID
     */
    function getMissionType(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the mission end time
     * @param shipId Ship identifier
     * @return Timestamp when the mission ends
     */
    function getMissionEndTime(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the mission start time
     * @param shipId Ship identifier
     * @return Timestamp when the mission started
     */
    function getMissionStartTime(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the mission data hash
     * @param shipId Ship identifier
     * @return Hash of the mission data
     */
    function getMissionDataHash(uint256 shipId) external view returns (bytes32);
    
    /**
     * @notice Get a list of ships by mission type
     * @param missionType Type of mission as a uint256 ID
     * @return Array of ship IDs on the specified mission type
     */
    function getShipsByMissionType(uint256 missionType) external view returns (uint256[] memory);
} 