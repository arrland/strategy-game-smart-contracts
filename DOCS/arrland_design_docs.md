# Arrland Design Documentation Summary

## Overview
This document outlines the core game mechanics, systems, and features of Arrland, a blockchain-based pirate-themed game. It covers mission systems, ship mechanics, resource management, and combat systems.

## Key Components

### Mission Systems
- Resource Transfer/Trade Between Islands
- Ship-based Trading System
- Attack and Hunt Missions
- Complex Naval Combat System

### Ship Mechanics
- 15 Different Ship Types across 5 Categories
- Detailed Ship Attributes (Durability, Speed, etc.)
- NFT and Non-NFT Ship Systems
- Ship Repair and Maintenance

### Crew Management
- Pirate NFT Integration
- Crew Assignment System
- Captain and Officer Mechanics
- Crew Skills and Specializations

### Resource Systems
- Inter-Island Resource Trading
- Resource-based Ship Repair
- Crafting System for Ships and Items
- Resource Transportation Mechanics

### Combat Mechanics
- Multi-phase Battle System
- Strategic Maneuver Options
- Ship-specific Combat Attributes
- Crew-influenced Combat Outcomes

### Economic Features
- ARRC Token Integration
- Resource Trading Markets
- Ship Construction Economy
- Repair Material Economy

### Technical Implementation
- Smart Contract Architecture
- Commit-Reveal Scheme for Random Number Integration
- Security Measures and Access Control
- Event Emission for Off-chain Tracking

---

Arrland Missions: Developer Documentation


1. Resource Transfer/Trade Between Islands


Players can board ships and assign Pirate NFTs as crew members. If a player doesn't own a Ship NFT, they can use a non-NFT boat by staking one Pirate NFT. To use additional non-NFT boats, players must craft them in the Shipyard. Non-NFT ships can also be crafted and used similarly to NFT ships but can be captured by other players during attacks.
Boarding Costs:
* ARRC Token Fee: Boarding a ship costs 0.1 ARRC per Pirate NFT stake. The ARRC tokens used are burned.
Crew Management:
* Pirate NFTs: Serve as captains or essential crew members.
* Non-NFT Crew Members: Assigned to Pirate NFTs to meet the ship's crew requirements.
* Captains Respect: Determine how many Pirate NTFS can be assigned to ship as ship crew.
* Additionally every Pirate NFT has its own crew score that determines the max num of non NFT crewmen. For example:
If Pirate NFT ID 1 is assigned as captain with 3 crewmen(crew_scrore) and Pirate NFT ID 2 is assigned as captain's officers with 2 crewmen(crew_scrore) then total max crew for this ship is 7.


________________


2. Ship Classes and Attributes
Ship Categories:
* Boats
* Sailboats
* Small Ships
* Medium Ships
* Large Ships

| Class | Durability | Speed | Agility | Viewing Range | Number of Cannons | Armor | Ramming | Crew Min | Crew Max | Cargo Base | Special | Oars | Shallow Waters | Type |
|-------|------------|--------|---------|---------------|------------------|-------|----------|----------|-----------|------------|---------|------|----------------|------|
| Boats | 3 | 1 | 6 | 1 | 0 | 0 | 0 | 1 | 2 | 4 | None | No | Yes | Boat |
| Boats | 2 | 1 | 2 | 1 | 0 | 0 | 0 | 1 | 2 | 1 | None | No | Yes | Raft |
| Sailboat | 5 | 1 | 5 | 1 | 0 | 0 | 0 | 2 | 7 | 30 | Additional crew space | Yes | Yes | Longboat |
| Sailboat | 10 | 3 | 6 | 2 | 0 | 0 | 0 | 1 | 7 | 50 | Additional crew space | No | Yes | Piragua |
| Sailboat | 20 | 6 | 5 | 2 | 2 | 1 | 1 | 3 | 10 | 60 | Additional crew space | No | Yes | Tartane |
| Small ship | 30 | 6 | 5 | 2 | 6 | 1 | 1 | 3 | 8 | 60 | None | No | Yes | Pinnace |
| Small ship | 40 | 5 | 4 | 3 | 10 | 2 | 2 | 4 | 10 | 120 | None | No | Yes | Sloop |
| Small ship | 60 | 4 | 3 | 3 | 12 | 3 | 3 | 6 | 12 | 200 | None | No | Yes | Brigantine |
| Small ship | 30 | 3 | 2 | 2 | 0 | 1 | 3 | 14 | 28 | 80 | None | Yes | Yes | Galley |
| Medium ship | 80 | 3 | 2 | 4 | 12 | 3 | 4 | 4 | 12 | 280 | Double loading speed | No | No | Fluyt |
| Medium ship | 100 | 3 | 3 | 4 | 16 | 4 | 4 | 8 | 16 | 400 | Double loading speed | No | No | Merchantman |
| Medium ship | 130 | 4 | 3 | 4 | 24 | 4 | 3 | 6 | 24 | 160 | Double loading speed | No | No | Frigate |
| Large ship | 150 | 3 | 1 | 5 | 64 | 3 | 5 | 12 | 100 | 500 | 20% faster cannons reload | No | No | Galleon |
| Large ship | 210 | 4 | 2 | 5 | 52 | 5 | 6 | 12 | 52 | 200 | 20% faster cannons reload | No | No | Man o War |
| Large ship | 350 | 3 | 1 | 5 | 72 | 6 | 6 | 16 | 72 | 300 | 20% faster cannons reload | No | No | Ship of the Line |





3. Missions
After boarding a ship and assigning the crew, players can embark on four types of missions:
1. Resource Transfer Between Islands
2. Resource Trade with Other players Islands
3. Attack Mission
4. Hunt Enemy Ships
Claim Back Ships and Crew:
At any point after the mission is done, users can call back ships to port (claim back NFTs to wallet).


________________


3.1 Resource Transfer Between Islands
Staking Requirements:
* Ship Deployment:
   * Ship and Crew must boarded first(staked) this done only once
* Resource Consumption:
   * Food Resources: Consumed daily based on travel duration and crew size.
   * RUM Token Fee: Required to initiate the transfer; paid in RUM tokens and burned.
Transfer Logic:
* Timed Transfers(average based ship speed and navigation skill):
   * Same region and Genesis Pirate Islands: max 1h average
   * Medium-Distance (2 Days average): North West ↔ South East, North East ↔ South West.
   * Long-Distance (4 Days): North West ↔ South West, North East ↔ South East, North West ↔ North East.
* Cargo capacity of the ship determines the amount of trade that can be conducted in a single trip.
* Manual Claiming: Players must claim resources after travel time elapses.
* We need to store on chain mapping of Island ID -> Region, ex. 1000:  South East
Load/unload Time calculation: based on ports involved in trading/transport mission

