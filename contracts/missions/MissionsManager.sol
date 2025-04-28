// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../interfaces/IMissionFactory.sol";
import "../interfaces/IMissionsManager.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMission.sol";
import "../AuthorizationModifiers.sol";
import "./MissionRegistration.sol";
import "../interfaces/ICooldownManager.sol";

contract MissionsManager is IMissionsManager, AuthorizationModifiers {
    using Strings for uint256;

    struct MissionInfo {
        bool isActive;
        uint256 shipId;
        uint256 missionType;
        uint256 startTime;
        uint256 endTime;
        bool isCompleted;
    }

    mapping(uint256 => MissionInfo) public missions;
    mapping(uint256 => uint256) public shipToActiveMission;
    uint256 public nextMissionId = 1;

    event MissionStarted(uint256 indexed missionId, uint256 indexed shipId, uint256 missionType);
    event MissionCompleted(uint256 indexed missionId, uint256 indexed shipId, uint256 missionType);

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionsManager")) 
    {}

    function getCooldownManager() internal view returns (ICooldownManager) {
        return ICooldownManager(centralAuthorizationRegistry.getContractAddress(keccak256("ICooldownManager")));
    }

    function startMission(
        uint256 shipId,
        uint256 missionType,
        bytes calldata missionData
    ) external override returns (uint256 missionId) {
        require(shipToActiveMission[shipId] == 0, "Ship already on mission");
        
        ICooldownManager cooldownManager = getCooldownManager();
        bytes32 cooldownKey = keccak256(abi.encodePacked("ship", shipId));
        require(!cooldownManager.isOnCooldown(cooldownKey), "Ship is on cooldown");
        
        address shipStorageAddress = centralAuthorizationRegistry.getContractAddress(keccak256("IShipStorage"));
        IShipStorage shipStorage = IShipStorage(shipStorageAddress);
        
        address shipOwner = shipStorage.getOwner(shipId);
        require(shipOwner == msg.sender, "MM: caller is not ship owner");
        require(shipOwner != address(0), "Ship does not exist");
        
        MissionRegistration missionRegistry = getMissionRegistration();
        string memory missionTypeName = missionRegistry.getMissionTypeName(missionType);
        require(bytes(missionTypeName).length > 0, "Invalid mission type");
        
        missionId = nextMissionId++;
        
        IMissionFactory factory = getMissionFactory();
        address missionContractAddress = factory.getMissionContract(missionType);
        require(missionContractAddress != address(0), "No implementation for this mission type");
        
        IMission missionContract = IMission(missionContractAddress);
        
        bytes memory fullMissionData = abi.encode(missionId, missionData);
        
        uint256 duration = missionContract.startMission(shipId, fullMissionData);
        require(duration > 0, "Invalid mission duration");
        
        missions[missionId] = MissionInfo({
            isActive: true,
            shipId: shipId,
            missionType: missionType,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            isCompleted: false
        });
        
        shipToActiveMission[shipId] = missionId;
        
        emit MissionStarted(missionId, shipId, missionType);
        
        return missionId;
    }

    function completeMission(uint256 missionId) external override onlyAuthorized {
        MissionInfo storage mission = missions[missionId];
        
        require(mission.isActive, "No active mission with this ID");
        require(!mission.isCompleted, "Mission already completed");
        require(block.timestamp >= mission.endTime, "Mission not yet complete");
        
        address missionContractAddress = getMissionFactory().getMissionContract(mission.missionType);
        require(missionContractAddress != address(0), "No implementation for this mission type");
        
        IMission missionContract = IMission(missionContractAddress);
        
        missionContract.completeMission(missionId);
        
        mission.isCompleted = true;
        mission.isActive = false;
        shipToActiveMission[mission.shipId] = 0;
        
        emit MissionCompleted(missionId, mission.shipId, mission.missionType);
    }

    function getMissionStatus(uint256 missionId) external view override returns (
        bool isActive,
        uint256 shipId,
        uint256 missionType,
        uint256 startTime,
        uint256 endTime,
        bool isCompleted
    ) {
        MissionInfo memory mission = missions[missionId];
        return (
            mission.isActive,
            mission.shipId,
            mission.missionType,
            mission.startTime,
            mission.endTime,
            mission.isCompleted
        );
    }

    function getActiveShipMission(uint256 shipId) external view override returns (uint256 missionId) {
        return shipToActiveMission[shipId];
    }

    function getMissionDetails(uint256 missionId) external view returns (bytes memory missionDetails) {
        MissionInfo memory mission = missions[missionId];
        
        require(mission.isActive || mission.isCompleted, "No mission with this ID");
        
        address missionContractAddress = getMissionFactory().getMissionContract(mission.missionType);
        require(missionContractAddress != address(0), "No implementation for this mission type");
        
        IMission missionContract = IMission(missionContractAddress);
        
        return missionContract.getMissionDetails(missionId);
    }

    function getMissionFactory() internal view returns (IMissionFactory) {
        return IMissionFactory(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionFactory")));
    }
    
    function getMissionRegistration() internal view returns (MissionRegistration) {
        return MissionRegistration(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionRegistration")));
    }
} 