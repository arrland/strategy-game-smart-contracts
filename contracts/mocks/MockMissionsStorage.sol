// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "hardhat/console.sol";
import "../interfaces/IMissionsStorage.sol";
import "../AuthorizationModifiers.sol";

contract MockMissionsStorage is IMissionsStorage, AuthorizationModifiers {
    mapping(uint256 => MissionInfo) private _missions;

    constructor(address _centralAuthorizationRegistry)
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionsStorage")) {}

    // Helper for tests: set all mission fields
    function setMission(
        uint256 shipId,
        uint256 startTime,
        uint256 endTime,
        bool isActive,
        uint256 missionType,
        uint256 missionId
    ) external {
        _missions[shipId] = MissionInfo({
            startTime: startTime,
            endTime: endTime,
            isActive: isActive,
            missionType: missionType,
            missionId: missionId
        });
    }

    function getMissionInfo(uint256 shipId) external view override returns (MissionInfo memory) {
        console.log("[DEBUG] MockMissionsStorage.getMissionInfo called with shipId:", shipId);
        return _missions[shipId];
    }

    function isOnMission(uint256 shipId) public view override returns (bool) {
        return _missions[shipId].isActive;
    }

    function getMissionId(uint256 shipId) external view override returns (uint256) {
        return _missions[shipId].missionId;
    }

    function getMissionType(uint256 shipId) external view override returns (uint256) {
        return _missions[shipId].missionType;
    }

    function getMissionEndTime(uint256 shipId) external view override returns (uint256) {
        return _missions[shipId].endTime;
    }

    function getMissionStartTime(uint256 shipId) external view override returns (uint256) {
        return _missions[shipId].startTime;
    }

    // Set isActive for a mission (for test compatibility)
    function setMissionActive(uint256 shipId, bool active) external {
        MissionInfo storage m = _missions[shipId];
        m.isActive = active;
    }

    // The rest can revert or return dummy values unless your tests require them
    function registerMissionType(uint256, string calldata) external override { revert("not implemented"); }
    function registerSpecializedStorage(uint256, address) external override { revert("not implemented"); }
    function getSpecializedStorage(uint256) external view override returns (address) { return address(0); }
    function startMission(uint256, uint256, uint256, uint256, bytes calldata) external override { revert("not implemented"); }
    function completeMission(uint256) external override { revert("not implemented"); }
    function getShipsByMissionType(uint256) external view override returns (uint256[] memory) { uint256[] memory arr; return arr; }
    function getMissionBasicInfo(uint256) external view override returns (MissionBasicInfo memory) { revert("not implemented"); }
    function getRandomShipOnMissionTypes(uint256[] calldata) external view override returns (uint256) { return 0; }
} 