load time = resources amount / ship crew / port level
Attacks & Defense:
* Attack Eligibility: Only medium and long-distance transfers can be attacked until travel time finishes.
* Combat Mechanics:
   * Random Outcome: Determined using Commit-Reveal Scheme.
   * Ship & Crew Stats: Speed, durability, cannons, armor, maneuverability, and crew influence the outcome.
* Damage System:
   * Random Damage: Ships take damage based on combat results.
   * Mission Failure: If attacked successfully, the ship's travel time resets, and the mission fails.
* Cooldowns:
   * Post-Attack: 24-hour cooldown for ships involved in combat.
Ship Repair System:
* Repair Requirements:
   * Minimum Durability: Ships must be at least 30% repaired to embark on missions.
   * Resources Needed: Planks, Wood, Yarn, Iron Accessories, Fabric, Marine Items, Cannons, Iron Bar, Tin Bar, Copper Bar.

Distance Calculation & Voyage Parameters
* Distance Categories:
   * Short Distance (D=1): Islands within the same region
   * Medium Distance (D=5): 
      * North West ↔ South East
      * North East ↔ South West
   * Long Distance (D=9):
      * North West ↔ South West
      * North East ↔ South East
      * North West ↔ North East

* Navigation Skill Bonuses:
   * Parrot: +3% travel time reduction
   * Genie Lamp: +6% travel time reduction
   * Spyglass: +4% travel time reduction
   * Map: +5% travel time reduction
   * Hat Tier 1: +1% travel time reduction
   * Hat Tier 2: +2% travel time reduction
   * Arrlandum Tier 1: +2% travel time reduction
   * Arrlandum Tier 2: +4% travel time reduction
   * Arrlandum Tier 3: +6% travel time reduction

Voyage Duration Formula:
* Duration = Distance (modifier / Ship speed) - ((Wisdom/2) + Navigation%)
   * Distance modifier: 1 (short), 5 (medium), or 9 (long)
   * Ship speed: From ship's technical parameters
   * Navigation%: Sum of captain's navigation trait bonuses
   * Wisdom: Captain's wisdom attribute

Cost Structure:
* Boarding Cost: 0.01 ARRC per crew member (NFT pirate + their crewmen)
* Mission Costs:
   * 1 RUM token burned per NFT staked
   * Food resources consumed per crew member (NFT pirate + their crewmen) based on voyage duration

Ship Class Requirements:
* Respect Level Prerequisites:
   * Boats/Sailboats: No minimum
   * Small Ships: Level 1
   * Medium Ships: Level 6
   * Large Ships: Level 9

Staking Requirements:
* Both NFT ship and captain (Pirate Genesis/Inhabitant) must be staked
* RUM token and food resources required for each voyage
* After completion:
   * Can initiate new voyage (requires new RUM token and food payment)
   * Can unstake NFTs(optional unboarding)

* Port Efficiency Factors:
   * Port Level Bonuses: Higher level ports reduce load/unload times
   

________________


3.2 Resource Trade with Other Islands
* Trade Execution:
   * Fill Buy/Sell Orders: Players can fulfill trade orders posted by island owners with a Main Building.
   * ARRC token is used as a means of exchange. All prices are in ARRC token.
   * Player select Island he want to trade with, Resources and ARRC are locked
   * Travel time start
   * When time finish player can settle the trade operation
   * Before the time is finished, then attackers can attack a ship that is traveling. When time finishes, attack is not possible any more.
* Staking Requirements:
   * Same as resource transfer.
* Attack Risks: Similar attack mechanics apply during medium and long-distance trades.
This feature will require integration with several existing contracts as well as a new IslandTrading contract to handle the buying and selling of resources. Ships are used to facilitate these trades, similar to the way they function during resource transfers. The ship is responsible for carrying resources between the islands, and the trade only completes once the ship reaches its destination. If a ship is attacked during travel then all resources it carries are stolen. Cool down to use the ship again is added 24h.


________________


3.3 Attack Mission
* Objective: Attack ships engaged in resource transfers or trades.
* Staking Requirements:
   * Ship and Crew: Assign ships and crew as per standard requirements.
* Combat Mechanics:
   * Commit-Reveal Scheme: Determines battle outcomes.
   * Ship & Crew Influence: Ship stats and crew assignments play a significant role.
* Rewards:
   * Resource Looting: Successful attackers can capture a portion of the target's cargo.
   * Ship Capture: Non-NFT ships can be captured by attackers.
* Cooldowns:
   * Post-Mission: 24-hour cooldown applies.

Combat Resolution Details:
   * Initiative Calculation: Based on ship speed and crew skills
   * Hit Chance Formula: (Attacker's accuracy - Target's evasion) * weather modifier
   * Damage Calculation: Base damage * (1 + crew bonus) * (1 - armor reduction)
   * Weather Effects: Different weather conditions affecting combat outcomes
   * Escape Mechanics: Conditions and calculations for successful retreat

________________


3.4 Hunt Enemy Ships
* Objective: Hunt and attack ships that have previously engaged in attacks.
* Mechanics:
   * Tracking: Players can target ships known for attacking others.
   * Rewards: Similar to standard attacks.
* Cooldowns:
   * Post-Mission: 24-hour cooldown applies.

Hunting System Details:
   * Target Detection: How potential targets are discovered
   * Tracking Mechanics: How ships can be followed
   * Intelligence System: Information gathering about target ships
   * Reputation System: Impact on future gameplay
   * Bounty System: Rewards for hunting specific targets

________________


4. Crafting and Shipyards
* Ship Crafting:
   * Non-NFT Ships: Can be crafted in the Shipyard.
   * Requirements: Consumption of specific resources and time.
* Boat Crafting:
   * Additional Boats: Players can craft non-NFT boats to assign to Pirate NFTs.
________________


5. Crew and Captain Mechanics
* Crew Assignment:
   * Non-NFT Crew Members: Can be assigned to Pirate NFTs.
   * Total Crew Count: Sum of Pirate NFTs and assigned crew members.
* Captain Respect:
   * Requirement: Ships have a minimum Captain Respect needed to be captained.
   * Pirate NFTs: Must meet or exceed this value to be assigned as the ship's captain.

Crew Development:
   * Experience System: How crew members gain experience
   * Skill Trees: Available specializations and abilities
   * Training: Methods to improve crew performance
   * Loyalty System: Impact on crew performance
   * Special Abilities: Unique crew member capabilities

________________


6. Damage and Repair System
* Damage Mechanics:
   * Randomized Damage: Based on combat outcomes using Commit-Reveal Scheme.
   * Effect on Missions: Ships below 30% durability cannot embark on missions.
* Repair Process:
   * In-Port Repairs: Conducted at specific locations using required resources.
   * Resource Consumption: Varies based on the extent of damage.
