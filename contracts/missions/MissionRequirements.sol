// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IMissionRequirements.sol";
import "../interfaces/IBuildingStorage.sol";
import "../AuthorizationModifiers.sol";
import "hardhat/console.sol";

/**
 * @title MissionRequirements
 * @notice Defines and validates requirements for different mission types
 * @dev Currently integrated with a mock BuildingStorage that always returns true for requirements
 *      This can be hot-replaced in the future with a real implementation
 */
contract MissionRequirements is IMissionRequirements, AuthorizationModifiers {
    // Constants for mission types
    uint256 public constant TRADE_MISSION = 1;
    uint256 public constant RESOURCE_TRANSFER_MISSION = 2;

    // Constants for building types
    uint256 public constant GOVERNOR_HQ_TYPE = 1;
    uint256 public constant TRADING_POST_TYPE = 2;

    // Dependencies - This is now retrieved from CentralAuthorizationRegistry when needed
    bytes32 private constant BUILDING_STORAGE_ID = keccak256(abi.encodePacked("IBuildingStorage"));

    // Building requirements mapping: missionType => BuildingRequirement[]
    mapping(uint256 => BuildingRequirement[]) private buildingRequirements;

    // Building support mapping: buildingType => missionType => bool
    mapping(uint256 => mapping(uint256 => bool)) private buildingMissionSupport;

    /**
     * @notice Constructor for MissionRequirements
     * @param _centralAuthorizationRegistry Address of the central authorization registry
     * @dev BuildingStorage address is retrieved from CentralAuthorizationRegistry
     */
    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256(abi.encodePacked("IMissionRequirements"))) 
    {
        console.log("MissionReqs_CONSTRUCTOR: Deployed. CAR is:", _centralAuthorizationRegistry);
        // Initialize Trade Mission requirements
        BuildingRequirement[] memory tradeReqs = new BuildingRequirement[](2);
        tradeReqs[0] = BuildingRequirement({
            buildingType: TRADING_POST_TYPE, // Trading Post
            minLevel: 1,
            required: true
        });
        tradeReqs[1] = BuildingRequirement({
            buildingType: GOVERNOR_HQ_TYPE, // Governor HQ
            minLevel: 1,
            required: true
        });
        buildingRequirements[TRADE_MISSION] = tradeReqs;

        // Initialize Resource Transfer Mission requirements
        BuildingRequirement[] memory transferReqs = new BuildingRequirement[](1);
        transferReqs[0] = BuildingRequirement({
            buildingType: GOVERNOR_HQ_TYPE, // Governor HQ
            minLevel: 1,
            required: true
        });
        buildingRequirements[RESOURCE_TRANSFER_MISSION] = transferReqs;

        // Set building mission support
        buildingMissionSupport[TRADING_POST_TYPE][TRADE_MISSION] = true; // Trading Post supports Trade Missions
        buildingMissionSupport[GOVERNOR_HQ_TYPE][RESOURCE_TRANSFER_MISSION] = true; // Governor HQ supports Resource Transfer Missions
    }

    /**
     * @notice Get the building storage contract from the registry
     * @return IBuildingStorage interface of the current building storage contract
     */
    function getBuildingStorage() internal view returns (IBuildingStorage) {
        // console.log("MissionReqs: getBuildingStorage() called. CAR address is:", address(centralAuthorizationRegistry)); 
        address buildingStorageAddr = centralAuthorizationRegistry.getContractAddress(BUILDING_STORAGE_ID);
        // console.log("MissionReqs: getBuildingStorage() retrieved IBuildingStorage address:", buildingStorageAddr); 
        require(buildingStorageAddr != address(0), "Building storage not registered");
        return IBuildingStorage(buildingStorageAddr);
    }

    /**
     * @notice Validate if an island meets the building requirements for a mission type
     * @param islandId ID of the island
     * @param missionType Type of mission
     * @return bool Whether the requirements are met
     */
    function validateBuildingRequirements(
        uint256 islandId,
        uint256 missionType
    ) external view override returns (bool) {
        // console.log("MissionReqs_VALIDATE_ENTRY: islandId:", islandId, "missionType:", missionType);

        BuildingRequirement[] memory reqs = buildingRequirements[missionType];
        // console.log("MissionReqs: Fetched reqs. Length is:", reqs.length);

        IBuildingStorage buildingStorage = getBuildingStorage();
        
        for (uint256 i = 0; i < reqs.length; i++) {
            if (reqs[i].required) {
                IBuildingStorage.BuildingInfo memory building = buildingStorage.getBuilding(
                    islandId,
                    reqs[i].buildingType
                );
                
                if (building.state != IBuildingStorage.BuildingState.Operational ||
                    building.level < reqs[i].minLevel) {
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * @notice Helper function to validate building requirements for mission contracts
     * @param islandId ID of the island
     * @param missionType Mission type ID
     * @return True if the requirements are met
     */
    function validateIslandForMission(
        uint256 islandId,
        uint256 missionType
    ) external view override returns (bool) {
        require(missionType > 0, "Unsupported mission type");
        return this.validateBuildingRequirements(islandId, missionType);
    }

    /**
     * @notice Get required building types and levels for a mission
     * @param missionType Mission type ID
     */
    function getRequiredBuildingsForMission(
        uint256 missionType
    ) external view override returns (uint256[] memory buildingTypes, uint256[] memory buildingLevels) {
        require(missionType > 0, "Unsupported mission type");
        BuildingRequirement[] memory reqs = buildingRequirements[missionType];
        buildingTypes = new uint256[](reqs.length);
        buildingLevels = new uint256[](reqs.length);
        for (uint256 i = 0; i < reqs.length; i++) {
            buildingTypes[i] = reqs[i].buildingType;
            buildingLevels[i] = reqs[i].minLevel;
        }
        return (buildingTypes, buildingLevels);
    }

    /**
     * @notice Get the maximum number of trade offers for an island
     * @param islandId ID of the island
     * @return Maximum number of trade offers allowed
     */
    function getMaxTradeOffers(uint256 islandId) external view returns (uint256) {
        return getBuildingStorage().getMaxTradeOffers(islandId);
    }

    /**
     * @notice Get the building requirements for a mission type
     * @param missionType Type of mission
     * @return BuildingRequirement[] Array of building requirements
     */
    function getBuildingRequirements(
        uint256 missionType
    ) external view override returns (BuildingRequirement[] memory) {
        return buildingRequirements[missionType];
    }

    /**
     * @notice Check if a building type can support a mission type
     * @param buildingType Type of building
     * @param missionType Type of mission
     * @return bool Whether the building can support the mission
     */
    function canBuildingSupportMission(
        uint256 buildingType,
        uint256 missionType
    ) external view override returns (bool) {
        return buildingMissionSupport[buildingType][missionType];
    }

    /**
     * @notice Get required building types and levels for a specific mission type
     * @param missionType The mission type ID
     */
    function getRequiredBuildingsForMissionType(
        uint256 missionType
    ) external view override returns (uint256[] memory buildingTypes, uint256[] memory buildingLevels) {
        require(missionType > 0, "Unsupported mission type");
        BuildingRequirement[] memory reqs = buildingRequirements[missionType];
        buildingTypes = new uint256[](reqs.length);
        buildingLevels = new uint256[](reqs.length);
        for (uint256 i = 0; i < reqs.length; i++) {
            buildingTypes[i] = reqs[i].buildingType;
            buildingLevels[i] = reqs[i].minLevel;
        }
        return (buildingTypes, buildingLevels);
    }
}
