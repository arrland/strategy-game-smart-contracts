// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IMission.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "hardhat/console.sol";

/**
 * @title MockMission
 * @notice Mock implementation of IMission for testing purposes.
 */
contract MockMission is IMission, IERC165 {
    uint256 public fixedDuration = 600; // Default 10 minutes
    address public lastCaller;
    uint256 public lastShipId;
    bytes public lastMissionData;

    // Event to track calls to startMission for testing purposes
    event MissionInstanceStarted(uint256 shipId, bytes data, uint256 returnedDuration);
    event MissionInstanceCompleted(uint256 missionId);

    mapping(uint256 => bytes) public missionDataStore;
    mapping(uint256 => bool) public completedMissions;

    /**
     * @notice Simulates starting a mission, stores data, returns fixed duration.
     * @param shipId ID of the ship (unused in mock).
     * @param data Encoded mission data, expected to contain missionId.
     * @return duration Fixed mission duration.
     */
    function startMission(uint256 shipId, bytes calldata data) external override returns (uint256 duration) {
        lastCaller = msg.sender;
        lastShipId = shipId;
        lastMissionData = data;
        
        emit MissionInstanceStarted(shipId, data, fixedDuration);
        return fixedDuration;
    }

    /**
     * @notice Marks a mission as complete.
     * @param missionId ID of the mission to complete.
     */
    function completeMission(uint256 missionId) external override {
        completedMissions[missionId] = true;
        emit MissionInstanceCompleted(missionId);
    }

    /**
     * @notice Retrieves stored mission data.
     * @param missionId ID of the mission.
     * @return Stored mission data.
     */
    function getMissionDetails(uint256 missionId) external view override returns (bytes memory) {
        // This is a simple mock; actual mission contracts would handle data storage and retrieval.
        // For this mock, returning lastMissionData or data from missionDataStore if populated.
        return missionDataStore[missionId];
    }

    /**
     * @notice Standard ERC165 supportsInterface.
     * @param interfaceId Interface ID to check.
     * @return True if IMission interface is supported.
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IMission).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    /**
     * @notice Allows setting a custom fixed duration for testing.
     * @param _duration New fixed duration in seconds.
     */
    function setFixedDuration(uint256 _duration) external {
        fixedDuration = _duration;
    }

    function setMissionDataForId(uint256 missionId, bytes calldata data) external {
        missionDataStore[missionId] = data;
    }
}