________________


7. Resource Requirements for Repair
* Materials Needed:
   * Planks
   * Wood
   * Yarn
   * Iron Accessories
   * Fabric
   * Marine Items
   * Cannons
   * Iron Bar
   * Tin Bar
   * Copper Bar
________________


8. Additional Considerations
* Non-NFT Ships:
   * Capture Mechanics: Can be captured during successful attacks.
* ARRC Token Usage:
   * Burn Mechanism: Boarding costs contribute to token scarcity.
* Commit-Reveal Scheme Integration:
   * Security: Ensures fairness in random number generation for combat.
* Smart Contract Security:
   * Access Control: Implement role-based access using OpenZeppelin's AccessControl.
   * Upgradability: Use proxy patterns if contracts need to be upgradeable.
   * Reentrancy Guards: Apply OpenZeppelin's ReentrancyGuard where necessary.
   * Event Emission: Emit events for all significant state changes for off-chain tracking.
   * Randomness Handling: Securely handle randomness to prevent manipulation.


Arrland Missions: Battle Mechanics 
________________
1. Introduction
This document provides a comprehensive guide to the battle mechanics in Arrland Missions. It outlines the different maneuvers and strategies players can employ during naval combat. Understanding these mechanics is crucial for players who wish to succeed in attacking enemy ships, defending their own vessels, and making strategic decisions that affect the outcome of battles.

Environmental Factors:
   * Weather Conditions: Impact on combat
   * Time of Day: Visibility and combat modifiers
   * Sea State: Effects on ship handling
   * Geographic Features: Strategic advantages/disadvantages
   * Wind Direction: Impact on ship movement and combat

________________


2. Overview of Battle Phases
Naval combat in Arrland Missions consists of several phases:
1. Displacement Maneuver (Mandatory): Initial phase where players choose their primary maneuver.
2. Maneuver in Case of Approach (Optional): An additional strategy if players decide to engage closely.
3. Cannon Maneuver (Complementary): Supplementary actions to enhance or alter the outcome of the primary maneuver.
Players must select their strategies before engaging in combat. These choices, combined with ship and crew statistics, influence the battle's outcome.

________________


3. Displacement Maneuver (Mandatory)
The displacement maneuver is the foundational strategy that determines the ship's initial approach in combat. Players must choose one of the following options:
3.1. Maneuvering
* Objective: Use the ship's speed and maneuverability to gain a tactical advantage.
* Effect: Increases the chance to outmaneuver the enemy, allowing for better positioning.
* Ideal For: Ships with high speed and maneuverability stats.
3.2. Escape
* Objective: Attempt to flee from the enemy and avoid engagement.
* Effect: If successful, the battle ends with no damage to either ship.
* Ideal For: Players wishing to avoid combat, especially if outmatched.
3.3. Ramming
* Objective: Use the ship's hull to collide with the enemy, causing damage.
* Effect: Inflicts damage on both ships, with potential for significant harm to the enemy.
* Ideal For: Ships with strong durability and ramming capabilities.
3.4. Abordage (Boarding)
* Objective: Close in on the enemy ship to engage in boarding actions.
* Effect: Initiates hand-to-hand combat between crews, with the potential to capture the enemy ship.
* Ideal For: Ships with large, well-trained crews and high abordage stats.

________________


4. Maneuver in Case of Approach (Optional)
An additional strategy that can be employed if the player decides to engage closely with the enemy.
4.1. Gunfire Before Abordage
* Objective: Use cannons to weaken the enemy before boarding.
* Effect: Reduces the enemy's crew and ship durability, increasing the chance of successful boarding.
* Ideal For: Players planning to board the enemy but wanting to soften defenses first.

________________


5. Cannon Maneuver (Complementary)
Complementary maneuvers that can enhance or alter the outcome of the primary strategy. Players can choose one of the following:
5.1. Short Salvo (Slowing Enemy for Capture)
* Objective: Fire a quick round of cannon shots to damage the enemy's sails and rigging.
* Effect: Slows down the enemy ship, making it easier to catch and engage.
* Ideal For: Players aiming to board or ram the enemy.
5.2. Long Salvo (Attempting to Destroy Enemy)
* Objective: Engage in sustained cannon fire to inflict maximum damage.
* Effect: Aims to destroy or heavily damage the enemy ship from a distance.
* Ideal For: Ships with superior firepower seeking to eliminate the threat without close engagement.
5.3. Short Salvo (Slowing Enemy to Escape)
* Objective: Fire at the enemy to impair their speed, facilitating escape.
* Effect: Decreases the enemy's ability to pursue, increasing the chance of a successful escape.
* Ideal For: Players wanting to avoid combat when the enemy is faster or more powerful.

________________


6. Ship and Crew Stats Influence
The outcome of battles is significantly affected by the ship's attributes and the crew's abilities.
Ship Attributes:
* Speed: Determines the ability to chase or escape.
* Maneuverability: Affects the success of maneuvering strategies.
* Durability: The ship's ability to withstand damage.
* Cannons (Max Cannons): The ship's firepower.
* Armor: Reduces incoming damage.
* Ramming Capability: Influences the effectiveness of ramming maneuvers.
* Viewing Range: Impacts the ability to spot enemy ships early.
Crew Influence:
* Number of Crew: More crew can enhance boarding actions.
* Crew Roles:
   * Gunners: Improve cannon accuracy and damage.
   * Navigators: Enhance maneuvering and escape chances.
   * Boarders: Increase effectiveness in boarding combat.
* Captain Respect: A higher-respected captain can boost crew morale and efficiency.

________________


7. Combat Resolution and Randomness
Combat Resolution Process:
1. Strategy Selection: Both players choose their maneuvers.
2. Stat Calculation: The game calculates the effectiveness based on ship and crew stats.
3. Randomness Integration:
   * Random Factors: Introduced using secure random numbers provided by Zama fhEVM.
   * Purpose: Ensures unpredictability and fairness.
4. Outcome Determination: The result is computed, factoring in strategies, stats, and randomness.
Randomness Handling:
* Security: Random numbers are securely generated to prevent manipulation.
* Impact: Affects elements like hit probability, critical hits, and successful escapes.

________________


8. Rewards and Outcomes
Possible Outcomes:
* Victory: Successfully defeat the enemy ship:
   * Captured then Taken (if there is enough crew to operate)
   * Captured then Destroyed (if not enough crew or at will)
   * Destroyed (by canon or raming)
   * Retreated (the enemy ship has withdrawn from the battle as a result of injuries)
* Defeat: Your ship is defeated or captured.
* Escape: Successfully evade combat without engagement.
* Stalemate: No decisive outcome; both ships disengage.
Rewards for Victory:
* Resource Looting:
   * Cargo Seizure: Capture a portion or all of the enemy's cargo.
