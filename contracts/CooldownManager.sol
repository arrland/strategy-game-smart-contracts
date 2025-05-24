// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "./interfaces/ICooldownManager.sol";
import "hardhat/console.sol";

/**
 * @title CooldownManager
 * @notice Manages generic cooldowns for entities identified by a bytes32 key.
 * @dev Uses a generic key + context approach for flexibility.
 *      Relies on CentralAuthorizationRegistry for access control.
 */
contract CooldownManager is ICooldownManager, AuthorizationModifiers {

    // Mapping from an entity's unique key to its cooldown end timestamp
    // bytes32 => uint256 (endTime)
    mapping(bytes32 => uint256) public cooldownEndTime;

    /**
     * @notice Constructor for CooldownManager.
     * @param _centralAuthorizationRegistry Address of the CentralAuthorizationRegistry.
     */
    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ICooldownManager")) 
    {}

    /**
     * @notice Sets or updates the cooldown for a given entity.
     * @dev Requires caller to be authorized via CentralAuthorizationRegistry.
     *      Calculates the end time based on the current block timestamp and the provided duration.
     * @param entityKey The unique key identifying the entity.
     * @param duration The duration of the cooldown in seconds.
     * @param context A string describing the reason for the cooldown.
     */
    function setCooldown(bytes32 entityKey, uint256 duration, string calldata context) external override onlyAuthorized {
        uint256 endTime = block.timestamp + duration;
        cooldownEndTime[entityKey] = endTime;
        emit CooldownSet(entityKey, endTime, context);        
    }

    /**
     * @notice Checks if an entity is currently on cooldown.
     * @param entityKey The unique key identifying the entity.
     * @return isOnCooldown True if the current block timestamp is before the entity's cooldown end time, false otherwise.
     */
    function isOnCooldown(bytes32 entityKey) external view override returns (bool) {
        uint256 endTime = cooldownEndTime[entityKey];
        // Ensure endTime is not 0 (meaning cooldown never set)
        return endTime != 0 && block.timestamp < endTime; 
    }

    /**
     * @notice Gets the timestamp when the cooldown for a specific entity ends.
     * @param entityKey The unique key identifying the entity.
     * @return endTime The absolute timestamp when the cooldown ends (0 if no cooldown is set).
     */
    function getCooldownEndTime(bytes32 entityKey) external view override returns (uint256) {
        return cooldownEndTime[entityKey];
    }
} 