// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IMissionsManager {
    function startMission(
        uint256 shipId,
        uint256 missionType,
        bytes calldata missionData
    ) external returns (uint256 missionId);
    
    function completeMission(uint256 shipId) external;
    
    function getMissionStatus(uint256 missionId) external view returns (
        bool isActive,
        uint256 shipId,
        uint256 missionType,
        uint256 startTime,
        uint256 endTime,
        bool isCompleted
    );
    
    function getActiveShipMission(uint256 shipId) external view returns (uint256 missionId);
} 