// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IMissionRequirements {
    struct BuildingRequirement {
        uint256 buildingType;
        uint256 minLevel;
        bool required;
    }

    function validateBuildingRequirements(
        uint256 islandId,
        uint256 missionType
    ) external view returns (bool);

    function getBuildingRequirements(
        uint256 missionType
    ) external view returns (BuildingRequirement[] memory);

    function canBuildingSupportMission(
        uint256 buildingType,
        uint256 missionType
    ) external view returns (bool);

    function validateIslandForMission(
        uint256 islandId,
        uint256 missionType
    ) external view returns (bool);

    function getMaxTradeOffers(uint256 islandId) external view returns (uint256);

    function getRequiredBuildingsForMission(
        uint256 missionType
    ) external view returns (uint256[] memory buildingTypes, uint256[] memory buildingLevels);

    function getRequiredBuildingsForMissionType(
        uint256 missionType
    ) external view returns (uint256[] memory buildingTypes, uint256[] memory buildingLevels);
}
