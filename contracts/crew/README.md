# Crew Module

This directory contains contracts related to crew management in the game.

## Core Contracts

### CrewManagement.sol
Core crew management functionality:
- Tracks crew members assigned to pirates
- Manages crew indices and amounts
- Handles crew transfers between pirates
- Enables crew type transformations
- Provides crew counting and lookup functions

### CrewTypeManager.sol
Manages different types of crew members and their progression:
- Defines base crew types (Peasant, Worker, Craftsman, etc.)
- Tracks crew stats and XP multipliers
- Manages career advancement paths
- Calculates effective stats based on level
- Controls ship crew eligibility

### CrewRecruitment.sol
Handles the recruitment of new crew members:
- Manages recruitment costs in ARRC tokens
- Verifies crew capacity limits
- Integrates with CrewManagement for adding crew
- Checks crew type validity

### CrewExperience.sol
Manages crew experience and leveling:
- Tracks XP gains and losses
- Handles level progression
- Manages experience transfer during crew moves
- Implements death penalties
- Provides XP requirements for levels

### CrewLoyalty.sol
Implements crew loyalty mechanics:
- Tracks loyalty levels per crew member
- Manages loyalty modifiers from missions
- Implements desertion mechanics
- Provides performance bonuses/penalties
- Handles battle survival effects

### CrewAbilities.sol
Manages special abilities for crew members:
- Defines special abilities (FieldMaster, ResourceSaver, etc.)
- Handles ability unlocking conditions
- Manages cooldowns for ability usage
- Provides ability-based modifiers
- Tracks ability usage statistics

## Reputation System

### Overview
The reputation system tracks and influences crew performance and interactions based on actions and achievements.

### Reputation Categories
1. **Trade Reputation**
   - Successful resource transfers
   - Fair trading practices
   - Market participation
   - Port relationships

2. **Combat Reputation**
   - Battle victories/losses
   - Ship captures
   - Crew preservation
   - Defense success rate

3. **Loyalty Reputation**
   - Crew retention rate
   - Desertion prevention
   - Payment history
   - Mission success rate

4. **Skill Reputation**
   - Crew advancement rate
   - Ability unlocks
   - Resource efficiency
   - Special achievements

### Integration with Crew Contracts

#### CrewManagement.sol
- Tracks overall reputation scores
- Applies reputation bonuses to crew capacity
- Influences crew transfer costs
- Affects recruitment limits

#### CrewTypeManager.sol
- Reputation requirements for career advancement
- Bonus stats based on reputation levels
- Special type unlocks for high reputation
- Reputation-based XP multipliers

#### CrewLoyalty.sol
- Loyalty bonuses from high reputation
- Reduced desertion chance
- Enhanced performance modifiers
- Reputation recovery mechanics

#### CrewAbilities.sol
- Reputation-gated abilities
- Enhanced ability effects
- Reduced cooldowns
- Special reputation abilities

#### CrewExperience.sol
- Reputation-based XP bonuses
- Enhanced level progression
- Special milestone rewards
- Recovery mechanics

#### CrewRecruitment.sol
- Reputation-based recruitment discounts
- Access to elite crew members
- Special recruitment events
- Bulk recruitment options

### Reputation Mechanics

#### Earning Reputation
```solidity
struct ReputationChange {
    uint256 tradeRep;
    uint256 combatRep;
    uint256 loyaltyRep;
    uint256 skillRep;
    string reason;
}
```

1. **Trade Activities**
   - Successful deliveries: +1-5 points
   - Large volume trades: +2-10 points
   - Market price adherence: +1-3 points
   - Failed deliveries: -2-8 points

2. **Combat Activities**
   - Victory against stronger opponent: +5-15 points
   - Successful defense: +3-8 points
   - Crew preservation: +2-5 points
   - Defeat or retreat: -3-10 points

3. **Loyalty Actions**
   - Long-term crew retention: +1-3 points/month
   - Successful advancement: +5 points
   - Crew desertion: -10 points
   - Mission completion: +2-5 points

4. **Skill Development**
   - Ability unlocks: +5 points
   - Level milestones: +3-8 points
   - Resource efficiency: +1-4 points
   - Special achievements: +10-20 points

