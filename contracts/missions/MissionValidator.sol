// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IMissionValidator.sol";
import "../AuthorizationModifiers.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../interfaces/ships/IShipAndPirateStaking.sol";
import "../interfaces/IMissionRequirements.sol";
import "../interfaces/IBuildingStorage.sol";
import "../interfaces/IFeeManagement.sol";
import "../interfaces/IResourceSpendManagement.sol";
import "../interfaces/ICrewManagement.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MissionValidator
 * @dev Validates all requirements for starting and completing missions.
 */
contract MissionValidator is IMissionValidator, AuthorizationModifiers {
    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionValidator")) {}


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
    function validateShipCapacity(uint256 shipId, uint256 amount) external view returns (bool) {
        IShipStorage shipStorageContract = getShipStorage(); 
        return shipStorageContract.hasAvailableCapacity(shipId, amount);
    }

    /**
     * @notice Check if a ship is locked
     * @param shipId The ID of the ship to check
     * @return locked True if the ship is locked
     */
    function isShipLocked(uint256 shipId) public view returns (bool) {
        IShipStorage shipStorage = IShipStorage(getShipStorage());
        return shipStorage.isResourceLocked(shipId);
    }

    /**
     * @notice Check if user is the owner of an island
     * @param islandId Island ID to check
     * @param user Address to check ownership against
     * @return True if the user is the owner of the island
     */
    function isIslandOwner(uint256 islandId, address user) external view returns (bool) {
        address islandContract = getIslandManager();
        (bool success, bytes memory data) = islandContract.staticcall(
            abi.encodeWithSignature("ownerOf(uint256)", islandId)
        );
        require(success, "Island owner check failed");
        address owner = abi.decode(data, (address));
        return owner == user;
    }

    /**
     * @dev Internal helper to calculate total food amounts and required storage.
     * This helps reduce stack depth in the main validation function.
     */
    function _calculateNeededStorageAndFoodAmounts(
        uint256 travelDays,
        uint256 intendedCargo,
        string calldata foodChoice,
        string calldata foodRationChoice,
        uint256 totalCrew,
        IResourceSpendManagement resourceSpend
    ) internal view returns (uint256 neededStorageInBaseUnits) {
        uint256 totalPrimaryFoodAmountWei = resourceSpend.calculateTotalFoodAmountForAction(
            "consumePrimaryFood",
            foodChoice,
            totalCrew,
            travelDays
        );

        uint256 totalRationFoodAmountWei = resourceSpend.calculateTotalFoodAmountForAction(
            "consumeRationFood",
            foodRationChoice,
            totalCrew,
            travelDays
        );

        uint256 primaryFoodCargoUnits;
        // This conversion assumes that "citrus" and "crate-packed citrus" values from
        // calculateTotalFoodAmountForAction are in wei (1e18 scale) and need conversion to base units for storage.
        // Other food types are assumed to be returned in base units already by calculateTotalFoodAmountForAction.
        // This logic should ideally be driven by metadata from ResourceTypeManager or ResourceSpendManagement
        // indicating the unit type of amounts returned by calculateTotalFoodAmountForAction.
        if (
            keccak256(bytes(foodChoice)) == keccak256(bytes("citrus")) ||
            keccak256(bytes(foodChoice)) == keccak256(bytes("crate-packed citrus"))
        ) {
            primaryFoodCargoUnits = totalPrimaryFoodAmountWei / (10**18);
        } else {
            // Assuming other primary food types are already in base units for cargo calculation
            primaryFoodCargoUnits = totalPrimaryFoodAmountWei; 
        }

        // Assuming all ration food amounts from calculateTotalFoodAmountForAction are in wei
        // and need conversion to base units for storage.
        uint256 rationFoodCargoUnits = totalRationFoodAmountWei / (10**18);

        neededStorageInBaseUnits = primaryFoodCargoUnits + rationFoodCargoUnits + intendedCargo;
        return neededStorageInBaseUnits;
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
        uint256 nftCrew = getNFTCrewCount(shipId);
        uint256 totalCrew = getTotalCrewCount(shipId);
        
        IResourceSpendManagement resourceSpend = IResourceSpendManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceSpendManagement")));

        uint256 totalResourcesNeededForShipStorage = _calculateNeededStorageAndFoodAmounts(
            travelDays,
            intendedCargo,
            foodChoice,
            foodRationChoice,
            totalCrew,
            resourceSpend
        );
        
        IShipStorage shipStorage = getShipStorage();
        uint256 availableCapacity = shipStorage.getAvailableCapacity(shipId);
        

        require(totalResourcesNeededForShipStorage <= availableCapacity, "Not enough ship storage for food and cargo");
        
        IFeeManagement feeManagement = IFeeManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IFeeManagement")));
        feeManagement.useRum(user, travelDays * nftCrew);

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
        ICrewManagement crewManagement = ICrewManagement(centralAuthorizationRegistry.getContractAddress(keccak256("ICrewManagement")));
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
            centralAuthorizationRegistry.getContractAddress(keccak256("IMissionsStorage"))
        );
    }

    function getShipAndPirateStaking() internal view returns (IShipAndPirateStaking) {
        return IShipAndPirateStaking(
            centralAuthorizationRegistry.getContractAddress(keccak256("IShipAndPirateStaking"))
        );
    }

    function getShipStorage() internal view returns (IShipStorage) {
        return IShipStorage(
            centralAuthorizationRegistry.getContractAddress(keccak256("IShipStorage"))
        );
    }

    function getMissionRequirements() internal view returns (IMissionRequirements) {
        return IMissionRequirements(
            centralAuthorizationRegistry.getContractAddress(keccak256("MISSION_REQUIREMENTS"))
        );
    }

    function getIslandManager() internal view returns (address) {
        return centralAuthorizationRegistry.getContractAddress(keccak256("IIslandManager"));
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