* Ship Capture:
   * Non-NFT Ships: Can be captured and added to your fleet.
* Experience Gains:
   * Crew and Captain: May gain experience, improving future combat performance.
Consequences of Defeat:
* Loss of Cargo: Enemy may seize your ship's cargo.
* Ship Damage: Significant reduction in ship durability.
* Ship Loss: In severe cases, the ship may be destroyed or captured.

________________


9. Damage and Repair
Damage Mechanics:
* Damage Calculation: Based on combat results, ship stats, and maneuvers.
* Durability Reduction: Ship's durability decreases with each hit.
* Critical Hits: Certain maneuvers may result in critical damage.
Repair Process:
* In-Port Repairs:
   * Requirements: Must be conducted at a port using specific resources.
   * Resources Needed:
      * Planks
      * Wood
      * Yarn
      * Iron Accessories
      * Fabric
      * Marine Items
      * Cannons
      * Iron Bar
      * Tin Bar
      * Copper Bar
* Repair Limitations:
   * Minimum Durability: Ships below 30% durability cannot embark on missions.
   * Time and Cost: Repair time and resource consumption depend on damage extent.

________________


10. Example Scenario
Scenario: Player Initiates an Attack
* Player's Ship:
   * Type: Medium Ship
   * Speed: High
   * Cannons: 10
   * Crew: 50 (including gunners and boarders)
   * Captain Respect: 5
* Enemy Ship:
   * Type: Small Ship
   * Speed: Moderate
   * Cannons: 6
   * Crew: 30
   * Captain Respect: 3
Player's Strategy:
1. Displacement Maneuver: Maneuvering
2. Maneuver in Case of Approach: Gunfire Before Abordage
3. Cannon Maneuver: Short Salvo to Slow Enemy for Capture
Combat Resolution Steps:
1. Displacement Maneuver Execution:
   * Player uses superior speed and maneuverability.
   * Success chance is high due to ship stats.
2. Cannon Maneuver:
   * Short salvo fired to damage enemy's sails.
   * Gunners improve accuracy and damage.
3. Maneuver in Case of Approach:
   * Gunfire before boarding further weakens the enemy.
   * Enemy crew and ship durability reduced.
4. Abordage (Boarding):
   * Player's larger crew and higher captain respect give an advantage.
   * Boarding combat ensues.
5. Outcome Determination:
   * Randomness applied to account for uncertainties.
   * Player successfully captures the enemy ship.
Rewards:
* Cargo Seized: Player gains a portion of the enemy's resources.
* Ship Captured: Non-NFT enemy ship added to player's fleet.
* Experience Gained: Crew and captain receive experience boosts.
Post-Battle Actions:
* Ship Repair:
   * Player's ship sustained minor damage.
   * Repairs conducted using resources at the port.
* Cooldown:
   * Ship enters a 24-hour cooldown before it can be used again.

________________


Summary
Understanding and effectively utilizing the battle mechanics in Arrland Missions can significantly enhance a player's success in naval combat. By carefully selecting maneuvers, leveraging ship and crew strengths, and considering potential risks, players can navigate battles strategically. Remember to maintain your ships, manage your crew wisely, and adapt your strategies based on the evolving circumstances of each encounter.




Arrland Buildings: Developer Documentation
Table of Contents
1. Introduction
2. Islands and Building Construction
   * Island Types
   * Manager's Headquarters
3. Residential Zones
   * Tiers and Levels
   * Residential Zone Types
   * Residential Zone Upgrades
4. Specialist Buildings
   * Types of Specialist Buildings
   * Tiers of Specialist Buildings
5. Building Mechanics
   * Plots and Land Management
   * Building Durability and Repair
6. Future Developments
7. Appendices
   * Resource Requirements
   * Building Outputs
________________


Introduction
This documentation provides detailed information for web developers on the buildings and their functionalities within Arrland. It covers the types of buildings available, their requirements, and how they interact within the game world. This guide aims to assist in understanding the building mechanics to facilitate development and integration.
Islands and Building Construction
Island Types
Buildings can be constructed on both NFT islands and non-NFT islands (e.g., Genesis Island). Each island offers different building opportunities and limitations based on its size and type.
Governor's Headquarters
* Overview: Every island has a Governor's Headquarters, which is the central hub for development and management.
* Maximum Levels: The headquarters can be upgraded up to Level 25, depending on the island type.
* Island-Specific Maximum Levels and Unlocks:
   * Genesis Island:
      * Max Level: 10
      * Unlocks: Reproduction of young pirates (non-NFT helpers of the Genesis Pirate NFT).
   * XS Island:
      * Max Level: 5
      * Unlocks: Ability to build 1 Residential Zone.
   * S Island:
      * Max Level: 10
      * Unlocks: Ability to build 2 Residential Zones.
   * M Island:
      * Max Level: 15
      * Unlocks: Ability to build 3 Residential Zones.
   * L Island:
      * Max Level: 20
      * Unlocks: Ability to build 4 Residential Zones.
   * XL Island:
      * Max Level: 25
      * Unlocks: Ability to build 5 Residential Zones.
* Level Benefits:
   * Each level increases the plot storage capacity by 50.
   * Each level unlocks to built-in Trading Post up to 25 levels, 1 level for each level of the Governor's House. Each level of trading post unlocks 1 trading offer for this island.
   * Unlocks new functionalities at specific levels.
Residential Zones
Tiers and Levels
Residential Zones can be upgraded up to Level 5. They are categorized into tiers, which determine their size and capabilities.
* Tier 1: Occupies 1 land plot.
   * Type: Settlement
* Tier 2: Occupies 2 land plots.
   * Types: Village, Artisan's Settlement, Fishermen's Cove, Prospector Settlement
* Tier 3: Occupies 4 land plots.
   * Types: Town, Port Town, Artisan's District, Main Plaza
* Tier 4: Occupies 8 land plots.
   * Types: Merchant District, Manufacturers' Quarter, Harbor District
* Tier 5: Occupies 16 land plots.
   * Types: Port City, Foundry District
Residential Zone Types
1. Settlement
   * The smallest residential zone.
   * Each level unlocks housing for 1 non-NFT Crewmen.
   * Upon reaching Level 5, it can be converted into a Specialized Settlement (e.g., fishing, coconut, citrus, cotton, tobacco, sugar cane, grain, pig farming), increasing chosen output by X..
2. Village:
   * Offers a balance between agricultural and other functionalities.
   * Each level unlocks housing for 2 non-NFT Crewmen.
   * Unlocks both Farming/Forestry Buildings and Crafting Buildings at various levels.
3. Artisan's Settlement:
   * Focused on crafting and production.
   * Each level unlocks housing for 2 non-NFT Crewmen.
   * Unlocks multiple Crafting Buildings across levels.
