## TASK-DOCK-REBASE: Add Docking and Rebasing (Change Base Island) to ShipAndPirateStaking
Status: Completed 
Priority: High  
PRD Reference: @{docs/PRD-missios.md}  
Architectural Module: ShipAndPirateStaking, Docking/PortManagement, IslandStorage, FeeManagement  
Dependencies: Docking/PortManagement, IslandRegionManagement, IIslandStorage, FeeManagement, Missions system

### 🔧 Implementation Plan
- [x] Design and deploy `Docking/PortManagement` contract:
  - [x] Track docked ships per island
  - [x] Enforce slot limits by island size/ports
  - [x] Allow different slot requirements per ship class:
        - Boats/Sailboats: 0 slots
        - Small ships: 1 slot
        - Medium ships: 2 slots
        - Large ships: 3 slots
  - [x] Expose query functions for docked ships/slots
  - [x] Restrict docking/undocking to authorized contracts
- [x] Add `homeIslandId` to `ShipInfo` in ShipAndPirateStaking
- [x] On ship staking, require user to specify `homeIslandId`
- [x] On staking, query Docking contract to check/allocate slots (using ship class for slot requirement)
- [x] On unstake, call Docking to free slots
- [x] On rebasing, call Docking to move slots between islands
- [x] On staking, burn 0.5 ARRC per NFT pirate (as now)
- [x] On rebasing, burn 0.1 ARRC per NFT pirate **(Blocked by TASK-FEE-REBASE)**
- [x] Add event: `ShipDocked(shipId, islandId, owner, timestamp)` (emit from Docking contract)
- [x] Add event: `ShipUndocked(shipId, islandId, owner, timestamp)` (emit from Docking contract)
- [x] Add event: `ShipRebased(shipId, oldIslandId, newIslandId, owner, timestamp)` (emit from Docking contract)
- [x] Add function to query docked ships per island (Docking contract)
- [x] Update tests: ShipAndPirateStaking.test.js and add Docking contract tests
  - [x] Test staking with home island assignment and slot enforcement (including slot rules per ship class)
  - [x] Test slot exhaustion and revert
  - [x] Test parallel ship moves and slot count consistency:
    - [x] Test multiple ships moving between islands in parallel
    - [x] Test slot count consistency on errors/reverts
  - [x] Test unstake decrements slot
  - [x] Test rebasing (with/without slot, ARRC fee, event)
  - [x] Test querying docked ships per island
- [x] Update status/log after each step

**Note:** Core logic for docking, slot requirements, staking/unstaking/rebasing integration, events, and associated tests are complete. Port upgrades are out of scope for this task. Remaining work focuses on edge case test coverage.

### ✅ Acceptance Criteria
1. Ships cannot be staked to an island with no available slots (enforced by Docking contract)
2. Slot requirements per ship class are enforced:
   - Sailboats: 0 slots
   - Small ships: 1 slot
   - Medium ships: 2 slots
   - Large ships: 3 slots
3. Staking burns correct ARRC fee and assigns home island
4. Unstaking frees up slot on island
5. Rebasing only possible if new island has slot, **burns correct ARRC fee (0.1 - Blocked by TASK-FEE-REBASE)**, and updates home island
6. All events are emitted as specified
7. Non-NFT boats can be docked with 0 slots, but can be captured
8. Tests cover all edge cases and pass

### 🧠 Edge Cases
- Staking to a full island (should revert)
- Rebasing to a full island (should revert)
- Unstaking and immediately restaking to same/different island
- Multiple ships moving between islands in parallel
- Slot count consistency on errors/reverts
- Only authorized contracts can dock/undock (access control)

---

**Current blockers:**
- **TASK-FEE-REBASE**: Implement correct ARRC fee burning (0.1) for ship rebasing in FeeManagement contract.

**Next Step:**
- Proceed with `TASK-FEE-REBASE`.
- After `TASK-FEE-REBASE` is complete, update `ShipAndPirateStaking` to call the new fee function and run final integration tests.
- Documentation/logging after each major step

---

## TASK-FEE-REBASE: Refactor FeeManagement for Generic ARRC Burning
Status: In Progress
Priority: High
PRD Reference: @{docs/PRD-missios.md} (Staking and Rebasing cost sections)
Architectural Module: FeeManagement, ShipAndPirateStaking
Dependencies: ShipAndPirateStaking (calls this)

