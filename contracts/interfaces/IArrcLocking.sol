// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IArrcLocking
 * @dev Interface for the ArrcLocking contract
 */
interface IArrcLocking {
    /**
     * @notice Lock ARRC for a trade mission
     * @param shipId Ship identifier
     * @param amount Amount to lock
     * @param duration Locking duration
     * @param lockingType Type of locking (0=None, 1=BuyOrder, 2=SellOrder)
     * @param player Player address
     */
    function lockForTrade(
        uint256 shipId,
        uint256 amount,
        uint256 duration,
        uint8 lockingType,
        address player
    ) external;

    /**
     * @notice Unlock ARRC after mission completion
     * @param shipId Ship identifier
     * @param player Player address to receive ARRC
     */
    function unlockArrc(
        uint256 shipId,
        address player
    ) external;

    /**
     * @notice Transfer locked ARRC to recipient (island owner for buy orders)
     * @param shipId Ship identifier
     * @param recipient Address to receive the ARRC
     */
    function transferArrcToRecipient(
        uint256 shipId,
        address recipient
    ) external;

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
    ) external;

    function getLock(uint256 shipId) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint8 lockingType
    );

    /**
     * @notice Check if ARRC is locked for a ship
     * @param shipId Ship identifier
     * @return Whether ARRC is locked
     */
    function isLocked(uint256 shipId) external view returns (bool);
} 