4. Fishermen's Cove:
   * Specializes in maritime activities.
   * Each level unlocks housing for 2 non-NFT Crewmen.
   * Unlocks Maritime Buildings and supports fishing operations.
5. Prospector Settlement:
   * Dedicated to mining activities.
   * Each level unlocks housing for 2 non-NFT Crewmen.
   * Unlocks Mines and supports resource extraction.
Residential Zone Upgrades
Settlement
* Level 1: Unlocks 1 Farming or Forestry Building
* Level 2: Unlocks 1 Farming or Forestry Building
* Level 3: Unlocks 1 Farming or Forestry Building
* Level 4: Unlocks 1 Farming or Forestry Building
* Level 5: Unlocks 1 Tier 1 Maritime Building
Village
* Level 1: Unlocks 1 Farming or Forestry Building and 1 Crafting Building
* Level 2: Unlocks 1 Farming or Forestry Building and 1 Tier 1 Maritime Building
* Level 3: Unlocks 1 Farming or Forestry Building and 1 Crafting Building
* Level 4: Unlocks 1 Farming or Forestry Building and 1 Tier 1 Maritime Building
* Level 5: Unlocks 1 Trade building
Artisan's Settlement
* Levels 1-4: Each level unlocks 1 Crafting Building
* Level 5: Unlocks 1 Farming or Forestry Building
Fishermen's Cove
* Level 1: Unlocks 1 Tier 1 Maritime Building
* Level 2: Unlocks 1 Farming or Forestry Building
* Levels 3-4: Each level unlocks 1 Crafting Building
* Level 5: Unlocks 1 Tier 2 Maritime Building
Prospector Settlement
* Level 1: Unlocks 1 Mine
* Level 2: Unlocks 1 Crafting Building
* Levels 3-5: Each level unlocks 1 Mine
Perks and Benefits
* Upgrading residential zones unlocks perks such as:
   * Additional housing for non-NFT Crewmen.
   * Ability to construct specialist buildings.
   * Special functionalities (e.g., sending extra non-NFT rowing or sailing boats to boost fishing, additional trade slots).
* The type and level of the residential zone influence the maximum number of non-NFT Crewmen and the types and quantities of specialist buildings that can be constructed.
Specialist Buildings
Types of Specialist Buildings
Specialist buildings are categorized into the following types:
1. Farming and Forestry (including food processing)
   * Examples: Farms, Plantations, Mills, Bakeries, Slaughterhouses, Food Processing Plants, Forester's Lodges, Orchards, Sawmills, Hunter's Huts.
   * Note: Some can only be built on special resource plots.
2. Maritime (each divided into 4 tiers)
   * Examples: Shipyards, Ports, Fisheries, Fish Farms.
   * Note: Some require special resource plots with fish.
3. Mining
   * Examples: Mines, Open-Pit Mines, Quarries.
   * Note: Only buildable on special resource plots with mineral resources.
4. Crafting
   * Examples: Lead Bullet Workshop, Gunpowder Workshop, Cooper's Workshop, Crate Manufacturing Workshop, Blacksmith, Gunsmith Shop.
5. Industrial
   * To be detailed in future development phases.
6. Licensed
   * To be detailed in future development phases.
7. Defensive (Forts and Coastal Fortifications)
   * To be detailed in future development phases.
Tiers of Specialist Buildings
* Tiers represent the advancement level of Maritime and Defensive buildings.
* Divided into 4 tiers, with higher tiers offering enhanced capabilities and outputs.
Building Mechanics
Plots and Land Management
* Each building occupies a certain number of plots. Each Island has a number of land and sea plots.
* The construction of buildings reduces the available plot storage in the Manager's Headquarters.
* Special resource plots are required for certain buildings (e.g., plantations, mines).
* Managing plots effectively is crucial for optimal island development.
Building Durability and Repair
* Buildings have durability levels.
* They can be damaged due to:
   * Attacks from other players.
   * Random events (e.g., natural disasters).
* Repairs require the use of resources.
* Maintaining building integrity is essential for continuous operation.
Future Developments
* The world is currently in its basic development phase.
* Higher levels of residential zones (Tier 3 and above) and additional building types will be introduced in later stages.
* Future updates will include detailed information on:
   * Industrial Buildings
   * Licensed Buildings
   * Defensive Structures
Appendices
Resource Requirements
* Detailed resource requirements for constructing each building will be provided in the appendix.
* This will include the types and quantities of resources needed.
Building Outputs
* Specific outputs (yields) for each building will be documented.
* This will help in planning resource production and management.



Arrland Buildings: Developer Documentation (Updated)
Table of Contents
   1. Introduction
   2. Islands and Building Construction
   * Island Types
   * Manager's Headquarters
   3. Plots and Special Resource Tiles
   * Plot Storage
   * Special Resource Plots
   4. Residential Zones
   * Tiers and Levels
   * Residential Zone Types
   * Residential Zone Upgrades
   5. Specialist Buildings
   * Types of Specialist Buildings
   * Tiers of Specialist Buildings
   6. Building Mechanics
   * Building Durability and Repair
   * Non-NFT Helpers
   7. Future Developments
   8. Appendices
   * Resource Requirements
   * Building Outputs



________________

Islands and Construction of the Governor's Residence
(Additional description to understand the structure)
________________


Types of Islands
Buildings can be constructed on both NFT islands and non-NFT islands (e.g., Genesis Island). Each island offers different building possibilities and limitations depending on its size and type.
________________


Governor's Residence
Overview
Each island has a Governor's Residence, which serves as the central point for development and management. Depending on the level, this building changes its name, construction requirements, and the bonuses offered. It should be treated as a single building.
Each upgrade has different resource requirements and construction difficulty. Every 5 levels name of Governor House changes. 
   * Maximum Levels: The Governor's Residence can be upgraded up to level 25, depending on the type/size of the island (Genesis, XS, S, M, L, XL).
Levels of the Governor's Residence and Unlocks
   * Genesis Island:
   * Maximum Level: 10
   * Unlocks: Reproduction of young pirates (non-NFT helpers of Genesis Pirate).
   * XS Island:
   * Maximum Level: 5
   * Unlocks: Ability to build 1 Residential Zone.
   * S Island:
   * Maximum Level: 10
   * Unlocks: Ability to build 2 Residential Zones.
   * M Island:
   * Maximum Level: 15
   * Unlocks: Ability to build 3 Residential Zones.
   * L Island:
   * Maximum Level: 20
   * Unlocks: Ability to build 4 Residential Zones.
   * XL Island:
   * Maximum Level: 25
   * Unlocks: Ability to build 5 Residential Zones.