### 🔧 Implementation Plan (Refactor)
- [x] Define a new generic function `burnArrc(address user, uint256 amount, string calldata action)` in the `IFeeManagement.sol` interface.
- [x] Remove the specific `burnArrcForStaking(address user, uint256 pirateCount)` function signature from `IFeeManagement.sol`.
- [x] Implement the new `burnArrc(address user, uint256 amount, string calldata action)` function in `FeeManagement.sol`:
  - [x] Keep existing checks for user balance and allowance.
  - [x] Keep existing `transferFrom` and `burn` logic, using the passed `amount`.
  - [x] Keep existing `onlyAuthorized` modifier.
  - [x] Emit the existing `ArrcBurned` event (with action).
- [x] Remove the specific `burnArrcForStaking` function implementation from `FeeManagement.sol`.
- [x] Keep `stakePirateArrcFee` state variable and `calculateStakingArrcFee` function for external query/cost calculation purposes (like `getPirateBoardingCost`).
- [x] Add `shipRebaseArrcFee` state variable to `IFeeManagement.sol` and `FeeManagement.sol`.
  - [x] Set the fee to 0.1 ARRC (`1 * 10**17` wei) in the `FeeManagement` constructor.
  - [x] Add a public getter function `getShipRebaseArrcFee()` to `IFeeManagement.sol` and `FeeManagement.sol`.
- [x] Add admin function `setShipRebaseArrcFee(uint256 newFee)` to `IFeeManagement.sol` and `FeeManagement.sol`.
  - [x] Ensure it has `onlyAdmin` modifier.
  - [x] Ensure it emits an event `ShipRebaseArrcFeeUpdated(newFee)`.
- [x] Update tests in `FeeManagement.test.js`:
  - [x] Remove tests for `burnArrcForStaking`.
  - [x] Add tests for the new generic `burnArrc(...)` covering:
    - [x] Correct amount burning.
    - [x] Revert on insufficient balance/allowance.
    - [x] Access control (`onlyAuthorized`).
    - [x] Event emission (with action).
  - [x] Add tests to verify `getShipRebaseArrcFee()` returns the correct value (0.1 ARRC).
  - [x] Add tests for `setShipRebaseArrcFee` (check event emission, access control, value update).
- [x] Implement unit tests for MissionValidator.sol (`test/missions/MissionValidator.test.js`)
  - [x] Test validateShipRequirements
  - [x] Test validateIslandRequirements
  - [x] Test validateShipCapacity
  - [x] Test isShipLocked
  - [x] Test isIslandOwner
  - [x] Test validateAndBurnMissionStartResources (including RUM and different food types)
  - [x] Test internal calculation functions (getTotalCrewCount, getNFTCrewCount, etc.)
- [x] Refactor `ShipAndPirateStaking.sol`:
  - [x] In `stakeShipWithPirates`, calculate the required staking fee (`pirateCount * stakePirateArrcFee`) locally.
  - [x] In `stakeShipWithPirates`, replace the call to `burnArrcForStaking` with a call to the new `feeManagement.burnArrc(msg.sender, calculatedStakingFee, "Staking")`.
  - [x] In `rebaseShipHomeIsland`, remove the hardcoded rebasing fee rate (0.1 ARRC = `1 * 10**17` wei).
  - [x] In `rebaseShipHomeIsland`, get the `shipRebaseArrcFee` by calling `feeManagement.getShipRebaseArrcFee()`.
  - [x] In `rebaseShipHomeIsland`, calculate the required rebasing fee (`pirateCount * shipRebaseArrcFee`) locally.
  - [x] In `rebaseShipHomeIsland`, replace the previous call to `burnArrc` with a call using the newly calculated rebasing fee `feeManagement.burnArrc(msg.sender, calculatedRebasingFee, "Rebasing")`.
  - [x] Authorize ShipAndPirateStaking to call MissionValidator.
  - [x] Modify rebaseShipHomeIsland signature to accept foodChoice (string) and foodRationChoice (string) parameters.
  - [x] In rebaseShipHomeIsland, get MissionValidator instance.
  - [x] In rebaseShipHomeIsland, call missionValidator.validateAndBurnMissionStartResources(...) with calculated travel duration and provided food choices (using 0 for intendedCargo).
