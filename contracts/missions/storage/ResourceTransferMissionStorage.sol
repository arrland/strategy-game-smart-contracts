// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../../AuthorizationModifiers.sol";
import "../../interfaces/mission-storage/IMissionTypeStorage.sol";
import "../../interfaces/mission-storage/IResourceTransferMissionStorage.sol";
import "../../interfaces/mission-storage/IMissionStates.sol";
import "../../interfaces/IMissionRegistration.sol";
import "../../interfaces/ICentralAuthorizationRegistry.sol";

/**
 * @title ResourceTransferMissionStorage
 * @notice Storage contract for resource transfer missions
 * @dev Implements IResourceTransferMissionStorage interface with journey states
 */
contract ResourceTransferMissionStorage is 
    IResourceTransferMissionStorage, 
    AuthorizationModifiers 
{
    // State variables
    struct ResourceTransferData {
        uint256 shipId;
        uint256 originIslandId;
        uint256 targetIslandId;
        string resourceType;
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        IMissionStates.JourneyState journeyState;
        bool resourcesDelivered;
    }

    // Mapping for mission data
    mapping(uint256 => ResourceTransferData) private resourceTransferMissions;

    // Events
    event MissionInitialized(uint256 indexed missionId, uint256 indexed shipId);
    event MissionCompleted(uint256 indexed missionId, uint256 indexed shipId);
    event JourneyStateUpdated(uint256 indexed missionId, IMissionStates.JourneyState indexed newState);
    event ResourcesDelivered(uint256 indexed missionId);

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionTypeStorage"))
    {}

    /**
     * @inheritdoc IMissionTypeStorage
     */
    function initializeMission(
        uint256 missionId,
        bytes memory initialData
    ) external override onlyAuthorized {
        // Decode initialData
        (
            uint256 shipId,
            uint256 originIslandId,
            uint256 targetIslandId,
            string memory resourceType,
            uint256 amount,
            uint256 startTime,
            uint256 endTime
        ) = abi.decode(initialData, (uint256, uint256, uint256, string, uint256, uint256, uint256));

        resourceTransferMissions[missionId] = ResourceTransferData({
            shipId: shipId,
            originIslandId: originIslandId,
            targetIslandId: targetIslandId,
            resourceType: resourceType,
            amount: amount,
            startTime: startTime,
            endTime: endTime,
            journeyState: IMissionStates.JourneyState.NotStarted,
            resourcesDelivered: false
        });

        emit MissionInitialized(missionId, shipId);
    }

    /**
     * @inheritdoc IMissionTypeStorage
     */
    function completeMission(uint256 missionId) external override onlyAuthorized {
        ResourceTransferData storage missionData = resourceTransferMissions[missionId];
        missionData.journeyState = IMissionStates.JourneyState.Completed;
        emit MissionCompleted(missionId, missionData.shipId);
        emit JourneyStateUpdated(missionId, IMissionStates.JourneyState.Completed);
    }

    /**
     * @inheritdoc IMissionTypeStorage
     */
    function getMissionData(uint256 missionId) external view override returns (bytes memory) {
        ResourceTransferData storage missionData = resourceTransferMissions[missionId];
        
        return abi.encode(
            missionData.shipId,
            missionData.originIslandId,
            missionData.targetIslandId,
            missionData.resourceType,
            missionData.amount,
            missionData.startTime,
            missionData.endTime,
            missionData.journeyState,
            missionData.resourcesDelivered
        );
    }

    function getMissionRegistration() internal view returns (IMissionRegistration) {
        return IMissionRegistration(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionRegistration")));
    }

    function supportsMissionType(uint256 missionType) external view override returns (bool) {
        uint256 transferMissionId = getMissionRegistration().getMissionTypeByName("ResourceTransfer");
        return missionType == transferMissionId;
    }

    /**
     * @inheritdoc IResourceTransferMissionStorage
     */
    function getMissionDetails(uint256 missionId) external view returns (
        uint256 shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        string memory resourceType,
        uint256 amount,
        uint256 startTime,
        uint256 endTime,
        IMissionStates.JourneyState journeyState,
        bool resourcesClaimed
    ) {
        ResourceTransferData storage missionData = resourceTransferMissions[missionId];
        return (
            missionData.shipId,
            missionData.originIslandId,
            missionData.targetIslandId,
            missionData.resourceType,
            missionData.amount,
            missionData.startTime,
            missionData.endTime,
            missionData.journeyState,
            missionData.resourcesDelivered
        );
    }

    function updateJourneyState(uint256 missionId, IMissionStates.JourneyState newState) external onlyAuthorized {
        ResourceTransferData storage missionData = resourceTransferMissions[missionId];
        missionData.journeyState = newState;
        emit JourneyStateUpdated(missionId, newState);
    }

    function isResourcesDelivered(uint256 missionId) external view returns (bool) {
        return resourceTransferMissions[missionId].resourcesDelivered;
    }

    function getJourneyState(uint256 missionId) external view returns (IMissionStates.JourneyState) {
        return resourceTransferMissions[missionId].journeyState;
    }

    function setResourcesClaimed(uint256 missionId) external override onlyAuthorized {
        resourceTransferMissions[missionId].resourcesDelivered = true;
        emit ResourcesDelivered(missionId);
    }
} 