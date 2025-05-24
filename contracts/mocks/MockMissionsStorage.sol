// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {IMissionsStorage} from "../interfaces/IMissionsStorage.sol";
import "../AuthorizationModifiers.sol";

/**
 * @title MockMissionsStorage
 * @notice Mock contract for testing purposes, implementing IMissionsStorage.
 */
contract MockMissionsStorage is IMissionsStorage, AuthorizationModifiers {
    bool private _startMissionCalled = false;
    StartMissionParams private _lastStartMissionParams;
    bool private _completeMissionCalled = false;
    uint256 private _lastCompletedShipId;
    mapping(uint256 => IMissionsStorage.MissionInfo) private _mockMissionInfos;

    // This struct is for the mock's internal tracking of startMission calls.
    // It should reflect parameters useful for assertions, which might differ from IMissionsStorage.startMission exact signature
    // if we only care about a subset or add mock-specific tracking.
    // The actual startMission function below WILL match the interface.
    struct StartMissionParams {
        uint256 shipId;
        uint256 missionId;
        uint256 missionType;
        uint256 duration;
        // bytes missionData; // Can add if tests need to assert this
    }

    constructor(address _car) AuthorizationModifiers(_car, keccak256("IMissionsStorage")) {}

    function reset() external {
        _startMissionCalled = false;
        _completeMissionCalled = false;
        // Consider clearing mappings if necessary for test isolation
        // For example, by iterating and deleting or reinitializing them.
    }

    function setMockMissionInfo(uint256 shipId, IMissionsStorage.MissionInfo memory info) external {
        _mockMissionInfos[shipId] = info;
    }

    function startMission(
        uint256 shipId,
        uint256 missionId,
        uint256 missionType,
        uint256 duration,
        bytes calldata missionData // Matched to interface
    ) external override {
        _startMissionCalled = true;
        _lastStartMissionParams = StartMissionParams({
            shipId: shipId,
            missionId: missionId,
            missionType: missionType,
            duration: duration
            // missionData: missionData // Store if needed for assertions
        });
        uint256 endTime = block.timestamp + duration;
        _mockMissionInfos[shipId] = IMissionsStorage.MissionInfo({
            startTime: block.timestamp,
            endTime: endTime,
            isActive: true,
            missionType: missionType,
            missionId: missionId
        });
    }

    function getMissionInfo(uint256 shipId) external view override returns (IMissionsStorage.MissionInfo memory) {
        if (_mockMissionInfos[shipId].missionId != 0 || _mockMissionInfos[shipId].isActive) { // Check missionId or isActive
            return _mockMissionInfos[shipId];
        }
        return IMissionsStorage.MissionInfo(0, 0, false, 0, 0);
    }

    function completeMission(uint256 shipId) external override {
        _completeMissionCalled = true;
        _lastCompletedShipId = shipId;
        if (_mockMissionInfos[shipId].missionId != 0) {
            _mockMissionInfos[shipId].isActive = false;
        }
    }

    // Implement all other functions from IMissionsStorage with basic mock behavior
    function registerMissionType(uint256 /*missionType*/, string calldata /*name*/) external override { /* no-op */ }
    function registerSpecializedStorage(uint256 /*missionType*/, address /*storageContract*/) external override { /* no-op */ }
    function getSpecializedStorage(uint256 /*missionType*/) external view override returns (address) { return address(0); }

    function isOnMission(uint256 shipId) external view override returns (bool) { 
        return _mockMissionInfos[shipId].isActive; 
    }

    function getMissionId(uint256 shipId) external view override returns (uint256) {
        return _mockMissionInfos[shipId].missionId; 
    }

    function getMissionType(uint256 shipId) external view override returns (uint256) {
        return _mockMissionInfos[shipId].missionType; 
    }

    function getMissionEndTime(uint256 shipId) external view override returns (uint256) {
        return _mockMissionInfos[shipId].endTime; 
    }

    function getMissionStartTime(uint256 shipId) external view override returns (uint256) {
        return _mockMissionInfos[shipId].startTime; 
    }

    function getShipsByMissionType(uint256 /*missionType*/) external view override returns (uint256[] memory) { 
        uint256[] memory empty; return empty; 
    }
    
    function getMissionBasicInfo(uint256 shipId) external view override returns (IMissionsStorage.MissionBasicInfo memory) { 
        if (_mockMissionInfos[shipId].missionId != 0 || _mockMissionInfos[shipId].isActive) {
            IMissionsStorage.MissionInfo memory info = _mockMissionInfos[shipId];
            return IMissionsStorage.MissionBasicInfo(info.startTime, info.endTime, info.isActive, info.missionType, info.missionId);
        }
        return IMissionsStorage.MissionBasicInfo(0, 0, false, 0, 0);
    }
    
    function getRandomShipOnMissionTypes(uint256[] calldata /*missionTypes*/) external view override returns (uint256) { 
        return 0; 
    }

    // View functions for asserting mock state
    function startMissionCalled() external view returns (bool) {
        return _startMissionCalled;
    }

    function getLastStartMissionParams() external view returns (StartMissionParams memory) {
        return _lastStartMissionParams;
    }

    function completeMissionCalled() external view returns (bool) {
        return _completeMissionCalled;
    }

    function getLastCompletedShipId() external view returns (uint256) {
        return _lastCompletedShipId;
    }
}

