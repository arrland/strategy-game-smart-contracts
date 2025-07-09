// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IMissionAuthorization
 * @notice Interface for mission authorization - allows missions to define who can complete them
 */
interface IMissionAuthorization {
    /**
     * @notice Check if caller is authorized to complete this mission
     * @param missionId Mission identifier
     * @param caller Address of the caller
     * @return isAuthorized Whether the caller can complete this mission
     */
    function isAuthorizedToComplete(uint256 missionId, address caller) external view returns (bool isAuthorized);
} 