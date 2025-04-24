// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/IDockingManagement.sol";
import "../interfaces/IBuildingStorage.sol";
import "hardhat/console.sol";

contract DockingManagement is IDockingManagement, AuthorizationModifiers {
    // Ship class slot requirements
    mapping(string => uint256) private slotRequirementForClass;

    // shipId => islandId (0 if not docked)
    mapping(uint256 => uint256) private shipDockedIsland;
    // islandId => docked ship IDs
    mapping(uint256 => uint256[]) private dockedShips;
    // islandId => shipId => index in dockedShips[islandId]
    mapping(uint256 => mapping(uint256 => uint256)) private dockedShipIndex;

    // NEW STATE VARIABLE to track total used slots per island
    mapping(uint256 => uint256) private _usedSlotsCount;

    IBuildingStorage public buildingStorage;

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IDockingManagement")) 
    {
        // Set default slot requirements
        slotRequirementForClass["Sailboat"] = 0;
        slotRequirementForClass["Small"] = 1;
        slotRequirementForClass["Medium"] = 2;
        slotRequirementForClass["Large"] = 3;
    }

    function getBuildingStorage() external view returns (IBuildingStorage) {
        return IBuildingStorage(centralAuthorizationRegistry.getContractAddress(keccak256("IBuildingStorage")));
    }

    function getSlotRequirementForShipClass(string calldata shipClass) external view override returns (uint256) {
        uint256 req = slotRequirementForClass[shipClass];
        // console.log("[DEBUG][DockingManagement] getSlotRequirementForShipClass req:", req);
        // console.logBytes32(keccak256(bytes(shipClass)));
        return req;
    }

    function getAvailableSlots(uint256 islandId) public view override returns (uint256) {
        // console.log("[DEBUG][DockingManagement] getAvailableSlots islandId:", islandId);
        address buildingStorageAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IBuildingStorage"));
        // console.log("[DEBUG][DockingManagement] buildingStorageAddr:", buildingStorageAddr);
        uint256 totalSlots = IBuildingStorage(buildingStorageAddr).getDockingSlots(islandId);
        // console.log("[DEBUG][DockingManagement] slots from getDockingSlots:", totalSlots);
        // Use the new _usedSlotsCount mapping
        uint256 usedSlots = _usedSlotsCount[islandId]; 
        // console.log("[DEBUG][DockingManagement] usedSlots:", usedSlots);
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
        // console.log("[DEBUG][DockingManagement] canDock islandId:", islandId);
        // console.log("[DEBUG][DockingManagement] canDock slotsRequired:", slotsRequired);
        // console.log("[DEBUG][DockingManagement] canDock available:", available);
        // console.log("[DEBUG][DockingManagement] canDock result:", result);
        return result;
    }

    function dockShip(uint256 shipId, uint256 islandId, address owner, string calldata shipClass) external override onlyAuthorized {
        require(shipDockedIsland[shipId] == 0, "Already docked");
        uint256 slotsRequired = slotRequirementForClass[shipClass];
        // console.log("[DEBUG][dockShip] Ship:%s Class:'%s' requires %s slots", shipId, shipClass, slotsRequired);
        uint256 available = getAvailableSlots(islandId);
        // console.log("[DEBUG][dockShip] Island:%s has %s available slots", islandId, available);
        require(available >= slotsRequired, "Not enough slots");

        // Update used slots count
        _usedSlotsCount[islandId] += slotsRequired;

        // Track docking (ship array logic remains for querying docked ships)
        shipDockedIsland[shipId] = islandId;
        dockedShipIndex[islandId][shipId] = dockedShips[islandId].length;
        dockedShips[islandId].push(shipId);
        
        emit ShipDocked(shipId, islandId, owner, block.timestamp, slotsRequired); // Emit slotsRequired (actual slots used)
    }

    function undockShip(uint256 shipId, uint256 islandId, address owner, string calldata shipClass) external override onlyAuthorized {
        require(shipDockedIsland[shipId] == islandId, "Not docked at this island");
        uint256 slotsFreed = slotRequirementForClass[shipClass];
        // console.log("[DEBUG][undockShip] Ship:%s Class:'%s' frees %s slots", shipId, shipClass, slotsFreed);

        // Update used slots count
        _usedSlotsCount[islandId] -= slotsFreed;

        // Remove from dockedShips array (for querying)
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
        
        emit ShipUndocked(shipId, islandId, owner, block.timestamp, slotsFreed); // Emit slotsFreed
    }

    function rebaseShip(uint256 shipId, uint256 oldIslandId, uint256 newIslandId, address owner, string calldata shipClass) external override onlyAuthorized {
        require(shipDockedIsland[shipId] == oldIslandId, "Not docked at old island");
        uint256 slotsRequired = slotRequirementForClass[shipClass];
        require(getAvailableSlots(newIslandId) >= slotsRequired, "Not enough slots at new island");

        // Update used slots count on both islands
        _usedSlotsCount[oldIslandId] -= slotsRequired;
        _usedSlotsCount[newIslandId] += slotsRequired;

        // Remove from old island's ship array
        uint256 idx = dockedShipIndex[oldIslandId][shipId];
        uint256 lastIdx = dockedShips[oldIslandId].length - 1;
        if (idx != lastIdx) {
            uint256 lastShip = dockedShips[oldIslandId][lastIdx];
            dockedShips[oldIslandId][idx] = lastShip;
            dockedShipIndex[oldIslandId][lastShip] = idx;
        }
        dockedShips[oldIslandId].pop();
        delete dockedShipIndex[oldIslandId][shipId];
        
        // Add to new island's ship array
        shipDockedIsland[shipId] = newIslandId;
        dockedShipIndex[newIslandId][shipId] = dockedShips[newIslandId].length;
        dockedShips[newIslandId].push(shipId);
        
        emit ShipRebased(shipId, oldIslandId, newIslandId, owner, block.timestamp, slotsRequired); // Emit slotsRequired
    }
} 