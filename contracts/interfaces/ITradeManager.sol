// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title ITradeManager
 * @dev Interface for the TradeManager contract
 */
interface ITradeManager {
    /**
     * @notice Initiate a trade between a player and an island
     * @param player Address of the player
     * @param shipId Ship identifier
     * @param tradeOrderId Trade order identifier
     * @param arrcAmount ARRC token amount for the trade
     * @param resourceType Type of resource being traded
     * @param resourceAmount Amount of resource being traded
     * @return success Boolean indicating if trade was initiated successfully
     */
    function initiateTrade(
        address player,
        uint256 shipId,
        uint256 tradeOrderId,
        uint256 arrcAmount,
        string memory resourceType,
        uint256 resourceAmount
    ) external returns (bool);

    /**
     * @notice Complete a trade when a ship arrives at the trade destination
     * @param player Address of the player
     * @param shipId Ship identifier
     * @return success Boolean indicating if trade was completed successfully
     */
    function completeTrade(
        address player,
        uint256 shipId
    ) external returns (bool);

    /**
     * @notice Start the return journey after trade completion
     * @param player Address of the player
     * @param shipId Ship identifier
     * @return success Boolean indicating if return journey was started successfully
     */
    function startReturnJourney(
        address player,
        uint256 shipId
    ) external returns (bool);

    /**
     * @notice Complete the entire trade mission (called after return journey completes)
     * @param player Address of the player
     * @param shipId Ship identifier
     * @return success Boolean indicating if mission was completed successfully
     */
    function completeEntireTradeMission(
        address player,
        uint256 shipId
    ) external returns (bool);


    function getTradeOrder(uint256 tradeOrderId) external view returns (
        address seller,
        uint256 islandId,
        string memory resourceType,
        uint256 resourceAmount,
        uint256 arrcPrice,
        bool isActive
    );

    /**
     * @notice Check if a trade order is valid
     * @param tradeOrderId Trade order identifier
     * @return valid Boolean indicating if the order is valid
     */
    function isTradeOrderValid(uint256 tradeOrderId) external view returns (bool);

    /**
     * @notice Get active trade orders for an island
     * @param islandId Island identifier
     * @return activeOrders Array of active trade order IDs
     */
    function getActiveTradeOrders(uint256 islandId) external view returns (uint256[] memory);

    /**
     * @notice Check if a ship is on a return journey from a trade
     * @param shipId Ship identifier
     * @return isReturning Whether the ship is on a return journey from a trade
     */
    function hasActiveTradeReturnForShip(uint256 shipId) external view returns (bool);
    
    /**
     * @notice Get pending resource amount for an island by resource type
     * @param islandId The island ID to check
     * @param resourceType The type of resource
     * @return Amount of pending resources for the specified resource type
     */
    function getPendingResourceAmount(uint256 islandId, string calldata resourceType) external view returns (uint256);
    
    /**
     * @notice Get all resource types with pending deliveries for an island
     * @param islandId The island ID to check
     * @return Array of resource types that have pending deliveries
     */
    function getPendingResourceTypes(uint256 islandId) external view returns (string[] memory);
    
    /**
     * @notice Claim pending deliveries of a specific resource type for an island
     * @param islandId The island ID
     * @param resourceType The type of resource to claim
     * @param amount The amount of resource to claim (use type(uint256).max to claim all)
     */
    function claimPendingDeliveries(uint256 islandId, string calldata resourceType, uint256 amount) external;
    
    /**
     * @notice Check if a resource type has pending deliveries for an island
     * @param islandId The island ID
     * @param resourceType The resource type to check
     * @return Whether the resource type has pending deliveries
     */
    function hasResourceTypePending(uint256 islandId, string calldata resourceType) external view returns (bool);
}
