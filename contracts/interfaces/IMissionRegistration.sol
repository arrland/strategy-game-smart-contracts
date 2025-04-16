// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IMissionRegistration
 * @notice Interface for mission type registration and lookup
 * @dev Provides functions to register and look up mission types by ID or name
 */
interface IMissionRegistration {
    /**
     * @notice Register a mission type with a name
     * @param missionType Numeric identifier for the mission type
     * @param name Human-readable name for the mission type
     */
    function registerMissionType(uint256 missionType, string calldata name) external;
    
    /**
     * @notice Get the mission type ID by name
     * @param name Name of the mission type
     * @return missionType Numeric identifier for the mission type
     */
    function getMissionTypeByName(string calldata name) external view returns (uint256);
    
    /**
     * @notice Get the mission type name by ID
     * @param missionType Numeric identifier for the mission type
     * @return name Human-readable name for the mission type
     */
    function getMissionTypeName(uint256 missionType) external view returns (string memory);
    
    /**
     * @notice Check if a mission type is registered
     * @param missionType Numeric identifier for the mission type
     * @return True if the mission type is registered
     */
    function isMissionTypeRegistered(uint256 missionType) external view returns (bool);
} 