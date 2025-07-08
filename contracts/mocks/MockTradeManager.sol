// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/ITradeManager.sol";
import "../AuthorizationModifiers.sol";

contract MockTradeManager is ITradeManager, AuthorizationModifiers {
    struct TradeOrder {
        address seller;
        uint256 islandId;
        string resourceType;
        uint256 resourceAmount;
        uint256 arrcPrice;
        bool isActive;
        bool isSellOrder;
    }

    mapping(uint256 => TradeOrder) public tradeOrders;
    mapping(uint256 => mapping(string => uint256)) public pendingResources;
    mapping(uint256 => string[]) public pendingResourceTypes;
    mapping(uint256 => bool) public hasActiveTradeReturn;

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ITradeManager")) {}

    // Setup function for tests
    function setupMockTradeOrder(
        uint256 tradeOrderId,
        address seller,
        uint256 islandId,
        string memory resourceType,
        uint256 resourceAmount,
        uint256 arrcPrice,
        bool isActive,
        bool isSellOrder
    ) external {
        tradeOrders[tradeOrderId] = TradeOrder({
            seller: seller,
            islandId: islandId,
            resourceType: resourceType,
            resourceAmount: resourceAmount,
            arrcPrice: arrcPrice,
            isActive: isActive,
            isSellOrder: isSellOrder
        });
    }

    function initiateTrade(
        address player,
        uint256 shipId,
        uint256 tradeOrderId,
        uint256 arrcAmount,
        string memory resourceType,
        uint256 resourceAmount,
        uint256 originIslandId
    ) external override returns (bool) {
        // Mock implementation - just return true for successful initiation
        return true;
    }

    function completeTrade(
        address player,
        uint256 shipId
    ) external override returns (bool) {
        // Mock implementation - just return true
        return true;
    }

    function startReturnJourney(
        address player,
        uint256 shipId
    ) external override returns (bool) {
        hasActiveTradeReturn[shipId] = true;
        return true;
    }

    function completeEntireTradeMission(
        address player,
        uint256 shipId
    ) external override returns (bool) {
        hasActiveTradeReturn[shipId] = false;
        return true;
    }

    function getTradeOrder(uint256 tradeOrderId) external view override returns (
        address seller,
        uint256 islandId,
        string memory resourceType,
        uint256 resourceAmount,
        uint256 arrcPrice,
        bool isActive,
        bool isSellOrder
    ) {
        TradeOrder memory order = tradeOrders[tradeOrderId];
        return (
            order.seller,
            order.islandId,
            order.resourceType,
            order.resourceAmount,
            order.arrcPrice,
            order.isActive,
            order.isSellOrder
        );
    }

    function isTradeOrderValid(uint256 tradeOrderId) external view override returns (bool) {
        return tradeOrders[tradeOrderId].isActive;
    }

    function getActiveTradeOrders(uint256 islandId) external view override returns (uint256[] memory) {
        // Mock implementation - return empty array
        return new uint256[](0);
    }

    function hasActiveTradeReturnForShip(uint256 shipId) external view override returns (bool) {
        return hasActiveTradeReturn[shipId];
    }

    function getPendingResourceAmount(uint256 islandId, string calldata resourceType) external view override returns (uint256) {
        return pendingResources[islandId][resourceType];
    }

    function getPendingResourceTypes(uint256 islandId) external view override returns (string[] memory) {
        return pendingResourceTypes[islandId];
    }

    function claimPendingDeliveries(uint256 islandId, string calldata resourceType, uint256 amount) external override {
        // Mock implementation - reduce pending amount
        uint256 currentPending = pendingResources[islandId][resourceType];
        if (amount == type(uint256).max || amount >= currentPending) {
            pendingResources[islandId][resourceType] = 0;
        } else {
            pendingResources[islandId][resourceType] = currentPending - amount;
        }
    }

    function hasResourceTypePending(uint256 islandId, string calldata resourceType) external view override returns (bool) {
        return pendingResources[islandId][resourceType] > 0;
    }

    // Helper functions for testing
    function setPendingResource(uint256 islandId, string memory resourceType, uint256 amount) external {
        pendingResources[islandId][resourceType] = amount;
        
        // Add to pending types if not already there
        string[] storage types = pendingResourceTypes[islandId];
        bool found = false;
        for (uint i = 0; i < types.length; i++) {
            if (keccak256(bytes(types[i])) == keccak256(bytes(resourceType))) {
                found = true;
                break;
            }
        }
        if (!found) {
            types.push(resourceType);
        }
    }
} 