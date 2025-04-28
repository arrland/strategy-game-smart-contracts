// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title ICooldownManager Interface
 * @notice Defines the interface for managing generic cooldowns.
 */
interface ICooldownManager {
    /**
     * @notice Emitted when a cooldown is set or updated for an entity.
     * @param entityKey The unique key identifying the entity on cooldown.
     * @param endTime The absolute timestamp when the cooldown ends.
     * @param context An optional string describing the action that triggered the cooldown.
     */
    event CooldownSet(bytes32 indexed entityKey, uint256 endTime, string context);

    /**
     * @notice Sets or updates the cooldown for a given entity.
     * @param entityKey The unique key identifying the entity.
     * @param duration The duration of the cooldown in seconds.
     * @param context A string describing the reason for the cooldown.
     */
    function setCooldown(bytes32 entityKey, uint256 duration, string calldata context) external;

    /**
     * @notice Checks if an entity is currently on cooldown.
     * @param entityKey The unique key identifying the entity.
     * @return isOnCooldown True if the current block timestamp is before the entity's cooldown end time, false otherwise.
     */
    function isOnCooldown(bytes32 entityKey) external view returns (bool);

    /**
     * @notice Gets the timestamp when the cooldown for a specific entity ends.
     * @param entityKey The unique key identifying the entity.
     * @return endTime The absolute timestamp when the cooldown ends (0 if no cooldown is set).
     */
    function getCooldownEndTime(bytes32 entityKey) external view returns (uint256);
} 