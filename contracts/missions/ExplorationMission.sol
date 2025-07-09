// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./BaseMission.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/mission-storage/IExplorationMissionStorage.sol";
import "../interfaces/IMissionRegistration.sol";
import "./MissionRegistration.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ExplorationMission is BaseMission {
    using Strings for uint256;

    // Constants for discovery chances
    uint256 private constant DISCOVERY_CHANCE_BASE = 100;  // Base value for percentage calculations
    uint256 private constant CHANCE_NOTHING = 35;         // 35% chance to find nothing
    uint256 private constant CHANCE_RESOURCE = 40;        // 40% chance to find resources
    uint256 private constant CHANCE_ARTIFACT = 20;        // 20% chance to find artifacts
    uint256 private constant CHANCE_ISLAND = 5;           // 5% chance to find new islands
    
    // Constants for resource discovery amount ranges
    uint256 private constant MIN_RESOURCE_AMOUNT = 50;
    uint256 private constant MAX_RESOURCE_AMOUNT_MULTIPLIER = 20;  // Multiplied by ship level for max
    
    // Constants for artifact rarity chances
    uint256 private constant RARITY_COMMON = 70;          // 70% chance for common artifacts
    uint256 private constant RARITY_UNCOMMON = 20;        // 20% chance for uncommon artifacts
    uint256 private constant RARITY_RARE = 9;             // 9% chance for rare artifacts
    uint256 private constant RARITY_LEGENDARY = 1;        // 1% chance for legendary artifacts

    // Events
    event ExplorationStarted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint256 targetIslandId,
        uint256 duration
    );

    event ExplorationCompleted(
        uint256 indexed missionId,
        uint256 indexed shipId,
        uint8 discoveryType
    );

    event ResourceDiscovered(
        uint256 indexed missionId,
        uint256 resourceType,
        uint256 amount
    );

    event ArtifactDiscovered(
        uint256 indexed missionId,
        uint256 artifactId,
        uint8 rarity
    );

    event NewIslandDiscovered(
        uint256 indexed missionId,
        uint256 islandId
    );

    constructor(
        address _centralAuthorizationRegistry
    ) BaseMission(
        _centralAuthorizationRegistry,
        keccak256("ExplorationMission"),
        "Exploration"
    ) {}

    function getMissionType() public view override returns (uint256) {
        // Get mission type ID from mission registration
        MissionRegistration missionRegistry = getMissionRegistration();
        return missionRegistry.getMissionTypeByName("Exploration");
    }

    function getMissionRegistration() internal view returns (MissionRegistration) {
        return MissionRegistration(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionRegistration")));
    }

    function startMission(
        uint256 shipId,
        bytes calldata missionData
    ) external override onlyAuthorized nonReentrant returns (uint256 duration) {
        // Decode mission parameters
        uint256 targetIslandId = abi.decode(missionData, (uint256));
        
        // Validate mission requirements
        validateBaseMissionRequirements(shipId);
        uint256 homeIslandId = getMissionValidator().getShipHomeIsland(shipId);
        
        // Calculate travel time for exploration (one-way travel plus exploration time)
        uint256 travelTime = calculateTravelTime(homeIslandId, targetIslandId, shipId);
        uint256 explorationTime = 12 * 60 * 60; // 12 hours of exploration
        duration = travelTime + explorationTime;
        
        // Lock ship for the mission duration plus safety margin
        lockShipForMission(shipId, shipId, duration + SECONDS_IN_DAY);
        
        // Store mission in central registry
        IMissionsStorage missionsStorage = getMissionsStorage();
        missionsStorage.startMission(
            shipId,
            shipId, // Using shipId as missionId for simplicity
            getMissionType(),
            duration,
            abi.encode(targetIslandId)
        );
        
        emit ExplorationStarted(shipId, shipId, targetIslandId, duration);
        
        return duration;
    }
    
    function completeMission(
        uint256 missionId
    ) external override onlyAuthorized nonReentrant returns (bool isFullyComplete) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Get ship ID (same as mission ID for simplicity)
        uint256 shipId = missionId;
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        // Get specialized storage
        address storageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        IExplorationMissionStorage explorationStorage = IExplorationMissionStorage(storageAddr);
        
        // Process exploration results
        uint8 discoveryType = determineDiscoveryType();
        
        // Handle different discovery types
        if (discoveryType == 0) {
            // Nothing discovered
            explorationStorage.recordDiscovery(missionId, 0, "");
        } else if (discoveryType == 1) {
            // Resource discovered
            (uint256 resourceType, uint256 amount) = discoverResource(shipId);
            explorationStorage.recordDiscovery(
                missionId, 
                1, 
                abi.encode(resourceType, amount)
            );
            
            // Transfer resources to ship
            transferResourceToShip(shipId, resourceType, amount);
            
            emit ResourceDiscovered(missionId, resourceType, amount);
        } else if (discoveryType == 2) {
            // Artifact discovered
            (uint256 artifactId, uint8 rarity) = discoverArtifact();
            explorationStorage.recordDiscovery(
                missionId, 
                2, 
                abi.encode(artifactId, rarity)
            );
            
            // Add artifact to player's inventory
            awardArtifact(shipId, artifactId, rarity);
            
            emit ArtifactDiscovered(missionId, artifactId, rarity);
        } else if (discoveryType == 3) {
            // New island discovered
            uint256 newIslandId = discoverNewIsland();
            explorationStorage.recordDiscovery(
                missionId, 
                3, 
                abi.encode(newIslandId)
            );
            
            emit NewIslandDiscovered(missionId, newIslandId);
        }
        
        // Complete the mission in storage
        missionsStorage.completeMission(shipId);
        
        // Unlock the ship
        unlockShipAfterMission(shipId);
        
        emit ExplorationCompleted(missionId, shipId, discoveryType);
        
        // ExplorationMission is always fully complete in one phase
        return true;
    }
    
    function getMissionDetails(uint256 missionId) external view override returns (bytes memory) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Get ship ID (same as mission ID for simplicity)
        uint256 shipId = missionId;
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        // Get mission basic info
        IMissionsStorage.MissionBasicInfo memory basicInfo = missionsStorage.getMissionBasicInfo(shipId);
        
        // Get specialized storage
        address storageAddr = missionsStorage.getSpecializedStorage(getMissionType());
        IExplorationMissionStorage explorationStorage = IExplorationMissionStorage(storageAddr);
        
        // Get target island ID
        uint256 targetIslandId = explorationStorage.getTargetIslandId(missionId);
        
        // Calculate remaining time
        uint256 timeRemaining = 0;
        if (basicInfo.endTime > block.timestamp) {
            timeRemaining = basicInfo.endTime - block.timestamp;
        }
        
        // Check if anything was discovered
        bool hasDiscovered = explorationStorage.hasDiscoveredSomething(missionId);
        uint8 discoveryType = explorationStorage.getDiscoveryType(missionId);
        
        return abi.encode(
            targetIslandId,
            basicInfo.startTime,
            basicInfo.endTime,
            timeRemaining,
            hasDiscovered,
            discoveryType
        );
    }
    
    function determineDiscoveryType() private view returns (uint8) {
        // Generate a pseudo-random number
        uint256 randomValue = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            blockhash(block.number - 1),
            msg.sender
        ))) % DISCOVERY_CHANCE_BASE;
        
        // Determine discovery type based on probability
        if (randomValue < CHANCE_NOTHING) {
            return 0; // Nothing
        } else if (randomValue < CHANCE_NOTHING + CHANCE_RESOURCE) {
            return 1; // Resource
        } else if (randomValue < CHANCE_NOTHING + CHANCE_RESOURCE + CHANCE_ARTIFACT) {
            return 2; // Artifact
        } else {
            return 3; // New island
        }
    }
    
    function discoverResource(uint256 shipId) private view returns (uint256 resourceType, uint256 amount) {
        // Determine resource type (0-4 for different resource types)
        resourceType = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            blockhash(block.number - 1),
            shipId
        ))) % 5;
        
        // Get ship level for scaling resource amount
        uint256 shipLevel = getMissionValidator().getShipLevel(shipId);
        
        // Calculate resource amount based on ship level
        uint256 maxAmount = MIN_RESOURCE_AMOUNT + (shipLevel * MAX_RESOURCE_AMOUNT_MULTIPLIER);
        amount = MIN_RESOURCE_AMOUNT + (uint256(keccak256(abi.encodePacked(
            block.timestamp,
            blockhash(block.number - 2),
            shipId,
            resourceType
        ))) % (maxAmount - MIN_RESOURCE_AMOUNT + 1));
        
        return (resourceType, amount);
    }
    
    function discoverArtifact() private view returns (uint256 artifactId, uint8 rarity) {
        // Generate artifact ID
        artifactId = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            blockhash(block.number - 1),
            msg.sender,
            "artifact"
        )));
        
        // Determine rarity based on probability
        uint256 rarityRoll = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            blockhash(block.number - 2),
            artifactId
        ))) % 100;
        
        if (rarityRoll < RARITY_COMMON) {
            rarity = 1; // Common
        } else if (rarityRoll < RARITY_COMMON + RARITY_UNCOMMON) {
            rarity = 2; // Uncommon
        } else if (rarityRoll < RARITY_COMMON + RARITY_UNCOMMON + RARITY_RARE) {
            rarity = 3; // Rare
        } else {
            rarity = 4; // Legendary
        }
        
        return (artifactId, rarity);
    }
    
    function discoverNewIsland() private view returns (uint256 islandId) {
        // Generate island ID
        islandId = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            blockhash(block.number - 1),
            msg.sender,
            "island"
        )));
        
        // In a real implementation, this would interact with the map contract to create a new island
        return islandId;
    }
    
    function transferResourceToShip(uint256 shipId, uint256 resourceType, uint256 amount) private {
        // Convert resource type to string representation
        string memory resourceName;
        if (resourceType == 0) resourceName = "wood";
        else if (resourceType == 1) resourceName = "stone";
        else if (resourceType == 2) resourceName = "iron";
        else if (resourceType == 3) resourceName = "gold";
        else resourceName = "crystal";
        
        // In a real implementation, this would transfer resources to the ship's cargo
        // For this example, we'll just emit an event
        emit ResourceDiscovered(shipId, resourceType, amount);
    }
    
    function awardArtifact(uint256 shipId, uint256 artifactId, uint8 rarity) private {
        // In a real implementation, this would add the artifact to the player's inventory
        // For this example, we'll just emit an event
        emit ArtifactDiscovered(shipId, artifactId, rarity);
    }
} 