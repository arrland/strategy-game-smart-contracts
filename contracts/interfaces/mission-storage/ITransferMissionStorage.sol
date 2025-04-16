// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../IMissionsStorage.sol";

/**
 * @title ITransferMissionStorage
 * @notice Interface for storage of transfer-related missions
 * @dev Follows Interface Segregation Principle by focusing only on transfer missions
 */
interface ITransferMissionStorage {
    /**
     * @notice Set a resource transfer or trade mission
     * @param shipId Ship identifier
     * @param fromIslandId Source island ID
     * @param toIslandId Destination island ID
     * @param duration Mission duration in seconds
     * @param missionDataHash Hash of additional mission parameters
     * @param missionType Type of mission (ResourceTransfer or Trade)
     */
    function setTransferMission(
        uint256 shipId,
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 duration,
        bytes32 missionDataHash,
        uint256 missionType
    ) external;
    
    /**
     * @notice Get the source island ID for a transfer mission
     * @param shipId Ship identifier
     * @return Source island ID
     */
    function getSourceIslandId(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the destination island ID for a transfer mission
     * @param shipId Ship identifier
     * @return Destination island ID
     */
    function getDestinationIslandId(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Check if resources have been claimed for a transfer mission
     * @param shipId Ship identifier
     * @return True if resources have been claimed
     */
    function areResourcesClaimed(uint256 shipId) external view returns (bool);
    
    /**
     * @notice Set resources as claimed for a transfer mission
     * @param shipId Ship identifier
     */
    function setResourcesClaimed(uint256 shipId) external;
}