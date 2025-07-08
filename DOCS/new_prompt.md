Create an engaging, visually appealing infographic that explains how the trading system works in our blockchain strategy game. The infographic should be easily understood by non-technical players and illustrate the complete trading process from both island owner and ship captain perspectives.

## Target Audience
- Game players with no blockchain or technical knowledge
- Visual learners who prefer graphical explanations over text
- New players trying to understand the game's economy

## Important Notes

1. Avoid technical terms like "smart contracts," "functions," or "blockchain"
2. Don't include code snippets or function names
3. Focus on the player experience rather than implementation details
4. Use metaphors that maritime/pirate game players would understand
5. Make it fun and exciting - trading should feel like an adventure!
6. Never use word credits or gold ALWAYS use ARRC tokens for this

## Example Narrative Flow

"Island owners post trade offers at their harbors → Ship captains discover these opportunities → Ships journey to trading islands → Goods and ARRC tokens change hands → Ships return home with profits or valuable cargo → Both islands and ships prosper through trade!"

The infographic should tell this story visually, making the trading system intuitive and appealing to players. 

# Trade Flow in the Strategy Game

This document outlines the complete process for trading in the blockchain strategy game, covering both buy and sell trade flows from the perspectives of island owners and ship captains.

## Overview

The trading system in the game involves multiple components:
- Ships and pirates must be staked (prepared for missions)
- Island owners create trade offers (buy or sell orders)
- Ship captains initiate trade missions to fulfill these orders
- Resources and ARRC tokens (the game's currency) are exchanged

The system allows for two types of trade:
1. **Ship Buying**: Ship purchases resources from an island (island's sell order)
2. **Ship Selling**: Ship sells resources to an island (island's buy order)

## Prerequisites

Before trading can occur, several requirements must be met:

### Island Requirements
- **For Islands Creating Offers (Important Clarification):**
  - A trading post building is required to create multiple trade offers
  - Each island owner gets 1 free trade offer they can create without having a trading post
  - Island owners need ARRC tokens to create buy orders
  - Islands need resources in storage to create sell orders

- **For Source Islands (Where Ships Depart From):**
  - No trading post building is required
  - Ships can depart from any island regardless of buildings

### Ship Requirements
- Ships must be staked in the `ShipAndPirateStaking` contract
- Each ship needs at least one pirate (captain) assigned
- Ships need sufficient cargo capacity for resources being traded
- Ship owners need ARRC tokens to buy resources

## 1. Ship and Pirate Staking Process

Before a ship can embark on a trading mission, it must be staked:

1. **Stake Ship**:
   ```
   function stakeShip(uint256 shipId)
   ```
   - Registers the ship as "active" in the game world
   - Ship owner must own the corresponding NFT
   - Ship becomes available for missions

2. **Stake Pirates**:
   ```
   function stakePirate(uint256 pirateId, uint256 shipId)
   ```
   - Assigns a pirate to the ship
   - The first pirate becomes the captain
   - Additional pirates can be added to increase crew size

3. **Validate Crew Requirements**:
   - Ships have minimum and maximum crew requirements
   - Crew is validated using `validateCrewRequirements` function
   - Insufficient crew will prevent mission participation

## 2. Creating Trade Offers (Island Owner)

Island owners can create two types of trade offers:

### Sell Offer (Island Selling Resources)
```
function createTradeOrder(
    uint256 islandId,
    string memory resourceType,
    uint256 resourceAmount,
    uint256 arrcPrice
)
```

1. Island owner must have the required resources in their storage
2. Resources are transferred to the `MarketPlaceStorage` contract
3. A trade order is created with details about resource type, amount, and price
4. The trade order is added to the island's active trades

### Buy Offer (Island Buying Resources)
```
function createIslandBuyOrder(
    uint256 islandId,
    string memory resourceType,
    uint256 resourceAmount,
    uint256 arrcPrice
)
```

1. Island owner must have sufficient ARRC tokens
2. The total ARRC amount (price × quantity) is temporarily locked in the contract
3. A trade order is created specifying what resources the island wants to buy
4. The trade order is added to the island's active trades

## 3. Initiating Trade Missions (Ship Captain)

When a ship captain wants to trade with an island:

1. **Find Trade Opportunities**:
   - Query available trade orders using `getActiveTradeOrders(islandId)`
   - Get trade details with `getTradeOrder(tradeOrderId)`

2. **Start Trade Mission**:
   - Mission Manager initiates the mission:
   ```
   function startMission(
       uint256 shipId,
       MissionType missionType, // Set to Trade
       bytes calldata missionData // Contains trade details
   )
   ```

3. **Trade Mission Process**:
   - The `TradeMission` contract manages the trade journey
   - Mission data includes origin island, destination island, trade order ID, and resource amounts
   - Ship is locked for the duration of the mission
   - Travel time is calculated based on ship speed and distance

## 4. Trade Execution Flow

### Outbound Journey (Ship to Trading Island)

1. **Preparation**:
   - Ship's cargo is locked for the mission duration
   - For buy offers: ARRC tokens are locked in the `ArrcLocking` contract
   - For sell offers: Resources on ship are verified

2. **Traveling**:
   - Ship enters "Outbound" journey state
   - Travel time is based on distance and ship speed
   - Ship must wait until `outboundEndTime` is reached

### Trade Completion (At Trading Island)

When the ship reaches the trading island:

#### For Ship Buying Resources (Island's Sell Order):
1. ARRC tokens are transferred from the ship owner to the island owner
2. Resources are transferred from `MarketPlaceStorage` to the ship
3. Trade order quantity is reduced by the traded amount

#### For Ship Selling Resources (Island's Buy Order):
1. Resources are transferred from the ship to the island
2. ARRC tokens are transferred to the `ArrcLocking` contract
3. Trade order quantity is reduced by the traded amount

### Return Journey (Trading Island to Home Island)

1. **Preparation**:
   - Ship enters "Inbound" journey state
   - Another travel period begins with similar duration to outbound
   - Ship must wait until `inboundEndTime` is reached

2. **Mission Completion**:
   - When the ship returns to its origin island
   - For sell offers: ARRC tokens are unlocked and transferred to the ship owner
   - Ship resources are unlocked, making them available for use
   - Mission is marked as completed

## 5. Canceling Trade Orders

Island owners can cancel their trade offers if they haven't been fulfilled:

```
function cancelTradeOrder(uint256 tradeOrderId)
```

1. For sell orders: remaining resources are returned to the island
2. For buy orders: locked ARRC tokens are returned to the island owner
3. The trade order is marked as inactive

## Technical Flow Details

1. **Trade Offer Creation**:
   - Island owner calls `createTradeOrder` or `createIslandBuyOrder`
   - `TradeManager` validates requirements and creates the order
   - Resources or ARRC are moved to escrow storage

2. **Trade Mission Initiation**:
   - Player calls `startMission` on `MissionsManager`
   - `MissionsManager` delegates to `TradeMission.startMission`
   - Trade is validated and resources/ARRC are prepared
   - Ship begins outbound journey

3. **Trade Execution**:
   - When outbound journey completes, `advanceMission` or `completeMission` is called
   - `TradeManager.completeTrade` handles the actual trade
   - Resources and ARRC tokens change hands
   - Ship begins return journey

4. **Mission Completion**:
   - When return journey completes, `completeEntireTradeMission` is called
   - Ship and resources are unlocked
   - Any ARRC tokens held in escrow are released

## Common Requirements and Constraints

1. **Ship Capacity**:
   - Ships have limited cargo capacity based on their metadata
   - Capacity is managed by `ShipStorage.getStorageCapacity`

2. **Island Requirements**:
   - Islands creating trade offers need trading posts for multiple offers (with one free offer allowed)
   - Island storage has capacity limits for resources

3. **Resource Types**:
   - Resource types are validated by string comparison
   - Type names are limited to 32 bytes

4. **Mission Duration**:
   - Travel time depends on distance and ship speed
   - Both outbound and return journeys consume time
   - Total mission duration is the sum of both journeys

5. **Error Handling**:
   - Various validations ensure trade integrity
   - Transactions revert with descriptive error messages when requirements aren't met

## User Experience Considerations

1. **Island Owners**:
   - Create trade offers based on resources needed or available
   - Monitor active trades and manage inventory/ARRC balance
   - Cancel trades that are no longer desirable

2. **Ship Captains**:
   - Stake ships and pirates to prepare for missions
   - Search for profitable trade opportunities
   - Manage ship cargo capacity and journey times
   - Execute trades to earn ARRC tokens or acquire resources

By following this flow, players can engage in the trading system to exchange resources for ARRC tokens, facilitating economic activity within the game world. # Trade Flow in the Strategy Game

This document outlines the complete process for trading in the blockchain strategy game, covering both buy and sell trade flows from the perspectives of island owners and ship captains.

## Overview

The trading system in the game involves multiple components:
- Ships and pirates must be staked (prepared for missions)
- Island owners create trade offers (buy or sell orders)
- Ship captains initiate trade missions to fulfill these orders
- Resources and ARRC tokens (the game's currency) are exchanged

The system allows for two types of trade:
1. **Ship Buying**: Ship purchases resources from an island (island's sell order)
2. **Ship Selling**: Ship sells resources to an island (island's buy order)

## Prerequisites

Before trading can occur, several requirements must be met:

### Island Requirements
- **For Islands Creating Offers (Important Clarification):**
  - A trading post building is required to create multiple trade offers
  - Each island owner gets 1 free trade offer they can create without having a trading post
  - Island owners need ARRC tokens to create buy orders
  - Islands need resources in storage to create sell orders

- **For Source Islands (Where Ships Depart From):**
  - No trading post building is required
  - Ships can depart from any island regardless of buildings

### Ship Requirements
- Ships must be staked in the `ShipAndPirateStaking` contract
- Each ship needs at least one pirate (captain) assigned
- Ships need sufficient cargo capacity for resources being traded
- Ship owners need ARRC tokens to buy resources

## 1. Ship and Pirate Staking Process

Before a ship can embark on a trading mission, it must be staked:

1. **Stake Ship**:
   ```
   function stakeShip(uint256 shipId)
   ```
   - Registers the ship as "active" in the game world
   - Ship owner must own the corresponding NFT
   - Ship becomes available for missions

2. **Stake Pirates**:
   ```
   function stakePirate(uint256 pirateId, uint256 shipId)
   ```
   - Assigns a pirate to the ship
   - The first pirate becomes the captain
   - Additional pirates can be added to increase crew size

3. **Validate Crew Requirements**:
   - Ships have minimum and maximum crew requirements
   - Crew is validated using `validateCrewRequirements` function
   - Insufficient crew will prevent mission participation

## 2. Creating Trade Offers (Island Owner)

Island owners can create two types of trade offers:

### Sell Offer (Island Selling Resources)
```
function createTradeOrder(
    uint256 islandId,
    string memory resourceType,
    uint256 resourceAmount,
    uint256 arrcPrice
)
```

1. Island owner must have the required resources in their storage
2. Resources are transferred to the `MarketPlaceStorage` contract
3. A trade order is created with details about resource type, amount, and price
4. The trade order is added to the island's active trades

### Buy Offer (Island Buying Resources)
```
function createIslandBuyOrder(
    uint256 islandId,
    string memory resourceType,
    uint256 resourceAmount,
    uint256 arrcPrice
)
```

1. Island owner must have sufficient ARRC tokens
2. The total ARRC amount (price × quantity) is temporarily locked in the contract
3. A trade order is created specifying what resources the island wants to buy
4. The trade order is added to the island's active trades

## 3. Initiating Trade Missions (Ship Captain)

When a ship captain wants to trade with an island:

1. **Find Trade Opportunities**:
   - Query available trade orders using `getActiveTradeOrders(islandId)`
   - Get trade details with `getTradeOrder(tradeOrderId)`

2. **Start Trade Mission**:
   - Mission Manager initiates the mission:
   ```
   function startMission(
       uint256 shipId,
       MissionType missionType, // Set to Trade
       bytes calldata missionData // Contains trade details
   )
   ```

3. **Trade Mission Process**:
   - The `TradeMission` contract manages the trade journey
   - Mission data includes origin island, destination island, trade order ID, and resource amounts
   - Ship is locked for the duration of the mission
   - Travel time is calculated based on ship speed and distance

## 4. Trade Execution Flow

### Outbound Journey (Ship to Trading Island)

1. **Preparation**:
   - Ship's cargo is locked for the mission duration
   - For buy offers: ARRC tokens are locked in the `ArrcLocking` contract
   - For sell offers: Resources on ship are verified

2. **Traveling**:
   - Ship enters "Outbound" journey state
   - Travel time is based on distance and ship speed
   - Ship must wait until `outboundEndTime` is reached

### Trade Completion (At Trading Island)

When the ship reaches the trading island:

#### For Ship Buying Resources (Island's Sell Order):
1. ARRC tokens are transferred from the ship owner to the island owner
2. Resources are transferred from `MarketPlaceStorage` to the ship
3. Trade order quantity is reduced by the traded amount

#### For Ship Selling Resources (Island's Buy Order):
1. Resources are transferred from the ship to the island
2. ARRC tokens are transferred to the `ArrcLocking` contract
3. Trade order quantity is reduced by the traded amount

### Return Journey (Trading Island to Home Island)

1. **Preparation**:
   - Ship enters "Inbound" journey state
   - Another travel period begins with similar duration to outbound
   - Ship must wait until `inboundEndTime` is reached

2. **Mission Completion**:
   - When the ship returns to its origin island
   - For sell offers: ARRC tokens are unlocked and transferred to the ship owner
   - Ship resources are unlocked, making them available for use
   - Mission is marked as completed

## 5. Canceling Trade Orders

Island owners can cancel their trade offers if they haven't been fulfilled:

```
function cancelTradeOrder(uint256 tradeOrderId)
```

1. For sell orders: remaining resources are returned to the island
2. For buy orders: locked ARRC tokens are returned to the island owner
3. The trade order is marked as inactive

## Technical Flow Details

1. **Trade Offer Creation**:
   - Island owner calls `createTradeOrder` or `createIslandBuyOrder`
   - `TradeManager` validates requirements and creates the order
   - Resources or ARRC are moved to escrow storage

2. **Trade Mission Initiation**:
   - Player calls `startMission` on `MissionsManager`
   - `MissionsManager` delegates to `TradeMission.startMission`
   - Trade is validated and resources/ARRC are prepared
   - Ship begins outbound journey

3. **Trade Execution**:
   - When outbound journey completes, `advanceMission` or `completeMission` is called
   - `TradeManager.completeTrade` handles the actual trade
   - Resources and ARRC tokens change hands
   - Ship begins return journey

4. **Mission Completion**:
   - When return journey completes, `completeEntireTradeMission` is called
   - Ship and resources are unlocked
   - Any ARRC tokens held in escrow are released

## Common Requirements and Constraints

1. **Ship Capacity**:
   - Ships have limited cargo capacity based on their metadata
   - Capacity is managed by `ShipStorage.getStorageCapacity`

2. **Island Requirements**:
   - Islands creating trade offers need trading posts for multiple offers (with one free offer allowed)
   - Island storage has capacity limits for resources

3. **Resource Types**:
   - Resource types are validated by string comparison
   - Type names are limited to 32 bytes

4. **Mission Duration**:
   - Travel time depends on distance and ship speed
   - Both outbound and return journeys consume time
   - Total mission duration is the sum of both journeys

5. **Error Handling**:
   - Various validations ensure trade integrity
   - Transactions revert with descriptive error messages when requirements aren't met

## User Experience Considerations

1. **Island Owners**:
   - Create trade offers based on resources needed or available
   - Monitor active trades and manage inventory/ARRC balance
   - Cancel trades that are no longer desirable

2. **Ship Captains**:
   - Stake ships and pirates to prepare for missions
   - Search for profitable trade opportunities
   - Manage ship cargo capacity and journey times
   - Execute trades to earn ARRC tokens or acquire resources

By following this flow, players can engage in the trading system to exchange resources for ARRC tokens, facilitating economic activity within the game world. 
