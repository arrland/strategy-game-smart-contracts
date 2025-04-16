// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./BaseMission.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMissionValidator.sol";
import "../interfaces/IMissionTravelCalculator.sol";
import "../interfaces/IMissionResourceHandler.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../interfaces/storage/IIslandStorage.sol";
import "../interfaces/mission-storage/IMissionTypeStorage.sol";
import "../interfaces/mission-storage/IResourceTransferMissionStorage.sol";
import "../interfaces/IMissionRegistration.sol";
import "./MissionRegistration.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IResourceTypeManager.sol";
import "../interfaces/IBuildingStorage.sol";

/**
 * @title ResourceTransferMission
 * @notice Handles resource transfer missions between islands
 * @dev Implements the IMission interface through BaseMission
 */
contract ResourceTransferMission is BaseMission {
    using Strings for uint256;

    // Events
    event ResourceTransferStarted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        string resourceType,
        uint256 resourceAmount,
        uint256 startTimestamp,
        uint256 completeTimestamp,
        bool isReturnFromTradeMission
    );

    event ResourceTransferCompleted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        string resourceType,
        uint256 resourceAmount,
        bool isReturnFromTradeMission
    );

    constructor(
        address _centralAuthorizationRegistry
    ) BaseMission(_centralAuthorizationRegistry, keccak256("IResourceTransferMission"), "Resource Transfer") {}

    /**
     * @notice Get mission type
     * @return missionType Numeric ID for ResourceTransfer
     */
    function getMissionType() public view override returns (uint256) {
        // Get mission type ID from mission registration
        MissionRegistration missionRegistry = getMissionRegistration();
        return missionRegistry.getMissionTypeByName("ResourceTransfer");
    }

    /**
     * @notice Get MissionRegistration instance
     */
    function getMissionRegistration() internal view returns (MissionRegistration) {
        return MissionRegistration(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionRegistration")));
    }

    /**
     * @notice Get ResourceTypeManager instance
     */
    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceTypeManager")));
    }

    /**
     * @notice Start a resource transfer mission
     * @param shipId Ship identifier
     * @param missionData Encoded mission parameters
     * @return duration Total mission duration in seconds
     */
    function startMission(
        uint256 shipId,
        bytes calldata missionData
    ) external override onlyMissionsManager returns (uint256) {
        // Decode mission data
        uint256 missionId = abi.decode(missionData[:32], (uint256));
        (uint256 originIslandId, uint256 targetIslandId, string memory resourceType, uint256 amount, bool isReturnFromTradeMission, string memory foodChoice, string memory foodRationChoice) = 
            abi.decode(missionData[32:], (uint256, uint256, string, uint256, bool, string, string));
        // Validate resource type
        require(getResourceTypeManager().isValidResourceType(resourceType), "Invalid resource type");
        
        // Use centralized validator for all validation
        validateIslandRequirements(originIslandId, targetIslandId, getMissionType());
        validateBaseMissionRequirements(shipId);
        require(validateShipCapacity(shipId, amount), "Insufficient ship capacity");
        
        // Calculate both outbound and inbound travel times in a single call
        (uint256 outboundTime, uint256 inboundTime) = calculateRoundTripTravelTime(
            originIslandId, 
            targetIslandId, 
            shipId
        );

        // Get port levels
        IBuildingStorage buildingStorage = IBuildingStorage(centralAuthorizationRegistry.getContractAddress(keccak256("IBuildingStorage")));
        uint256 PORT_TYPE = 3; // Replace with your actual port type
        uint256 originPortLevel = buildingStorage.getBuilding(originIslandId, PORT_TYPE).level;
        uint256 targetPortLevel = buildingStorage.getBuilding(targetIslandId, PORT_TYPE).level;

        // Get crew count
        uint256 crewCount = getMissionValidator().getTotalCrewCount(shipId);

        // Calculate load/unload times
        uint256 loadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, originPortLevel);
        uint256 unloadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, targetPortLevel);

        // Total mission duration is outbound + inbound time + load + unload
        uint256 totalTime = outboundTime + inboundTime + loadTime + unloadTime;

        // Validate and burn mission start resources (RUM, food)
        getMissionValidator().validateAndBurnMissionStartResources(
            shipId,
            totalTime / 1 days, // travelDays (assuming totalTime is in seconds)
            amount, // intended cargo
            foodChoice,
            foodRationChoice,
            tx.origin
        );
        
        // Lock ship for the entire mission duration (outbound + inbound)
        lockShipForMission(shipId, missionId, totalTime);
        
        // Prepare the data for the specialized storage
        bytes memory specializedData = abi.encode(
            shipId,
            originIslandId,
            targetIslandId,
            resourceType,
            amount,
            isReturnFromTradeMission,
            block.timestamp,  // outboundStartTime
            block.timestamp + outboundTime,  // outboundEndTime
            block.timestamp + totalTime  // missionEndTime
        );
        
        // Store mission in central indexing storage with link to specialized data
        IMissionsStorage missionsStorage = getMissionsStorage();
        missionsStorage.startMission(
            shipId,
            missionId,
            getMissionType(),
            totalTime,
            specializedData
        );
        
        // Emit transfer-specific event
        emit ResourceTransferStarted(
            missionId,
            shipId,
            originIslandId,
            targetIslandId,
            resourceType,
            amount,
            block.timestamp,
            block.timestamp + totalTime,
            isReturnFromTradeMission
        );
        
        return missionId;
    }

    /**
     * @notice Complete a resource transfer mission
     * @param missionId ID of the mission to complete
     */
    function completeMission(uint256 missionId) external override onlyAuthorized {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        IMissionsStorage.MissionBasicInfo memory basicInfo = missionsStorage.getMissionBasicInfo(missionId);
        
        // In this implementation, missionId is the same as shipId
        uint256 shipId = missionId;
        require(basicInfo.isActive, "Mission is not active");
        require(block.timestamp >= basicInfo.endTime, "Mission not yet complete");
        
        // Get specialized storage for this mission type
        address resourceTransferStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        IResourceTransferMissionStorage resourceTransferStorage = IResourceTransferMissionStorage(resourceTransferStorageAddr);
        
        // Get resource transfer details
        (
            uint256 _shipId,
            uint256 fromIslandId,
            uint256 toIslandId,
            string memory resourceType,
            uint256 amount,
            , // uint256 startTime
            , // uint256 endTime
            , // bool isReturnFromTradeMission
            bool resourcesClaimed
        ) = resourceTransferStorage.getMissionDetails(missionId);
        
        require(!resourcesClaimed, "Resources already claimed");
        
        // Get ship storage to check resource balance
        address shipStorageAddress = centralAuthorizationRegistry.getContractAddress(keccak256("IShipStorage"));
        
        // Check ship still has the resources
        uint256 shipResourceBalance = IShipStorage(shipStorageAddress).getResourceBalance(
            shipId, 
            resourceType
        );
        require(shipResourceBalance >= amount, "Ship no longer has resources for delivery");
        
        // Get contract addresses and interfaces
        IMissionResourceHandler resourceHandler = getMissionResourceHandler();
        
        // Check target island can receive the resources
        require(
            resourceHandler.hasIslandStorageCapacity(toIslandId, amount),
            "Target island doesn't have enough capacity"
        );
        
        // Transfer resources from ship to target island
        resourceHandler.transferResourceFromShipToIsland(
            shipId,
            toIslandId,
            resourceType,
            amount
        );
        
        // Unlock ship
        unlockShipAfterMission(shipId);
        
        // Mark resources as claimed in specialized storage
        resourceTransferStorage.setResourcesClaimed(missionId);
        
        // Complete mission in central storage
        missionsStorage.completeMission(shipId);
        
        // Emit completion event
        emit ResourceTransferCompleted(
            missionId,
            shipId,
            fromIslandId,
            toIslandId,
            resourceType,
            amount,
            false // Would need to be retrieved from specialized storage
        );
    }

    /**
     * @notice Get mission details
     * @param missionId Mission identifier
     * @return Encoded mission details
     */
    function getMissionDetails(uint256 missionId) external view override returns (bytes memory) {
        // Get mission information from both central and specialized storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        IMissionsStorage.MissionBasicInfo memory basicInfo = missionsStorage.getMissionBasicInfo(missionId);
        
        // Ensure mission exists and is of the correct type
        require(basicInfo.missionId == missionId, "Mission does not exist");
        require(basicInfo.missionType == getMissionType(), "Not a resource transfer mission");
        
        // Get specialized storage for this mission type
        address resourceTransferStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        IResourceTransferMissionStorage resourceTransferStorage = IResourceTransferMissionStorage(resourceTransferStorageAddr);
        
        // Get resource transfer details
        (
            uint256 _shipId,
            uint256 fromIslandId,
            uint256 toIslandId,
            string memory _resourceType,
            uint256 amount,
            , // uint256 startTime
            , // uint256 endTime
            , // IMissionStates.JourneyState journeyState
            bool resourcesClaimed
        ) = resourceTransferStorage.getMissionDetails(missionId);
        
        // Convert resource type hash back to string (simplified approach)
        string memory resourceTypeStr = "resource"; // This would need proper conversion in production
        
        return abi.encode(
            _shipId,
            fromIslandId,
            toIslandId,
            resourceTypeStr,
            amount,
            basicInfo.startTime,
            basicInfo.endTime,
            block.timestamp >= basicInfo.endTime, // isComplete flag
            resourcesClaimed // isReturnFromTradeMission - would need to be retrieved from specialized storage
        );
    }

    /**
     * @notice Check if a mission is ready to be claimed
     * @param shipId The ship ID involved in the mission
     * @return True if the mission is ready to be claimed
     */
    function isMissionReadyForClaim(uint256 shipId) internal view override returns (bool) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        IMissionsStorage.MissionInfo memory info = missionsStorage.getMissionInfo(shipId);
        
        // Check if mission is active and completed time-wise
        if (!info.isActive || block.timestamp < info.endTime) {
            return false;
        }
        
        // Get specialized storage to check if resources are already claimed
        uint256 missionType = info.missionType;
        address specializedStorageAddr = missionsStorage.getSpecializedStorage(missionType);
        
        // Cast to appropriate interface
        IResourceTransferMissionStorage resourceTransferStorage = IResourceTransferMissionStorage(specializedStorageAddr);
        
        // Get resource transfer details to check if resources are claimed
        (
            , //uint256 _shipId3,
            , //uint256 _originIslandId3,
            , //uint256 _targetIslandId3,
            , //string memory _resourceType3,
            , //uint256 _amount3,
            , // uint256 startTime
            , // uint256 endTime
            , // IMissionStates.JourneyState journeyState
            bool resourcesClaimed
        ) = resourceTransferStorage.getMissionDetails(info.missionId);
        
        // Mission is ready for claim if it's not already completed
        return !resourcesClaimed;
    }
}
