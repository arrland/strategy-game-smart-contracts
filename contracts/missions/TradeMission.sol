// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./BaseMission.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IResourceManagement.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../interfaces/IMissionRequirements.sol";
import "../interfaces/IBuildingStorage.sol";
import "../interfaces/ITradeManager.sol";
import "../interfaces/IArrcLocking.sol";
import "../interfaces/mission-storage/IMissionTypeStorage.sol";
import "../interfaces/mission-storage/ITradeMissionStorage.sol";
import "../interfaces/mission-storage/IMissionStates.sol";
import "../interfaces/IMissionRegistration.sol";
import "./MissionRegistration.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../islands/IslandRegionManagement.sol";
import "../interfaces/IResourceTypeManager.sol";
import "../interfaces/IMissionValidator.sol";
import "../interfaces/IMissionTravelCalculator.sol";


contract TradeMission is BaseMission {
    event TradeJourneyStarted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        string resourceType,
        uint256 amount,
        uint256 price,
        bool isShipBuying,
        IMissionStates.JourneyState journeyState
    );

    event TradePhaseCompleted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        IMissionStates.JourneyState journeyState
    );

    event TradeMissionCompleted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        string resourceType,
        uint256 amount,
        uint256 price
    );

    constructor(
        address _centralAuthorizationRegistry
    ) BaseMission(_centralAuthorizationRegistry, keccak256("TRADE_MISSION"), "Trade Mission") {}

    function getMissionRequirements() internal view returns (IMissionRequirements) {
        return IMissionRequirements(
            centralAuthorizationRegistry.getContractAddress(keccak256("MISSION_REQUIREMENTS"))
        );
    }

    function getTradeManager() internal view returns (ITradeManager) {
        return ITradeManager(
            centralAuthorizationRegistry.getContractAddress(keccak256("ITradeManager"))
        );
    }

    function getArrcLocking() internal view returns (IArrcLocking) {
        return IArrcLocking(centralAuthorizationRegistry.getContractAddress(keccak256("IArrcLocking")));
    }

    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceTypeManager")));
    }

    function validateTradeOrder(
        uint256 tradeOrderId, 
        string memory resourceType, 
        uint256 amount,
        uint256 toIslandId
    ) internal view returns (uint256 price, bool isShipBuying) {
        ITradeManager tradeManager = getTradeManager();
        
        require(tradeManager.isTradeOrderValid(tradeOrderId), "Trade order not available");
        
        (
            address seller,
            uint256 islandId,
            string memory orderResourceType,
            uint256 orderAmount,
            uint256 orderPrice,
            bool isActive
        ) = tradeManager.getTradeOrder(tradeOrderId);
        
        require(isActive, "Trade order not active");
        require(
            keccak256(bytes(orderResourceType)) == keccak256(bytes(resourceType)), 
            "Resource type mismatch"
        );
        
        require(amount <= orderAmount, "Requested amount exceeds available amount");
        
        address islandOwner = getIslandOwner(toIslandId);
        isShipBuying = (seller == islandOwner);
        
        price = orderPrice * amount;
        
        return (price, isShipBuying);
    }

    function getIslandOwner(uint256 islandId) internal view returns (address) {
        address islandContract = centralAuthorizationRegistry.getContractAddress(keccak256("ISLAND_MANAGER"));
        (bool success, bytes memory data) = islandContract.staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", islandId)
        );
        require(success, "Island owner check failed");
        return abi.decode(data, (address));
    }

    function startMission(
        uint256 shipId,
        bytes calldata missionData
    ) external override onlyMissionsManager returns (uint256) {
        // Decode mission data
        uint256 missionId = abi.decode(missionData[:32], (uint256));
        (uint256 originIslandId, uint256 targetIslandId, string memory resourceType, uint256 amount, uint256 tradeOrderId, string memory foodChoice, string memory foodRationChoice) = 
            abi.decode(missionData[32:], (uint256, uint256, string, uint256, uint256, string, string));
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
        
        (uint256 price, bool isShipBuying) = validateTradeOrder(
            tradeOrderId,
            resourceType,
            amount,
            targetIslandId
        );
        
        // Let TradeManager handle all ARRC locking and resource transfers
        // The TradeManager will:
        // 1. Lock ARRC tokens when ship is buying
        // 2. Transfer resources from origin island to ship when island is buying
        ITradeManager tradeManager = getTradeManager();
        bool success = tradeManager.initiateTrade(
            tx.origin,
            shipId,
            tradeOrderId,
            price,
            resourceType,
            amount
        );
        require(success, "Failed to initiate trade");
        
        // Prepare the data for the specialized storage
        bytes memory specializedData = abi.encode(
            shipId,
            originIslandId,
            targetIslandId,
            resourceType,
            amount,
            price,
            tradeOrderId,
            block.timestamp,  // outboundStartTime
            block.timestamp + outboundTime,  // outboundEndTime
            isShipBuying
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
        
        // Emit trade-specific event
        emit TradeJourneyStarted(
            missionId,
            shipId,
            originIslandId,
            targetIslandId,
            resourceType,
            amount,
            price,
            isShipBuying,
            IMissionStates.JourneyState.ToDestination
        );
        
        // Return the total mission duration to MissionsManager
        return totalTime;
    }

    function advanceMission(uint256 missionId) external onlyAuthorized {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        IMissionsStorage.MissionBasicInfo memory basicInfo = missionsStorage.getMissionBasicInfo(missionId);
        
        // In this implementation, missionId is the same as shipId
        uint256 shipId = missionId;
        require(basicInfo.isActive, "Mission is not active");
        
        // Get specialized storage for this mission type
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        
        // Get trade mission details from specialized storage
        bytes memory missionDataBytes = IMissionTypeStorage(tradeStorageAddr).getMissionData(missionId);
        
        (
            uint256 storedShipId,
            uint256 originIslandId,
            uint256 targetIslandId,
            uint256 tradeOrderId,
            string memory resourceType,
            uint256 amount,
            uint256 price,
            uint8 journeyStateRaw,
            uint256 startTime,
            uint256 endTime,
            bool isShipBuying,
            bool resourcesClaimed
        ) = abi.decode(missionDataBytes, (
            uint256, uint256, uint256, uint256, string, uint256, uint256, 
            uint8,
            uint256, uint256, 
            bool, bool
        ));
        
        IMissionStates.JourneyState journeyState = IMissionStates.JourneyState(journeyStateRaw);
        
        if (journeyState == IMissionStates.JourneyState.ToDestination) {
            require(block.timestamp >= endTime, "Outbound journey not complete");
            
            // Instead of handling transfers directly, we'll let TradeManager handle them
            // Call the trade manager to complete the trade, which will handle:
            // 1. ARRC transfers to the island owner (when ship is buying)
            // 2. Resource transfers between ship, marketplace, and island
            ITradeManager tradeManager = getTradeManager();
            address shipOwner = IShipStorage(getShipStorage()).getOwner(shipId);
            
            bool success = tradeManager.completeTrade(
                shipOwner,
                shipId
            );
            require(success, "Failed to complete trade");
            
            // Use the decoded start/end times directly
            uint256 returnTime = endTime - startTime;
            
            // Update mission state for return journey
            // Calculate inbound times
            uint256 newInboundStart = block.timestamp;
            uint256 newInboundEnd = block.timestamp + returnTime;
            
            // Cast to the correct interface: ITradeMissionStorage
            ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
            tradeMissionStorage.updateJourneyState(
                missionId,
                IMissionStates.JourneyState.Returning
            );
            
            emit TradePhaseCompleted(missionId, shipId, IMissionStates.JourneyState.ToDestination);
        } else if (journeyState == IMissionStates.JourneyState.Returning) {
            // Use the decoded end time directly
            require(block.timestamp >= endTime, "Return journey not complete");
            
            // Let TradeManager handle ARRC unlocking when ship returns
            // Just notify it that the mission is complete
            ITradeManager tradeManager = getTradeManager();
            address shipOwner = IShipStorage(getShipStorage()).getOwner(shipId);
            
            bool success = tradeManager.completeEntireTradeMission(
                shipOwner,
                shipId
            );
            require(success, "Failed to complete entire trade mission");
            
            // Unlock the ship after mission
            unlockShipAfterMission(shipId);
            
            // Complete mission in specialized storage
            IMissionTypeStorage(tradeStorageAddr).completeMission(missionId);
            
            // Complete mission in central storage
            missionsStorage.completeMission(shipId);
            
            emit TradePhaseCompleted(missionId, shipId, IMissionStates.JourneyState.Returning);
            emit TradeMissionCompleted(
                missionId,
                shipId,
                originIslandId,
                targetIslandId,
                resourceType,
                amount,
                price
            );
        }
    }

    function completeMission(
        uint256 shipId
    ) external override onlyMissionsManager {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        uint256 missionId = missionsStorage.getMissionId(shipId);
        
        // Call advanceMission with the retrieved mission ID
        this.advanceMission(missionId);
    }

    function getMissionState(uint256 missionId) external view returns (
        uint256 shipId,
        uint256 originIslandId,
        uint256 targetIslandId,
        uint256 tradeOrderId,
        string memory resourceType,
        uint256 amount,
        uint256 price,
        IMissionStates.JourneyState journeyState,
        uint256 outboundStartTime,
        uint256 outboundEndTime,
        uint256 inboundStartTime,
        uint256 inboundEndTime,
        bool isShipBuying
    ) {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Get specialized storage for this mission type
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        
        // Call the custom getter in the specialized storage
        bytes memory resultData = IMissionTypeStorage(tradeStorageAddr).getMissionData(missionId);
        
        // Decode and return the mission state
        return abi.decode(resultData, (
            uint256, uint256, uint256, uint256, string, uint256, uint256, 
            IMissionStates.JourneyState, uint256, uint256, uint256, uint256, bool
        ));
    }

    function getTimeRemaining(uint256 missionId) external view returns (uint256 timeRemaining) {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Get specialized storage for this mission type
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        
        // Cast to the correct interface: ITradeMissionStorage
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        return tradeMissionStorage.getTimeRemaining(missionId);
    }

    function isPhaseComplete(uint256 missionId) external view returns (bool isComplete) {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Get specialized storage for this mission type
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        
        // Cast to the correct interface: ITradeMissionStorage
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        return tradeMissionStorage.isPhaseComplete(missionId);
    }

    /**
     * @notice Get mission type
     * @return missionType Numeric ID for Trade
     */
    function getMissionType() public view override returns (uint256) {
        // Get mission type ID from mission registration
        MissionRegistration missionRegistry = getMissionRegistration();
        return missionRegistry.getMissionTypeByName("Trade");
    }
    
    /**
     * @notice Get MissionRegistration instance
     */
    function getMissionRegistration() internal view returns (MissionRegistration) {
        return MissionRegistration(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionRegistration")));
    }

    /**
     * @notice Get the ship storage contract
     * @return Address of ship storage contract
     */
    function getShipStorage() internal view returns (address) {
        return centralAuthorizationRegistry.getContractAddress(keccak256("IShipStorage"));
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
        
        // Get specialized storage
        uint256 missionType = info.missionType;
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(missionType);
        
        // Cast to the correct interface: ITradeMissionStorage
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        
        // For trade missions, we need to check if the current phase is complete
        bool isPhaseComplete = tradeMissionStorage.isPhaseComplete(info.missionId);
        
        // Also check which phase the mission is in
        (
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
        ) = tradeMissionStorage.getMissionDetails(info.missionId);
        
        // Mission is ready for claim if current phase is complete and it's in the correct journey state
        return isPhaseComplete && (journeyState == IMissionStates.JourneyState.ToDestination || journeyState == IMissionStates.JourneyState.Returning);
    }
}
