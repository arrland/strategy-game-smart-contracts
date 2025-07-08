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
import "../interfaces/IMissionFactory.sol";
import "../interfaces/IMissionsManager.sol";
import "./MissionRegistration.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../islands/IslandRegionManagement.sol";
import "../interfaces/IResourceTypeManager.sol";
import "../interfaces/IMissionValidator.sol";
import "../interfaces/IMissionTravelCalculator.sol";
import "../core/InterfaceIdentifiers.sol";
import "@openzeppelin/contracts/utils/Strings.sol";


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

    event ReturnJourneyStarted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint256 returnMissionId,
        uint256 originIslandId,
        uint256 targetIslandId
    );

    // Mapping to track return missions for trade missions
    mapping(uint256 => uint256) public tradeToReturnMission;
    mapping(uint256 => uint256) public returnToTradeMission;

    constructor(
        address _centralAuthorizationRegistry
    ) BaseMission(_centralAuthorizationRegistry, keccak256("TRADE_MISSION"), "Trade Mission") {}

    function getMissionRequirements() internal view returns (IMissionRequirements) {
        return IMissionRequirements(
            centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSION_REQUIREMENTS_KEY)
        );
    }

    function getTradeManager() internal view returns (ITradeManager) {
        return ITradeManager(
            centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.TRADE_MANAGER_KEY)
        );
    }

    function getArrcLocking() internal view returns (IArrcLocking) {
        return IArrcLocking(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.ARRC_LOCKING_KEY));
    }

    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.RESOURCE_TYPE_MANAGER_KEY));
    }

    function getMissionFactory() internal view returns (IMissionFactory) {
        return IMissionFactory(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSION_FACTORY_KEY));
    }

    function getMissionsManager() internal view returns (IMissionsManager) {
        return IMissionsManager(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSIONS_MANAGER_KEY));
    }

    /**
     * @notice Get Island NFT contract instance
     */
    function getIslandNFT() internal view returns (IERC721) {
        return IERC721(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.ISLAND_NFT_KEY));
    }

    /**
     * @notice Validate that the user owns the specified island
     * @param islandId The ID of the island to check ownership for
     * @param user The address to check ownership against
     */
    function validateIslandOwnership(uint256 islandId, address user) internal view {
        IERC721 islandNFT = getIslandNFT();
        address islandOwner = islandNFT.ownerOf(islandId);
        require(islandOwner == user, "User does not own the origin island");
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
            bool isActive,
            bool isSellOrder
        ) = tradeManager.getTradeOrder(tradeOrderId);
        
        require(isActive, "Trade order not active");
        require(
            keccak256(bytes(orderResourceType)) == keccak256(bytes(resourceType)), 
            "Resource type mismatch"
        );
        
        require(amount <= orderAmount, "Requested amount exceeds available amount");
        
        // FIXED: Use isSellOrder to determine isShipBuying correctly
        // isSellOrder = true  → Island Buy Orders (ships sell TO islands) → isShipBuying = false
        // isSellOrder = false → Island Sell Orders (ships buy FROM islands) → isShipBuying = true
        isShipBuying = !isSellOrder;
        
        price = orderPrice * amount;
        
        return (price, isShipBuying);
    }

    function getIslandOwner(uint256 islandId) internal view returns (address) {
        IERC721 islandNFT = getIslandNFT();
        return islandNFT.ownerOf(islandId);
    }

    function startMission(
        uint256 shipId,
        bytes calldata missionData
    ) external override onlyMissionsManager returns (uint256) {
        // Decode mission data
        uint256 missionId = abi.decode(missionData[:32], (uint256));
        (uint256 originIslandId, uint256 targetIslandId, string memory resourceType, uint256 amount, uint256 tradeOrderId, string memory foodChoice, string memory foodRationChoice) = 
            abi.decode(missionData[32:], (uint256, uint256, string, uint256, uint256, string, string));
        
        // Get the ship owner who is initiating the mission
        address user = getShipOwner(shipId);
        
        // Validate that user owns the origin island
        validateIslandOwnership(originIslandId, user);
        
        // Validate resource type
        require(getResourceTypeManager().isValidResourceType(resourceType), "Invalid resource type");
        
        // Use centralized validator for all validation
        validateIslandRequirements(originIslandId, targetIslandId, getMissionType());
        validateBaseMissionRequirements(shipId);
        
        // Calculate outbound travel time only (return journey will be handled separately)
        uint256 outboundTime = calculateTravelTime(
            originIslandId, 
            targetIslandId, 
            shipId
        );

        // Get port levels
        IBuildingStorage buildingStorage = IBuildingStorage(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.BUILDING_STORAGE_KEY));
        uint256 PORT_TYPE = 3; // Replace with your actual port type
        uint256 originPortLevel = buildingStorage.getBuilding(originIslandId, PORT_TYPE).level;
        uint256 targetPortLevel = buildingStorage.getBuilding(targetIslandId, PORT_TYPE).level;

        // Get crew count
        uint256 crewCount = getMissionValidator().getTotalCrewCount(shipId);

        // Calculate load/unload times for outbound journey only
        uint256 loadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, originPortLevel);
        uint256 unloadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, targetPortLevel);

        // Total outbound time includes travel + load + unload
        uint256 totalOutboundTime = outboundTime + loadTime + unloadTime;

        // Calculate return journey time for storage (will be used when creating ResourceTransferMission)
        uint256 returnTime = calculateTravelTime(targetIslandId, originIslandId, shipId);
        uint256 returnLoadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, targetPortLevel);
        uint256 returnUnloadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, originPortLevel);
        uint256 totalReturnTime = returnTime + returnLoadTime + returnUnloadTime;

        // Total mission time for RUM/food calculation includes both outbound and return
        uint256 totalMissionTime = totalOutboundTime + totalReturnTime;

        // Validate and burn mission start resources (RUM, food) for the entire round trip
        // Ensure minimum of 1 day for RUM calculation even for short missions
        uint256 travelDaysForRum = totalMissionTime / 1 days;
        if (travelDaysForRum == 0) {
            travelDaysForRum = 1; // Minimum 1 day for RUM calculation
        }
        getMissionValidator().validateAndBurnMissionStartResources(
            shipId,
            travelDaysForRum,
            amount, // intended cargo
            foodChoice,
            foodRationChoice,
            user
        );
        
        (uint256 price, bool isShipBuying) = validateTradeOrder(
            tradeOrderId,
            resourceType,
            amount,
            targetIslandId
        );
        
        // ENHANCEMENT: For Island Buy Orders (ship selling), validate ship has required resources
        if (!isShipBuying) {
            // Ship is selling resources to the island - validate ship has the resources
            IResourceManagement resourceManagement = IResourceManagement(
                centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.RESOURCE_MANAGEMENT_KEY)
            );
            
            // Get ship storage contract address
            address shipStorageAddress = centralAuthorizationRegistry.getContractAddress(
                InterfaceIdentifiers.SHIP_STORAGE_KEY
            );
            
            uint256 shipResourceBalance = resourceManagement.getResourceBalance(
                shipStorageAddress, // Ship storage contract address
                shipId, // Ship storage
                resourceType
            );
            
            require(shipResourceBalance >= amount, 
                string(abi.encodePacked(
                    "Ship missing resources for sale: has ", 
                    Strings.toString(shipResourceBalance),
                    " but needs ",
                    Strings.toString(amount),
                    " of ",
                    resourceType
                ))
            );
        }
        
        // Let TradeManager handle all ARRC locking and resource transfers
        ITradeManager tradeManager = getTradeManager();
        bool success = tradeManager.initiateTrade(
            user,
            shipId,
            tradeOrderId,
            price,
            resourceType,
            amount,
            originIslandId
        );
        require(success, "Failed to initiate trade");
        
        // Prepare the data for the specialized storage (include return journey time)
        bytes memory specializedData = abi.encode(
            shipId,
            originIslandId,
            targetIslandId,
            resourceType,
            amount,
            price,
            tradeOrderId,
            block.timestamp,  // outboundStartTime
            block.timestamp + totalOutboundTime,  // outboundEndTime
            isShipBuying,
            totalReturnTime  // Store return journey duration for later use
        );
        
        // Store mission in central indexing storage with link to specialized data
        IMissionsStorage missionsStorage = getMissionsStorage();
        missionsStorage.startMission(
            shipId,
            missionId,
            getMissionType(),
            totalOutboundTime, // Only outbound time for the initial mission
            specializedData
        );
        
        // Lock ship for the outbound journey only (return will be handled by ResourceTransferMission)
        lockShipForMission(shipId, missionId, totalOutboundTime);
        
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
        
        // Return the mission ID to MissionsManager
        return missionId;
    }

    function advanceMission(uint256 missionId) internal {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Get shipId from specialized storage using missionId
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        (uint256 shipId, uint256 originIslandId, uint256 targetIslandId, uint256 tradeOrderId, 
         string memory resourceType, uint256 amount, uint256 price, uint256 startTime, 
         uint256 endTime, IMissionStates.JourneyState journeyState, bool isShipBuying, bool resourcesClaimed) = 
            tradeMissionStorage.getMissionDetails(missionId);
        
        require(shipId != 0, "Mission does not exist");
        
        IMissionsStorage.MissionBasicInfo memory basicInfo = missionsStorage.getMissionBasicInfo(shipId);
        require(basicInfo.isActive, "Mission is not active");
        
        if (journeyState == IMissionStates.JourneyState.ToDestination) {
            require(block.timestamp >= endTime, "Outbound journey not complete");
            
            // Complete the trade at the destination island
            ITradeManager tradeManager = getTradeManager();
            address shipOwner = IShipStorage(getShipStorage()).getOwner(shipId);
            
            bool success = tradeManager.completeTrade(
                shipOwner,
                shipId
            );
            require(success, "Failed to complete trade");
            
            // Start return journey after trade completion
            bool returnStarted = tradeManager.startReturnJourney(
                shipOwner,
                shipId
            );
            require(returnStarted, "Failed to start return journey");
            
            // Update mission state to Returning
            tradeMissionStorage.updateJourneyState(
                missionId,
                IMissionStates.JourneyState.Returning
            );
            
            // Get return journey duration and update end time for the returning phase
            uint256 returnJourneyDuration = ITradeMissionStorage(tradeStorageAddr).getReturnJourneyDuration(missionId);
            uint256 newEndTime = block.timestamp + returnJourneyDuration;
            
            // Update end time in specialized storage for the return journey
            ITradeMissionStorage(tradeStorageAddr).updateEndTime(missionId, newEndTime);
            
            // Create ResourceTransferMission for return journey
            uint256 returnMissionId = startReturnJourney(
                shipId,
                missionId,
                targetIslandId,
                originIslandId,
                resourceType,
                amount,
                isShipBuying
            );
            
            // Track the relationship between trade and return missions
            tradeToReturnMission[missionId] = returnMissionId;
            returnToTradeMission[returnMissionId] = missionId;
            
            emit TradePhaseCompleted(missionId, shipId, IMissionStates.JourneyState.ToDestination);
            emit ReturnJourneyStarted(missionId, shipId, returnMissionId, targetIslandId, originIslandId);
            
        } else {
            revert("Invalid journey state for advancement");
        }
    }

    /**
     * @notice Start a return journey internally within the TradeMission
     * @param shipId Ship identifier
     * @param tradeMissionId Original trade mission ID
     * @param fromIslandId Source island (where trade was completed)
     * @param toIslandId Destination island (origin island)
     * @param resourceType Type of resource being transferred
     * @param amount Amount of resource
     * @param isShipBuying Whether the ship was buying (affects what gets transferred)
     * @return returnMissionId The trade mission ID (same mission, different phase)
     */
    function startReturnJourney(
        uint256 shipId,
        uint256 tradeMissionId,
        uint256 fromIslandId,
        uint256 toIslandId,
        string memory resourceType,
        uint256 amount,
        bool isShipBuying
    ) internal returns (uint256 returnMissionId) {
        // For now, just update the journey state to Returning
        // The mission will continue with the same ID but in the returning phase
        // The return journey duration was already calculated and stored during mission start
        
        // Emit event to indicate return journey has started
        emit ReturnJourneyStarted(tradeMissionId, shipId, tradeMissionId, fromIslandId, toIslandId);
            
        // Return the same mission ID since we're continuing the same trade mission
        return tradeMissionId;
    }

    /**
     * @notice Complete the return journey phase of a trade mission
     * @param missionId Trade mission ID
     */
    function completeReturnJourney(uint256 missionId) internal {
        // Get mission details
        IMissionsStorage missionsStorage = getMissionsStorage();
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        
        (uint256 shipId, uint256 originIslandId, uint256 targetIslandId, , 
         string memory resourceType, uint256 amount, , , , , bool isShipBuying, ) = 
            tradeMissionStorage.getMissionDetails(missionId);
        
        // Transfer acquired resources or ARRC payment to the origin island
        if (isShipBuying) {
            // Ship was buying - transfer acquired resources from ship to origin island
            getMissionResourceHandler().transferResourceFromShipToIsland(
                shipId,
                originIslandId,
                resourceType,
                amount
            );
        }
        // If ship was selling, ARRC payment was already handled by TradeManager
        
        // Complete the entire trade mission (return journey was already started in advanceMission)
        address shipOwner = getShipOwner(shipId);
        ITradeManager tradeManager = getTradeManager();
        
        // Complete the entire trade mission
        bool success = tradeManager.completeEntireTradeMission(shipOwner, shipId);
        require(success, "Failed to complete entire trade mission");
    }

    // NOTE: completeReturnJourney method removed - ResourceTransferMission now handles 
    // trade mission completion automatically via TradeManager integration

    function completeMission(
        uint256 shipId
    ) external override onlyMissionsManager {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        uint256 missionId = missionsStorage.getMissionId(shipId);
        
        // Get mission state to determine what to do
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        
        (, , , , , , , , uint256 endTime, IMissionStates.JourneyState journeyState, , ) = 
            tradeMissionStorage.getMissionDetails(missionId);
        
        if (journeyState == IMissionStates.JourneyState.ToDestination) {
            // If in ToDestination phase, advance to Returning
            advanceMission(missionId);
            
            // Mission advanced but is not complete - don't complete in MissionsManager
            // Just return without calling completion logic
            return;
        } else if (journeyState == IMissionStates.JourneyState.Returning) {
            // If in Returning phase, complete the entire trade mission
            require(block.timestamp >= endTime, "Return journey not yet complete");
            
            // Get mission details for event emission
            (uint256 _shipId, uint256 originIslandId, uint256 targetIslandId, , 
             string memory resourceType, uint256 amount, uint256 price, , , , , ) = 
                tradeMissionStorage.getMissionDetails(missionId);
            
            // Complete the return journey and finalize the trade
            completeReturnJourney(missionId);
            
            // Unlock ship and complete mission in storage
            unlockShipAfterMission(shipId);
            missionsStorage.completeMission(shipId);
            
            emit TradeMissionCompleted(missionId, shipId, originIslandId, targetIslandId, resourceType, amount, price);
        }
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
        uint256 startTime,
        uint256 endTime,
        bool isShipBuying,
        bool resourcesClaimed
    ) {
        // Get mission information from central storage
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Get specialized storage for this mission type
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        
        // Call the custom getter in the specialized storage
        bytes memory resultData = IMissionTypeStorage(tradeStorageAddr).getMissionData(missionId);
        
        // Decode the actual data structure (12 fields, not 13)
        (
            uint256 _shipId,
            uint256 _originIslandId,
            uint256 _targetIslandId,
            uint256 _tradeOrderId,
            string memory _resourceType,
            uint256 _amount,
            uint256 _price,
            uint256 _startTime,
            uint256 _endTime,
            uint8 journeyStateRaw,
            bool _isShipBuying,
            bool _resourcesClaimed
        ) = abi.decode(resultData, (
            uint256, uint256, uint256, uint256, string, uint256, uint256, 
            uint256, uint256, uint8, bool, bool
        ));
        
        // Assign to return variables
        shipId = _shipId;
        originIslandId = _originIslandId;
        targetIslandId = _targetIslandId;
        tradeOrderId = _tradeOrderId;
        resourceType = _resourceType;
        amount = _amount;
        price = _price;
        startTime = _startTime;
        endTime = _endTime;
        journeyState = IMissionStates.JourneyState(journeyStateRaw);
        isShipBuying = _isShipBuying;
        resourcesClaimed = _resourcesClaimed;
        
        return (
            shipId,
            originIslandId,
            targetIslandId,
            tradeOrderId,
            resourceType,
            amount,
            price,
            journeyState,
            startTime,
            endTime,
            isShipBuying,
            resourcesClaimed
        );
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
     * @notice Get return journey duration for a trade mission
     * @param missionId Trade mission ID
     * @return duration Return journey duration in seconds
     */
    function getReturnJourneyDuration(uint256 missionId) external view returns (uint256 duration) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        
        // Get the stored return journey duration from specialized data
        bytes memory missionDataBytes = IMissionTypeStorage(tradeStorageAddr).getMissionData(missionId);
        
        // Decode to get the return journey duration (last field in our encoding)
        (, , , , , , , , , , , uint256 returnJourneyDuration) = 
            abi.decode(missionDataBytes, (
                uint256, uint256, uint256, string, uint256, uint256, uint256, 
                uint256, uint256, bool, bool, uint256
            ));
        
        return returnJourneyDuration;
    }

    /**
     * @notice Check if mission can advance to next phase
     * @param missionId Trade mission ID
     * @return canAdvance Whether the mission can advance
     */
    function canAdvanceToNextPhase(uint256 missionId) external view returns (bool canAdvance) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        
        (, , , , , , , , uint256 endTime, IMissionStates.JourneyState journeyState, , ) = 
            tradeMissionStorage.getMissionDetails(missionId);
        
        // Can advance if in ToDestination phase and time has elapsed
        return (journeyState == IMissionStates.JourneyState.ToDestination && block.timestamp >= endTime);
    }

    /**
     * @notice Get resources acquired from trade (for ship buying scenarios)
     * @param missionId Trade mission ID
     */
    function getAcquiredResources(uint256 missionId) external view returns (string memory resourceType, uint256 amount) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        
        (, , , , string memory _resourceType, uint256 _amount, , , , , bool isShipBuying, ) = 
            tradeMissionStorage.getMissionDetails(missionId);
        
        // Only return acquired resources if ship was buying
        if (isShipBuying) {
            return (_resourceType, _amount);
        } else {
            return ("", 0);
        }
    }

    /**
     * @notice Get ARRC payment from trade (for ship selling scenarios)
     * @param missionId Trade mission ID
     * @return payment ARRC payment amount
     */
    function getArrcPayment(uint256 missionId) external view returns (uint256 payment) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        address tradeStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        ITradeMissionStorage tradeMissionStorage = ITradeMissionStorage(tradeStorageAddr);
        
        (, , , , , , uint256 price, , , , bool isShipBuying, ) = 
            tradeMissionStorage.getMissionDetails(missionId);
        
        // Only return ARRC payment if ship was selling
        if (!isShipBuying) {
            return price;
        } else {
            return 0;
        }
    }

    /**
     * @notice Check if return journey is active for a trade mission
     * @param missionId Trade mission ID
     * @return isActive Whether return journey is active
     */
    function isReturnJourneyActive(uint256 missionId) external view returns (bool isActive) {
        uint256 returnMissionId = tradeToReturnMission[missionId];
        if (returnMissionId == 0) {
            return false;
        }
        
        // Check if return mission is active in MissionsStorage
        IMissionsStorage missionsStorage = getMissionsStorage();
        try missionsStorage.isOnMission(returnMissionId) returns (bool onMission) {
            return onMission;
        } catch {
            return false;
        }
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
        return MissionRegistration(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSION_REGISTRATION_KEY));
    }

    /**
     * @notice Get the ship storage contract
     * @return Address of ship storage contract
     */
    function getShipStorage() internal view returns (address) {
        return centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.SHIP_STORAGE_KEY);
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
        bool phaseComplete = tradeMissionStorage.isPhaseComplete(info.missionId);
        
        // Also check which phase the mission is in
        (
            uint256 missionShipId,
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
        
        // Mission is ready for claim if current phase is complete and it's in ToDestination state
        // (Returning state is handled by ResourceTransferMission)
        return phaseComplete && journeyState == IMissionStates.JourneyState.ToDestination;
    }
}
