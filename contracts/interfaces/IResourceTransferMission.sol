// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IResourceTransferMission
 * @notice Interface for ResourceTransferMission contract
 */
interface IResourceTransferMission {
    /**
     * @notice Start a resource transfer mission
     * @param shipId Ship identifier
     * @param missionData Encoded mission parameters
     */
    function startMission(uint256 shipId, bytes calldata missionData) external;

    /**
     * @notice Complete a resource transfer mission
     * @param shipId Ship identifier
     */
    function completeMission(uint256 shipId) external;

    /**
     * @notice Initialize a return journey for a ship after trading
     * @param shipId Ship identifier
     * @param fromIslandId Source island ID for the return journey
     * @param toIslandId Destination island ID for the return journey
     * @param resourceType Type of resource being transported
     * @param amount Amount of resource being transported
     * @return success Boolean indicating if return journey was started successfully
     */
    function initiateReturnJourney(
        uint256 shipId,
        uint256 fromIslandId,
        uint256 toIslandId,
        string memory resourceType,
        uint256 amount
    ) external returns (bool);
} 