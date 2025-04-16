// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IBaseStorage {
    function getResourceBalance(uint256 tokenId, string memory resource) external view returns (uint256);

    function getTotalResourcesInStorage(uint256 tokenId) external view returns (uint256);
    
    function transferResource(
        uint256 fromTokenId,
        address fromOwner,
        uint256 toTokenId,
        address toOwner,
        address toStorageContract,
        string memory resource,
        uint256 amount
    ) external;

    function getOwner(uint256 tokenId) external view returns (address);

    function getAllResourceBalances(uint256 tokenId) external view returns (string[] memory, uint256[] memory);

    function getStorageCapacity(uint256 tokenId) external view returns (uint256);

    function lockResources(uint256 tokenId, uint256 duration, uint256 missionId) external;
    
    function unlockResources(uint256 tokenId) external;
    
    function isResourceLocked(uint256 tokenId) external view returns (bool);
    
    function getLockInfo(uint256 tokenId) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint256 missionId
    );

    // New helper functions
    function transferResourceBetweenStorages(
        address fromStorage,
        uint256 fromId,
        address toStorage, 
        uint256 toId,
        string memory resourceType,
        uint256 amount
    ) external;
    
    function hasAvailableCapacity(uint256 tokenId, uint256 additionalAmount) external view returns (bool);
    
    function getAvailableCapacity(uint256 tokenId) external view returns (uint256);
} 