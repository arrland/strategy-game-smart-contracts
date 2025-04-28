// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/IArrcLocking.sol";

/**
 * @title MockTradeMission
 * @dev Mock contract to simulate TradeMission interactions with ArrcLocking
 */
contract MockTradeMission is AuthorizationModifiers {
    IArrcLocking public arrcLocking;
    
    event MissionStarted(uint256 indexed shipId, uint256 amount, uint8 lockingType);
    event OutboundJourneyCompleted(uint256 indexed shipId);
    event MissionCompleted(uint256 indexed shipId);
    event ShipAttacked(uint256 indexed targetShipId, uint256 indexed attackerShipId, address attacker);
    
    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IArrcLocking")) {
        // Constructor logic
    }
    
    function setArrcLocking(address _arrcLocking) external onlyAdmin {
        arrcLocking = IArrcLocking(_arrcLocking);
    }
    
    function startMission(uint256 shipId, uint256 amount, uint8 lockingType, address player) external {
        // Lock ARRC for trade
        arrcLocking.lockForTrade(shipId, amount, 86400, lockingType, player);
        emit MissionStarted(shipId, amount, lockingType);
    }
    
    function completeOutboundJourney(uint256 shipId, address recipient) external {
        // For BUY_ORDER, transfer tokens to recipient on arrival
        arrcLocking.transferArrcToRecipient(shipId, recipient);
        emit OutboundJourneyCompleted(shipId);
    }
    
    function completeMission(uint256 shipId, address player) external {
        // Unlock tokens on mission completion
        arrcLocking.unlockArrc(shipId, player);
        emit MissionCompleted(shipId);
    }
    
    function simulateShipAttack(uint256 targetShipId, uint256 attackerShipId, address attacker) external {
        // Simulate ship being attacked
        arrcLocking.captureLockedArrc(targetShipId, attackerShipId, attacker);
        emit ShipAttacked(targetShipId, attackerShipId, attacker);
    }
} 