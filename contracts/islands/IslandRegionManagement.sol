// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";

contract IslandRegionManagement is AuthorizationModifiers {
    enum Region { NorthWest, NorthEast, SouthWest, SouthEast, North, South, East, West }
    enum Distance { Short, Medium, Long }

    mapping(uint256 => Region) public islandRegions;

    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IIslandRegionManagement")) {}

    function setIslandRegion(uint256 islandId, Region region) external onlyAuthorized {
        islandRegions[islandId] = region;
    }

    function batchSetIslandRegions(uint256[] memory islandIds, Region[] memory regions) external onlyAuthorized {
        require(islandIds.length == regions.length, "Array length mismatch");
        for (uint256 i = 0; i < islandIds.length; i++) {
            islandRegions[islandIds[i]] = regions[i];
        }
    }

    function calculateDistance(uint256 fromIslandId, uint256 toIslandId) public view returns (Distance) {
        Region fromRegion = islandRegions[fromIslandId];
        Region toRegion = islandRegions[toIslandId];

        if (fromRegion == toRegion) {
            return Distance.Short;
        }

        if ((fromRegion == Region.NorthWest && toRegion == Region.SouthEast) ||
            (fromRegion == Region.SouthEast && toRegion == Region.NorthWest) ||
            (fromRegion == Region.NorthEast && toRegion == Region.SouthWest) ||
            (fromRegion == Region.SouthWest && toRegion == Region.NorthEast)) {
            return Distance.Medium;
        }

        return Distance.Long;
    }
}