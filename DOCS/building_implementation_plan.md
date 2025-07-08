# Building Development Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for the building development system on islands in Arrland. The system will handle construction, upgrades, and management of various building types across different tiers.

## 1. Smart Contract Structure

### 1.1 Core Contracts

1. `BuildingManager.sol`
   - Main contract for building management
   - Handles building registration and ownership
   - Manages global building state
   - Coordinates between different building type contracts
   - Provides interface for building interactions

2. `BuildingBase.sol` (Abstract Contract)
   - Base contract for all building types
   - Defines common interfaces and functionality
   - Handles basic building operations
   - Manages upgrade mechanics
   - Defines storage structures

3. Building Type Contracts (Initial Implementation)
   a) `GovernorHQManager.sol`
   - Manages Governor HQ buildings
   - Handles HQ-specific upgrade logic
   - Manages storage capacity
   - Controls residential zone unlocking
   - Validates Genesis island requirements
   
   b) `TradingPostManager.sol`
   - Manages Trading Post buildings
   - Handles trade slot allocation
   - Controls storage capacity
   - Manages trade operation permissions
   - Validates HQ level requirements

4. Future Building Type Contracts (To be implemented later)
   - `SettlementManager.sol`
   - `FarmManager.sol`
   - Additional building type contracts

5. `LandManager.sol`
   - Manages land plot allocation
   - Tracks plot occupancy and types
   - Validates island size requirements
   - Handles special plot designations

### 1.2 Supporting Contracts

1. `BuildingStorage.sol`
   - Central storage contract
   - Stores building data and states
   - Manages building type registrations
   - Handles building ownership records

2. Integration Contracts
   - `CrewTypeManager.sol` integration
   - `CrewManagement.sol` integration
   - Resource management integration

## 2. Implementation Steps

### Phase 1: Core Infrastructure
1. Implement Base Contracts
   - Create `BuildingBase.sol` abstract contract
   - Implement `BuildingManager.sol`
   - Set up `BuildingStorage.sol`
   - Implement basic land management

2. Implement Governor HQ Contract
   - Create `GovernorHQManager.sol`
   - Implement Governor HQ building (5 tiers)
     - Levels 1-25 upgrade system
     - Resource costs and requirements
     - Storage management
   - Implement Genesis island validation
   - Additional requirements

3. Implement Trading Post Contract
   - Create `TradingPostManager.sol`
   - Implement Tier 1 Trading Post
     - Levels 1-5 upgrade system
     - Trade slot management
     - HQ level validation
   - Implement Tier 2 Trading Post
     - Levels 6-10 upgrade system
     - Enhanced trade features
     - Storage expansion

### Phase 2: Testing and Integration
1. Unit Testing
   - Test `GovernorHQManager.sol`
     - Building creation
     - Upgrade mechanics
     - Resource requirements
   - Test `TradingPostManager.sol`
     - Building creation
     - Trade slot functionality
     - HQ dependency validation

2. Integration Testing
   - Test interaction between HQ and Trading Post
   - Validate upgrade dependencies
   - Test resource management
   - Verify land management

### Phase 3: Future Expansion
1. Preparation for Additional Buildings
   - Document extension points
   - Define interface requirements
   - Plan storage expansion

2. Extension Templates
   - Create base templates for new building types
   - Document integration requirements
   - Provide example implementations

## 3. Building System Core Components

### 3.1 Building Types and Plots
1. Plot System
   - Create `LandPlotManager.sol`
   - Implement resource plot type tracking
   - Add plot type validation for buildings
   - Track plot occupancy and size

2. Building Requirements
   - Validate plot type requirements
   - Check tier space requirements
   - Verify resource availability
   - Check tech level prerequisites

### 3.1 Building Upgrade Costs and Requirements

#### Construction Time Requirements

All buildings require NFT staking and have construction times calculated by BuildingConstructionTime contract.
Current formula: `(((Strength + Agility + Building Tool) * (1 + Wisdom)) / Construction Difficulty) / 2`

Construction Difficulty values (managed by BuildingConstructionTime contract):
- Governor HQ:
  * Tier 1 (Camp): 1
  * Tier 2 (Homestead/Pirate Camp): 2
  * Tier 3 (Residence): 3
  * Tier 4 (Manor): 4
  * Tier 5 (Mansion): 5

- Trading Post:
  * Tier 1: 1
  * Tier 2: 2

#### Governor HQ Building (25 Levels, 5 Tiers)

1. Tier 1 - Camp (Levels 1-5)
   - Requirements:
     * No plots needed
     * Minimum island size: XS
     * No prerequisites
     * Storage: 100 per level
   
   - Upgrade Costs:
     * Level 1: wood (10), cotton (50)
     * Level 2: wood (20), cotton (100)
     * Level 3: wood (30), cotton (150)
     * Level 4: wood (40), cotton (200)
     * Level 5: wood (50), cotton (250)
   
   - Features:
     * Unlocks 1 residential zone
     * Trading Post level 1 access

