// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface ITradeMission {
    function getMissionState(uint256 missionId) external view returns (
        uint256 shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        uint256 tradeOrderId,
        string memory resourceType,
        uint256 amount,
        uint256 price,
        uint8 journeyState,
        uint256 startTime,
        uint256 endTime,
        bool isShipBuying,
        bool resourcesClaimed
    );
} 