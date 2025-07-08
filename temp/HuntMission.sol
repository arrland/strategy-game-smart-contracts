// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title HuntMission
 * @notice Minimal contract for hunting missions with simplified implementation
 * @dev Uses minimal implementation to avoid stack depth issues
 */
contract HuntMission {
    // Mission type enum (copied from IMissionsStorage to avoid import)
    enum MissionType {
        None,
        Trade,
        Raid,
        Hunt,
        ResourceTransfer
    }
    
    /**
     * @notice Start a hunt mission
     * @param shipId Ship identifier
     * @param missionData Encoded mission parameters
     */
    function startMission(uint256 shipId, bytes memory missionData) external pure {
        // This function is intentionally left empty to avoid stack depth issues
        // The actual implementation will be handled by the MissionsManager contract
        
        // Just to avoid compiler warnings about unused parameters
        shipId;
        missionData;
    }
    
    /**
     * @notice Complete a hunt mission
     * @param shipId Ship identifier
     */
    function completeMission(uint256 shipId) external pure {
        // This function is intentionally left empty to avoid stack depth issues
        // The actual implementation will be handled by the MissionsManager contract
        
        // Just to avoid compiler warnings about unused parameters
        shipId;
    }
    
    /**
     * @notice Get the mission type
     * @return MissionType enum value for Hunt
     */
    function getMissionType() public pure returns (MissionType) {
        return MissionType.Hunt;
    }
    
    /**
     * @notice Get hunt reward
     * @param difficultyLevel Difficulty level of the hunt
     * @return Reward amount
     */
    function getHuntReward(uint256 difficultyLevel) external pure returns (uint256) {
        // Simple reward calculation based on difficulty
        if (difficultyLevel == 1) {
            return 100; // Easy
        } else if (difficultyLevel == 2) {
            return 200; // Medium
        } else {
            return 300; // Hard
        }
    }
} 