Level Benefits
   * Resource Warehouse Capacity: Each level increases the resource warehouse capacity by +100.
   * New Features: Unlocks new features at specific levels.
   * Trade Post: Every tier of Governor's Residence, a Trade Post can be built in the Governor's Residence(Max 5 levels)
   * Trade Offers: Each level of the Trade Post provides 1 trade offer, adding to the available offer slots on the island.
________________


Detailed Requirements and Bonuses for the Governor's Residence
Below is a table outlining the requirements, levels, and bonuses for the Governor's Residence based on the island type and level.
Governor's Residence Levels
Building
	Plots
	Terrain Type
	Minimum Island Size
	Type
	Level
	Required Construction Resources<br>(per level, if applicable)
	Construction Difficulty
	Rules, Bonuses, and Benefits
	Camp
	0
	Not required
	XS
	Governor's Residence
	1-5
	- Wood: 5
- Cotton: 25
	1
	Unlocks 1 Residential Zone
	Pirate Camp
	0
	Requires Genesis Island
	XS
(Genesis only)
	Governor's Residence
	6-10
	- Wood: 20
- Planks: 100
- Cotton: 50
	2
	Reproduction of Young Pirates, bonus to "Act of Love" time, bonus to Genesis Pirate reproduction time
	Farmstead
	0
	Not required
	S
	Governor's Residence
	6-10
	- Wood: 20
- Planks: 100
- Cotton: 50
	2
	Unlocks 2 Residential Zones
	Residence
	1
	Land
	M
	Governor's Residence
	11-15
	- Wood: 100
- Planks: 500
- Stone: 50
	3
	Unlocks 3 Residential Zones
	Manor
	2
	Land
	L
	Governor's Residence
	16-20
	- Wood: 400
- Planks: 2000
- Stone: 200
- Bricks: 1000
	4
	Unlocks 4 Residential Zones
	Estate
	3
	Land
	XL
	Governor's Residence
	21-25
	- Wood: 1000
- Planks: 4000
- Stone: 1000
- Bricks: 5000
- Gold Bars: 100
	5
	Unlocks 5 Residential Zones
	Notes:
   * Construction Difficulty: Indicates the level of difficulty based on resource requirements and advancement level.
   * Rules, Bonuses, and Benefits:
   * Camp: Basic structure that allows the beginning of island development.
   * Pirate Camp: Available only on Genesis Island; enables reproduction of Young Pirates and offers bonuses to reproduction time.
   * Farmstead: Expands building possibilities by unlocking additional Residential Zones.
   * Residence, Manor, Estate: Higher levels of the Governor's Residence that increase management capabilities, storage, and offer additional bonuses.
   * Trade Post:
   * Unlocking: Can be built every 5 levels of the Governor's Residence.
   * Functions:
   * Each level provides 1 trade offer, adding to the available offer slots on the island.
   * Facilitates trade and resource exchange with other players.
   * Strengthens the island's economy by increasing the availability of products and resources.
________________


Example Scenarios
Player on an XS Island
   * Governor's Residence: Can upgrade up to level 5 (Camp).
   * Unlocks: 1 Residential Zone.
   * Trade Post: Can build at level 5, providing 1 additional trade offer.
Player on an Genesis Island
   * Governor's Residence: Can upgrade up to level 10 (Pirate Camp).
   * Unlocks: reproduction of young pirates (crewmen)
   * Trade Post: Can build at level 5, providing 1 additional trade offer.
Player on an M Island
   * Governor's Residence: Can upgrade up to level 15 (Residence).
   * Unlocks: 3 Residential Zones.
   * Trade Post: Can build at levels 5, 10, and 15, obtaining a total of 3 additional trade offers.
Player on an XL Island
   * Governor's Residence: Can upgrade up to level 25 (Estate).
   * Unlocks: 5 Residential Zones.
   * Trade Post: Can build at levels 5, 10, 15, 20, and 25, obtaining a total of 5 additional trade offers.
________________


Summary
Upgrading the Governor's Residence is crucial for island development and unlocking new building possibilities and functions. With each level, resource requirements increase, but so do the benefits:
   * Increased Warehouse Capacity: Each level boosts the storage capacity of plots.
   * More Residential Zones: Ability to build a greater number of Residential Zones.
   * Advanced Structures: Access to buildings like the Trade Post.
   * Economic Enhancements: Improvements in trade and the island's economy.
   * Unique Bonuses: Specific functions depending on the island type (e.g., reproduction of Young Pirates on Genesis Island).
________________


Strategy
   * Planning: Players should plan the upgrade of the Governor's Residence according to their goals and resources.
   * Resource Management: Collecting and accumulating the required resources is essential for upgrading to higher levels.
   * Trade: Utilizing the Trade Post to exchange surplus resources and obtain missing materials.
   * Island Development: Investing in Residential Zones and other specialized buildings to increase productivity and defense.
________________


This section provides detailed information about the Governor's Residence, its levels, requirements, and bonuses, helping players understand and effectively manage the development of their island in the game Arrland.
Islands and Building Construction
Island Types
Buildings can be constructed on both NFT islands and non-NFT islands (e.g., Genesis Island). Each island offers different building opportunities and limitations based on its size and type.
Plots and Special Resource Tiles
Plot Storage
   * Plot Storage: Each island provides storage for plots, which are used to construct buildings.
   * Plot Consumption: Each building occupies a certain number and type of plots, reducing the available plot storage. Each Inhabitant/Pirate farming on basic rules occupies 1 plot.
   * Building deconstruction adds available plot storage and 50% of resources used for original construction.
Special Resource Plots
   * Definition: Special resource plots are land and sea tiles marked with specific resources.
   * Restrictions: Certain buildings can only be constructed on these special plots.
   * Buildings Requiring Special Plots:
   * Plantations: Require plots with specific crops (e.g., cotton, sugar cane, cocos).
   * Fish Farms: Require plots with fish resources.
   * Hunter's lodge: Require plots with wild game.
   * Mines, Pits, and Quarries: Require plots with mineral resources (e.g., gold, iron).
   * Arrlandum Gardens: Specific to arrlandum resource plots.
Residential Zones
Tiers and Levels
Residential Zones can be upgraded up to Level 5. They are categorized into tiers, determining their size and capabilities.
   * Tier 1: Occupies 1 land plot.
   * Type: Settlement
   * Tier 2: Occupies 2 land plots.
   * Types: Village, Craftsmen's Settlement, Fishing Village, Mining Settlement
   * Tier 3: Occupies 4 land plots.
   * Types: Town, Port Town, Craftsmen's District, City Center
   * Tier 4: Occupies 8 land plots.
   * Types: Merchant District, Industrial District, Harbor District
   * Tier 5: Occupies 16 land plots.
   * Types: Port City, Industrial Park
