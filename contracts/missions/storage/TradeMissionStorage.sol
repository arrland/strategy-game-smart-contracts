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
        // Decode the mission data (10 values)
        (
            uint256 shipId,
            uint256 originIslandId,
            uint256 targetIslandId,
            string memory resourceType,
            uint256 amount,
            uint256 price,
            uint256 tradeOrderId,    // Added decoding
            uint256 startTime,
            uint256 endTime,
            bool isShipBuying       // Added decoding
        ) = abi.decode(
            _initialMissionDataBytes,
            (uint256, uint256, uint256, string, uint256, uint256, uint256, uint256, uint256, bool) // Updated tuple type
        );
        
        // Store the mission data
        TradeMissionData storage data = missionData[missionId];
        data.shipId = shipId;
        data.originIslandId = originIslandId;
        data.targetIslandId = targetIslandId;
        data.tradeOrderId = tradeOrderId; // Store decoded value
        data.resourceType = resourceType;
        data.amount = amount;
        data.price = price;
        data.startTime = startTime;
        data.endTime = endTime;
        data.journeyState = IMissionStates.JourneyState.ToDestination;
        data.isShipBuying = isShipBuying; // Store decoded value
        data.resourcesClaimed = false;
        
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
        data.journeyState = IMissionStates.JourneyState.Completed;
        
        emit TradeMissionCompleted(missionId, data.shipId);
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
            data.resourcesClaimed
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
        uint256 fetchedTradeOrderId = data.tradeOrderId;
        bool fetchedIsShipBuying = data.isShipBuying;
        return (
            data.shipId,
            data.originIslandId,
            data.targetIslandId,
            fetchedTradeOrderId,
            data.resourceType,
            data.amount,
            data.price,
            data.startTime,
            data.endTime,
            data.journeyState,
            fetchedIsShipBuying,
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
        
        // Use the overall mission end time for now
        uint256 currentPhaseEndTime = data.endTime;
        
        if (block.timestamp >= currentPhaseEndTime) {
            return 0;
        }
        
        return currentPhaseEndTime - block.timestamp;
    }
    
    /**
     * @notice Check if the current mission phase is complete.
     * @dev For simplicity, assumes phase is complete if current time is past overall end time.
     *      A more complex implementation might track individual phase end times.
     * @inheritdoc ITradeMissionStorage
     */
    function isPhaseComplete(uint256 missionId) external view override returns (bool isComplete) {
        TradeMissionData memory data = missionData[missionId];
        // Use the overall mission end time for simplicity
        return block.timestamp >= data.endTime;
    }
} 