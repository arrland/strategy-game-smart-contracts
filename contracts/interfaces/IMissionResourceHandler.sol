// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IMissionResourceHandler {
    function lockShipForMission(uint256 shipId, uint256 missionId, uint256 duration) external;

    function unlockShipAfterMission(uint256 shipId) external;

    function getShipLockInfo(uint256 shipId) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint256 missionId
    );

    function transferResourceFromIslandToShip(
        uint256 fromIslandId,
        uint256 toShipId,
        string calldata resourceType,
        uint256 amount
    ) external;

    function transferResourceFromShipToIsland(
        uint256 fromShipId,
        uint256 toIslandId,
        string calldata resourceType,
        uint256 amount
    ) external;

    function hasIslandStorageCapacity(uint256 islandId, uint256 additionalAmount) external view returns (bool);
} 