Residential Zone Types
   1. Settlement:
   * The smallest residential zone.
   * Each level unlocks housing for 1 non-NFT crewmen.
   * Upon reaching Level 5, it can be converted into a Specialized Settlement (e.g., fishing, coconut, citrus, cotton, tobacco, sugar cane, grain, pig farming).
   2. Village:
   * Offers a balance between agricultural and other functionalities.
   * Unlocks both Farming/Forestry Buildings and Crafting Buildings at various levels.
   3. Craftsmen's Settlement:
   * Focused on crafting and production.
   * Unlocks multiple Crafting Buildings across levels.
   4. Fishing Village:
   * Specializes in maritime activities.
   * Unlocks Maritime Buildings and supports fishing operations.
   5. Mining Settlement:
   * Dedicated to mining activities.
   * Unlocks Mines and supports resource extraction.
   6. More zones can added in future
Residential Zone Upgrades
Settlement
   * Level 1: Unlocks 1 Farming or Forestry Building
   * Level 2: Unlocks 1 Farming or Forestry Building
   * Level 3: Unlocks 1 Farming or Forestry Building
   * Level 4: Unlocks 1 Farming or Forestry Building
   * Level 5: Unlocks 1 Tier 1 Maritime Building
Village
   * Level 1: Unlocks 1 Farming or Forestry Building and 1 Crafting Building
   * Level 2: Unlocks 1 Farming or Forestry Building and 1 Tier 1 Maritime Building
   * Level 3: Unlocks 1 Farming or Forestry Building and 1 Crafting Building
   * Level 4: Unlocks 1 Farming or Forestry Building and 1 Tier 1 Maritime Building
   * Level 5: Unlocks 1 Farming or Forestry Building
Craftsmen's Settlement
   * Levels 1-4: Each level unlocks 1 Crafting Building
   * Level 5: Unlocks 1 Farming or Forestry Building
Fishing Village
   * Level 1: Unlocks 1 Tier 1 Maritime Building
   * Level 2: Unlocks 1 Farming or Forestry Building
   * Levels 3-4: Each level unlocks 1 Crafting Building
   * Level 5: Unlocks 1 Tier 2 Maritime Building
Mining Settlement
   * Level 1: Unlocks 1 Mine
   * Level 2: Unlocks 1 Crafting Building
   * Levels 3-5: Each level unlocks 1 Mine
Perks and Benefits
   * Upgrading residential zones unlocks perks such as:
   * Additional housing for non-NFT helpers.
   * Ability to construct specialist buildings.
   * Special functionalities (e.g., sending extra non-NFT rowing or sailing boats to boost fishing, additional trade slots).
   * The type and level of the residential zone influence the maximum number of non-NFT helpers and the types and quantities of specialist buildings that can be constructed.
Specialist Buildings
Types of Specialist Buildings
Specialist buildings are categorized into the following types:
   1. Farming and Forestry (including food processing) 
   * Examples:
   * Basic farm - Does not require any building to construct, each assigned Pirate/Inhabitant takes one in sile slot and allows Pirate to farm resources
   * Farms and Plantations: Only on special resource plots with specific crops.
   * Processing Facilities: Mill, Bakery, Slaughterhouse, Food Processing Plant.
   * Resource Gathering: Forester's Lodge, Hunter's Hut (only on wild game plots).
   * Others: Citrus Orchard, Coconut Orchard, Charcoal Pile, Sawmill.
   2. Maritime (each divided into 4 tiers)
   * Examples:
   * Shipyard
   * Port
   * Fishery
   * Fish Farm: Only on special resource plots with fish.
   3. Mining
   * Examples:
   * Mine: Only on special resource plots with mineral resources.
   * Open-Pit Mine: Only on special resource plots.
   * Quarry: Only on special resource plots.
   4. Crafting
   * Examples:
   * Lead Bullet Workshop
   * Gunpowder Workshop
   * Cooper's Workshop
   * Crate Manufacturing Workshop
   * Blacksmith
   * Gunsmith Shop
   5. Industrial: To be detailed in future development phases.
   6. Licensed: To be detailed in future development phases.
   7. Defensive (Forts and Coastal Fortifications): To be detailed in future development phases.
Tiers of Specialist Buildings
   * Tiers represent the advancement level of Maritime and Defensive buildings.
   * Divided into 4 tiers, with higher tiers offering enhanced capabilities and outputs.


Detailed Breakdown of Specialist Buildings:
1. Farming and Forestry
   * Basic Farms: These are the foundation for food production and basic resource gathering. They don't require specific buildings to operate, but each worker (pirate or helper) can farm and produce resources.
   * Plantations and Orchards: These buildings can only be built on special resource plots. For example, cotton plantations must be on cotton-designated plots.
   * Example: Cotton Plantation (Level 1-5) produces cotton per level, with efficiency bonuses for resource-specific plots.
   * Food Processing: Buildings like mills, bakeries, and slaughterhouses convert raw resources (grain, pigs, etc.) into processed goods (flour, bread, meat).
   * Resource Gathering: Buildings such as the Forester's Lodge or Hunter's Hut allow for sustainable resource gathering (e.g., wood or wild animals) in forests or wild game plots.
2. Maritime
Maritime buildings unlock naval capabilities, including:
   * Shipyards: These allow the construction of ships, with higher tiers producing larger, more capable vessels.
   * Example: Shipyard Tier-1 produces small ships like longboats, while Tier-4 enables the construction of large ships like galleons.
   * Ports and Harbors: These buildings manage your fleet, allowing docking and providing bonus slots for trade.
   * Fishery and Fish Farms: These can only be built on water plots with fish resources. Higher-tier fisheries increase fish output and efficiency.
   * Example: Fishery Tier-1 produces X fish per day, while Fishery Tier-4 can manage 16 fish production slots.
3. Mining
Mining is a vital part of your game's economy, focusing on resource extraction:
   * Mines (Gold, Iron, Coal, etc.): These buildings extract valuable resources from land plots marked with the respective resource. Higher-level mines increase efficiency and yield.
   * Example: An Iron Mine increases iron production by 5% per level, up to Level 5, and requires regular resources (like wood, coal) for operation.
   * Quarries: Used to extract stone or other raw materials.
   * Open-Pit Mines: Likely a more advanced version for extracting larger quantities from rare resource plots.
4. Crafting
Crafting buildings are essential for producing more advanced items, tools, and even weapons.
   * Workshops: Basic crafting structures like the Lead Bullet Workshop or Blacksmith produce essential items (bullets, tools, etc.).
   * Advanced Crafting: Buildings like the Gunpowder Workshop and Cooper's Workshop support the creation of key strategic resources (e.g., gunpowder, barrels), necessary for trade or warfare.
   * Example: Blacksmith Level-1 allows simple crafting like melee weapons or tools, whereas Level-5 enables advanced weaponry production.
