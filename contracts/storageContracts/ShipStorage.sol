// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/storageContracts/BaseStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IShipMetadata.sol";
import "../interfaces/IResourceManagement.sol";

contract ShipStorage is BaseStorage {
    using Strings for string;
    
    constructor(
        address _centralAuthorizationRegistry,
        address _nftCollectionAddress,
        bool _isNft721
    ) BaseStorage(_centralAuthorizationRegistry, _nftCollectionAddress, _isNft721, keccak256("IShipStorage")) {}

    function getShipMetadata() internal view returns (IShipMetadata) {
        return IShipMetadata(centralAuthorizationRegistry.getContractAddress(keccak256("IShipMetadata")));
    }

    function getStorageCapacity(uint256 shipId) public view override returns (uint256 capacity) {
        IShipMetadata.ShipAttributes memory shipAttrs = getShipMetadata().getShipMetadata(shipId);
        require(shipAttrs.cargoBay > 0, "Cargo bay is not set in ship metadata");
        return shipAttrs.cargoBay;     
    }

    function captureLockedResources(
        uint256 targetShipId,
        uint256 attackerShipId,
        string memory resourceType,
        uint256 amount
    ) external override onlyAuthorized {
        // Handle the lock status directly
        MissionLock storage lock = missionLocks[targetShipId];
        require(lock.locked, "Target not locked");
        require(lock.attacker == address(0), "Already captured");
        
        // Mark as captured
        lock.attacker = msg.sender;
        
        // Emit capture event
        emit ResourcesCaptured(targetShipId, msg.sender, resourceType, amount);
        
        // Get resource management
        IResourceManagement resourceManagement = getResourceManagement();
        
        // Get the ship owner addresses
        address targetOwner = address(0);
        address attackerOwner = address(0);
        
        // Try to get the owners through the ship staking contract
        try this.getOwner(targetShipId) returns (address owner) {
            targetOwner = owner;
        } catch {}
        
        try this.getOwner(attackerShipId) returns (address owner) {
            attackerOwner = owner;
        } catch {}
        
        // Perform the resource transfer through ResourceManagement
        resourceManagement.transferResource(
            address(this),
            targetShipId,
            targetOwner,
            address(this),
            attackerShipId,
            attackerOwner,
            resourceType,
            amount
        );
    }
    
    function getOwner(uint256 shipId) external view returns (address) {
        address shipStakingAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IShipAndPirateStaking"));
        (bool success, bytes memory data) = shipStakingAddr.staticcall(
            abi.encodeWithSignature("getShipOwner(uint256)", shipId)
        );
        
        if (success && data.length >= 32) {
            address owner = abi.decode(data, (address));
            return owner;
        }
        
        return address(0);
    }

    function initializeStorage(uint256 shipId) external onlyAuthorized {
        // Get current capacity from storage capacities mapping
        uint256 currentCapacity = storageCapacities[shipId];
        require(currentCapacity == 0, "Storage already initialized");
        
        // Set capacity from metadata
        uint256 capacity = getStorageCapacity(shipId);
        storageCapacities[shipId] = capacity;
    }

    function getStorageUsage(uint256 shipId) external view returns (
        uint256 used,
        uint256 capacity
    ) {
        // Get capacity from storage capacities mapping
        capacity = storageCapacities[shipId];
        if (capacity == 0) {
            capacity = getStorageCapacity(shipId);
        }
        
        // Calculate used space from ResourceManagement
        used = this.getTotalResourcesInStorage(shipId);
        
        return (used, capacity);
    }

    function getResourceAmount(uint256 shipId, string memory resourceType) external view returns (uint256) {
        return this.getResourceBalance(shipId, resourceType);
    }
}