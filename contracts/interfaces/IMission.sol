// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IMission
 * @notice Base interface for all mission implementations
 * @dev Defines the common interface that all mission types must implement
 */
interface IMission {
    /**
     * @notice Start a mission
     * @param shipId Ship identifier
     * @param missionData Encoded mission parameters
     * @return duration Total mission duration in seconds
     */
    function startMission(
        uint256 shipId,
        bytes calldata missionData
    ) external returns (uint256 duration);
    
    /**
     * @notice Complete a mission
     * @param missionId Mission identifier
     * @return isFullyComplete True if mission is fully complete, false if just advanced to next phase
     */
    function completeMission(uint256 missionId) external returns (bool isFullyComplete);
    
    /**
     * @notice Get mission details
     * @param missionId Mission identifier
     * @return Encoded mission details (structure depends on mission type)
     */
    function getMissionDetails(uint256 missionId) external view returns (bytes memory);
} 