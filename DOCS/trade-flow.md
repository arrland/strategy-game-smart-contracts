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

Before a ship can embark on a trading mission, it must be "staked," which means it's officially ready for action along with its crew:

1.  **Stake Ship and Assign Crew**:
    ```
    function stakeShipAndPirates(
        uint256 shipId,
        uint256 captainPirateId,
        address captainCollectionAddress,
        uint256[] calldata genesisCrewIds,
        uint256[] calldata inhabitantCrewIds,
        uint256 homeIslandId,
        string calldata shipClass
    )
    ```
    - This single action registers the ship as "active" in the game world and assigns its captain and crew.
    - The ship owner must own the ship NFT, and the pirates (captain and crew) must also be valid NFTs owned by the user.
    - The ship becomes available for missions, ready to sail from its designated `homeIslandId`.

2.  **Validate Crew Requirements**:
   - Ships have minimum and maximum crew requirements
   - Crew is validated using `validateCrewRequirements` function
   - Insufficient crew will prevent mission participation

## 1.A. Ship Docking: Arriving at an Island

While not a direct part of a *trade transaction* itself, a ship needs to be "at" an island to interact with it, whether it's the ship's home base or a destination for a mission.

- **Being at an Island:** When a ship is staked via `ShipAndPirateStaking.stakeShipAndPirates()`, it's assigned a `homeIslandId`. This is its primary base.
- **Docking Slots:** Islands have a limited number of "docking slots" managed by the `DockingManagement` contract. When a ship is staked and its `homeIslandId` is set, it effectively occupies one of these slots on its home island.
- **Arriving for Missions:** When a ship undertakes a mission (like a Trade Mission) to another island, its arrival at the destination island is tracked by the mission contract. The act of "docking" at a destination island for a mission is usually an implicit part of the mission's progression (e.g., reaching `outboundEndTime`). There isn't typically a separate, manual "dock" action a player takes at a mission destination; the mission logic handles the ship's presence there.
- **Leaving an Island:** When a ship departs on a mission, it conceptually leaves its dock. If it's undocked entirely (see Rebasing), it frees up its slot.

## 1.B. Ship Rebasing: Changing Your Home Island

Sometimes, a captain might want to move their base of operations to a new island. This is called "rebasing."

1.  **Unstake from Old Island First (Implicit):**
    *   To rebase, the ship typically needs to be in a state where it can change its home base. The `ShipAndPirateStaking.rebaseShip()` function handles this.
    *   This function updates the ship's `homeIslandId` in the `ShipAndPirateStaking` contract.

2.  **Rebase Ship to New Island**:
    ```
    function rebaseShip(uint256 shipId, uint256 newIslandId, string calldata shipClass)
    ```
    - The ship owner calls this function on `ShipAndPirateStaking`.
    - It changes the ship's registered `homeIslandId` to the `newIslandId`.
    - The `DockingManagement` contract is updated:
        - The ship is removed from its docking slot on the old island.
        - The ship attempts to secure a docking slot on the `newIslandId`. If no slot is available, the rebase might fail or be queued, depending on game rules.
    - This action might have an ARRC fee, processed by `FeeManagement`.
    - There might also be a cooldown period associated with rebasing, managed by `CooldownManager`, to prevent players from changing home islands too frequently.

- **Effect on Missions:** A ship must typically be at its home island and not on an active mission to initiate a rebase.

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

1. Island owner must have sufficient ARRC tokens.
2. The total ARRC amount (price × quantity) is sent by the island owner to the `TradeManager` contract. The `TradeManager` then securely locks these ARRC tokens in a special contract called `ArrcLocking` until the trade is completed or canceled.
3. A trade order is created specifying what resources the island wants to buy.
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
1. ARRC tokens are transferred from the ship owner to the island owner (seller).
2. Resources are transferred from the `MarketPlaceStorage` (where the island initially placed them) directly into the ship's own storage, ready for the journey back.
3. Trade order quantity is reduced by the traded amount.

#### For Ship Selling Resources (Island's Buy Order):
1. Resources are transferred from the ship's storage to the island's storage.
2. The ARRC tokens, which were previously locked by the `TradeManager` in the `ArrcLocking` contract on behalf of the island owner, are prepared for transfer.
3. Trade order quantity is reduced by the traded amount.

### Return Journey (Trading Island to Home Island)

Once the trade at the destination island is done, the ship needs to bring its newly acquired goods (if buying) or its payment (if selling) back to its original port.

1.  **New Mission for the Return Trip**:
    *   The `TradeMission` cleverly starts a *new, separate mission* for the return journey. This is often a `ResourceTransferMission`.
    *   If the ship bought resources, this new mission is about transferring those resources from the ship's current location (the trading island) back to its home island.
    *   If the ship sold resources, this new mission is about bringing the ARRC payment (which was held in `ArrcLocking`) back to the ship owner at their home island.

2.  **Traveling Home**:
    *   The ship enters this "Inbound" journey state, managed by the new mission.
    *   Another travel period begins, usually similar in duration to the outbound trip.
    *   The ship must wait until the `endTime` of this return mission is reached.