- [x] Add fee logic to `stakePirate` in `ShipAndPirateStaking.sol`:
  - [x] Calculate the staking fee (0.5 ARRC = `stakePirateArrcFee`).
  - [x] Call the generic `feeManagement.burnArrc(msg.sender, stakePirateFee, "StakingPirate")`.
- [x] Update tests in `ShipAndPirateStaking.test.js`:
  - [x] Deploy and register MissionValidator in setupFixture for ShipAndPirateStaking.test.js.
  - [x] Ensure tests for `stakeShipWithPirates` verify the correct 0.5 ARRC/pirate fee is calculated and burned via the new `burnArrc`.
  - [x] Ensure tests for `rebaseShipHomeIsland` verify the correct 0.1 ARRC/pirate fee is calculated and burned via the new `burnArrc`.
  - [x] Ensure tests for rebaseShipHomeIsland verify that missionValidator.validateAndBurnMissionStartResources is called correctly and that underlying RUM/food burning happens.
  - [x] Add tests to cover different foodChoice and foodRationChoice selections during rebase (verifying call to MissionValidator).
- [x] Update `ShipAndPirateStaking` tests for fee burning
- [x] Design and implement `CooldownManager.sol` (using Option 3: Generic Key + Context):
  - [x] Add `cooldownEndTime` mapping (`bytes32 => uint256`).
  - [x] Add `CooldownSet(bytes32 indexed entityKey, uint256 endTime, string context)` event.
  - [x] Add `setCooldown(bytes32 entityKey, uint256 duration, string calldata context)` function (`onlyAuthorized`).
  - [x] Add `isOnCooldown(bytes32 entityKey)` view function (returns `block.timestamp < cooldownEndTime[entityKey]`).
  - [x] Add `getCooldownEndTime(bytes32 entityKey)` view function.
- [x] Register `CooldownManager` in `CentralAuthorizationRegistry` (`ICooldownManager`).
- [x] Authorize `ShipAndPirateStaking` to call `CooldownManager`.
- [x] Update `ShipAndPirateStaking.sol::rebaseShipHomeIsland`:
  - [x] Add check: `require(newIslandId != ship.homeIslandId, "Cannot rebase to the same island");`.
  - [x] Add rebase action cooldown check: 
    - [x] Calculate `bytes32 rebaseActionKey = keccak256(abi.encodePacked("rebaseAction", shipId));`
    - [x] Check `cooldownManager.isOnCooldown(rebaseActionKey)` and revert if true.
    - [x] Get `IMissionTravelCalculator` instance.
    - [x] Call `calculateTravelTime(oldIslandId, newIslandId, shipId)` to get `cooldownDuration`.
    - [x] Get `ICooldownManager` instance.
    - [x] Calculate `bytes32 entityKey = keccak256(abi.encodePacked("ship", shipId));`
    - [x] Call `cooldownManager.setCooldown(entityKey, cooldownDuration, "rebase")`.
    - [x] Set rebase action cooldown (e.g., 1 hour = 3600s): 
      - [x] Call `cooldownManager.setCooldown(rebaseActionKey, 3600, "rebaseAction")`.
- [x] Update `MissionsManager.sol::startMission`:
  - [x] Get `ICooldownManager` instance.
  - [x] Calculate `bytes32 entityKey = keccak256(abi.encodePacked("ship", shipId));`
  - [x] Check `cooldownManager.isOnCooldown(entityKey)`.
  - [x] Revert if ship is on cooldown (e.g., `require(!isOnCooldown, "Ship is on cooldown");`).
- [x] Add Tests:
  - [x] Add tests for `CooldownManager.sol`.
  - [x] Add tests in `ShipAndPirateStaking.test.js` to verify cooldown is set correctly on rebase (checking event with correct key and context).
  - [x] Add tests in `ShipAndPirateStaking.test.js` to verify rebase to same island is blocked.
  - [x] Add tests in `ShipAndPirateStaking.test.js` to verify rebase is blocked if rebase action cooldown is active.
  - [x] Add tests in `ShipAndPirateStaking.test.js` to verify rebase action cooldown is set correctly.
  - [x] Add tests in `MissionsManager.test.js` to verify mission start is blocked during cooldown (checking revert reason).
  - [x] Run all test suites (`FeeManagement`, `ShipAndPirateStaking`, `DockingManagement`, `CooldownManager`, `MissionsManager`) to ensure integration works.
  - [x] Update status/log after each step.