#### Reputation Effects

1. **Economic Benefits**
   - Recruitment cost reduction: 5-25%
   - Resource efficiency bonus: 2-15%
   - Trade fee reduction: 5-20%
   - Special market access

2. **Combat Advantages**
   - Crew combat bonus: 5-20%
   - Reduced damage taken: 3-15%
   - Enhanced ability effects: 10-30%
   - Special maneuvers

3. **Loyalty Enhancements**
   - Desertion resistance: 10-40%
   - Performance bonus: 5-25%
   - XP gain increase: 10-30%
   - Recovery boost

4. **Progression Boosts**
   - Career advancement speed: +10-30%
   - Ability unlock rate: +15-40%
   - Resource generation: +5-25%
   - Special unlocks

### Implementation Example
```solidity
interface IReputationSystem {
    function updateReputation(
        address owner,
        ReputationChange memory change
    ) external;
    
    function getReputationBonuses(
        address owner,
        uint256 pirateId
    ) external view returns (
        uint256 tradingBonus,
        uint256 combatBonus,
        uint256 loyaltyBonus,
        uint256 skillBonus
    );
    
    function checkReputationRequirement(
        address owner,
        uint256 pirateId,
        uint256 requiredLevel,
        uint8 reputationType
    ) external view returns (bool);
}
```

### Events and Tracking
```solidity
event ReputationChanged(
    address indexed owner,
    uint256 indexed pirateId,
    int256 change,
    uint8 reputationType,
    string reason
);

event ReputationMilestoneReached(
    address indexed owner,
    uint256 indexed pirateId,
    uint256 level,
    uint8 reputationType
);
```

## Contract Interactions

### Recruitment Flow
1. `CrewRecruitment.sol` verifies costs and capacity
2. Calls `CrewManagement.sol` to add new crew
3. `CrewLoyalty.sol` initializes loyalty for new crew
4. `CrewExperience.sol` sets up initial experience tracking
5. Reputation system applies recruitment bonuses

### Career Advancement Flow
1. `CrewTypeManager.sol` verifies advancement eligibility
2. `CrewExperience.sol` checks level requirements
3. `CrewManagement.sol` handles type transformation
4. `CrewAbilities.sol` updates available abilities
5. `CrewLoyalty.sol` adjusts loyalty based on advancement
6. Reputation system awards advancement points

### Mission Participation
1. `CrewManagement.sol` verifies crew availability
2. `CrewLoyalty.sol` affects performance via modifiers
3. `CrewAbilities.sol` provides special bonuses
4. `CrewExperience.sol` tracks XP gains
5. `CrewTypeManager.sol` applies type-specific multipliers
6. Reputation system modifies rewards and performance

### Battle System Integration
1. `CrewTypeManager.sol` provides combat stats
2. `CrewAbilities.sol` applies combat abilities
3. `CrewLoyalty.sol` affects battle performance
4. `CrewExperience.sol` handles battle XP
5. `CrewManagement.sol` manages casualties
6. Reputation system influences combat outcomes

## Authorization and Security
- All contracts inherit from `AuthorizationModifiers`
- Contracts use `onlyAuthorized` and `onlyAdmin` modifiers
- Integration through `CentralAuthorizationRegistry`
- Reentrancy protection where needed
- Event emission for all significant state changes
- Reputation changes require authorization

## State Management
- Crew data stored across multiple contracts
- Each contract maintains its specific aspect:
  - Management: Basic crew data and indices
  - Experience: XP and levels
  - Loyalty: Loyalty scores and desertion
  - Abilities: Unlocked abilities and cooldowns
  - Types: Career paths and stats
  - Reputation: Multi-category reputation scores

## Events
All contracts emit events for:
- Crew additions and removals
- Experience gains and losses
- Loyalty changes and desertions
- Ability unlocks and usage
- Type transformations and advancements
- Reputation changes and milestones

## Integration Points
The crew system integrates with:
- Ship system for crew assignments and naval operations
- Mission system for experience gains and loyalty effects
- Battle system for combat bonuses and casualties
- Resource system for recruitment and advancement costs
- Token system (ARRC) for economic aspects
- Reputation system for performance modifiers and bonuses