3.  **Mission Completion (Back at Origin Island)**:
    *   When the ship arrives back at its origin island and the return mission (`ResourceTransferMission`) is completed:
        *   If the ship bought resources, these are now fully secured and accounted for at the origin island (often implicitly, as they were already put in the ship's storage at the trade island and the `ResourceTransferMission` just formalizes their "delivery" to the origin).
        *   If the ship sold resources, the ARRC tokens (payment) are unlocked from `ArrcLocking` and transferred to the ship owner.
    *   The ship's main resources and the ship itself are fully unlocked from the overall `TradeMission`, making them available for new adventures.
    *   The original `TradeMission` is then marked as completed.

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
   - Player calls `startMission` on `MissionsManager`.
   - `MissionsManager` finds the correct `TradeMission` contract and tells it to `startMission`.
   - The `TradeMission` validates the trade, prepares resources/ARRC. If the ship is buying, its ARRC is locked. If selling, its resources are virtually earmarked.
   - Ship begins its outbound journey, and its resources are locked by `MissionResourceHandler`.

3. **Trade Execution (Advancing the Mission)**:
   - When the outbound journey time is up, the player calls `advanceMission` on the `TradeMission` contract.
   - `TradeMission` then calls `TradeManager.completeTrade` to handle the actual swap of resources for ARRC (or ARRC for resources).
     - If the ship is buying: ARRC goes from ship owner to island owner; resources go from `MarketPlaceStorage` to the ship's storage.
     - If the ship is selling: Resources go from ship's storage to island; ARRC is moved from the island owner's locked stash in `ArrcLocking` and prepared for the ship owner.
   - After the trade, `TradeMission` initiates a new `ResourceTransferMission` for the return journey to bring the acquired goods/payment back to the ship's origin island.

4. **Mission Completion (Finalizing the Entire Trade)**:
   - When the return journey (`ResourceTransferMission`) completes (player calls its `completeMission` function), the goods/ARRC are officially delivered to the origin.
   - Then, the player calls `completeEntireTradeMission` on the original `TradeMission` contract.
   - This final step unlocks the ship and its general resources via `MissionResourceHandler`. If the ship sold goods, the ARRC payment from `ArrcLocking` is now transferred to the ship owner.
   - The `TradeMission` is marked as fully done.

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



# Pirate's Tale: Trading in Arrland

*[Scene: A weathered pirate captain, One-Eyed Jack, slams his tankard on the tavern table, silencing the chattering patrons. He grins, a gold tooth glinting in the dim light.]*

Arr mateys, gather 'round, and let an old salt spin ye a yarn about the life of a true Arrland trader! Forget yer dusty maps and buried chests – the real gold flows on the tides of commerce!

First things first, ye can't just sail off on a whim. Ye need a sturdy ship, aye, but more importantly, a loyal crew and a captain – that's likely you, ye ambitious dog! Ye take yer ship NFT, yer pirate NFTs – yer captain and yer hearties – and ye stake 'em all together in the `ShipAndPirateStaking` contract. That tells the world yer open for business, ready to set sail from yer chosen `homeIslandId`! When ye stake yer ship, it snags a spot at the island's docks, thanks to the `DockingManagement` system. Every island only has so many spots, mind ye!

*[Jack pauses, taking a swig of his grog]*

Now, what if ye fancy a change of scenery? Say, another island looks more profitable? That's called 'rebasing,' me lads. Ye tell the `ShipAndPirateStaking` contract ye want to `rebaseShip` to a new island. It'll check with `DockingManagement` to see if there's a free slot at the new port. If there is, ye pay yer ARRC fee, wait out any cooldowns the `CooldownManager` slaps on ye, and yer ship has a new home! But ye can't be off on a mission when ye decide to pack up and move, savvy?

*[Jack leans forward, voice dropping to a conspiratorial whisper]*

Now, the islands, they be the heart of it all. Some island barons are flush with goods, lookin' to sell. Others are desperate for supplies, ready to buy with a fistful of ARRC – that's our shiny game currency, savvy? An island owner posts their offer on the `TradeManager`. If they're sellin', their goods go into the `MarketPlaceStorage` for safekeeping. If they're buyin', their ARRC gets sent to the `TradeManager`, who then locks it tight in the `ArrcLocking` strongbox. No cheeky bilgesneaking their treasure!

*[He gestures expansively with his hooked hand]*

So, ye spot a rich trade. What next? Ye tell the `MissionsManager` ye want to start a `TradeMission`! If ye be buyin', yer own ARRC gets locked up. If ye be sellin', the `MissionResourceHandler` makes sure yer cargo is reserved. Then, it's anchors aweigh! Off ye sail on the outbound journey to the trading island. The `TravelTimeCalculator` figures out how long it'll take – no shortcuts on the high seas!

When ye finally drop anchor, it's time for business! Ye call `advanceMission`. The `TradeManager` steps in. If ye bought goods, ARRC from yer stash goes to the islander, and their wares from `MarketPlaceStorage` get loaded right into yer ship! If ye sold 'em goods, yer cargo goes to the island, and their ARRC, which was sittin' in `ArrcLocking`, is now earmarked for ye.

But the tale ain't over! The `TradeMission` is a clever beast – it then kicks off a *new* `ResourceTransferMission` to get yer loot or yer payment back to yer home port! Another journey, another wait.

Once yer back in familiar waters, and that `ResourceTransferMission` is done, ye signal the main `TradeMission` again by calling `completeEntireTradeMission`. Yer ship and any leftover resources are unlocked by the `MissionResourceHandler`. If ye sold goods, that sweet ARRC payment from `ArrcLocking` finally lands in yer coffers! The `TradeMission` is done!

*[Jack stands, raising his tankard, eyes gleaming with adventure]*

And remember this, ye scallywags! Each island has its own rules. Some might need a fancy Trading Post for many deals, but every island owner gets one free trade offer to start. But one thing's for certain – when ye complete a successful trade, the ARRC tokens flow, and that's what makes a pirate's life worthwhile!

*[He drains his tankard]*

So, learn the ropes, watch the winds, and may yer holds always be heavy with bounty! To profitable trades and safe journeys, mates! 🏴‍☠️