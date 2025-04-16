// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../storage/IBaseStorage.sol";

/**
 * @title IShipStorage Interface
 * @notice Interface for the ShipStorage contract that manages ship storage capabilities
 */
interface IShipStorage is IBaseStorage {
    /**
     * @notice Get the storage capacity for a specific ship
     * @param shipId The ID of the ship to query
     * @return The storage capacity of the ship
     * @dev Returns the cargo bay capacity from ship metadata
     */
    function getStorageCapacity(uint256 shipId) external view returns (uint256);
    
}
