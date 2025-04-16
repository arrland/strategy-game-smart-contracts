// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IMissionStates
 * @notice Defines common state enums for missions
 */
interface IMissionStates {
    /**
     * @notice Enum representing the state of a mission journey
     */
    enum JourneyState {
        NotStarted,       // Mission initialized but not started
        ToDestination,    // Traveling to the target
        AtDestination,    // Arrived at the target, performing action
        Returning,        // Traveling back to origin
        Completed         // Mission finished successfully
        // Consider adding Cancelled/Failed states later if needed
    }
} 