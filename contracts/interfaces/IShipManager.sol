// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IShipManager
 * @notice Interface for the ShipManager contract that handles ship operations
 */
interface IShipManager {
    /**
     * @notice Check if a player owns a ship
     * @param player Player address
     * @param shipId Ship identifier
     * @return ownershipStatus True if the player owns the ship
     */
    function isShipOwner(address player, uint256 shipId) external view returns (bool);
    
    /**
     * @notice Get the owner of a ship
     * @param shipId Ship identifier
     * @return owner Owner address
     */
    function getShipOwner(uint256 shipId) external view returns (address);
    
    /**
     * @notice Get the speed of a ship
     * @param shipId Ship identifier
     * @return speed Ship speed
     */
    function getShipSpeed(uint256 shipId) external view returns (uint256);
    
    /**
     * @notice Get the cargo capacity of a ship
     * @param shipId Ship identifier
     * @return capacity Cargo capacity
     */
    function getShipCapacity(uint256 shipId) external view returns (uint256);
} 