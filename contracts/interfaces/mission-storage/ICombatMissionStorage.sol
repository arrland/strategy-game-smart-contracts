// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../IMissionsStorage.sol";

/**
 * @title ICombatMissionStorage
 * @notice Interface for storage of combat-related missions
 * @dev Follows Interface Segregation Principle by focusing only on combat missions
 */
interface ICombatMissionStorage {
    /**
     * @notice Set a raid mission
     * @param shipId Ship identifier
     * @param targetShipId Target ship ID
     * @param duration Mission duration in seconds
     * @param missionDataHash Hash of additional mission parameters
     */
    function setRaidMission(
        uint256 shipId,
        uint256 targetShipId,
        uint256 duration,
        bytes32 missionDataHash
    ) external;
    
    /**
     * @notice Set a hunt mission
     * @param shipId Ship identifier
     * @param targetShipId Target ship ID
     * @param isNPCTarget Whether the target is an NPC
     * @param duration Mission duration in seconds
     * @param missionDataHash Hash of additional mission parameters
     */
    function setHuntMission(
        uint256 shipId,
        uint256 targetShipId,
        bool isNPCTarget,
        uint256 duration,
        bytes32 missionDataHash
    ) external;
    
    /**
     * @notice Get the target ship ID for a combat mission
     * @param shipId Ship identifier
     * @return Target ship ID
     */
    function getTargetShipId(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Check if the target is an NPC for a hunt mission
     * @param shipId Ship identifier
     * @return True if the target is an NPC
     */
    function isNPCTarget(uint256 shipId) external view returns (bool);
} 