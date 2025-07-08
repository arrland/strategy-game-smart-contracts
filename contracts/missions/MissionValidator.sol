// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/interfaces/IMissionValidator.sol";
import "contracts/AuthorizationModifiers.sol";
import "contracts/interfaces/IMissionsStorage.sol";
import "contracts/interfaces/storage/IShipStorage.sol";
import "contracts/interfaces/ships/IShipAndPirateStaking.sol";
import "contracts/interfaces/IMissionRequirements.sol";
import "contracts/interfaces/IBuildingStorage.sol";
import "contracts/interfaces/IFeeManagement.sol";
import "../interfaces/IResourceSpendManagement.sol";
import "../interfaces/ICrewManagement.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../core/InterfaceIdentifiers.sol";
import "hardhat/console.sol";

/**
 * @title MissionValidator
 * @dev Validates all requirements for starting and completing missions.
 */
contract MissionValidator is IMissionValidator, AuthorizationModifiers {
    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, InterfaceIdentifiers.MISSION_VALIDATOR_KEY) {}


    /**
     * @notice Validate that a ship meets base requirements for missions
     * @param shipId The ID of the ship to validate
     */
    function validateShipRequirements(uint256 shipId) external view {
        IShipAndPirateStaking staking = getShipAndPirateStaking();
        IMissionsStorage missionsStorage = getMissionsStorage();

        require(staking.isShipStaked(shipId), "Ship not staked");
        require(!missionsStorage.isOnMission(shipId), "Ship already on mission");
        require(!isShipLocked(shipId), "Ship resources are locked");
    }

    /**
     * @notice Validate that islands have required buildings for a mission type
     * @param fromIslandId Source island ID
     * @param toIslandId Destination island ID
     * @param missionType Type of mission
     */
    function validateIslandRequirements(
        uint256 fromIslandId, 
        uint256 toIslandId, 
        uint256 missionType
    ) external view {
        IMissionRequirements missionRequirements = getMissionRequirements();
        
        // no buildings required for source island
        
        // // Validate the source island
        // if (fromIslandId != 0) {
        //     bool isSourceValid = missionRequirements.validateIslandForMission(fromIslandId, missionType);
        //     require(isSourceValid, "Source island missing required buildings");
        // }
        
        // Validate the destination island
        if (toIslandId != 0) {
            bool isDestinationValid = missionRequirements.validateIslandForMission(toIslandId, missionType);
            require(isDestinationValid, "Destination island missing required buildings");
        }
        
        // Get building requirements for display in error messages
        uint256[] memory buildingTypes;
        uint256[] memory buildingLevels;
        
        (buildingTypes, buildingLevels) = missionRequirements.getRequiredBuildingsForMissionType(missionType);
    }

    /**
     * @notice Check if a ship has sufficient capacity for resources
     * @param shipId The ID of the ship
     * @param amount The amount of resources to check capacity for
     * @return True if the ship has sufficient capacity
     */
    function validateShipCapacity(
        uint256 shipId, 
        uint256 amount,
        uint256 travelDays,
        string memory foodChoice,
        string memory foodRationChoice
    ) public view override returns (bool) {
        (uint256 requiredFoodAmount, ) = _calculateNeededStorageAndFoodAmounts(shipId, travelDays, 0, foodChoice, foodRationChoice);
        uint256 totalRequiredCapacity = amount + requiredFoodAmount;
        
        return getShipStorage().hasAvailableCapacity(shipId, totalRequiredCapacity);
    }

    /**
     * @notice Check if a ship is locked
     * @param shipId The ID of the ship to check
     * @return locked True if the ship is locked
     */
    function isShipLocked(uint256 shipId) public view override returns (bool) {
        return getShipStorage().isResourceLocked(shipId);
    }

    /**
     * @notice Check if user is the owner of an island
     * @param islandId Island ID to check
     * @param user Address to check ownership against
     * @return True if the user is the owner of the island
     */
    function isIslandOwner(uint256 islandId, address user) public view override returns (bool) {
        address islandContractAddress = centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.ISLAND_NFT_KEY);
        require(islandContractAddress != address(0), "Island contract not registered");
        return IERC721(islandContractAddress).ownerOf(islandId) == user;
    }

    /**
     * @dev Internal helper to calculate total food amounts and required storage.
     * This helps reduce stack depth in the main validation function.
     */
    function _calculateNeededStorageAndFoodAmounts(
        uint256 shipId,
        uint256 travelDays,
        uint256 intendedCargo,
        string memory foodChoice,
        string memory foodRationChoice
    ) internal view returns (uint256 requiredFoodAmount, uint256 neededStorageInBaseUnits) {
        uint256 totalPrimaryFoodAmountWei = 0;
        uint256 totalRationFoodAmountWei = 0;
        
        // Only calculate food amounts if food choices are not "none"
        if (keccak256(abi.encodePacked(foodChoice)) != keccak256(abi.encodePacked("none"))) {
            totalPrimaryFoodAmountWei = IResourceSpendManagement(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.RESOURCE_SPEND_MANAGEMENT_KEY)).calculateTotalFoodAmountForAction(
                "consumePrimaryFood",
                foodChoice,
                getTotalCrewCount(shipId),
                travelDays
            );
        }
        
        if (keccak256(abi.encodePacked(foodRationChoice)) != keccak256(abi.encodePacked("none"))) {
            totalRationFoodAmountWei = IResourceSpendManagement(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.RESOURCE_SPEND_MANAGEMENT_KEY)).calculateTotalFoodAmountForAction(
                "consumeRationFood",
                foodRationChoice,
                getTotalCrewCount(shipId),
                travelDays
            );
        }
        
        // Convert food amounts from wei to base units for cargo calculation
        uint256 primaryFoodCargoUnits = totalPrimaryFoodAmountWei / 1 ether;
        uint256 rationFoodCargoUnits = totalRationFoodAmountWei / 1 ether;

        requiredFoodAmount = primaryFoodCargoUnits + rationFoodCargoUnits;
        neededStorageInBaseUnits = requiredFoodAmount + intendedCargo;
    }

    /**
     * @notice Validate and burn resources for mission start (RUM and food)
     * @param shipId The ID of the ship
     * @param travelDays Number of days for the mission
     * @param intendedCargo Amount of cargo to be carried (in resource units)
     * @param foodChoice "citrus" or "crate-packed citrus"
     * @param foodRationChoice One of the middle food set (e.g., "fish", "coconut", etc.)
     * @param user The address of the user starting the mission
     */
    function validateAndBurnMissionStartResources(
        uint256 shipId,
        uint256 travelDays,
        uint256 intendedCargo,
        string calldata foodChoice,
        string calldata foodRationChoice,
        address user
    ) external override onlyAuthorized {
        uint256 totalCrew = getTotalCrewCount(shipId);
        
        // 1. Validate Ship Capacity
        (, uint256 totalResourcesNeededForShipStorage) = _calculateNeededStorageAndFoodAmounts(
            shipId,
            travelDays,
            intendedCargo,
            foodChoice,
            foodRationChoice
        );
        
        IShipStorage shipStorage = getShipStorage();
        require(totalResourcesNeededForShipStorage <= shipStorage.getAvailableCapacity(shipId), "Not enough ship storage for food and cargo");
        
        IFeeManagement feeManagement = IFeeManagement(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.FEE_MANAGEMENT_KEY));
        feeManagement.useRum(user, travelDays * getNFTCrewCount(shipId));

        IResourceSpendManagement resourceSpend = IResourceSpendManagement(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.RESOURCE_SPEND_MANAGEMENT_KEY));
        resourceSpend.burnMissionStartFoods(
            address(shipStorage),
            shipId,
            user,
            travelDays,
            totalCrew,
            foodChoice,
            foodRationChoice
        );
    }

    /**
     * @notice Get total crew count (NFT + non-NFT) for a ship
     * @param shipId The ID of the ship
     * @return totalCrew The total crew count
     */
    function getTotalCrewCount(uint256 shipId) public view returns (uint256 totalCrew) {
        return getNFTCrewCount(shipId) + getNonNFTCrewCount(shipId);
    }

    function getNFTCrewCount(uint256 shipId) public view returns (uint256) {
        (, , uint256[] memory genesisCrew, uint256[] memory inhabitantsCrew) = getShipAndPirateStaking().getShipCrewDetails(shipId);
        return 1 + genesisCrew.length + inhabitantsCrew.length;
    }

    function getNonNFTCrewCount(uint256 shipId) public view returns (uint256 totalNonNFT) {
        IShipAndPirateStaking staking = getShipAndPirateStaking();
        ICrewManagement crewManagement = ICrewManagement(centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.CREW_MANAGEMENT_KEY));
        (uint256 captainId, address captainCollection, uint256[] memory genesisCrew, uint256[] memory inhabitantsCrew) = staking.getShipCrewDetails(shipId);
        address genesisAddr = staking.getGenesisPiratesAddress();
        address inhabitantsAddr = staking.getInhabitantsAddress();
        uint256[] memory allPirateIds = new uint256[](genesisCrew.length + inhabitantsCrew.length + 1);
        address[] memory allCollections = new address[](genesisCrew.length + inhabitantsCrew.length + 1);
        allPirateIds[0] = captainId;
        allCollections[0] = captainCollection;
        for (uint256 i = 0; i < genesisCrew.length; i++) {
            allPirateIds[i + 1] = genesisCrew[i];
            allCollections[i + 1] = genesisAddr;
        }
        for (uint256 i = 0; i < inhabitantsCrew.length; i++) {
            allPirateIds[genesisCrew.length + 1 + i] = inhabitantsCrew[i];
            allCollections[genesisCrew.length + 1 + i] = inhabitantsAddr;
        }
        for (uint256 i = 0; i < allPirateIds.length; i++) {
            (, uint256[] memory crewCounts) = crewManagement.getAllCrewCountsForShip(allCollections[i], allPirateIds[i]);
            for (uint256 j = 0; j < crewCounts.length; j++) {
                totalNonNFT += crewCounts[j];
            }
        }
    }

    function calculateTotalRequiredStorage(
        uint256 primaryFood,
        uint256 rationFood,
        uint256 rum,
        uint256 intendedCargo
    ) public pure returns (uint256) {
        return primaryFood + rationFood + intendedCargo;
    }

    // Internal access to system contracts
    function getMissionsStorage() internal view returns (IMissionsStorage) {
        return IMissionsStorage(
            centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSIONS_STORAGE_KEY)
        );
    }

    function getShipAndPirateStaking() internal view returns (IShipAndPirateStaking) {
        return IShipAndPirateStaking(
            centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.SHIP_AND_PIRATE_STAKING_KEY)
        );
    }

    function getShipStorage() internal view returns (IShipStorage) {
        return IShipStorage(
            centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.SHIP_STORAGE_KEY)
        );
    }

    function getMissionRequirements() internal view returns (IMissionRequirements) {
        address missionReqAddr = centralAuthorizationRegistry.getContractAddress(InterfaceIdentifiers.MISSION_REQUIREMENTS_KEY);
        console.log("MissionValidator: getMissionRequirements() retrieved address:", missionReqAddr);
        require(missionReqAddr != address(0), "MISSION_REQUIREMENTS not registered in CAR");
        return IMissionRequirements(missionReqAddr);
    }

    function getShipHomeIsland(uint256 shipId) external view override returns (uint256) {
        // TODO: Implement properly by querying IShipAndPirateStaking
        revert("getShipHomeIsland not implemented");
        // return 0; // Placeholder
    }

    function getShipLevel(uint256 shipId) external view override returns (uint256) {
        // TODO: Implement properly by querying IShipMetadata or similar
        revert("getShipLevel not implemented");
        // return 0; // Placeholder
    }
} 