2. Tier 2 - Homestead/Pirate Camp (Levels 6-10)
   - Requirements for Homestead:
     * No plots needed
     * Minimum island size: S
     * Camp level 5 required
     * Storage: 200 per level

   - Requirements for Pirate Camp (Genesis Islands):
     * No plots needed
     * Minimum island size: XS (Genesis only)
     * Camp level 5 required
     * Storage: 200 per level
     * Needs food medium and RUM for operation
   
   - Upgrade Costs (Pirate Camp):
     * Level 6: wood (100), planks (200), cotton (100)
     * Level 7: wood (150), planks (300), cotton (150)
     * Level 8: wood (200), planks (400), cotton (200)
     * Level 9: wood (250), planks (500), cotton (250)
     * Level 10: wood (300), planks (600), cotton (300)

   - Upgrade Costs (Homestead):
     * Levels 6-10: wood (20), planks (100), cotton (50) per level
   
   - Features:
     * Unlocks 2 residential zone buildings
     * Trading Post level 2 access
     * Pirate Camp: Young Pirates reproduction feature

3. Tier 3 - Residence (Levels 11-15)
   - Requirements:
     * 1 Land plot
     * Minimum island size: M
     * Homestead level 10 required
     * Storage: 300 per level
   
   - Upgrade Costs:
     * Levels 11-15: wood (100), planks (500), stone (50) per level
   
   - Features:
     * Unlocks 3 residential zones
     * Trading Post level 3 access

4. Tier 4 - Manor (Levels 16-20)
   - Requirements:
     * 2 Land plots
     * Minimum island size: L
     * Residence level 15 required
     * Storage: 400 per level
   
   - Upgrade Costs:
     * Levels 16-20: wood (400), planks (2000), stone (200), bricks (1000) per level
   
   - Features:
     * Unlocks 4 residential zones
     * Trading Post level 4 access

5. Tier 5 - Mansion (Levels 21-25)
   - Requirements:
     * 3 Land plots
     * Minimum island size: XL
     * Manor level 20 required
     * Storage: 500 per level
   
   - Upgrade Costs:
     * Levels 21-25: wood (1000), planks (4000), stone (1000), bricks (5000), gold_bars (100) per level
   
   - Features:
     * Unlocks 5 residential zones
     * Trading Post level 5 access
     * Maximum storage capacity

Note: Genesis islands have special access to Pirate Camp instead of Homestead at Tier 2, with the following modifications:
- Only available on Genesis islands
- Requires Camp level 5
- Enables Young Pirates reproduction feature
- Needs food and RUM for operation
- Same resource costs as Homestead

#### Trading Post Buildings

Default Trading Capability:
- Every island, regardless of having a Trading Post, can make 1 buy/sell offer on the island marketplace
- This is a base feature available to all islands from the start
- Building a Trading Post increases trading capabilities beyond this default

1. Trading Post (Tier 1)
   - Requirements:
     * 1 Land plot
     * Camp level 1 required
     * Minimum island size: XS
     * Storage: 150 per level
   
   - Upgrade Costs:
     * Level 1: wood (20), planks (50)
     * Level 2: wood (40), planks (100)
     * Level 3: wood (60), planks (150)
     * Level 4: wood (80), planks (200)
     * Level 5: wood (100), planks (250)
   
   - Features:
     * Basic trade operations
     * 2 simultaneous trade slots

2. Trading Post (Tier 2)
   - Requirements:
     * 1 Land plot
     * Pirate Camp/Homestead level 6 required
     * Minimum island size: S
     * Storage: 300 per level
   
   - Upgrade Costs:
     * Level 6: wood (150), planks (300), stone (50)
     * Level 7: wood (200), planks (400), stone (100)
     * Level 8: wood (250), planks (500), stone (150)
     * Level 9: wood (300), planks (600), stone (200)
     * Level 10: wood (350), planks (700), stone (250)
   
   - Features:
     * Improved trade operations
     * 4 simultaneous trade slots

### 2.3 Building Construction Mechanics

1. Construction Time Contract
   - Create separate `BuildingConstructionTime.sol` contract
   - Responsibilities:
     * Calculate construction time based on NFT attributes
     * Store and manage construction difficulty values
     * Provide interface for future formula updates
     * Handle tool bonuses calculation
   
   - Key Functions:
     * `calculateConstructionTime(uint256 nftId, uint256 buildingType, uint256 difficulty)`
     * `getConstructionDifficulty(uint256 buildingType, uint256 tier)`
     * `updateConstructionFormula(bytes memory newFormula)` (admin only)
     * `updateDifficultyValue(uint256 buildingType, uint256 tier, uint256 newValue)` (admin only)

2. Resource Requirements
   - Validate resource availability
   - Check resource storage capacity
   - Deduct resources upon construction start

