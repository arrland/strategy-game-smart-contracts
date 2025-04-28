// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IMission.sol";
import "hardhat/console.sol";

/**
 * @title MockMission
 * @notice Mock implementation of IMission for testing purposes.
 */
contract MockMission is IMission {
    uint256 public fixedDuration = 600; // Default 10 minutes
    mapping(uint256 => bytes) public missionDataStore;
    mapping(uint256 => bool) public completedMissions;

    /**
     * @notice Simulates starting a mission, stores data, returns fixed duration.
     * @param shipId ID of the ship (unused in mock).
     * @param data Encoded mission data, expected to contain missionId.
     * @return duration Fixed mission duration.
     */
    function startMission(uint256 shipId, bytes calldata data) external override returns (uint256 duration) {
        (uint256 missionId, /* bytes memory specificData */) = abi.decode(data, (uint256, bytes));
        missionDataStore[missionId] = data;
        console.log("MockMission: Started mission %s", missionId);
        return fixedDuration;
    }

    /**
     * @notice Marks a mission as complete.
     * @param missionId ID of the mission to complete.
     */
    function completeMission(uint256 missionId) external override {
        completedMissions[missionId] = true;
        console.log("MockMission: Completed mission %s", missionId);
    }

    /**
     * @notice Retrieves stored mission data.
     * @param missionId ID of the mission.
     * @return Stored mission data.
     */
    function getMissionDetails(uint256 missionId) external view override returns (bytes memory) {
        return missionDataStore[missionId];
    }

    /**
     * @notice Standard ERC165 supportsInterface.
     * @param interfaceId Interface ID to check.
     * @return True if IMission interface is supported.
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IMission).interfaceId;
    }

    /**
     * @notice Allows setting a custom fixed duration for testing.
     * @param _duration New fixed duration in seconds.
     */
    function setFixedDuration(uint256 _duration) external {
        fixedDuration = _duration;
    }
}
