# Building System Architecture

## Overview
The building system is a core component of the game that manages the construction, upgrading, and operation of various buildings across islands. This document outlines the current architecture and how different components interact.

## Core Components

### 1. BuildingBase (Abstract Contract)
The foundation for all building types, providing:
- Common building state management
- Standard upgrade mechanics
- Resource requirement validation
- Tier and level management

Key Functions:
```solidity
function getMaxTier() public pure virtual returns (uint256);
function getLevelForTier(uint256 tier) public pure virtual returns (uint256, uint256);
```

### 2. BuildingManager
Central coordinator for all building operations:
- Building registration and type management
- Construction initiation and completion
- Upgrade coordination
- State transitions
- Security validations
- Integration with BuildingTypeManager for constraints
- Plot assignment coordination

### 3. BuildingStorage
Persistent storage layer:
- Building data and states
- Plot occupancy tracking:
  - Plot-to-building mapping
  - Plot occupation state
  - Plot freeing and assignment
- Building type registrations
- Building ownership records

Events:
```solidity
event PlotOccupied(uint256 indexed islandId, uint256 indexed plotId, uint256 buildingType);
event PlotFreed(uint256 indexed islandId, uint256 indexed plotId);
```

### 4. BuildingResourceManager
Handles all resource-related operations:
- Construction resource requirements
- Resource consumption validation
- Storage capacity management
- Resource production tracking

### 5. BuildingTypeManager
Centralized management of building types and constraints:
- Building type registration
- Construction difficulty settings
- Building unlocks and progression:
  - Tier-based building unlocks
  - Level requirements per building
  - Genesis-specific unlocks
  - Building progression tracking
- Building constraints:
  - Plot requirements per building type
  - Uniqueness rules
  - Dependencies
  - Land type requirements
  - Island size requirements
  - Building count limits

Key Functions:
```solidity
function getUnlockedBuildings(uint256 tier) returns (uint256[] memory)
function isUnlocked(uint256 buildingType, uint256 hqTier, bool isGenesis) returns (bool)
function getRequiredHQLevelForBuilding(uint256 buildingType) returns (uint256)
```

### 6. GovernorHQManager
Special building type that:
- Acts as island headquarters
- Controls island storage capacity
- Has Genesis island specific rules
- Manages tier progression
- Delegates building unlock checks to BuildingTypeManager
- Validates Genesis requirements
- Manages storage capacity scaling

### 7. BuildingConstructionTime
Manages construction timing:
- Calculates construction duration
- Handles NFT attribute bonuses
- Construction state tracking

### 8. BuildingCrew
Manages crew assignments:
- Crew allocation to buildings
- Skill bonus calculations
- Crew capacity management
- Production efficiency modifiers

## Plot Management System

### Plot Allocation
1. IslandStorage:
   - Defines total plots per island size:
     - Small: 6 plots
     - Medium: 14 plots
     - Large: 30 plots
     - Huge: 62 plots
     - ExtraSmall: 1 plot

2. BuildingStorage:
   - Tracks individual plot occupancy
   - Manages plot-to-building mapping
   - Handles plot state changes

3. BuildingTypeManager:
   - Defines plot requirements per building
   - Validates plot availability
   - Enforces building placement rules

4. BuildingManager:
   - Coordinates plot assignment during construction
   - Validates plot availability
   - Manages plot state transitions

### Plot Operations
```solidity
// BuildingStorage functions
function occupyPlot(uint256 islandId, uint256 plotId, uint256 buildingType) external;
function freePlot(uint256 islandId, uint256 plotId) external;
function isPlotOccupied(uint256 islandId, uint256 plotId) external view returns (bool);
function getBuildingTypeOnPlot(uint256 islandId, uint256 plotId) external view returns (uint256);
```

## Current Building Types

### 1. GovernorHQ
Special building type that:
- Acts as island headquarters
- Controls island storage capacity
- Has Genesis island specific rules
- Manages tier progression
- Delegates building unlock checks to BuildingTypeManager
- Validates Genesis requirements
- Manages storage capacity scaling

### 2. TradingPost
Commerce-focused building that:
- Manages trade operations
- Controls trade slot allocation
- Depends on HQ level
- Handles storage for trade goods

## System Interactions

### Construction Flow
1. User initiates construction
2. BuildingManager validates requirements via BuildingTypeManager
3. BuildingResourceManager checks resources
4. BuildingConstructionTime calculates duration
5. BuildingStorage updates state
6. Specific building manager handles type-specific logic

### Upgrade Flow
1. User initiates upgrade through BuildingManager
2. System Validations:
   - Building state must be Operational
   - Building level must be below max level
   - Island must meet requirements for next level
   - Rate limits checked by SecurityManager
   - Global game state validated

3. Resource Requirements:
   - Building contract determines resources needed for next level
   - Resources scale with building level and tier
   - ResourceManager validates resource availability
   - Storage capacity checked for new resources

4. Building-Specific Validation:
   - GovernorHQ checks Genesis requirements if applicable
   - Building dependencies verified for new level
   - Building-specific upgrade requirements checked
   - Plot requirements validated

5. Construction Time:
   - Calculated based on:
     - Building difficulty for tier
     - Pirate skills (Strength, Agility, Wisdom)
     - Building skill bonus
     - Tool bonus

6. Upgrade Execution:
   - Resources consumed from player storage
   - Building state changed to Upgrading
   - Construction timer started
   - Events emitted for state change

7. Completion:
   - Building level increased
   - State returned to Operational
   - New capabilities unlocked
   - Storage/production rates updated
   - Tier upgrade checked and processed

### Resource Costs
- Base resource requirements defined per building type
- Cost increases with each level
- Higher tiers require additional resource types
- Example progression (Trading Post):
  - Tier 1 (Levels 1-5): Wood and Planks
  - Tier 2 (Levels 6-10): Adds Stone
  - Tier 3 (Levels 11-15): Adds Bricks
  - Tier 4 (Levels 16-20): Adds Iron
  - Tier 5 (Levels 21-25): Adds Gold Bars

## Security Features

### Authorization
- CentralAuthorizationRegistry for access control
- Role-based permissions
- Contract-level authorization

### Anti-Exploit Measures
- Rate limiting on operations
- State transition guards
- Resource validation
- Reentrancy protection

## Events and Logging
Key events emitted for:
- Construction starts/completions
- Upgrades
- Resource consumption
- Crew assignments
- State changes
- Storage capacity updates
- Building unlocks

## Error Handling
Standardized error messages for:
- Invalid operations
- Insufficient resources
- State conflicts
- Authorization failures
- Genesis requirements
- Building constraints

## Recent Architecture Changes

### 1. Consolidated BuildingTypeManager
- Merged construction difficulty management into BuildingTypeManager
- Removed separate BuildingConstructionDifficulty contract
- Centralized building type constraints and requirements

### 2. Simplified GovernorHQ
- Consolidated functionality into single GovernorHQManager contract
- Improved storage capacity calculation
- Direct integration with BuildingTypeManager for difficulties

### 3. Enhanced Type Management
- Centralized building type validation
- Improved constraint checking
- Better integration between components
