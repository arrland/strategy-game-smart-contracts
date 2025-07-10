// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../AuthorizationModifiers.sol";
import "../../interfaces/mission-storage/ITradeMissionStorage.sol";
import "../../interfaces/IMissionsStorage.sol";
import "../../interfaces/IMissionRegistration.sol";
import "../../interfaces/ICentralAuthorizationRegistry.sol";
import "../../interfaces/mission-storage/IMissionStates.sol";

/**
 * @title TradeMissionStorage
 * @notice Storage contract for trade missions
 * @dev Implements ITradeMissionStorage interface for managing trade mission data
 */
contract TradeMissionStorage is ITradeMissionStorage, AuthorizationModifiers {
    // Data structure for trade missions
    struct TradeMissionData {
        uint256 shipId;
        uint256 originIslandId;
        uint256 targetIslandId;
        uint256 tradeOrderId;
        string resourceType;
        uint256 amount;
        uint256 price;
        uint256 startTime;
        uint256 endTime;
        IMissionStates.JourneyState journeyState;
        bool isShipBuying;
        bool resourcesClaimed;
        uint256 returnJourneyDuration; // Added field for return journey duration
    }

    // Mission data mapping: missionId => TradeMissionData
    mapping(uint256 => TradeMissionData) private missionData;
    
    // Events
    event TradeMissionInitialized(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        string resourceType,
        uint256 amount,
        uint256 price
    );
    
    event TradeMissionJourneyStateUpdated(
        uint256 indexed missionId,
        IMissionStates.JourneyState newState
    );
    
    event TradeMissionCompleted(
        uint256 indexed missionId,
        uint256 indexed shipId
    );
    
    event ResourcesClaimed(
        uint256 indexed missionId,
        uint256 indexed shipId
    );

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ITradeMissionStorage"))
    {}

    /**
     * @inheritdoc IMissionTypeStorage
     */
    function initializeMission(
        uint256 missionId,
        bytes memory _initialMissionDataBytes
    ) external onlyAuthorized override {
        // Decode the mission data (11 values now, including returnJourneyDuration)
        (
            uint256 shipId,
            uint256 originIslandId,
            uint256 targetIslandId,
            string memory resourceType,
            uint256 amount,
            uint256 price,
            uint256 tradeOrderId,
            uint256 startTime,
            uint256 endTime,
            bool isShipBuying,
            uint256 returnJourneyDuration
        ) = abi.decode(
            _initialMissionDataBytes,
            (uint256, uint256, uint256, string, uint256, uint256, uint256, uint256, uint256, bool, uint256)
        );
        
        // Store the mission data
        TradeMissionData storage data = missionData[missionId];
        data.shipId = shipId;
        data.originIslandId = originIslandId;
        data.targetIslandId = targetIslandId;
        data.tradeOrderId = tradeOrderId;
        data.resourceType = resourceType;
        data.amount = amount;
        data.price = price;
        data.startTime = startTime;
        data.endTime = endTime;
        data.journeyState = IMissionStates.JourneyState.ToDestination;
        data.isShipBuying = isShipBuying;
        data.resourcesClaimed = false;
        data.returnJourneyDuration = returnJourneyDuration;
        
        emit TradeMissionInitialized(
            missionId,
            shipId,
            originIslandId,
            targetIslandId,
            resourceType,
            amount,
            price
        );
    }

    /**
     * @inheritdoc IMissionTypeStorage
     */
    function completeMission(uint256 missionId) external onlyAuthorized override {
        TradeMissionData storage data = missionData[missionId];
        require(data.shipId != 0, "Mission does not exist");
        
        uint256 shipId = data.shipId; // Save shipId for event
        
        // Set mission as completed by updating journey state
        data.journeyState = IMissionStates.JourneyState.Completed;
        
        emit TradeMissionCompleted(missionId, shipId);
    }

    /**
     * @inheritdoc IMissionTypeStorage
     */
    function getMissionData(uint256 missionId) external view override returns (bytes memory) {
        // Access storage pointer directly
        TradeMissionData storage data = missionData[missionId]; 
        return abi.encode(
            data.shipId,
            data.originIslandId,
            data.targetIslandId,
            data.tradeOrderId,
            data.resourceType,
            data.amount,
            data.price,
            data.startTime,
            data.endTime,
            uint8(data.journeyState),
            data.isShipBuying,
            data.resourcesClaimed,
            data.returnJourneyDuration // Include return journey duration in encoding
        );
    }

    function getMissionRegistration() internal view returns (IMissionRegistration) {
        return IMissionRegistration(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionRegistration")));
    }

    function supportsMissionType(uint256 missionType) external view override returns (bool) {
        uint256 tradeMissionId = getMissionRegistration().getMissionTypeByName("Trade");
        return missionType == tradeMissionId;
    }

    /**
     * @inheritdoc ITradeMissionStorage
     */
    function getMissionDetails(uint256 missionId) external view override returns (
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
    ) {
        TradeMissionData storage data = missionData[missionId];
        return (
            data.shipId,
            data.originIslandId,
            data.targetIslandId,
            data.tradeOrderId,
            data.resourceType,
            data.amount,
            data.price,
            data.startTime,
            data.endTime,
            data.journeyState,
            data.isShipBuying,
            data.resourcesClaimed
        );
    }

    /**
     * @inheritdoc ITradeMissionStorage
     */
    function updateJourneyState(uint256 missionId, IMissionStates.JourneyState newState) external onlyAuthorized override {
        TradeMissionData storage data = missionData[missionId];
        data.journeyState = newState;
        
        emit TradeMissionJourneyStateUpdated(missionId, newState);
    }

    /**
     * @notice Get the return journey duration for a trade mission
     * @param missionId Trade mission ID
     * @return duration Return journey duration in seconds
     */
    function getReturnJourneyDuration(uint256 missionId) external view returns (uint256 duration) {
        return missionData[missionId].returnJourneyDuration;
    }

    /**
     * @notice Update the mission end time (used when transitioning to return journey)
     * @param missionId Mission identifier
     * @param newEndTime New end time for the mission
     */
    function updateEndTime(uint256 missionId, uint256 newEndTime) external onlyAuthorized {
        TradeMissionData storage data = missionData[missionId];
        require(data.shipId != 0, "Mission does not exist");
        data.endTime = newEndTime;
    }

    function markResourcesClaimed(uint256 missionId) external onlyAuthorized {
        TradeMissionData storage data = missionData[missionId];
        data.resourcesClaimed = true;
        
        emit ResourcesClaimed(missionId, data.shipId);
    }

    function isResourcesClaimed(uint256 missionId) external view returns (bool) {
        return missionData[missionId].resourcesClaimed;
    }
    
    /**
     * @inheritdoc ITradeMissionStorage
     */
    function getJourneyState(uint256 missionId) external view override returns (IMissionStates.JourneyState) {
        return missionData[missionId].journeyState;
    }
    
    /**
     * @inheritdoc ITradeMissionStorage
     */
    function getTimeRemaining(uint256 missionId) external view override returns (uint256 timeRemaining) {
        TradeMissionData memory data = missionData[missionId];
        
        // For ToDestination phase, use the outbound end time
        if (data.journeyState == IMissionStates.JourneyState.ToDestination) {
            if (block.timestamp >= data.endTime) {
            return 0;
            }
            return data.endTime - block.timestamp;
        }
        
        // For Returning phase, the return journey is handled by ResourceTransferMission
        // So this should return 0 as the TradeMission itself is waiting for ResourceTransferMission completion
        return 0;
    }
    
    /**
     * @notice Check if the current mission phase is complete.
     * @dev For ToDestination phase, checks if outbound time has elapsed.
     *      For Returning phase, the completion is handled by ResourceTransferMission.
     * @inheritdoc ITradeMissionStorage
     */
    function isPhaseComplete(uint256 missionId) external view override returns (bool isComplete) {
        TradeMissionData memory data = missionData[missionId];
        
        if (data.journeyState == IMissionStates.JourneyState.ToDestination) {
            // Phase is complete if outbound journey time has elapsed
        return block.timestamp >= data.endTime;
        } else if (data.journeyState == IMissionStates.JourneyState.Returning) {
            // Return journey completion is handled by ResourceTransferMission
            // TradeMission is waiting for external completion signal
            return false;
        }
        
        return false;
    }
} 