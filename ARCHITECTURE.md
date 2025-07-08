# Arrland Strategy Game Smart Contract Architecture

## Core Systems

### 1. Mission System
The mission system follows a modular architecture that allows for easy addition of new mission types.

#### Key Components:

##### A. Base Mission Contract (`BaseMission.sol`)
- Abstract contract that defines common mission functionality
- Implements core mission lifecycle (start, complete, cancel)
- Handles basic validation and authorization
- Defines common events and state management

##### B. Mission Factory (`MissionFactory.sol`)
- Central registry for all mission types
- Manages mission contract deployment and updates
- Handles mission type registration
- Provides mission contract lookup functionality

##### C. Mission Types
1. Resource Transfer Mission (`ResourceTransferMission.sol`)
   - Handles resource transportation between islands
   - Validates resource availability and capacity
   - Integrates with ResourceTransferManager
   - Manages resource locking and transfer mechanics

2. Trade Mission (`TradeMission.sol`)
   - Manages trading operations between players/islands
   - Handles price verification and trade execution
   - Integrates with TradeManager
   - Implements trade-specific validation rules

### 2. Ship System

#### A. Ship Damage (`ShipDamage.sol`)
- Manages ship durability (0-100%)
- Handles damage application and repair mechanics
- Features:
  * Minimum 30% durability requirement for missions
  * Resource-based repair system
  * Time-based repair mechanics
  * Ship type-specific repair costs
  * Damage tracking and events

#### B. Ship Management
1. Ship Metadata (`ShipMetadata.sol`)
   - Stores ship specifications and attributes
   - Manages ship type definitions
   - Handles ship metadata updates

2. Ship And Pirate Staking (`ShipAndPirateStaking.sol`)
   - Manages ship staking mechanics
   - Handles pirate crew staking
   - Controls staking rewards and penalties

### 3. Resource Management

#### A. Resource Transfer
1. Resource Transfer Manager (`ResourceTransferManager.sol`)
   - Handles resource movement between locations
   - Manages resource locks and transfers
   - Validates transfer conditions
   - Tracks resource balances

2. Missions Manager (`MissionsManager.sol`)
   - Coordinates mission execution
   - Manages mission state transitions
   - Handles mission rewards and penalties

#### B. Crew System
1. Crew Management (`CrewManagement.sol`)
   - Manages crew assignments
   - Handles crew state and attributes
   - Controls crew availability

2. Crew Recruitment (`CrewRecruitment.sol`)
   - Handles crew hiring mechanics
   - Manages recruitment costs
   - Controls crew availability

3. Crew Type Manager (`CrewTypeManager.sol`)
   - Defines crew types and attributes
   - Manages crew type modifications
   - Controls crew type availability

## System Interactions

### Mission Flow
1. Player initiates mission through MissionsManager
2. MissionFactory creates appropriate mission contract
3. Mission contract validates conditions:
   - Ship durability (via ShipDamage)
   - Crew availability (via CrewManagement)
   - Resource availability (via ResourceTransferManager)
4. Mission executes specific logic
5. Resources/rewards are distributed upon completion

### Ship Damage & Repair Flow
1. Ships take damage during missions
2. Damage reduces durability
3. Players must repair ships:
   - Consume resources
   - Wait for repair time
   - Complete repair to restore durability

## Security Features
- Role-based access control
- Reentrancy protection
- Resource validation
- State transition checks
- Event emission for transparency

## Future Extensions
1. Planned Mission Types:
   - Raid Missions
   - Hunt Missions
   - Battle Missions

2. Enhanced Features:
   - Advanced damage mechanics
   - Dynamic repair costs
   - Enhanced crew mechanics
   - Advanced trading features

## Technical Notes
- Built on Solidity 0.8.25
- Uses OpenZeppelin contracts
- Implements proxy pattern for upgradability
- Uses events for off-chain tracking