- [ ] **Test Refactoring & Utils Enhancement:**
  - [x] Analyze `ShipAndPirateStaking.test.js` and other test files for common setup and actions.
  - [x] Design `setupCoreGameContracts` utility in `test/utils.js` to deploy and register common contracts.
  - [x] Implement `setupCoreGameContracts` utility.
  - [x] Refactor `ShipAndPirateStaking.test.js` `setupFixture` to use `setupCoreGameContracts`.
  - [x] Refactor `MissionValidator.test.js` `setupFixture` to use `setupCoreGameContracts`.
  - [x] Refactor `MissionsManager.test.js` `setupFixture` to use `setupCoreGameContracts` and other existing utils.
  - [x] Design `prepareShipForJourney` utility in `test/utils.js` for rebase/mission resource preparation.
  - [x] Implement `prepareShipForJourney` utility.
  - [x] Refactor "Ship Rebasing" tests in `ShipAndPirateStaking.test.js` to use `prepareShipForJourney`.
  - [x] Design `setupEmptyResourceProduction` utility in `test/utils.js`.
  - [x] Implement `setupEmptyResourceProduction` utility.
  - [x] Refactor `ShipAndPirateStaking.test.js` and `MissionValidator.test.js` to use `setupEmptyResourceProduction`.
  - [x] Run all test suites to ensure refactoring is successful.

### ✅ Acceptance Criteria
1. Generic `burnArrc` function correctly burns the specified ARRC amount after checking balance/allowance.
2. `burnArrc` function reverts correctly on insufficient funds or if called by an unauthorized address.
3. `ShipAndPirateStaking.stakeShipWithPirates` calculates and triggers burning of 0.5 ARRC per pirate via the generic `burnArrc`.
4. `ShipAndPirateStaking.rebaseShipHomeIsland` calculates and triggers burning of 0.1 ARRC per pirate via the generic `burnArrc`.
5. All relevant tests pass.
6. Ships enter a cooldown period after `rebaseShipHomeIsland` equal to the one-way travel time between the old and new islands.
7. Ships cannot start a new mission via `MissionsManager` while the rebase cooldown is active.
8. `ShipAndPirateStaking.rebaseShipHomeIsland` correctly calculates the one-way travel time and calls `CooldownManager.setCooldown` with the correct `entityKey`, `duration`, and context (`"rebase"`).
9. `CooldownManager` correctly records the `endTime` for the ship's `entityKey` and emits a `CooldownSet` event.
10. `MissionsManager.startMission` checks the `CooldownManager` using the correct `entityKey` and reverts with a specific error (e.g., "Ship is on cooldown") if attempted during the cooldown period.
11. `ShipAndPirateStaking.rebaseShipHomeIsland` reverts if attempting to rebase to the same island.
12. `ShipAndPirateStaking.rebaseShipHomeIsland` reverts if the ship is still under the rebase action cooldown.
13. `ShipAndPirateStaking.rebaseShipHomeIsland` sets the correct rebase action cooldown (e.g., 1 hour) upon successful rebase.

### 🧠 Edge Cases
- `amount` passed to `burnArrc` is zero.
- User has exactly the required balance/allowance.
- Starting a mission immediately after cooldown expires.
- Attempting to start a mission exactly when cooldown ends.
- Interactions between mission completion and rebase cooldown start.
- User has exactly the required balance/allowance.
- Starting a mission immediately after cooldown expires.
- Attempting to start a mission exactly when cooldown ends.
- Interactions between mission completion and rebase cooldown start.
- 13. Calling `rebaseShipHomeIsland` again while the ship is already on rebase cooldown (should reset/overwrite the timer).
- 14. `MissionTravelCalculator.calculateTravelTime` reverting during `rebaseShipHomeIsland` (should cause the entire rebase to revert).
- 15. Unauthorized contract attempting to call `CooldownManager.setCooldown`.
- 16. Attempting to rebase to the same island multiple times.
- 17. Attempting to rebase to a different island immediately after a successful rebase (should be blocked by rebase action cooldown).
- 18. Attempting to rebase exactly when the rebase action cooldown expires.
