// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../IMissionsStorage.sol";
import "./IMissionTypeStorage.sol";
import "./IMissionStates.sol";

interface ITradeMissionStorage is IMissionTypeStorage {
    function getMissionDetails(uint256 missionId) external view returns (
        uint256 shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        uint256 tradeOrderId,
        string memory resourceType,
        uint256 amount,
        uint256 price,
        uint256 startTime,
        uint256 endTime,
        IMissionStates.JourneyState journeyState,
        bool isShipBuying,
        bool resourcesClaimed
    );

    function updateJourneyState(uint256 missionId, IMissionStates.JourneyState newState) external;

    function isPhaseComplete(uint256 missionId) external view returns (bool isComplete);

    function getTimeRemaining(uint256 missionId) external view returns (uint256 timeRemaining);

    function getJourneyState(uint256 missionId) external view returns (IMissionStates.JourneyState);
} 