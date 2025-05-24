// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol"; // Uncommented
import "../interfaces/IDockingManagement.sol";
import "../interfaces/IBuildingStorage.sol";
import "../interfaces/ICentralAuthorizationRegistry.sol"; // Import interface for CAR

contract DockingManagement is IDockingManagement, AuthorizationModifiers { // Added AuthorizationModifiers
    // Ship class slot requirements
    mapping(string => uint256) private slotRequirementForClass;

    // shipId => islandId (0 if not docked)
    mapping(uint256 => uint256) private shipDockedIsland;
    // islandId => docked ship IDs
    mapping(uint256 => uint256[]) private dockedShips;
    // islandId => shipId => index in dockedShips[islandId]
    mapping(uint256 => mapping(uint256 => uint256)) private dockedShipIndex;

    mapping(uint256 => uint256) private _usedSlotsCount;

    
    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IDockingManagement")) // Call AuthorizationModifiers constructor
    {
        // Set default slot requirements
        slotRequirementForClass["Sailboat"] = 0;
        slotRequirementForClass["Small"] = 1;
        slotRequirementForClass["Medium"] = 2;
        slotRequirementForClass["Large"] = 3;
    }

    function getBuildingStorage() internal view returns (IBuildingStorage) {
        ICentralAuthorizationRegistry car = ICentralAuthorizationRegistry(centralAuthorizationRegistry); // Use inherited CAR
        address buildingStorageAddr = car.getContractAddress(keccak256(abi.encodePacked("IBuildingStorage")));
        return IBuildingStorage(buildingStorageAddr);
    }
    
    // Keep other functions as is for now, but remove onlyAuthorized if it blocks basic deployment/interaction
    // For now, just testing if the constructor deploys.

    function getSlotRequirementForShipClass(string calldata shipClass) external view override returns (uint256) {
        uint256 req = slotRequirementForClass[shipClass];
        return req;
    }

    function getAvailableSlots(uint256 islandId) public view override returns (uint256) {
        IBuildingStorage buildingStorageContract = getBuildingStorage();
        uint256 totalSlots = buildingStorageContract.getDockingSlots(islandId);
        uint256 usedSlots = _usedSlotsCount[islandId]; 
        return totalSlots > usedSlots ? totalSlots - usedSlots : 0;
    }

    function getDockedShips(uint256 islandId) external view override returns (uint256[] memory) {
        return dockedShips[islandId];
    }

    function getShipDockedIsland(uint256 shipId) external view override returns (uint256) {
        return shipDockedIsland[shipId];
    }

    function canDock(uint256 islandId, uint256 slotsRequired) external view override returns (bool) {
        uint256 available = getAvailableSlots(islandId);
        bool result = available >= slotsRequired;
        return result;
    }

    function dockShip(uint256 shipId, uint256 islandId, address owner, string calldata shipClass) external override onlyAuthorized /* Uncommented */ {
        require(shipDockedIsland[shipId] == 0, "Already docked");
        uint256 slotsRequired = slotRequirementForClass[shipClass];
        uint256 available = getAvailableSlots(islandId);
        require(available >= slotsRequired, "Not enough slots");
        _usedSlotsCount[islandId] += slotsRequired;
        shipDockedIsland[shipId] = islandId;
        dockedShipIndex[islandId][shipId] = dockedShips[islandId].length;
        dockedShips[islandId].push(shipId);
        emit ShipDocked(shipId, islandId, owner, block.timestamp, slotsRequired);
    }

    function undockShip(uint256 shipId, uint256 islandId, address owner, string calldata shipClass) external override onlyAuthorized /* Uncommented */ {
        require(shipDockedIsland[shipId] == islandId, "Not docked at this island");
        uint256 slotsFreed = slotRequirementForClass[shipClass];
        _usedSlotsCount[islandId] -= slotsFreed;
        uint256 idx = dockedShipIndex[islandId][shipId];
        uint256 lastIdx = dockedShips[islandId].length - 1;
        if (idx != lastIdx) {
            uint256 lastShip = dockedShips[islandId][lastIdx];
            dockedShips[islandId][idx] = lastShip;
            dockedShipIndex[islandId][lastShip] = idx;
        }
        dockedShips[islandId].pop();
        delete dockedShipIndex[islandId][shipId];
        delete shipDockedIsland[shipId];
        emit ShipUndocked(shipId, islandId, owner, block.timestamp, slotsFreed);
    }

    function rebaseShip(uint256 shipId, uint256 oldIslandId, uint256 newIslandId, address owner, string calldata shipClass) external override onlyAuthorized /* Uncommented */ {
        require(shipDockedIsland[shipId] == oldIslandId, "Not docked at old island");
        uint256 slotsRequired = slotRequirementForClass[shipClass];
        require(getAvailableSlots(newIslandId) >= slotsRequired, "Not enough slots at new island");
        _usedSlotsCount[oldIslandId] -= slotsRequired;
        _usedSlotsCount[newIslandId] += slotsRequired;
        uint256 idx = dockedShipIndex[oldIslandId][shipId];
        uint256 lastIdx = dockedShips[oldIslandId].length - 1;
        if (idx != lastIdx) {
            uint256 lastShip = dockedShips[oldIslandId][lastIdx];
            dockedShips[oldIslandId][idx] = lastShip;
            dockedShipIndex[oldIslandId][lastShip] = idx;
        }
        dockedShips[oldIslandId].pop();
        delete dockedShipIndex[oldIslandId][shipId];
        shipDockedIsland[shipId] = newIslandId;
        dockedShipIndex[newIslandId][shipId] = dockedShips[newIslandId].length;
        dockedShips[newIslandId].push(shipId);
        emit ShipRebased(shipId, oldIslandId, newIslandId, owner, block.timestamp, slotsRequired);
    }
} 