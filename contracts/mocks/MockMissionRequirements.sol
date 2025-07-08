// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IMissionRequirements.sol";
import "../AuthorizationModifiers.sol";

// Basic mock for IMissionRequirements (no longer abstract)
contract MockMissionRequirements is IMissionRequirements, AuthorizationModifiers {
    // islandId => missionType => isValid
    mapping(uint256 => mapping(uint256 => bool)) private _islandValidity;
    // missionType => BuildingType[]
    mapping(uint256 => uint256[]) private _requiredBuildingTypes;
    // missionType => BuildingLevel[]
    mapping(uint256 => uint256[]) private _requiredBuildingLevels;
    // Mock state for getBuildingRequirements
    mapping(uint256 => BuildingRequirement[]) private _buildingReqs;

    constructor(address _car) AuthorizationModifiers(_car, keccak256("IMissionRequirements")) {}

    // --- Mock Control Functions ---
    function setIslandValidity(uint256 islandId, uint256 missionType, bool isValid) external {
        _islandValidity[islandId][missionType] = isValid;
    }

    function setRequiredBuildings(
        uint256 missionType,
        uint256[] memory buildingTypes,
        uint256[] memory buildingLevels
    ) external {
        require(buildingTypes.length == buildingLevels.length, "Array length mismatch");
        _requiredBuildingTypes[missionType] = buildingTypes;
        _requiredBuildingLevels[missionType] = buildingLevels;
    }

    function setBuildingRequirements(uint256 missionType, BuildingRequirement[] calldata reqs) external {
        _buildingReqs[missionType] = reqs;
    }

    // --- IMissionRequirements Interface Implementation ---
    function validateIslandForMission(uint256 islandId, uint256 missionType) external view override returns (bool) {
        return _islandValidity[islandId][missionType];
    }

    function getRequiredBuildingsForMissionType(uint256 missionType) external view override returns (uint256[] memory buildingTypes, uint256[] memory buildingLevels) {
        return (_requiredBuildingTypes[missionType], _requiredBuildingLevels[missionType]);
    }

    // --- Dummy Implementations for Missing Interface Functions ---
    function validateBuildingRequirements(uint256 /*islandId*/, uint256 /*missionType*/) external view override returns (bool) {
        return true; // Default to true for mock
    }

    function getBuildingRequirements(uint256 missionType) external view override returns (BuildingRequirement[] memory) {
        return _buildingReqs[missionType]; // Return stored reqs or empty array
    }

    function canBuildingSupportMission(uint256 /*buildingType*/, uint256 /*missionType*/) external view override returns (bool) {
        return true; // Default to true for mock
    }

    function getMaxTradeOffers(uint256 /*islandId*/) external view override returns (uint256) {
        return 10; // Return a default value
    }

    function getRequiredBuildingsForMission(uint256 missionType) external view override returns (uint256[] memory buildingTypes, uint256[] memory buildingLevels) {
        // Delegate to the other function as per the interface pattern often seen
        return this.getRequiredBuildingsForMissionType(missionType);
    }

    // --- Extra Admin-like functions (Not part of Interface) ---
    function addMissionRequirement(uint256 /*missionType*/, uint256 /*buildingType*/, uint256 /*minLevel*/) external {}
    function removeMissionRequirement(uint256 /*missionType*/, uint256 /*buildingType*/) external {}
    function setRequiredBuildingLevel(uint256 /*missionType*/, uint256 /*buildingType*/, uint256 /*minLevel*/) external {}
} 