// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../interfaces/IMissionFactory.sol";
import "../interfaces/IMissionsManager.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMission.sol";
import "../interfaces/IMissionAuthorization.sol";
import "../AuthorizationModifiers.sol";
import "./MissionRegistration.sol";
import "../interfaces/ICooldownManager.sol";

import "../core/InterfaceIdentifiers.sol";
import "../interfaces/ships/IShipAndPirateStaking.sol";
import "hardhat/console.sol";

// Custom Errors
error ShipAlreadyOnMission(uint256 shipId, uint256 activeMissionId);
error ShipOnCooldown(uint256 shipId, uint256 cooldownEndTime);
error InvalidMissionType(uint256 missionType);
error MissionContractNotFound(uint256 missionType);
error MissionIdMismatch(uint256 expectedMissionId, uint256 actualMissionId);

contract MissionsManager is IMissionsManager, AuthorizationModifiers {
    using Strings for uint256;

    struct MissionInfo {
        bool isActive;
        uint256 shipId;
        uint256 missionType;
        uint256 startTime;
        uint256 endTime; // endTime will be fetched after mission contract execution
        bool isCompleted;
    }

    mapping(uint256 => MissionInfo) public missions;
    mapping(uint256 => uint256) public shipToActiveMission;
    uint256 public nextMissionId = 1;

    event MissionStarted(uint256 indexed missionId, uint256 indexed shipId, uint256 missionType);
    event MissionCompleted(uint256 indexed missionId, uint256 indexed shipId, uint256 missionType);
    event MissionFailed(uint256 indexed missionId, uint256 indexed shipId, uint256 missionType);

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256(abi.encodePacked("IMissionsManager"))) {}

    function getCooldownManager() internal view returns (ICooldownManager) {
        console.log("MissionsManager: getCooldownManager called");
        return ICooldownManager(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.COOLDOWN_MANAGER_KEY));
    }

    function getMissionFactory() internal view returns (IMissionFactory) {
        console.log("MissionsManager: getMissionFactory called");
        return IMissionFactory(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSION_FACTORY_KEY));
    }
    
    function getMissionsStorage() internal view returns (IMissionsStorage) {
        console.log("MissionsManager: getMissionsStorage called");
        return IMissionsStorage(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSIONS_STORAGE_KEY));
    }
    
    function getMissionRegistration() internal view returns (MissionRegistration) {
        console.log("MissionsManager: getMissionRegistration called");
        return MissionRegistration(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSION_REGISTRATION_KEY));
    }

    function getShipAndPirateStaking() internal view returns (IShipAndPirateStaking) {
        return IShipAndPirateStaking(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.SHIP_AND_PIRATE_STAKING_KEY));
    }

    function startMission(
        uint256 _shipId,
        uint256 _missionType,
        bytes calldata _innerMissionData
    ) external override returns (uint256 missionId) {
        console.log("MissionsManager: startMission called for shipId:", _shipId, "missionType:", _missionType);

        if (shipToActiveMission[_shipId] != 0) {
            console.log("MissionsManager: Reverting - Ship already on a mission. ActiveMissionId:", shipToActiveMission[_shipId]);
            revert ShipAlreadyOnMission(_shipId, shipToActiveMission[_shipId]);
        }
        console.log("MissionsManager: Checking shipToActiveMission for shipId:", _shipId, "Value:", shipToActiveMission[_shipId]);
        
        ICooldownManager cooldownManager = getCooldownManager();
        console.log("MissionsManager: Getting CooldownManager");
        bytes32 shipCooldownKey = keccak256(abi.encodePacked("ship", _shipId));
        console.logBytes(abi.encode(shipCooldownKey));
        if (cooldownManager.isOnCooldown(shipCooldownKey)) {
            console.log("MissionsManager: Reverting - Ship is on cooldown.");
            revert ShipOnCooldown(_shipId, cooldownManager.getCooldownEndTime(shipCooldownKey));
        }
        console.log("MissionsManager: Is ship on cooldown?", cooldownManager.isOnCooldown(shipCooldownKey));

        IMissionRegistration missionRegistration = getMissionRegistration();
        console.log("MissionsManager: Getting MissionRegistration");
        string memory missionTypeName = missionRegistration.getMissionTypeName(_missionType);
        console.log("MissionsManager: Getting missionTypeName for type:", _missionType);
        if (bytes(missionTypeName).length == 0) {
            console.log("MissionsManager: Reverting - Invalid mission type.");
            revert InvalidMissionType(_missionType);
        }
        console.log("MissionsManager: Checking missionTypeName length. Name:", missionTypeName);
        
        missionId = nextMissionId++;
        console.log("MissionsManager: Assigned missionId:", missionId);

        shipToActiveMission[_shipId] = missionId;

        IMissionFactory missionFactory = getMissionFactory();
        console.log("MissionsManager: Getting MissionFactory");
        address missionContractAddress = missionFactory.getMissionContract(_missionType);
        console.log("MissionsManager: Getting missionContractAddress for type:", _missionType);

        if (missionContractAddress == address(0)) {
            console.log("MissionsManager: Reverting - Mission contract not found for type.");
            revert MissionContractNotFound(_missionType);
        }
        console.log("MissionsManager: Checking missionContractAddress != address(0). Address:", missionContractAddress);
        
        // Construct fullMissionData correctly
        bytes memory missionIdBytes = abi.encode(missionId);
        bytes memory innerMissionDataMemory = _innerMissionData; // Implicitly converts calldata to memory
        bytes memory fullMissionData = bytes.concat(missionIdBytes, innerMissionDataMemory);
        
        console.log("MissionsManager: Calling missionContract.startMission for shipId:", _shipId);
        (uint256 actualMissionId) = IMission(missionContractAddress).startMission(_shipId, fullMissionData);

        // Ensure the missionId returned by the specific mission contract matches the one assigned by MissionsManager
        // This is a critical consistency check. BaseMission.startMission returns the missionId it decodes.
        if (actualMissionId != missionId) {
            revert MissionIdMismatch(missionId, actualMissionId);
        }

        IMissionsStorage missionsStorage = getMissionsStorage();
        IMissionsStorage.MissionBasicInfo memory missionBasicInfo = missionsStorage.getMissionBasicInfo(_shipId);
        require(missionBasicInfo.missionId == missionId && missionBasicInfo.isActive, "Mission not properly started in MissionsStorage");
        
        missions[missionId] = MissionInfo({
            isActive: true,
            shipId: _shipId,
            missionType: _missionType,
            startTime: missionBasicInfo.startTime,
            endTime: missionBasicInfo.endTime,
            isCompleted: false
        });
        console.log("MissionsManager: Mission info stored for missionId:", missionId, "EndTime:", missions[missionId].endTime);
        
        console.log("MissionsManager: Emitting MissionStarted event for missionId:", missionId);
        emit MissionStarted(missionId, _shipId, _missionType);
        
        return missionId;
    }

    function completeMission(uint256 shipId) external override {
        uint256 missionId = shipToActiveMission[shipId];
        require(missionId != 0, "Ship is not on an active mission");

        IMissionsStorage missionsStorage = getMissionsStorage();
        uint256 missionType = missionsStorage.getMissionType(shipId);
        
        // Get mission contract and check authorization through the mission contract
        address missionContractAddress = getMissionFactory().getMissionContract(missionType);
        require(missionContractAddress != address(0), "No implementation for this mission type");
        
        // Use generic authorization interface - each mission defines its own authorization rules
        IMissionAuthorization authContract = IMissionAuthorization(missionContractAddress);
        require(authContract.isAuthorizedToComplete(missionId, msg.sender), "Caller not authorized to complete this mission");
        
        MissionInfo storage mission = missions[missionId];
        
        require(mission.isActive, "No active mission with this ID");
        require(!mission.isCompleted, "Mission already completed");
        require(block.timestamp >= mission.endTime, "Mission not yet complete");        
        
        IMission missionContract = IMission(missionContractAddress);
        
        // Let the mission contract determine if it's fully complete or just advanced
        bool isFullyComplete = missionContract.completeMission(missionId);
        
        // Only complete the mission tracking if the mission contract says it's fully done
        if (isFullyComplete) {
            mission.isCompleted = true;
            mission.isActive = false;
            shipToActiveMission[mission.shipId] = 0;
            
            emit MissionCompleted(missionId, mission.shipId, mission.missionType);
        }
        // If not fully complete, mission just advanced to next phase - don't emit completion event
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
        console.log("MissionsManager: getMissionStatus called for missionId:", missionId, "isActive:", mission.isActive);
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
        console.log("MissionsManager: getActiveShipMission called for shipId:", shipId, "returning:", shipToActiveMission[shipId]);
        return shipToActiveMission[shipId];
    }

    function getMissionDetails(uint256 missionId) external view returns (bytes memory missionDetails) {
        console.log("MissionsManager: getMissionDetails called for missionId:", missionId);
        MissionInfo memory mission = missions[missionId];
        
        console.log("MissionsManager: Checking mission.isActive || mission.isCompleted.");
        console.log("MissionsManager: - missionId:", missionId);
        console.log("MissionsManager: - isActive:", mission.isActive);
        console.log("MissionsManager: - isCompleted:", mission.isCompleted);
        require(mission.isActive || mission.isCompleted, "No mission with this ID");
        
        address missionContractAddress = getMissionFactory().getMissionContract(mission.missionType);
        console.log("MissionsManager: Checking missionContractAddress != address(0) in getMissionDetails. Address:", missionContractAddress);
        require(missionContractAddress != address(0), "No implementation for this mission type");
        
        IMission missionContract = IMission(missionContractAddress);
        console.log("MissionsManager: Calling missionContract.getMissionDetails for missionId:", missionId);
        return missionContract.getMissionDetails(missionId);
    }

    function failMission(uint256 missionId) external onlyAuthorized {
        MissionInfo storage mission = missions[missionId];
        require(mission.isActive, "No active mission with this ID");
        mission.isActive = false;
        mission.isCompleted = false; // Optionally add a new isFailed flag if needed
        shipToActiveMission[mission.shipId] = 0;
        // Set cooldown for the ship (e.g., 1 hour = 3600 seconds)
        ICooldownManager cooldownManager = getCooldownManager();
        bytes32 shipCooldownKey = keccak256(abi.encodePacked("ship", mission.shipId));
        cooldownManager.setCooldown(shipCooldownKey, 3600, "failMission"); // 1 hour cooldown with context
        emit MissionFailed(missionId, mission.shipId, mission.missionType);
    }
} 