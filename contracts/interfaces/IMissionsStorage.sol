// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IMissionsStorage
 * @notice Interface for mission storage contracts
 * @dev Defines the storage operations for missions in the game
 */
interface IMissionsStorage {
    // Struct for basic mission info
    struct MissionBasicInfo {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 missionType; // uint256 instead of enum for extensibility
        uint256 missionId;        
    }
    
    // Alias for backward compatibility
    struct MissionInfo {
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 missionType; // uint256 instead of enum for extensibility
        uint256 missionId;        
    }
    
    // Events
    event MissionStarted(uint256 indexed shipId, uint256 indexed missionType, uint256 missionId);
    event MissionCompleted(uint256 indexed shipId, uint256 indexed missionType, uint256 missionId);
    event SpecializedStorageRegistered(uint256 indexed missionType, address storageContract);
    event MissionTypeRegistered(uint256 indexed missionType, string name);
    
    /**
     * @notice Register a mission type with a name
     * @param missionType Numeric identifier for the mission type
     * @param name Human-readable name for the mission type
     */
    function registerMissionType(uint256 missionType, string calldata name) external;
    
    /**
     * @notice Register a specialized storage contract for a mission type
     * @param missionType Type of mission
     * @param storageContract Address of the specialized storage contract
     */
    function registerSpecializedStorage(uint256 missionType, address storageContract) external;
    
    /**
     * @notice Get the specialized storage contract for a mission type
     * @param missionType Type of mission
     * @return Address of the specialized storage contract
     */
    function getSpecializedStorage(uint256 missionType) external view returns (address);
    
    /**
     * @notice Get mission information
     * @param shipId Ship identifier
     * @return Mission information
     */
    function getMissionInfo(uint256 shipId) external view returns (MissionInfo memory);
    
    /**
     * @notice Start a new mission and store its basic information
     * @param shipId Ship identifier
     * @param missionId Mission identifier
     * @param missionType Type of mission
     * @param duration Mission duration in seconds
     * @param missionData Encoded mission parameters for specialized storage
     */
    function startMission(
        uint256 shipId,
        uint256 missionId,
        uint256 missionType,
        uint256 duration,
        bytes calldata missionData
    ) external;
    
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
     * @notice Get the mission ID for a ship
     * @param shipId Ship identifier
     * @return Mission ID
     */
    function getMissionId(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the mission type for a ship
     * @param shipId Ship identifier
     * @return Mission type
     */
    function getMissionType(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the mission end time for a ship
     * @param shipId Ship identifier
     * @return End time in seconds since epoch
     */
    function getMissionEndTime(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the mission start time for a ship
     * @param shipId Ship identifier
     * @return Start time in seconds since epoch
     */
    function getMissionStartTime(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get all ships on a specific mission type
     * @param missionType Type of mission
     * @return Array of ship IDs
     */
    function getShipsByMissionType(uint256 missionType) external view returns (uint256[] memory);
    
    /**
     * @notice Get basic mission info for a ship
     * @param shipId Ship identifier
     * @return Mission basic information
     */
    function getMissionBasicInfo(uint256 shipId) external view returns (MissionBasicInfo memory);
    
    /**
     * @notice Get a random ship from specified mission types
     * @param missionTypes Array of mission types to choose from
     * @return A randomly selected ship ID, or 0 if none found
     */
    function getRandomShipOnMissionTypes(uint256[] calldata missionTypes) external view returns (uint256);
}
