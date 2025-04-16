// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/IMissionRegistration.sol";

/**
 * @title MissionRegistration
 * @notice Registry for mission types
 * @dev Enables dynamic registration and lookup of mission types
 */
contract MissionRegistration is IMissionRegistration, AuthorizationModifiers {
    // Constants for common mission types
    uint256 public constant TRADE_MISSION = 1;
    uint256 public constant RESOURCE_TRANSFER_MISSION = 2;
    uint256 public constant EXPLORATION_MISSION = 3;
    
    // Mappings for mission type registration
    mapping(uint256 => string) private missionTypeNames;
    mapping(string => uint256) private missionTypeIds;
    
    // Events
    event MissionTypeRegistered(uint256 indexed missionType, string name);
    
    /**
     * @notice Constructor for MissionRegistration
     * @param _centralAuthorizationRegistry Address of the central authorization registry
     */
    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionRegistration")) 
    {
        // Register default mission types
        _registerMissionType(TRADE_MISSION, "Trade");
        _registerMissionType(RESOURCE_TRANSFER_MISSION, "ResourceTransfer");
        _registerMissionType(EXPLORATION_MISSION, "Exploration");
    }
    
    /**
     * @notice Register a mission type with a name
     * @param missionType Numeric identifier for the mission type
     * @param name Human-readable name for the mission type
     */
    function registerMissionType(uint256 missionType, string calldata name) external onlyAuthorized {
        _registerMissionType(missionType, name);
    }
    
    /**
     * @notice Internal function to register a mission type
     * @param missionType Numeric identifier for the mission type
     * @param name Human-readable name for the mission type
     */
    function _registerMissionType(uint256 missionType, string memory name) internal {
        require(missionType > 0, "Mission type must be greater than 0");
        require(bytes(name).length > 0, "Mission name cannot be empty");
        require(bytes(missionTypeNames[missionType]).length == 0, "Mission type already registered");
        require(missionTypeIds[name] == 0, "Mission name already registered");
        
        missionTypeNames[missionType] = name;
        missionTypeIds[name] = missionType;
        
        emit MissionTypeRegistered(missionType, name);
    }
    
    /**
     * @notice Get the mission type ID by name
     * @param name Name of the mission type
     * @return missionType Numeric identifier for the mission type
     */
    function getMissionTypeByName(string calldata name) external view returns (uint256) {
        uint256 missionType = missionTypeIds[name];
        require(missionType > 0, "Mission type not registered");
        return missionType;
    }
    
    /**
     * @notice Get the mission type name by ID
     * @param missionType Numeric identifier for the mission type
     * @return name Human-readable name for the mission type
     */
    function getMissionTypeName(uint256 missionType) external view returns (string memory) {
        string memory name = missionTypeNames[missionType];
        require(bytes(name).length > 0, "Mission type not registered");
        return name;
    }
    
    /**
     * @notice Check if a mission type is registered
     * @param missionType Numeric identifier for the mission type
     * @return True if the mission type is registered
     */
    function isMissionTypeRegistered(uint256 missionType) external view returns (bool) {
        return bytes(missionTypeNames[missionType]).length > 0;
    }
} 