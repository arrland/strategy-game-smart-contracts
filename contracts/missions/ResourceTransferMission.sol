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
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IResourceTypeManager.sol";
import "../interfaces/IBuildingStorage.sol";
import "../core/InterfaceIdentifiers.sol";
import "../interfaces/ITradeManager.sol";
import "../interfaces/IMissionAuthorization.sol";


/**
 * @title ResourceTransferMission
 * @notice Handles resource transfer missions between islands
 * @dev Implements the IMission interface through BaseMission
 */
contract ResourceTransferMission is BaseMission, IMissionAuthorization {
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
    ) BaseMission(_centralAuthorizationRegistry, keccak256(abi.encodePacked("IResourceTransferMission")), "ResourceTransfer") {
    }

    /**
     * @notice Get mission type
     * @return missionType Numeric ID for ResourceTransfer
     */
    function getMissionType() public view override returns (uint256) {
        MissionRegistration missionRegistry = getMissionRegistration();
        return missionRegistry.getMissionTypeByName("ResourceTransfer");
    }

    /**
     * @notice Get MissionRegistration instance
     */
    function getMissionRegistration() internal view returns (MissionRegistration) {
        return MissionRegistration(centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IMissionRegistration"))));
    }

    /**
     * @notice Get ResourceTypeManager instance
     */
    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IResourceTypeManager"))));
    }

    /**
     * @notice Get Island NFT contract instance
     */
    function getIslandNFT() internal view returns (IERC721) {
        address islandNFTAddress = centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.ISLAND_NFT_KEY);
        require(islandNFTAddress != address(0), "Island NFT contract not registered");
        return IERC721(islandNFTAddress);
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

    function startMission(
        uint256 shipIdParam, 
        bytes calldata missionData 
    ) external override onlyMissionsManager returns (uint256) {
        uint256 missionId = abi.decode(missionData[:32], (uint256));
        bytes memory innerDataSlice = missionData[32:];

        (uint256 originIslandId, uint256 targetIslandId, string memory resourceType, uint256 amount, bool isReturnFromTradeMission, string memory foodChoice, string memory foodRationChoice) = 
            abi.decode(innerDataSlice, (uint256, uint256, string, uint256, bool, string, string));
        
        // Get the ship owner who is initiating the mission
        address user = getShipOwner(shipIdParam);
        
        // VALIDATIONS
        require(getResourceTypeManager().isValidResourceType(resourceType), "Invalid resource type");
        
        // Validate that the user owns the origin island (can only transfer resources from islands you own)
        validateIslandOwnership(originIslandId, user);
        
        validateIslandRequirements(originIslandId, targetIslandId, getMissionType());
        validateBaseMissionRequirements(shipIdParam);
        
        // TIME CALCULATIONS
        uint256 travelTime = calculateTravelTime(originIslandId, targetIslandId, shipIdParam);

        IBuildingStorage buildingStorage = IBuildingStorage(centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IBuildingStorage"))));
        uint256 PORT_TYPE = 3;
        IBuildingStorage.BuildingInfo memory originPortInfo = buildingStorage.getBuilding(originIslandId, PORT_TYPE);
        uint256 originPortLevel = originPortInfo.level;

        IBuildingStorage.BuildingInfo memory targetPortInfo = buildingStorage.getBuilding(targetIslandId, PORT_TYPE);
        uint256 targetPortLevel = targetPortInfo.level;

        uint256 crewCount = getMissionValidator().getTotalCrewCount(shipIdParam); 
        uint256 loadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, originPortLevel);
        uint256 unloadTime = getMissionTravelCalculator().calculateLoadTime(amount, crewCount, targetPortLevel);

        uint256 totalTime = travelTime + loadTime + unloadTime;
        require(totalTime > 0, "RTM: Total time must be > 0");
        uint256 travelDays = totalTime / SECONDS_IN_DAY;
        if (totalTime % SECONDS_IN_DAY != 0) {
            travelDays++;
        }

        // SHIP CAPACITY VALIDATION
        require(validateShipCapacity(shipIdParam, amount / 1 ether, travelDays, foodChoice, foodRationChoice), "Insufficient ship capacity");
        
        // VALIDATE AND BURN MISSION START RESOURCES (RUM, FOOD)
        getMissionValidator().validateAndBurnMissionStartResources(
            shipIdParam,
            travelDays,
            amount, // intendedCargo
            foodChoice,
            foodRationChoice,
            user
        );

        getMissionResourceHandler().transferResourceFromIslandToShip(
            originIslandId,
            shipIdParam,
            resourceType,
            amount
        );
        
        // LOCK SHIP FOR MISSION
        lockShipForMission(shipIdParam, missionId, totalTime);
        
        // PREPARE SPECIALIZED DATA
        bytes memory specializedData = abi.encode(
            shipIdParam,
            originIslandId,
            targetIslandId,
            resourceType,
            amount,
            block.timestamp,
            block.timestamp + totalTime,
            isReturnFromTradeMission
        );
        
        // STORE MISSION IN MISSIONSSTORAGE
        IMissionsStorage missionsStorage = getMissionsStorage();
        missionsStorage.startMission(
            shipIdParam,
            missionId,
            getMissionType(),
            totalTime,
            specializedData
        );
        
        emit ResourceTransferStarted(
            missionId,
            shipIdParam,
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
    function completeMission(uint256 missionId) external override onlyAuthorized returns (bool isFullyComplete) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        address resourceTransferStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        IResourceTransferMissionStorage resourceTransferStorage = IResourceTransferMissionStorage(resourceTransferStorageAddr);
        
        (uint256 shipId, uint256 fromIslandId, uint256 toIslandId, string memory resourceType, uint256 amount, , , , bool resourcesClaimed)
             = resourceTransferStorage.getMissionDetails(missionId);
        
        IMissionsStorage.MissionBasicInfo memory basicInfo = missionsStorage.getMissionBasicInfo(shipId);
        
        require(basicInfo.isActive, "Mission is not active");
        require(block.timestamp >= basicInfo.endTime, "Mission not yet complete");
        require(!resourcesClaimed, "Resources already claimed");
        
        // Check if this is a return journey from a trade mission
        bool isReturnFromTradeMission = isReturnJourneyFromTrade(missionId);
        
        getMissionResourceHandler().transferResourceFromShipToIsland(
            shipId,
            toIslandId,
            resourceType,
            amount
        );

        unlockShipAfterMission(shipId);
        missionsStorage.completeMission(shipId);
        
        // If this was a return journey from a trade mission, notify TradeManager
        if (isReturnFromTradeMission) {
            address shipOwner = getShipOwner(shipId);
            ITradeManager tradeManager = getTradeManager();
            
            try tradeManager.completeEntireTradeMission(shipOwner, shipId) returns (bool success) {
                require(success, "Failed to complete entire trade mission");
            } catch {
                // Log error but don't fail the ResourceTransferMission completion
                // The trade mission can be completed manually if needed
            }
        }
        
        emit ResourceTransferCompleted(
            missionId,
            shipId,
            fromIslandId,
            toIslandId,
            resourceType,
            amount,
            isReturnFromTradeMission
        );
        
        // ResourceTransferMission is always fully complete in one phase
        return true;
    }

    /**
     * @notice Check if this ResourceTransferMission is a return journey from a trade mission
     * @param missionId Mission identifier
     * @return isReturnJourney True if this is a return journey from a trade mission
     */
    function isReturnJourneyFromTrade(uint256 missionId) internal view returns (bool isReturnJourney) {
        try this.getResourceTransferMissionStorage().isReturnFromTradeMission(missionId) returns (bool result) {
            return result;
        } catch {
            return false;
        }
    }

    /**
     * @notice Get ResourceTransferMissionStorage instance
     */
    function getResourceTransferMissionStorage() public view returns (IResourceTransferMissionStorage) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        address storageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        return IResourceTransferMissionStorage(storageAddr);
    }

    /**
     * @notice Get TradeManager instance
     */
    function getTradeManager() internal view returns (ITradeManager) {
        return ITradeManager(centralAuthorizationRegistry.getContractAddress(keccak256("ITradeManager")));
    }

    /**
     * @notice Check if caller is authorized to complete this mission
     * @param missionId Mission identifier  
     * @param caller Address of the caller
     * @return isAuthorized Whether the caller can complete this mission
     */
    function isAuthorizedToComplete(uint256 missionId, address caller) external view override returns (bool isAuthorized) {
        // Get mission information to find the ship
        IMissionsStorage missionsStorage = getMissionsStorage();
        address storageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        
        // Get mission data to extract shipId
        bytes memory missionData = IMissionTypeStorage(storageAddr).getMissionData(missionId);
        if (missionData.length == 0) return false; // Mission doesn't exist
        
        (uint256 shipId, , , , , , , ) = abi.decode(missionData, (uint256, uint256, uint256, string, uint256, uint256, uint256, bool));
        
        // Only ship owner can complete resource transfer missions
        address shipOwner = getShipAndPirateStaking().getShipOwner(shipId);
        return (caller == shipOwner);
    }

    /**
     * @notice Get mission details
     * @param missionId ID of the mission
     * @return missionDetails Encoded mission details
     */
    function getMissionDetails(uint256 missionId) external view override returns (bytes memory missionDetails) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        address specializedStorageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        IResourceTransferMissionStorage resourceTransferStorage = IResourceTransferMissionStorage(specializedStorageAddr);
        
        (uint256 shipId, uint256 fromIslandId, uint256 toIslandId, string memory resourceType, uint256 amount, uint256 startTime, uint256 endTime, IMissionStates.JourneyState journeyState, bool resourcesClaimed) = resourceTransferStorage.getMissionDetails(missionId);

        return abi.encode(
            shipId,
            fromIslandId,
            toIslandId,
            resourceType,
            amount,
            startTime,
            endTime,
            journeyState,
            resourcesClaimed
        );
    }
}
