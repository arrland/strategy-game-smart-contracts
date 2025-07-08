# Plan to Address Missing/Incomplete Features in Resource Trading & Transfer Missions

## Overview
This plan addresses the following missing/incomplete features:
1. Resource Type Handling
2. Return-from-Trade Logic
3. Failure/Abort Handling
4. Pending Resource Tracking
5. Building Requirements Upgradability
6. Atomicity and Rollbacks
7. Testing and Edge Cases

Each section includes clarifying questions, implementation steps, and deliverables.

---

## 1. Resource Type Handling
**Goal:** Ensure resource types are consistently tracked as strings or enums, not hashes or placeholders, across all mission and storage contracts.

**Clarifying Questions:**
- Should all resource types be validated against the `ResourceTypeManager` contract?
- Are there any legacy flows that require backward compatibility for resource type representation?
- Should resource type be stored as a string in all mission storage and event emissions?

**Implementation Steps:**
1. Refactor all mission contracts (e.g., `ResourceTransferMission`, `TradeMission`) to use string resource types throughout mission data, storage, and events.
2. Update mission storage contracts to store and return resource types as strings.
3. Ensure all resource type inputs are validated using `ResourceTypeManager.isValidResourceType`.
4. Update any places where resource type is converted to a hash or placeholder (e.g., "resource") to use the actual string.
5. Update tests to cover multiple resource types and edge cases.

---

## 2. Return-from-Trade Logic
**Goal:** Implement the `isReturnFromTradeMission` flag in resource transfer missions to match trade mission behavior.

**Clarifying Questions:**
- None needed as return missions follow the same logic as trade missions.

**Implementation Steps:**
1. Ensure resource transfer missions with `isReturnFromTradeMission=true` follow the same flow as trade missions.
2. Verify that event emissions, validations, and resource handling are consistent between return missions and trade missions.
3. Update documentation to clarify that return-from-trade missions are functionally equivalent to trade missions.
4. Add tests to verify that return-from-trade missions behave identically to trade missions.

---

## 3. Failure/Abort Handling
**Goal:** Add logic to handle mission failures or aborts, ensuring resources/ARRC are unlocked and missions are marked as failed.

**Clarifying Questions:**
- What are the possible failure/abort scenarios (e.g., ship destroyed, mission canceled, timeout)?
- Who is authorized to abort a mission (player, admin, system)?
- Should partial progress be handled (e.g., partial resource loss)?

**Implementation Steps:**
1. Define failure/abort scenarios and add documentation.
2. Add abort/failure functions to mission contracts and storage.
3. Implement logic to unlock resources/ARRC and mark mission as failed.
4. Emit appropriate events for mission failure/abort.
5. Add/Update tests for all failure/abort scenarios.

---

## 4. Pending Resource Tracking
**Goal:** Integrate mission flows with `MarketPlaceStorage` to track pending resources during missions.

**Clarifying Questions:**
- Should all resources involved in missions be marked as pending in storage until mission completion?
- How should pending resources be handled if a mission fails or is aborted?

**Implementation Steps:**
1. Update mission contracts to call `MarketPlaceStorage.addPendingResource` when resources are committed to a mission.
2. Call `MarketPlaceStorage.removePendingResource` on mission completion or abort.
3. Ensure atomicity between mission state changes and pending resource updates.
4. Add/Update tests for pending resource tracking.

---

## 5. Building Requirements Upgradability
**Goal:** Make building requirements for missions upgradable/configurable without redeploying contracts.

**Clarifying Questions:**
- Should requirements be managed by an external storage contract or via admin functions?
- Is there a need for versioning or rollback of requirements?

**Implementation Steps:**
1. Refactor building requirements logic to use a storage contract or admin-updatable mappings.
2. Add admin functions to update requirements for each mission type.
3. Add/Update tests for requirements updates and enforcement.

---

## 6. Atomicity and Rollbacks
**Goal:** Ensure resource/ARRC transfers are atomic or have rollback mechanisms to prevent inconsistencies.

**Clarifying Questions:**
- Are there any cross-contract calls that could fail mid-operation?
- Should we use a pattern like "try/catch and revert" or explicit rollback functions?

**Implementation Steps:**
1. Review all resource/ARRC transfer flows for atomicity.
2. Add try/catch and revert or explicit rollback logic where needed.
3. Document and test all atomicity guarantees.

---

## 7. Testing and Edge Cases
**Goal:** Ensure comprehensive tests for all mission flows, including edge cases and failure scenarios.

**Clarifying Questions:**
- Are there any known edge cases not currently tested?
- Should we add property-based/fuzz testing for mission flows?

**Implementation Steps:**
1. Review and expand test coverage for all mission types and flows.
2. Add tests for edge cases, including reentrancy, overflows, partial completions, and failures.
3. Add property-based/fuzz tests where appropriate.

---

## Next Steps
- Review and answer clarifying questions for each section.
- Approve or revise this plan as needed.
- Begin implementation phase-by-phase, starting with resource type handling. 