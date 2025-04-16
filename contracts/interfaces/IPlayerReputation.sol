// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IPlayerReputation
 * @notice Interface for the player reputation system
 * @dev This is a placeholder for future implementation
 */
interface IPlayerReputation {
    /**
     * @notice Update a player's reputation
     * @param player The player's address
     * @param change The change in reputation (positive or negative)
     * @param reason The reason for the reputation change
     */
    function updateReputation(
        address player,
        int256 change,
        string calldata reason
    ) external;
    
    /**
     * @notice Get a player's current reputation
     * @param player The player's address
     * @return The player's reputation score (-100 to +100)
     */
    function getReputation(address player) external view returns (int256);
    
    /**
     * @notice Check if a player has positive reputation
     * @param player The player's address
     * @return Whether the player has positive reputation
     */
    function isPositiveReputation(address player) external view returns (bool);
} 