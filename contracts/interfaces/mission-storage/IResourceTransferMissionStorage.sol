// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../IMissionsStorage.sol";
import "./IMissionTypeStorage.sol";
import "./IMissionStates.sol";

interface IResourceTransferMissionStorage is IMissionTypeStorage {
    function getMissionDetails(uint256 missionId)
        external
        view
        returns (
            uint256 shipId,
            uint256 originIslandId,
            uint256 targetIslandId,
            string memory resourceType,
            uint256 amount,
            uint256 startTime,
            uint256 endTime,
            IMissionStates.JourneyState journeyState,
            bool resourcesClaimed
        );
    
    function setResourcesClaimed(uint256 missionId) external;
} 