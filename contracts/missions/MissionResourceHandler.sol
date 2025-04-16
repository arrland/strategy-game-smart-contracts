// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../interfaces/storage/IIslandStorage.sol";
import "../interfaces/storage/IBaseStorage.sol";
import "../interfaces/IResourceManagement.sol";

contract MissionResourceHandler is AuthorizationModifiers {
    // Events
    event ResourcesTransferred(
        address indexed fromStorage,
        uint256 fromId,
        address indexed toStorage,
        uint256 toId,
        string resourceType,
        uint256 amount
    );
    
    event ShipResourcesLocked(uint256 indexed shipId, bool locked, uint256 missionId);

    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionResourceHandler")) {}

    function lockShipForMission(uint256 shipId, uint256 missionId, uint256 duration) external onlyAuthorized {
        // Get ship storage
        address shipStorageAddress = getShipStorage();
        
        // Lock the ship resources
        IBaseStorage(shipStorageAddress).lockResources(
            shipId,
            duration,
            missionId
        );
        
        emit ShipResourcesLocked(shipId, true, missionId);
    }

    function unlockShipAfterMission(uint256 shipId) external onlyAuthorized {
        // Get ship storage
        address shipStorageAddress = getShipStorage();
        
        // Unlock the ship resources
        IBaseStorage(shipStorageAddress).unlockResources(shipId);
        
        emit ShipResourcesLocked(shipId, false, 0);
    }

    function getShipLockInfo(uint256 shipId) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint256 missionId
    ) {
        IShipStorage shipStorage = IShipStorage(getShipStorage());
        return shipStorage.getLockInfo(shipId);
    }

    function transferResourceFromIslandToShip(
        uint256 fromIslandId,
        uint256 toShipId,
        string calldata resourceType,
        uint256 amount
    ) external onlyAuthorized {
        address islandStorageAddress = getIslandStorage();
        address shipStorageAddress = getShipStorage();
        
        IBaseStorage(islandStorageAddress).transferResourceBetweenStorages(
            islandStorageAddress,
            fromIslandId,
            shipStorageAddress,
            toShipId,
            resourceType,
            amount
        );
        
        emit ResourcesTransferred(
            islandStorageAddress,
            fromIslandId,
            shipStorageAddress,
            toShipId,
            resourceType,
            amount
        );
    }

    function transferResourceFromShipToIsland(
        uint256 fromShipId,
        uint256 toIslandId,
        string calldata resourceType,
        uint256 amount
    ) external onlyAuthorized {
        address shipStorageAddress = getShipStorage();
        address islandStorageAddress = getIslandStorage();
        
        IBaseStorage(shipStorageAddress).transferResourceBetweenStorages(
            shipStorageAddress,
            fromShipId,
            islandStorageAddress,
            toIslandId,
            resourceType,
            amount
        );
        
        emit ResourcesTransferred(
            shipStorageAddress,
            fromShipId,
            islandStorageAddress,
            toIslandId,
            resourceType,
            amount
        );
    }

    function hasIslandStorageCapacity(uint256 islandId, uint256 additionalAmount) external view returns (bool) {
        address islandStorageAddress = getIslandStorage();
        IIslandStorage islandStorage = IIslandStorage(islandStorageAddress);
        
        uint256 capacity = islandStorage.getStorageCapacity(islandId);
        uint256 used = islandStorage.getTotalResourcesInStorage(islandId);
        
        return capacity >= used + additionalAmount;
    }

    // Internal contract access functions
    function getShipStorage() internal view returns (address) {
        return centralAuthorizationRegistry.getContractAddress(keccak256("IShipStorage"));
    }

    function getIslandStorage() internal view returns (address) {
        return centralAuthorizationRegistry.getContractAddress(keccak256("IIslandStorage"));
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        address resourceManagementAddress = centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement"));
        return IResourceManagement(resourceManagementAddress);
    }
} 