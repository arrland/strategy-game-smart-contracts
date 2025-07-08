# Ships and Crew Management Guide

## Introduction

Welcome to the comprehensive guide on Ships and Crew Management in Arrland! This document explains how the ship and pirate boarding system works, how crew management operates, the different types of crew available, and how travel works between islands. This guide is designed for non-technical users who want to understand the gameplay mechanics behind the scenes.

## Pirate NFTs and Crew

### Pirate Collections

In Arrland, there are two main collections of pirate NFTs:

1. **Genesis Pirates (ERC1155)**: These are the original pirates with special abilities.
2. **Inhabitant Pirates (ERC721)**: These are standard pirates that can be owned by players.

Each pirate NFT can recruit and manage their own crew members, which enhances their capabilities.

### Crew Capacity

Each pirate has a limited crew capacity determined by their "Respect" skill and collection type:

- Genesis Pirates have a base crew capacity of 7
- Inhabitant Pirates with Ship Respect > 0 have a base crew capacity of 5
- Inhabitant Citizens (without Ship Respect) have a base crew capacity of 3
- Certified Inhabitant Citizens have a base crew capacity of 4

The total crew capacity is calculated as: Base Capacity + Ship Respect Skill Level

## Crew Types

The game features various crew types, each with different skills and specialties:

### Base Crew Types

1. **Peasant**:
   - Skills: Farming (1), Fishing (1), Woodpicking (1), Building (1), Defense (1)
   - Cannot serve on ships

2. **Worker**:
   - Skills: Woodpicking (1), Building (2), Defense (2), Abordage (1), Bombarding (1)
   - Cannot serve on ships

3. **Craftsman**:
   - Skills: Building (2), Defense (1), Bombarding (2)
   - Cannot serve on ships

4. **Sailor**:
   - Skills: Defense (2), Abordage (1), Bombarding (1)
   - Can serve on ships
   - Can be essential crew

5. **Soldier**:
   - Skills: Defense (3), Abordage (2), Bombarding (1), Shooting (2)
   - Cannot serve on ships

6. **Corsair**:
   - Skills: Defense (2), Abordage (3), Bombarding (2), Shooting (1)
   - Can serve on ships
   - Can be essential crew

7. **Pirate**:
   - Skills: Defense (2), Abordage (3), Bombarding (2), Shooting (2)
   - Can serve on ships
   - Can be essential crew

8. **Young Pirate**:
   - Skills: Farming (1), Fishing (1), Woodpicking (1), Building (1), Defense (2), Abordage (2), Bombarding (1), Shooting (1)
   - Can serve on ships
   - Can be essential crew

### Understanding Crew Skills

- **Farming**: Ability to farm resources
- **Fishing**: Ability to fish for resources
- **Woodpicking**: Ability to collect wood
- **Building**: Ability to construct buildings
- **Defense**: Ability to defend against attacks
- **Abordage**: Ability to board enemy ships
- **Bombarding**: Ability to attack with cannons
- **Shooting**: Ability to use ranged weapons

## Recruiting Crew

### Sailor Recruitment

Sailors are the most common crew type that can be recruited using ARRC tokens:

1. Each sailor costs 1 ARRC token to recruit
2. To recruit sailors:
   - You must own the pirate NFT
   - The pirate must have enough crew capacity
   - You need sufficient ARRC tokens and must approve the recruitment contract to spend them

When recruiting sailors:
- The ARRC tokens are transferred and used for fees
- The sailors are added to your pirate's crew count
- You can check your pirate's crew capacity before recruiting

## Ship Management

### Ship Staking

To use a ship for travel or missions, you must stake it along with pirates:

1. **Staking Requirements**:
   - You must own the ship NFT
   - You must assign a captain (a pirate NFT that you own)
   - You can optionally assign crew pirates (additional pirate NFTs)
   - Ships require a minimum number of essential crew members

2. **Captain Requirements**:
   - Different ship classes require captains with specific "Respect" levels:
     - Small Ships: Respect level 1+
     - Medium Ships: Respect level 6+
     - Large Ships: Respect level 9+

3. **Crew Requirements**:
   - Each ship has a minimum and maximum essential crew capacity
   - Essential crew types include: Sailor, Corsair, Pirate, and Young Pirate
   - The total essential crew count from all staked pirates must meet the ship's requirements

### Staking Process

1. To stake a ship:
   - Transfer your ship NFT to the staking contract
   - Assign a captain (pirate NFT) to the ship
   - Optionally assign additional crew pirates
   - Pay ARRC fees for staking

2. Once staked:
   - The ship and pirates are locked in the staking contract
   - The ship is now ready for travel and missions
   - You can later add or remove crew pirates (but not the captain)

3. Unstaking:
   - You can unstake your ship and pirates when not on a mission
   - All NFTs will be returned to your wallet

## Ship Travel

### Island Regions and Distances

The world is divided into regions: NorthWest, NorthEast, SouthWest, SouthEast, North, South, East, and West. Travel time depends on the distance between regions:

1. **Short Distance**: Islands in the same region
   - Base travel time: 1 day (24 hours)

2. **Medium Distance**: Islands in opposite diagonal regions
   - NorthWest to SouthEast
   - NorthEast to SouthWest
   - Base travel time: 5 days (120 hours)

3. **Long Distance**: Islands in other region combinations
   - Base travel time: 9 days (216 hours)

### Travel Time Calculation

Travel time between islands depends on several factors:

1. **Base Duration**: Determined by the distance between islands (Short, Medium, Long)

2. **Ship Speed**: Each ship has a speed attribute
   - Adjusted travel time = Base duration / Ship speed

3. **Captain Skills**: Two key skills affect travel time:
   - **Wisdom**: Each 2 points reduces travel time by 1%
   - **Navigation**: Each point reduces travel time by 1%

4. **Minimum Travel Time**: No matter how fast a ship or skilled a captain, travel always takes at least 1 hour

The final formula is:
```
Final Duration = Base Duration / Ship Speed - Wisdom Bonus - Navigation Bonus
```

### Ship Attributes

Ships have various attributes that affect gameplay:

- **Class**: Determines ship size (Small, Medium, Large)
- **Ship Type**: Specific type of ship (e.g., Sloop, Frigate)
- **Durability**: Ship's health and durability
- **Speed**: How fast the ship travels
- **Agility**: Ship's maneuverability
- **Viewing Range**: How far the ship can see
- **Cannons Capacity**: How many cannons the ship can carry
- **Armor**: Ship's defensive capability
- **Ramming**: Ship's ability to ram other ships
- **Crew Requirements**: Minimum and maximum crew capacity
- **Cargo Bay**: How much cargo the ship can carry

## Gameplay Flow

1. **Acquire Pirates and Ships**: Obtain pirate NFTs and ship NFTs
2. **Recruit Crew**: Use ARRC tokens to recruit crew for your pirates
3. **Stake Your Ship**: Assign a captain and crew pirates to your ship
4. **Travel Between Islands**: Your ship can now travel with calculated travel times
5. **Complete Missions**: Participate in missions for rewards
6. **Manage Resources**: Use your crew's skills to gather and manage resources

## Conclusion

The Ships and Crew Management system in Arrland provides a deep and engaging gameplay experience. By understanding how to recruit crew, manage ships, and optimize travel times, you can become a more effective player in the game's ecosystem. As you gain more experience, you'll discover strategies for building the perfect crew complement for your adventures at sea! 