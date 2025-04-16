// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IMissionTypeStorage.sol";

interface IExplorationMissionStorage is IMissionTypeStorage {
    function getTargetIslandId(uint256 missionId) external view returns (uint256);
    
    function hasDiscoveredSomething(uint256 missionId) external view returns (bool);
    
    function getDiscoveryType(uint256 missionId) external view returns (uint8);
    
    function getDiscoveredResource(uint256 missionId) external view returns (
        uint256 resourceType,
        uint256 amount
    );
    
    function getDiscoveredArtifact(uint256 missionId) external view returns (
        uint256 artifactId,
        uint8 rarity
    );
    
    function getDiscoveredIsland(uint256 missionId) external view returns (uint256 islandId);
    
    function recordDiscovery(
        uint256 missionId, 
        uint8 discoveryType, 
        bytes memory discoveryData
    ) external;
} 