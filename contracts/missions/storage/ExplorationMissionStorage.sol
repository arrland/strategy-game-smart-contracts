// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../AuthorizationModifiers.sol";
import "../../interfaces/IMissionsStorage.sol";
import "../../interfaces/mission-storage/IMissionTypeStorage.sol";
import "../../interfaces/mission-storage/IExplorationMissionStorage.sol";

contract ExplorationMissionStorage is IExplorationMissionStorage, AuthorizationModifiers {
    // Constants
    uint8 public constant DISCOVERY_NONE = 0;
    uint8 public constant DISCOVERY_RESOURCE = 1;
    uint8 public constant DISCOVERY_ARTIFACT = 2;
    uint8 public constant DISCOVERY_ISLAND = 3;
    
    // Mission data structure
    struct ExplorationData {
        uint256 targetIslandId;
        uint8 discoveryType;
        bytes discoveryData;
        bool isCompleted;
    }
    
    // Storage mapping
    mapping(uint256 => ExplorationData) private missionData;
    
    // Events
    event ExplorationInitialized(
        uint256 indexed missionId,
        uint256 targetIslandId
    );
    event ExplorationCompleted(uint256 indexed missionId);
    event DiscoveryRecorded(
        uint256 indexed missionId,
        uint8 discoveryType
    );
    
    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionTypeStorage")) {}
    
    function initializeMission(
        uint256 missionId,
        bytes memory missionDataBytes
    ) external override onlyAuthorized {
        // Decode mission data
        uint256 targetIslandId = abi.decode(missionDataBytes, (uint256));
        
        // Create and store mission data
        ExplorationData memory newData = ExplorationData({
            targetIslandId: targetIslandId,
            discoveryType: DISCOVERY_NONE,
            discoveryData: bytes(""),
            isCompleted: false
        });
        
        missionData[missionId] = newData;
        
        emit ExplorationInitialized(
            missionId,
            targetIslandId
        );
    }
    
    function initializeMission(
        uint256 shipId,
        uint256 missionId,
        bytes memory missionDataBytes
    ) external onlyAuthorized {
        // Call the IMissionTypeStorage implementation
        this.initializeMission(missionId, missionDataBytes);
    }
    
    function completeMission(uint256 missionId) external override onlyAuthorized {
        ExplorationData storage data = missionData[missionId];
        require(!data.isCompleted, "Mission already completed");
        
        data.isCompleted = true;
        
        emit ExplorationCompleted(missionId);
    }
    
    function completeMission(uint256 shipId, uint256 missionId) external onlyAuthorized {
        // Call the IMissionTypeStorage implementation
        this.completeMission(missionId);
    }
    
    function getMissionData(uint256 missionId) external view override returns (bytes memory) {
        ExplorationData storage data = missionData[missionId];
        
        return abi.encode(
            data.targetIslandId,
            data.discoveryType,
            data.discoveryData,
            data.isCompleted
        );
    }
    
    function supportsMissionType(uint256 missionType) external pure override returns (bool) {
        // Exploration mission type is registered with ID 3
        return missionType == 3; // EXPLORATION_MISSION
    }
    
    function getTargetIslandId(uint256 missionId) external view override returns (uint256) {
        return missionData[missionId].targetIslandId;
    }
    
    function hasDiscoveredSomething(uint256 missionId) external view override returns (bool) {
        return missionData[missionId].discoveryType != DISCOVERY_NONE;
    }
    
    function getDiscoveryType(uint256 missionId) external view override returns (uint8) {
        return missionData[missionId].discoveryType;
    }
    
    function getDiscoveredResource(uint256 missionId) external view override returns (
        uint256 resourceType,
        uint256 amount
    ) {
        require(missionData[missionId].discoveryType == DISCOVERY_RESOURCE, "Not a resource discovery");
        return abi.decode(missionData[missionId].discoveryData, (uint256, uint256));
    }
    
    function getDiscoveredArtifact(uint256 missionId) external view override returns (
        uint256 artifactId,
        uint8 rarity
    ) {
        require(missionData[missionId].discoveryType == DISCOVERY_ARTIFACT, "Not an artifact discovery");
        return abi.decode(missionData[missionId].discoveryData, (uint256, uint8));
    }
    
    function getDiscoveredIsland(uint256 missionId) external view override returns (uint256 islandId) {
        require(missionData[missionId].discoveryType == DISCOVERY_ISLAND, "Not an island discovery");
        return abi.decode(missionData[missionId].discoveryData, (uint256));
    }
    
    function recordDiscovery(
        uint256 missionId, 
        uint8 discoveryType, 
        bytes memory discoveryData
    ) external override onlyAuthorized {
        require(discoveryType >= DISCOVERY_NONE && discoveryType <= DISCOVERY_ISLAND, "Invalid discovery type");
        require(!missionData[missionId].isCompleted, "Mission already completed");
        
        ExplorationData storage data = missionData[missionId];
        data.discoveryType = discoveryType;
        data.discoveryData = discoveryData;
        
        emit DiscoveryRecorded(missionId, discoveryType);
    }
} 