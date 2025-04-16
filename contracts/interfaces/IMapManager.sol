// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IMapManager {
    struct IslandInfo {
        uint256 id;
        uint256 x;
        uint256 y;
        string islandType;
        address owner;
    }
    
    function getIslandInfo(uint256 islandId) external view returns (IslandInfo memory);
    function getDistanceBetweenIslands(uint256 fromIslandId, uint256 toIslandId) external view returns (uint256 distance, bool success);
    function getTravelCost(uint256 fromIslandId, uint256 toIslandId, uint256 shipSpeed) external view returns (uint256 travelTime);
} 