/*
// Original content commented out for debugging deploy

import {IMissionsStorage} from "../interfaces/IMissionsStorage.sol";
import "../AuthorizationModifiers.sol";


contract MockMissionsStorage is IMissionsStorage, AuthorizationModifiers {
    bool private _startMissionCalled = false;
    StartMissionParams private _lastStartMissionParams;
    bool private _completeMissionCalled = false;
    uint256 private _lastCompletedShipId;
    mapping(uint256 => IMissionsStorage.MissionInfo) private _mockMissionInfos; 

    struct StartMissionParams {
        uint256 shipId;
        uint256 missionId;
        uint256 missionType;
        uint256 duration;
    }

    constructor(address _car)
        AuthorizationModifiers(_car, keccak256("IMissionsStorage"))
    {}

    function reset() external {
        _startMissionCalled = false;
        _completeMissionCalled = false;
    }

    function setMockMissionInfo(uint256 shipId, IMissionsStorage.MissionInfo memory info) external { 
        _mockMissionInfos[shipId] = info;
    }

    function startMission(
        uint256 shipId,
        uint256 missionId,
        uint256 missionType,
        uint256 duration,
        bytes calldata 
    ) external override {
        _startMissionCalled = true;
        _lastStartMissionParams = StartMissionParams({
            shipId: shipId,
            missionId: missionId,
            missionType: missionType,
            duration: duration
        });
        uint256 endTime = block.timestamp + duration;
        _mockMissionInfos[shipId] = IMissionsStorage.MissionInfo({
            startTime: block.timestamp,
            endTime: endTime,
            isActive: true,
            missionType: missionType,
            missionId: missionId
        });
    }
    
    function getMissionInfo(uint256 shipId) external view override returns (IMissionsStorage.MissionInfo memory) { 
        if (_mockMissionInfos[shipId].missionId != 0) {
            return _mockMissionInfos[shipId];
        }
        return IMissionsStorage.MissionInfo(0, 0, false, 0, 0); 
    }

    function completeMission(uint256 shipId) external override {
        _completeMissionCalled = true;
        _lastCompletedShipId = shipId;
        if (_mockMissionInfos[shipId].missionId != 0) {
            _mockMissionInfos[shipId].isActive = false;
        }
    }

    function registerMissionType(uint256, string calldata) external override { }
    function registerSpecializedStorage(uint256, address) external override { }
    function getSpecializedStorage(uint256) external view override returns (address) { return address(0); }
    function isOnMission(uint256 shipId) external view override returns (bool) { return _mockMissionInfos[shipId].isActive; }
    function getMissionId(uint256 shipId) external view override returns (uint256) { return _mockMissionInfos[shipId].missionId; }
    function getMissionType(uint256 shipId) external view override returns (uint256) { return _mockMissionInfos[shipId].missionType; }
    function getMissionEndTime(uint256 shipId) external view override returns (uint256) { return _mockMissionInfos[shipId].endTime; }
    function getMissionStartTime(uint256 shipId) external view override returns (uint256) { return _mockMissionInfos[shipId].startTime; }
    function getShipsByMissionType(uint256) external view override returns (uint256[] memory) { uint256[] memory empty; return empty; }
    function getMissionBasicInfo(uint256 shipId) external view override returns (IMissionsStorage.MissionBasicInfo memory) { 
        if (_mockMissionInfos[shipId].missionId != 0) {
            IMissionsStorage.MissionInfo memory info = _mockMissionInfos[shipId];
            return IMissionsStorage.MissionBasicInfo(info.startTime, info.endTime, info.isActive, info.missionType, info.missionId);
        }
        return IMissionsStorage.MissionBasicInfo(0, 0, false, 0, 0); 
    }
    function getRandomShipOnMissionTypes(uint256[] calldata) external view override returns (uint256) { return 0; }
    
    function startMissionCalled() external view returns (bool) {
        return _startMissionCalled;
    }

    function getLastStartMissionParams() external view returns (StartMissionParams memory) {
        return _lastStartMissionParams;
    }

    function completeMissionCalled() external view returns (bool) {
        return _completeMissionCalled;
    }

    function getLastCompletedShipId() external view returns (uint256) {
        return _lastCompletedShipId;
    }
}
*/ 