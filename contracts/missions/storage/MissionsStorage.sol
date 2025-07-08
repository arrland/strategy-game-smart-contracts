// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../AuthorizationModifiers.sol";
import "../../interfaces/IMissionsStorage.sol";
import "../../interfaces/mission-storage/IMissionTypeStorage.sol";

import "hardhat/console.sol";

/**
 * @title MissionsStorage
 * @notice Central mission storage with registry for specialized storage
 * @dev Implements a hybrid approach with central indexing and delegated specialized storage
 */
contract MissionsStorage is IMissionsStorage, AuthorizationModifiers {    
    // Central tracking of all active missions
    mapping(uint256 => MissionBasicInfo) private shipMissions; // shipId => MissionBasicInfo
    
    // Mission type indexes for efficient querying
    mapping(uint256 => uint256[]) private missionTypeShips;
    mapping(uint256 => uint256) private shipToMissionTypeIndex;
    
    // Registry of specialized storage contracts and mission types
    mapping(uint256 => address) private specializedStorage;
    mapping(uint256 => string) private missionTypeNames;
    mapping(string => uint256) private missionTypesByName;
    uint256[] private registeredMissionTypes;
    
    constructor(address _centralAuthorizationRegistry)
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionsStorage"))
    {}
    
    /**
     * @notice Register a mission type with a name
     * @param missionType Numeric identifier for the mission type
     * @param name Human-readable name for the mission type
     */
    function registerMissionType(uint256 missionType, string calldata name) external override onlyAdmin {
        require(missionType > 0, "Invalid mission type ID");
        require(bytes(missionTypeNames[missionType]).length == 0, "Mission type already registered");
        require(bytes(name).length > 0, "Mission type name cannot be empty");
        require(missionTypesByName[name] == 0, "Mission type name already used");
        
        missionTypeNames[missionType] = name;
        missionTypesByName[name] = missionType;
        registeredMissionTypes.push(missionType);
        
        emit MissionTypeRegistered(missionType, name);
    }
    

    function getRegisteredMissionTypes() external view returns (uint256[] memory) {
        return registeredMissionTypes;
    }
    
    /**
     * @notice Get mission type by name
     * @param name Mission type name
     * @return Mission type ID
     */
    function getMissionTypeByName(string calldata name) external view returns (uint256) {
        uint256 missionType = missionTypesByName[name];
        require(missionType != 0, "Mission type not found");
        return missionType;
    }
    
    /**
     * @notice Get mission type name
     * @param missionType Mission type ID
     * @return Mission type name
     */
    function getMissionTypeName(uint256 missionType) external view returns (string memory) {
        string memory name = missionTypeNames[missionType];
        require(bytes(name).length > 0, "Mission type not registered");
        return name;
    }

    /**
     * @notice Register a specialized storage contract for a mission type
     * @param missionType Type of mission
     * @param storageContract Address of the specialized storage contract
     */
    function registerSpecializedStorage(uint256 missionType, address storageContract) 
        external override onlyAdmin {
        require(storageContract != address(0), "Invalid storage contract");
        require(bytes(missionTypeNames[missionType]).length > 0, "Mission type not registered");
        
        // Verify the contract implements the correct interface and supports this mission type
        IMissionTypeStorage storage_ = IMissionTypeStorage(storageContract);
        require(storage_.supportsMissionType(missionType), "Mission type mismatch");
        
        specializedStorage[missionType] = storageContract;
        emit SpecializedStorageRegistered(missionType, storageContract);
    }
    
    /**
     * @notice Get the specialized storage contract for a mission type
     * @param missionType Type of mission
     * @return Address of the specialized storage contract
     */
    function getSpecializedStorage(uint256 missionType) 
        external view override returns (address) {
        address storageAddr = specializedStorage[missionType];
        require(storageAddr != address(0), "Storage not registered for mission type");
        return storageAddr;
    }

    /**
     * @notice Get mission information (for IMissionsStorage interface compliance)
     * @param shipId Ship identifier
     * @return Mission information
     */
    function getMissionInfo(uint256 shipId) external view override returns (MissionInfo memory) {
        MissionBasicInfo memory basicInfo = shipMissions[shipId];
        
        // Convert MissionBasicInfo to MissionInfo
        return MissionInfo({
            startTime: basicInfo.startTime,
            endTime: basicInfo.endTime,
            isActive: basicInfo.isActive,
            missionType: basicInfo.missionType,
            missionId: basicInfo.missionId
        });
    }

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
    ) external override onlyAuthorized {
        require(!isOnMission(shipId), "Ship already on mission");
        
        // Update central index
        shipMissions[shipId] = MissionBasicInfo({
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isActive: true,
            missionType: missionType,
            missionId: missionId
        });

        console.log("MissionsStorage: Mission started for shipId:");
        
        // Add to mission type index
        _addShipToMissionType(shipId, missionType);

        console.log("MissionsStorage: Mission added to mission type index");
        
        // Delegate to specialized storage
        address storageAddr = specializedStorage[missionType];
        require(storageAddr != address(0), "No specialized storage for mission type");
        console.log("MissionsStorage: Delegate to specialized storage");
        IMissionTypeStorage(storageAddr).initializeMission(
            missionId,
            missionData
        );
        
        emit MissionStarted(shipId, missionType, missionId);
    }
    
    /**
     * @notice Complete a mission
     * @param shipId Ship identifier
     */
    function completeMission(uint256 shipId) external override onlyAuthorized {
        MissionBasicInfo storage mission = shipMissions[shipId];
        require(mission.isActive, "No active mission");
        
        uint256 missionType = mission.missionType;
        uint256 missionId = mission.missionId;
        
        // Delegate to specialized storage for specific cleanup
        address storageAddr = specializedStorage[missionType];
        IMissionTypeStorage(storageAddr).completeMission(missionId);
        
        // Update central index
        _removeShipFromMissionType(shipId, missionType);
        mission.isActive = false;
        
        emit MissionCompleted(shipId, missionType, missionId);
    }
    
    /**
     * @notice Check if a ship is on a mission
     * @param shipId Ship identifier
     * @return True if the ship is on an active mission
     */
    function isOnMission(uint256 shipId) public view override returns (bool) {
        return shipMissions[shipId].isActive;
    }
    
    /**
     * @notice Get the mission ID for a ship
     * @param shipId Ship identifier
     * @return Mission ID
     */
    function getMissionId(uint256 shipId) external view override returns (uint256) {
        return shipMissions[shipId].missionId;
    }
    
    /**
     * @notice Get the mission type for a ship
     * @param shipId Ship identifier
     * @return Mission type
     */
    function getMissionType(uint256 shipId) external view override returns (uint256) {
        return shipMissions[shipId].missionType;
    }
    
    /**
     * @notice Get the mission end time for a ship
     * @param shipId Ship identifier
     * @return End time in seconds since epoch
     */
    function getMissionEndTime(uint256 shipId) external view override returns (uint256) {
        return shipMissions[shipId].endTime;
    }
    
    /**
     * @notice Get the mission start time for a ship
     * @param shipId Ship identifier
     * @return Start time in seconds since epoch
     */
    function getMissionStartTime(uint256 shipId) external view override returns (uint256) {
        return shipMissions[shipId].startTime;
    }
    
    /**
     * @notice Get all ships on a specific mission type
     * @param missionType Type of mission
     * @return Array of ship IDs
     */
    function getShipsByMissionType(uint256 missionType) 
        external view override returns (uint256[] memory) {
        return missionTypeShips[missionType];
    }
    
    /**
     * @notice Get basic mission info for a ship
     * @param shipId Ship identifier
     * @return Mission basic information
     */
    function getMissionBasicInfo(uint256 shipId) external view override returns (MissionBasicInfo memory) {
        return shipMissions[shipId];
    }
    
    /**
     * @notice Get a random ship from specified mission types
     * @param missionTypes Array of mission types to choose from
     * @return A randomly selected ship ID, or 0 if none found
     */
    function getRandomShipOnMissionTypes(uint256[] calldata missionTypes) 
        external view override returns (uint256) {
        
        uint256 totalShips = 0;
        for (uint i = 0; i < missionTypes.length; i++) {
            totalShips += missionTypeShips[missionTypes[i]].length;
        }
        
        if (totalShips == 0) return 0;
        
        // Select a random index using a somewhat secure randomness source
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            blockhash(block.number - 1),
            msg.sender
        ))) % totalShips;
        
        // Find the ship at that index
        uint256 currentIndex = 0;
        for (uint i = 0; i < missionTypes.length; i++) {
            uint256[] memory ships = missionTypeShips[missionTypes[i]];
            if (randomIndex < currentIndex + ships.length) {
                return ships[randomIndex - currentIndex];
            }
            currentIndex += ships.length;
        }
        
        return 0; // Shouldn't reach here
    }
    
    // Index management helpers
    function _addShipToMissionType(uint256 shipId, uint256 missionType) internal {
        shipToMissionTypeIndex[shipId] = missionTypeShips[missionType].length;
        missionTypeShips[missionType].push(shipId);
    }
    
    function _removeShipFromMissionType(uint256 shipId, uint256 missionType) internal {
        uint256 index = shipToMissionTypeIndex[shipId];
        uint256 lastIndex = missionTypeShips[missionType].length - 1;
        
        if (index != lastIndex) {
            uint256 lastShipId = missionTypeShips[missionType][lastIndex];
            missionTypeShips[missionType][index] = lastShipId;
            shipToMissionTypeIndex[lastShipId] = index;
        }
        
        missionTypeShips[missionType].pop();
        delete shipToMissionTypeIndex[shipId];
    }
}