// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../IMissionsStorage.sol";

/**
 * @title IMissionTypeStorage
 * @notice Interface for specialized mission type storage contracts
 * @dev Each mission type can have its own dedicated storage contract
 */
interface IMissionTypeStorage {
    /**
     * @notice Initialize mission data in specialized storage
     * @param missionId Mission identifier
     * @param missionData Encoded mission parameters
     */
    function initializeMission(
        uint256 missionId,
        bytes memory missionData
    ) external;
    
    /**
     * @notice Complete a mission in specialized storage
     * @param missionId Mission identifier
     */
    function completeMission(uint256 missionId) external;
    
    /**
     * @notice Get mission data from specialized storage
     * @param missionId Mission identifier
     * @return Encoded mission data
     */
    function getMissionData(uint256 missionId) external view returns (bytes memory);
    
    /**
     * @notice Check if this storage supports a specific mission type
     * @param missionType Type of mission
     * @return True if the mission type is supported
     */
    function supportsMissionType(uint256 missionType) external view returns (bool);
} 