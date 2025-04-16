// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../AuthorizationModifiers.sol";
import "../interfaces/IArrcLocking.sol";

/**
 * @title ArrcLocking
 * @dev Manages locking of ARRC tokens for trade missions
 */
contract ArrcLocking is AuthorizationModifiers, ReentrancyGuard, IArrcLocking {
    // State variables
    IERC20 public immutable arrcToken;

    // Enums
    enum LockingType {
        None,
        BuyOrder,  // Lock until trade execution
        SellOrder  // Lock from trade execution to home port arrival
    }

    // Structs
    struct LockingInfo {
        uint256 startTime;
        uint256 endTime;
        bool locked;
        uint256 amount;
        address attacker; // Set if ship is attacked
        LockingType lockingType; // Type of locking
    }

    // Mappings
    mapping(uint256 => LockingInfo) public locks; // shipId => Lock

    // Events
    event ArrcLocked(uint256 indexed shipId, uint256 amount, uint256 duration, LockingType lockingType);
    event ArrcUnlocked(uint256 indexed shipId, uint256 amount);
    event ArrcTransferred(uint256 indexed shipId, address indexed recipient, uint256 amount);
    event ArrcCaptured(uint256 indexed targetShipId, uint256 indexed attackerShipId, uint256 amount);

    constructor(
        address _centralAuthorizationRegistry,
        address _arrcToken
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IArrcLocking")) {
        require(_arrcToken != address(0), "Invalid ARRC token address");
        arrcToken = IERC20(_arrcToken);
    }

    /**
     * @notice Lock ARRC for a trade mission
     * @param shipId Ship identifier
     * @param amount Amount to lock
     * @param duration Locking duration
     * @param lockingTypeUint8 Type of locking as uint8 (buy or sell order)
     * @param player Player address
     */
    function lockForTrade(
        uint256 shipId,
        uint256 amount,
        uint256 duration,
        uint8 lockingTypeUint8,
        address player
    ) external override nonReentrant onlyAuthorized {
        LockingType lockingType = LockingType(lockingTypeUint8);
        require(!locks[shipId].locked, "Already locked");
        require(amount > 0, "Must lock ARRC");
        require(lockingType != LockingType.None, "Invalid locking type");
        
        // Transfer ARRC from player to contract
        require(arrcToken.transferFrom(player, address(this), amount), "ARRC transfer failed");

        // Set lock
        locks[shipId] = LockingInfo({
            amount: amount,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            locked: true,
            attacker: address(0),
            lockingType: lockingType
        });

        emit ArrcLocked(shipId, amount, duration, lockingType);
    }

    /**
     * @notice Unlock ARRC after mission completion
     * @param shipId Ship identifier
     * @param player Player address to receive ARRC
     */
    function unlockArrc(
        uint256 shipId,
        address player
    ) external override nonReentrant onlyAuthorized {
        LockingInfo storage lock = locks[shipId];
        require(lock.locked, "Not locked");
        require(lock.attacker == address(0), "Ship was attacked");

        uint256 amount = lock.amount;

        // Clear lock
        delete locks[shipId];

        // Return ARRC to player
        require(arrcToken.transfer(player, amount), "ARRC return failed");

        emit ArrcUnlocked(shipId, amount);
    }

    /**
     * @notice Transfer locked ARRC to recipient (island owner for buy orders)
     * @param shipId Ship identifier
     * @param recipient Address to receive the ARRC
     */
    function transferArrcToRecipient(
        uint256 shipId,
        address recipient
    ) external override nonReentrant onlyAuthorized {
        LockingInfo storage lock = locks[shipId];
        require(lock.locked, "Not locked");
        require(lock.lockingType == LockingType.BuyOrder, "Not a buy order");
        require(lock.attacker == address(0), "Ship was attacked");

        uint256 amount = lock.amount;

        // Clear lock
        delete locks[shipId];

        // Transfer ARRC to recipient
        require(arrcToken.transfer(recipient, amount), "ARRC transfer failed");

        emit ArrcTransferred(shipId, recipient, amount);
    }

    /**
     * @notice Capture locked ARRC when ship is attacked
     * @param targetShipId Ship being attacked
     * @param attackerShipId Attacking ship
     * @param attacker Address of the attacker
     */
    function captureLockedArrc(
        uint256 targetShipId,
        uint256 attackerShipId,
        address attacker
    ) external override nonReentrant onlyAuthorized {
        LockingInfo storage lock = locks[targetShipId];
        require(lock.locked, "Target not locked");
        require(lock.attacker == address(0), "Already attacked");

        // Set attacker
        lock.attacker = attacker;

        // Calculate capture amount (50% of locked amount)
        uint256 captureAmount = lock.amount / 2;
        
        if (captureAmount > 0) {
            // Update lock amount
            lock.amount -= captureAmount;

            // Transfer captured ARRC to attacker
            require(arrcToken.transfer(attacker, captureAmount), "ARRC capture failed");

            emit ArrcCaptured(targetShipId, attackerShipId, captureAmount);
        }
    }

    function getLock(uint256 shipId) external view override returns (
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint8 lockingType
    ) {
        LockingInfo memory lock = locks[shipId];
        return (
            lock.amount,
            lock.startTime,
            lock.endTime,
            lock.locked,
            lock.attacker,
            uint8(lock.lockingType)
        );
    }

    /**
     * @notice Check if ARRC is locked for a ship
     * @param shipId Ship identifier
     * @return Whether ARRC is locked
     */
    function isLocked(uint256 shipId) external view override returns (bool) {
        return locks[shipId].locked;
    }
} 