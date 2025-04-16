// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IMissionsStorage.sol";

/**
 * @title IMissionFactory
 * @notice Interface for the mission factory contract
 * @dev Defines functions for managing mission implementations
 */
interface IMissionFactory {
    /**
     * @notice Register a mission contract for a specific mission type
     * @param missionType The type of mission
     * @param contractAddress The address of the mission contract
     */
    function registerMissionContract(uint256 missionType, address contractAddress) external;
    
    /**
     * @notice Update a mission contract for a specific mission type
     * @param missionType The type of mission
     * @param contractAddress The new address of the mission contract
     */
    function updateMissionContract(uint256 missionType, address contractAddress) external;
    
    /**
     * @notice Check if a mission type has a registered contract
     * @param missionType The type of mission
     * @return True if the mission type is registered
     */
    function isMissionTypeRegistered(uint256 missionType) external view returns (bool);
    
    /**
     * @notice Get mission contract for a specific mission type
     * @param missionType The type of mission
     * @return The address of the mission contract
     */
    function getMissionContract(uint256 missionType) external view returns (address);
    
    /**
     * @notice Start a mission of a specific type
     * @param shipId The ID of the ship going on the mission
     * @param missionType The type of mission
     * @param missionData Encoded mission parameters
     * @return The ID of the new mission
     */
    function startMission(
        uint256 shipId,
        uint256 missionType,
        bytes calldata missionData
    ) external returns (uint256);
    
    /**
     * @notice Complete a mission of a specific type
     * @param missionId The ID of the mission
     * @param missionType The type of mission
     */
    function completeMission(
        uint256 missionId,
        uint256 missionType
    ) external;
}
