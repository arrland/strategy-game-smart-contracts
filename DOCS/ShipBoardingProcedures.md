# Ship Boarding and Unboarding Procedures

## Overview
This document details the complete procedures for boarding and unboarding ships in Arrland. Once a ship is boarded, it remains in a persistent boarded state and can be used for multiple missions until explicitly unboarded.

## 1. Standard Boarding Procedures

### 1.1 Requirements
- ARRC Token Fee: 0.1 ARRC per Pirate NFT stake (one-time fee for boarding period)
- Ship Requirements:
  - Must meet minimum crew requirements
  - Must be at least 30% durability
  - Must not be on active mission
  - Must not be already boarded

### 1.2 Boarding Process
1. **Initial Checks**
   - Verify ship ownership
   - Check ship durability
   - Validate crew requirements
   - Ensure sufficient ARRC tokens

2. **Crew Assignment**
   - Assign captain (Pirate NFT)
   - Assign crew members based on Crew Score
   - Validate crew specializations
   - Set persistent crew assignments

3. **Resource Loading**
   - Load necessary resources
   - Calculate cargo weight
   - Verify ship capacity
   - Initialize persistent cargo tracking

### 1.3 Persistent State Management
1. **Boarded State**
   - Ship enters persistent boarded state
   - Crew remains assigned until unboarding
   - Resources stay allocated to ship
   - Ship becomes available for multiple missions

2. **Mission Availability**
   - Can undertake trade missions
   - Can perform resource transfers
   - Can engage in raid missions
   - Can participate in hunt missions

3. **Between-Mission State**
   - Ship maintains crew assignments
   - Resources remain in cargo hold
   - Can perform repairs if needed
   - Can resupply between missions

## 2. Mission Management for Boarded Ships

### 2.1 Starting New Missions
1. **Mission Requirements**
   - Verify ship is boarded
   - Check current durability
   - Validate resource requirements
   - Ensure no active mission

2. **Mission Transitions**
   - Complete current mission
   - Perform necessary repairs
   - Resupply if needed
   - Start new mission

### 2.2 Resource Management
1. **Persistent Resources**
   - Track cargo across missions
   - Manage resource consumption
   - Handle mission rewards
   - Update inventory between missions

2. **Crew Management**
   - Maintain crew assignments
   - Track crew experience
   - Handle crew fatigue
   - Process crew rewards

## 3. Unboarding Procedures

### 3.1 Standard Unboarding
1. **Mission Completion Check**
   - Verify no active missions
   - Check for pending trades/transfers
   - Ensure all mission rewards collected
   - Process final crew rewards

2. **Resource Unloading**
   - Transfer all resources to island storage
   - Clear persistent cargo tracking
   - Process resource distribution
   - Update storage records

3. **Crew Release**
   - Return Pirate NFTs to wallet
   - Release non-NFT crew members
   - Clear persistent crew assignments
   - Process final crew payments

## 4. Multi-Ship Coordination

### 4.1 Fleet Boarding
1. **Fleet Organization**
   - Designate flagship
   - Assign fleet roles
   - Coordinate crew distribution

2. **Resource Distribution**
   - Allocate resources across ships
   - Balance crew assignments
   - Coordinate cargo distribution

### 4.2 Fleet Unboarding
1. **Synchronized Unboarding**
   - Coordinate resource unloading
   - Manage crew reassignments
   - Process multiple ships simultaneously

2. **Fleet Recovery**
   - Coordinate repairs
   - Redistribute resources
   - Reallocate crew

## 5. Cooldowns and Restrictions

### 5.1 Boarding Cooldowns
- 24-hour cooldown after combat
- 12-hour cooldown after mission completion
- 6-hour cooldown after emergency unboarding
- No cooldown between missions while boarded

### 5.2 Restrictions
- Cannot board if ship is under repair
- Cannot unboard during active mission
- Cannot modify core crew during boarded state
- Cannot board multiple ships with same Pirate NFT
- Must maintain minimum durability (30%) for new missions

## 6. Resource Management

### 6.1 Boarding Resources
- Required resources for different ship types
- Resource consumption during boarding
- Resource allocation across fleet

### 6.2 Unboarding Resources
- Resource recovery procedures
- Resource distribution after mission
- Resource loss calculations

## 7. Error Handling

### 7.1 Common Issues
- Insufficient ARRC tokens
- Invalid crew assignments
- Capacity overload
- Mission conflicts

### 7.2 Resolution Procedures
- Token requirement resolution
- Crew reassignment procedures
- Capacity adjustment methods
- Mission conflict resolution

## 8. Best Practices

### 8.1 Efficient Boarding
- Optimize crew assignments
- Minimize resource waste
- Coordinate fleet movements
- Plan mission sequences

### 8.2 Safe Unboarding
- Secure resource transfer
- Proper crew management
- Maintain ship condition
- Document procedures 