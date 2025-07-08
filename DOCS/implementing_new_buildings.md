# Implementing New Building Types

## Overview
This guide provides step-by-step instructions for implementing new building types in the game. Follow these patterns to ensure consistency and maintainability.

## Implementation Steps

### 1. Create New Building Contract

```solidity
// NewBuildingManager.sol
contract NewBuildingManager is BuildingBase {
    constructor(address _centralAuthorizationRegistry) 
        BuildingBase(_centralAuthorizationRegistry, "NEW_BUILDING_TYPE") {
        // Initialize building-specific state
    }

    // Required overrides
    function getMaxTier() public pure override returns (uint256) {
        return YOUR_MAX_TIER;
    }

    function getLevelForTier(uint256 tier) public pure override returns (uint256, uint256) {
        if (tier == 1) return (1, 5);
        if (tier == 2) return (6, 10);
        revert("Invalid tier");
    }
}
```

### 2. Define Building Configuration

```solidity
contract NewBuildingManager is BuildingBase {
    struct BuildingConfig {
        uint256[] resourceTypes;
        uint256[] resourceAmounts;
        uint256 storageCapacity;
        uint256 constructionDifficulty;
    }

    function getConfiguration(uint256 level) internal pure returns (BuildingConfig memory) {
        return BuildingConfig({
            resourceTypes: [WOOD_TYPE, STONE_TYPE],
            resourceAmounts: [100 * level, 50 * level],
            storageCapacity: 1000 * level,
            constructionDifficulty: level
        });
    }
}
```

### 3. Implement Required Functions

#### Construction Logic
```solidity
function validateConstruction(
    uint256 islandId,
    uint256 buildingType
) internal virtual override {
    super.validateConstruction(islandId, buildingType);
    // Add building-specific validation
    require(meetsPrerequisites(islandId), "Prerequisites not met");
}

function onConstructionComplete(
    uint256 islandId,
    uint256 buildingType
) internal virtual override {
    super.onConstructionComplete(islandId, buildingType);
    // Add building-specific completion logic
    initializeBuilding(islandId, buildingType);
}
```

#### Upgrade Logic
```solidity
function validateUpgrade(
    uint256 islandId,
    uint256 buildingType
) internal virtual override {
    super.validateUpgrade(islandId, buildingType);
    // Add building-specific upgrade validation
}

function onUpgradeComplete(
    uint256 islandId,
    uint256 buildingType
) internal virtual override {
    super.onUpgradeComplete(islandId, buildingType);
    // Add building-specific upgrade completion logic
}
```

### 4. Add Production Logic (for Resource Buildings)

```solidity
contract ResourceBuildingManager is BuildingBase {
    struct ProductionConfig {
        uint256 inputResource;
        uint256 outputResource;
        uint256 productionRate;
        string requiredSkill;
        uint256 skillMultiplier;
    }

    function getProductionConfig() internal pure virtual returns (ProductionConfig memory);
    
    function calculateProduction(
        uint256 islandId,
        uint256 buildingType
    ) public view returns (uint256) {
        ProductionConfig memory config = getProductionConfig();
        uint256 crewBonus = buildingCrew.getCrewBonus(
            islandId,
            buildingType,
            config.requiredSkill
        );
        return config.productionRate * crewBonus / 100;
    }
}
```

### 5. Implement Storage Management

```solidity
function getStorageCapacity(
    uint256 level
) public pure override returns (uint256) {
    return BASE_STORAGE_CAPACITY * level;
}

function validateStorage(
    uint256 islandId,
    uint256 buildingType
) internal view {
    uint256 currentStorage = resourceManager.getCurrentStorage(
        islandId,
        buildingType
    );
    require(
        currentStorage <= getStorageCapacity(getCurrentLevel()),
        "Storage capacity exceeded"
    );
}
```

### 6. Add Building-Specific Features

```solidity
contract NewBuildingManager is BuildingBase {
    // Custom events
    event SpecialFeatureActivated(uint256 indexed islandId, uint256 indexed buildingType);
    
    // Custom state variables
    mapping(uint256 => mapping(uint256 => bool)) public specialFeatureActive;
    
    function activateSpecialFeature(
        uint256 islandId,
        uint256 buildingType
    ) external onlyOperational(islandId, buildingType) {
        specialFeatureActive[islandId][buildingType] = true;
        emit SpecialFeatureActivated(islandId, buildingType);
    }
}
```

## Registration Process

1. Deploy new building contract
2. Register with BuildingManager
3. Set up resource requirements
4. Configure construction difficulties
5. Set up crew requirements

```solidity
// Registration example
function registerNewBuilding(address buildingContract) external onlyAdmin {
    uint256 buildingType = getNextBuildingType();
    buildingStorage.registerBuildingType(
        buildingType,
        buildingContract,
        "New Building"
    );
    buildingConstructionTime.setConstructionDifficulty(
        buildingType,
        1,  // tier
        2   // difficulty
    );
}
```

## Testing Guidelines

1. Unit Tests
```solidity
contract NewBuildingTest is Test {
    function testConstruction() public {
        // Test basic construction
    }
    
    function testUpgrade() public {
        // Test upgrade mechanics
    }
    
    function testProduction() public {
        // Test production if applicable
    }
    
    function testSpecialFeatures() public {
        // Test building-specific features
    }
}
```

2. Integration Tests
- Test interaction with other buildings
- Validate resource flow
- Check crew management
- Verify state transitions

## Common Patterns

### Resource Management
```solidity
function validateResources(uint256 islandId, uint256 level) internal view {
    BuildingConfig memory config = getConfiguration(level);
    for (uint256 i = 0; i < config.resourceTypes.length; i++) {
        require(
            resourceManager.hasResource(
                islandId,
                config.resourceTypes[i],
                config.resourceAmounts[i]
            ),
            "Insufficient resources"
        );
    }
}
```

### Crew Management
```solidity
function validateCrew(uint256 islandId, uint256 buildingType) internal view {
    require(
        buildingCrew.getTotalCrewCount(islandId, buildingType) > 0,
        "No crew assigned"
    );
}
```

### State Transitions
```solidity
function validateStateTransition(
    uint256 islandId,
    uint256 buildingType,
    BuildingState currentState,
    BuildingState newState
) internal pure {
    require(
        isValidTransition(currentState, newState),
        "Invalid state transition"
    );
}
```

## Best Practices

1. **Modular Design**
   - Keep contracts focused and single-purpose
   - Use inheritance for common functionality
   - Implement clear interfaces

2. **Security**
   - Always validate state transitions
   - Check resources before operations
   - Implement access control
   - Guard against reentrancy

3. **Gas Optimization**
   - Use appropriate data types
   - Batch operations when possible
   - Optimize storage usage

4. **Maintainability**
   - Document all functions
   - Use clear naming conventions
   - Emit events for important state changes
   - Keep functions simple and focused
