// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IArrcLocking.sol";
import "../AuthorizationModifiers.sol";
import "../core/InterfaceIdentifiers.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockArrcLocking is IArrcLocking, AuthorizationModifiers {
    struct Lock {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        bool locked;
        address attacker;
        uint8 lockingType;
    }

    mapping(uint256 => Lock) public locks;

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IArrcLocking")) {}

    function lockForTrade(
        uint256 shipId,
        uint256 amount,
        uint256 duration,
        uint8 lockingType,
        address player
    ) external override {
        // Transfer ARRC tokens from player to this contract
        IERC20 arrcToken = IERC20(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.ARRC_TOKEN_KEY));
        require(arrcToken.transferFrom(player, address(this), amount), "ARRC transfer failed");
        
        locks[shipId] = Lock({
            amount: amount,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            locked: true,
            attacker: address(0),
            lockingType: lockingType
        });
    }

    function unlockArrc(
        uint256 shipId,
        address player
    ) external override {
        Lock storage lock = locks[shipId];
        require(lock.locked, "No locked ARRC for this ship");
        require(lock.amount > 0, "No ARRC to unlock");
        
        // Return ARRC tokens to player
        IERC20 arrcToken = IERC20(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.ARRC_TOKEN_KEY));
        require(arrcToken.transfer(player, lock.amount), "ARRC unlock transfer failed");
        
        // Mark as unlocked
        lock.locked = false;
        lock.amount = 0;
    }

    function transferArrcToRecipient(
        uint256 shipId,
        address recipient
    ) external override {
        Lock storage lock = locks[shipId];
        require(lock.locked, "No locked ARRC for this ship");
        require(lock.amount > 0, "No ARRC to transfer");
        
        // Transfer ARRC tokens to recipient
        IERC20 arrcToken = IERC20(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.ARRC_TOKEN_KEY));
        require(arrcToken.transfer(recipient, lock.amount), "ARRC transfer to recipient failed");
        
        // Mark as unlocked
        lock.locked = false;
        lock.amount = 0;
    }

    function captureLockedArrc(
        uint256 targetShipId,
        uint256 attackerShipId,
        address attacker
    ) external override {
        locks[targetShipId].attacker = attacker;
        locks[targetShipId].locked = false;
        locks[targetShipId].amount = 0;
    }

    function getLock(uint256 shipId) external view override returns (
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint8 lockingType
    ) {
        Lock memory lock = locks[shipId];
        return (
            lock.amount,
            lock.startTime,
            lock.endTime,
            lock.locked,
            lock.attacker,
            lock.lockingType
        );
    }

    function isLocked(uint256 shipId) external view override returns (bool) {
        return locks[shipId].locked;
    }

    // Helper functions for testing
    function setLock(
        uint256 shipId,
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        bool locked,
        uint8 lockingType
    ) external {
        locks[shipId] = Lock({
            amount: amount,
            startTime: startTime,
            endTime: endTime,
            locked: locked,
            attacker: address(0),
            lockingType: lockingType
        });
    }
} 