3. Construction Process
   - NFT Staking Requirement:
     * User must stake either a Pirate NFT or Inhabitant NFT to start construction
     * NFT remains staked until construction is complete
     * Same mechanic will be used for all building types in future
   
   - Construction Time Calculation:
     * Current Formula: (((Strength + Agility + Building Tool) * (1 + Wisdom)) / Construction Difficulty) / 2
     * Variables managed by BuildingConstructionTime contract:
       - Strength: NFT's strength attribute
       - Agility: NFT's agility attribute
       - Building Tool: Tool bonus (if any)
       - Wisdom: NFT's wisdom attribute
       - Construction Difficulty: Building-specific difficulty value
   
   - Construction Completion:
     * User must claim their NFT back after construction time has passed
     * Building level is updated only after successful claim
     * NFT is returned to user's wallet

4. Implementation Steps
   a) Deploy BuildingConstructionTime contract
      - Initialize with current formula
      - Set initial difficulty values
      - Set up admin controls for updates
   
   b) Integrate with Building Managers
      - GovernorHQManager and TradingPostManager call BuildingConstructionTime
      - Handle NFT staking and unstaking
      - Manage construction state

   c) Testing
      - Test different NFT attribute combinations
      - Verify formula updates work correctly
      - Test difficulty value updates
      - Ensure proper integration with building upgrades

### 3.2 Implementation Details

1. Resource Cost Management
   - Implement resource cost validation
   - Create resource deduction system
   - Track resource requirements per level
   - Handle resource refunds on failures

2. Storage System
   - Implement tiered storage capacity
   - Track current storage usage
   - Handle storage capacity upgrades
   - Manage resource overflow protection

3. Building Prerequisites
   - Track building level dependencies
   - Validate island type requirements
   - Check plot availability
   - Manage building type restrictions

4. Feature Unlocking
   - Implement residential zone unlocking
   - Manage trade slot allocation
   - Handle special features (reproduction)
   - Control building type access

### 3.3 Production System
1. Resource Processing
   - Raw resource gathering rates
   - Processing building chains
   - Production efficiency bonuses
   - Worker assignment system

2. Maritime Production
   - Shipyard boat crafting
   - Port capacity scaling
   - Fishing production rates
   - Maritime bonus calculations

### 3.4 Building Progression
1. Tier System
   - Building tier requirements
   - Space occupation by tier
   - Upgrade prerequisites
   - Resource scaling per tier

2. Level System
   - Level-based bonuses
   - Production rate scaling
   - Resource consumption changes
   - Crew capacity increases

## 4. Testing Strategy

### 4.1 Unit Tests
1. Building construction tests
   - Plot validation
   - Resource requirements
   - State transitions
   - Timer mechanics

2. Resource management tests
   - Production calculations
   - Resource consumption
   - Storage limits
   - Efficiency modifiers

3. Workforce tests
   - Assignment mechanics
   - Production calculations
   - Efficiency modifiers
   - Worker specializations

### 4.2 Integration Tests
1. End-to-end building lifecycle
   - Construction
   - Upgrades
   - Production
   - Demolition

2. Resource flow testing
   - Construction costs
   - Production rates
   - Storage mechanics
   - Resource transfers

3. System interaction tests
   - Building-to-building interactions
   - Resource chain dependencies
   - Workforce management
   - Combat system integration

## 5. Security Considerations

1. Access Control
   - Implement role-based permissions
   - Owner-only functions
   - Operator roles for management
   - User permissions

2. Economic Balance
   - Resource sink mechanisms
   - Production rate limits
   - Upgrade costs balancing
   - Worker efficiency caps

3. Anti-Exploit Measures
   - Rate limiting
   - Resource validation
   - State transition guards
   - Reentrancy protection

## 6. Future Expansions

1. Additional Building Types
   - New specialist buildings
   - Advanced production chains
   - Special effect buildings
   - Unique island features

2. Enhanced Mechanics
   - Building synergies
   - Advanced production formulas
   - Special events integration
   - Seasonal bonuses

3. Economic Features
   - Building marketplace
   - Resource trading hubs
   - Specialized production zones
   - Economic incentives

## 7. Integration with Existing Systems

### 7.1 Mission System Integration
1. Trade Mission Requirements
   - Validate trading post level for trade missions
   - Check market/plaza capacity for trade volume
   - Verify resource storage capacity
   - Apply building trade bonuses

2. Resource Transfer Requirements
   - Check storage building capacity
   - Validate resource production buildings
   - Apply port building loading speed bonuses
   - Calculate load/unload time based on port level

### 7.2 Resource Transfer Changes
1. Crew System Updates
   - Add building-specific crew stats
   - Implement construction speed bonuses
   - Add building crew capacity system
   - Track crew productivity in buildings

2. Resource Management
   - Create `BuildingResourceManager.sol`
   - Handle construction resource consumption
   - Manage building maintenance costs
   - Track resource production from buildings

### 7.3 Trade System Changes
1. Building Requirements
   - Add trading post level checks
   - Implement market/plaza capacity limits
   - Add building-specific trade bonuses
   - Validate building prerequisites for trade

2. Trade Mechanics
   - Scale trade offer limits with building level
   - Add building efficiency bonuses to trades
   - Implement building-specific trade features
   - Handle building-based trade restrictions