5. Industrial
Industrial buildings handle large-scale resource refinement.
   * Smelters (Copper, Tin, Iron, Gold): These are used to refine raw ores into usable bars for crafting, trade, or construction.
   * Example: Ironworks refines iron ore into iron bars, required for creating advanced tools or buildings.
   * Bronze Foundry: Combines tin and copper to produce bronze, often required for higher-level military or crafting buildings.
6. Licensed Buildings
These buildings unlock higher-level gameplay mechanics that tie into the game's economy.
   * Distillery: Produces RUM, one of the core resources in the game, possibly linked to NFT mechanics or blockchain interactions.
   * Mint: Produces in-game currency ($ARRC), playing a pivotal role in the game's economy and resource trade.
   * Bank: Unlocks DeFi-like mechanics, allowing for staking or trading resources like RUM.
7. Defensive Buildings (Future Development)
Defensive structures like forts and coastal defenses are not yet fully detailed but will likely offer protection against enemy attacks or NPC raids, providing strategic advantages in multiplayer environments.
Tiers of Specialist Buildings:
Specialist buildings, particularly in the Maritime and Defensive categories, are divided into 4 tiers, representing the advancement level and capabilities of each building:
   * Tier 1: Basic functionality, often producing a limited number of units (e.g., small ships, low fish output).
   * Tier 2: Enhanced production with more outputs (e.g., medium-sized ships, double fish production).
   * Tier 3: Larger capabilities with additional production slots (e.g., large ships, quintupling fish production).
   * Tier 4: Maximum capabilities and resource efficiency, often with unique advantages or bonuses (e.g., faster ship production or strategic defense bonuses).
Considerations for Specialist Buildings:
   1. Special Plots: Many specialist buildings, like farms, fisheries, and mines, require specific plots marked for that resource. This mechanic adds strategic depth, as players must find or conquer the right plots.
   2. Crewmen Assignments: Non-NFT helpers play a crucial role in manning specialist buildings, which increases production and efficiency. Without enough helpers, buildings may operate at lower efficiency or halt production entirely.
   3. Repair and Durability: Many specialist buildings can be damaged (e.g., during attacks), requiring repairs to maintain efficiency. Each tier likely increases the building's durability or provides more advanced defense options.


Building Mechanics
Building Durability and Repair
   * Buildings have durability levels.
   * They can be damaged due to:
   * Attacks from other players.
   * Random Events (e.g., natural disasters).
   * Repairs require the use of resources.
   * Maintaining building integrity is essential for continuous operation.
Non-NFT Helpers (crewmen)
   * Housing:
   * Non-NFT helpers require housing in residential zones.
   * Limitations:
   * The type and level of residential zones determine the maximum number of non-NFT helpers.
   * Roles:
   * Helpers can operate buildings, increasing production and efficiency.
________________


Future Developments
   * The world is currently in its basic development phase.
   * Higher levels of residential zones (Tier 3 and above) and additional building types will be introduced in later stages.
   * Future updates will include detailed information on:
   * Industrial Buildings
   * Licensed Buildings
   * Defensive Structures
________________


Appendices
Resource Requirements and Yield Formulas
   * Resource Requirements: Each building has specific resources needed for construction and upgrades. These will be detailed in the appendices, including any special plot requirements.
   * Yield Formulas: Buildings produce outputs based on formulas that consider building level, assigned crew, and other factors like pirate skills and attributes.
Example of Daily Check-In and Rewards
   * Daily Check-In Example:
   * A player checks in daily for 7 days, earning 1 Activity Point each day.
   * On the 7th day, they receive a bonus, increasing their resource yield by 10%.
   * Rewards:
   * Based on reputation and streak length, players receive weekly rewards from the king, such as crewmen, tools, or building materials.
Rewards come in different tiers, and random weights determine the amount of goods and crew members.

Resource Requirements
   * Detailed resource requirements for constructing each building will be provided in the appendix.
   * Includes the types and quantities of resources needed.
   * Special Note: Some buildings require specific resources and can only be built on special resource plots.
Building Outputs
   * Specific outputs (yields) for each building will be documented.
   * Helps in planning resource production and management.
ARRC Reward Formula
Player's Reward=(Player's AccrualsTotal Accruals)×Total ARRC RewardsPlayer's Reward=(Total AccrualsPlayer's Accruals​)×Total ARRC Rewards
Daily Check-In Example
   * Player checks in daily for 7 days, earns a 7-day bonus increasing resource yield by 10%.
________________


Technical Considerations
Security and Upgradability
   * Access Control:
   * Implement role-based access using tools like OpenZeppelin's AccessControl.
   * Reentrancy Guards:
   * Use protections like OpenZeppelin's ReentrancyGuard to prevent double-spending attacks.
   * Upgradability:
   * Consider proxy patterns to allow for future contract upgrades.
Randomness Handling
   * Random Elements:
   * Combat and reputation outcomes may involve randomness.
   * Random Number Generation:
   * Use secure methods to generate random numbers, ensuring fairness and preventing manipulation.
________________





Crew Performance
Non-NFT crewmen have specific performance stats in various activities:
   * Peasants:
   * Farming: 1
   * Fishing: 1
   * Woodpicking: 1
   * Building: 1
   * Defense: 1
   * Workers:
   * Woodcutting: 1
   * Mining: 1
   * Quarrying: 1
   * Excavation: 1
   * Building: 2
   * Abordage: 1
   * Defense: 2
   * Bombarding: 1
   * Craftsmen:
   * Crafting: 2
   * Building: 2
   * Defense: 1
   * Bombarding: 2
   * Sailors:
   * Can be counted as ship crew
   * Abordage: 1
   * Defense: 2
   * Bombarding: 1
   * Soldiers:
   * Abordage: 2
   * Defense: 3
   * Bombarding: 1
   * Shooting: 2
   * Corsairs:
   * Can be counted as ship crew
   * Abordage: 3
   * Defense: 2
   * Bombarding: 2
   * Shooting: 1
   * Pirates:
   * Can be counted as ship crew
   * Abordage: 3
   * Defense: 2
   * Bombarding: 2
   * Shooting: 2
   * Young Pirates:
   * Can be counted as ship crew
   * Farming: 1
   * Fishing: 1
   * Woodpicking: 1
   * Building: 1
   * Crafting: 1
   * Abordage: 2
   * Defense: 2
   * Bombarding: 1
   * Shooting: 1
Note: "Abordage" refers to boarding actions during sea battles.
Crew Score
   * Base Crew Score:
   * Inhabitant Citizen: 3 Crewmen.
   * Inhabitant Pirate: 5 Crewmen.
   * Genesis Pirate: 8 Crewmen.
   * Respect:
   * Each point allows a pirate commander to lead one additional NFT Pirate on a ship.