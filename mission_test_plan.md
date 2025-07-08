# Mission System Test Plan

## 1. Overview

This document outlines a comprehensive testing strategy for the mission system in our blockchain-based strategy game. The mission system consists of multiple contracts that work together to enable players to send ships on various types of missions, including resource transfers and trading.

## 2. Contracts to Test

The following contracts need to be tested thoroughly:

1. `ArrcLocking.sol` - Manages token locking for trade missions
2. `BaseMission.sol` - Abstract contract with common mission functionality
3. `MissionFactory.sol` - Factory for mission contract registration
4. `MissionRequirements.sol` - Defines requirements for different mission types
5. `MissionsManager.sol` - Manages the mission lifecycle
6. `MissionsStorage.sol` - Unified storage for mission data
7. `ResourceTransferMission.sol` - Handles resource transfer missions
8. `TradeMission.sol` - Handles trade missions between islands
9. `TradeManager.sol` - Manages trade orders and executions

## 3. Dependencies

### External Libraries
- OpenZeppelin
  - ReentrancyGuard
  - IERC20
  - Strings utility

### Internal Dependencies
- `ICentralAuthorizationRegistry` - For contract addressing and authorization
- `IBaseStorage` - For resource storage operations
- `IShipStorage` - For ship-related data
- `IIslandStorage` - For island-related data
- `IResourceManagement` - For resource management operations
- `IBuildingStorage` - For island building requirements
- `IMapManager` - For map-related data
- `ITravelTimeCalculator` - For calculating travel times
- `ICrewManagement` - For crew-related functionality
- `IShipMetadata` - For ship metadata
- `IFeeManagement` - For fee calculations
- `MarketPlaceStorage` - For storing trade orders

## 4. Testing Strategy

### 4.1 Unit Testing

Unit tests will verify the functionality of individual methods in isolation, using actual contract dependencies rather than mocks.

### 4.2 Integration Testing

Integration tests will verify the interaction between contracts in the mission system, focusing on common workflows.

### 4.3 Test Environment Setup

For each test suite, we need:
- Test data for ships, islands, resources, and players
- Properly initialized contract instances

### 4.4 Using Existing Utility Functions

We'll use the following utility functions from utils.js:

1. `deployBaseInfrastructure` - Sets up admin, user, and CentralAuthorizationRegistry
2. `registerContractInterfaces` - Registers contracts in the registry
3. `verifyContractState` - Validates contract states
4. `createTestConfig` - Creates test configuration objects
5. `deployAndAuthorizeContract` - Deploys contracts and authorizes them
6. `setupTokenInfrastructure` - Sets up ARRC, RUM tokens, and FeeManagement
7. `setupGenesisPiratesNFT` - Sets up Genesis Pirates NFT
8. `setupInhabitantsNFT` - Sets up Inhabitants NFT
9. `setupNFTsForStaking` - Sets up NFTs for staking
10. `setupStakingRequirements` - Sets up requirements for staking
11. `setupShipMetadata` - Sets up ship metadata
12. `initializeShipStorage` - Initializes ship storage
13. `registerContractAddresses` - Registers multiple contract addresses

### 4.5 New Utility Functions Needed

We need to develop the following new utility functions:

1. `setupMissionInfrastructure` - Sets up all mission contracts and registers them
2. `setupBuildingStorage` - Initializes building storage with required buildings
3. `createTestMission` - Creates a test mission with default parameters
4. `advanceMissionTime` - Advances time to simulate mission progress
5. `setupTradeOrder` - Creates a trade order for testing
6. `validateMissionState` - Validates mission state against expected values
7. `setupTestIslands` - Sets up test islands with required buildings
8. `setupResourcesForMissions` - Sets up resources for test missions
9. `validateResourceTransferState` - Validates resource transfer mission state
10. `validateTradeMissionState` - Validates trade mission state
11. `calculateExpectedTravelTime` - Calculates expected travel time for tests
12. `validateArrcLockingState` - Validates ARRC locking state

## 5. Test Cases

### 5.1 ArrcLocking Tests

#### Unit Tests
1. `test_lockForTrade` - Test locking ARRC tokens for a trade mission STATUS [✓]
   - Verify tokens are locked
   - Verify locking info is stored correctly
   - Test with different locking types (buy/sell)
   - Test authorization checks

2. `test_unlockArrc` - Test unlocking ARRC tokens after mission STATUS [✓]
   - Verify tokens are returned to player
   - Verify lock data is cleared

3. `test_transferArrcToRecipient` - Test transferring locked ARRC STATUS [✓]
   - Verify tokens are transferred to recipient
   - Verify lock data is cleared

4. `test_captureLockedArrc` - Test capturing locked ARRC during attack STATUS [✓]
   - Verify 50% of tokens are transferred to attacker
   - Verify attacker is recorded in lock data

5. `test_getLockAndIsLocked` - Test querying lock information STATUS [✓]

6. `test_lockForTrade_RevertConditions` - Test error conditions for locking STATUS [✓]
   - Test already locked ship
   - Test with zero amount
   - Test with invalid locking type

#### Integration Tests
1. `test_arrcLockingWithTradeMission` - Test interaction with TradeMission STATUS [✓]
   - Verify tokens are locked when trade mission starts
   - Verify tokens are transferred to seller or unlocked to buyer when appropriate

2. `test_arrcLockingAfterAttack` - Test token locking behavior after attack STATUS [✓]
   - Verify attacker can only capture 50% of tokens
   - Verify remaining tokens can be retrieved by owner

### 5.2 BaseMission Tests

Since BaseMission is abstract, we'll test its functionality through concrete implementations.

#### Unit Tests (via implementation)
1. `test_lockShipForMission` - Test locking a ship for a mission STATUS [ ]
   - Verify ship is locked correctly
   - Verify event is emitted

2. `test_unlockShipAfterMission` - Test unlocking a ship STATUS [ ]
   - Verify ship is unlocked correctly
   - Verify event is emitted

3. `test_isShipLocked` - Test ship lock status check STATUS [ ]

4. `test_getShipLockInfo` - Test retrieving ship lock information STATUS [ ]

5. `test_getMissionDetails` - Test retrieving mission details STATUS [ ]

6. `test_calculateTravelTime` - Test travel time calculations STATUS [ ]
   - Test with different ship speeds
   - Test with different island distances

7. `test_validateIslandRequirements` - Test building requirements for missions STATUS [ ]
   - Test with valid island buildings
   - Test with missing required buildings

8. `test_validateBaseMissionRequirements` - Test base requirements for missions STATUS [ ]
   - Test with unstaked ship
   - Test with ship already on mission
   - Test with locked ship

9. `test_validateShipCapacity` - Test ship capacity validation STATUS [ ]
   - Test with sufficient capacity
   - Test with insufficient capacity

10. `test_transferResources` - Test resource transfer functionality STATUS [ ]
    - Test correct transfer between storages
    - Test with insufficient resources

### 5.3 MissionFactory Tests

#### Unit Tests
1. `test_registerMissionContract` - Test registering a new mission contract STATUS [ ]
   - Verify contract is registered correctly
   - Verify event is emitted
   - Test admin-only access

2. `test_updateMissionContract` - Test updating a mission contract STATUS [ ]
   - Verify contract address is updated
   - Verify event is emitted
   - Test admin-only access

3. `test_getMissionContract` - Test retrieving mission contract STATUS [ ]
   - Verify correct address is returned
   - Test with invalid mission type

4. `test_isMissionTypeRegistered` - Test checking if mission type is registered STATUS [ ]

5. `test_registerMissionContract_RevertConditions` - Test error conditions for registration STATUS [ ]
   - Test zero address
   - Test already registered mission type

### 5.4 MissionRequirements Tests

#### Unit Tests
1. `test_validateBuildingRequirements` - Test building requirements validation STATUS [ ]
   - Test with valid buildings
   - Test with missing required buildings

2. `test_validateIslandForMission` - Test island validation for mission types STATUS [ ]
   - Test for each mission type
   - Test with valid and invalid islands

3. `test_getRequiredBuildingsForMission` - Test retrieving required buildings STATUS [ ]
   - Test for each mission type
   - Verify correct building types and levels are returned

4. `test_getMaxTradeOffers` - Test max trade offers calculation STATUS [ ]

5. `test_canBuildingSupportMission` - Test building support for missions STATUS [ ]

6. `test_validateIslandForMission_AllMissionTypes` - Test validation for all mission types STATUS [ ]
   - Test for Trade missions
   - Test for ResourceTransfer missions
   - Test for Hunt missions
   - Test for Raid missions

### 5.5 MissionsManager Tests

#### Unit Tests
1. `test_startMission` - Test starting a mission STATUS [ ]
   - Test for each mission type
   - Verify mission data is stored correctly
   - Verify event is emitted
   - Test with already-on-mission ship

2. `test_completeMission` - Test completing a mission STATUS [ ]
   - Verify mission status is updated
   - Verify event is emitted
   - Test with incomplete mission (time not elapsed)

3. `test_getMissionStatus` - Test retrieving mission status STATUS [ ]

4. `test_getActiveShipMission` - Test retrieving active mission for ship STATUS [ ]

5. `test_getMissionFactoryForType` - Test retrieving mission factory for each type STATUS [ ]
   - Test for each mission type
   - Test with invalid mission type

6. `test_missionIdGeneration` - Test unique mission ID generation STATUS [ ]
   - Verify each mission gets a unique ID
   - Verify IDs are sequential

7. `test_startMission_RevertConditions` - Test error conditions for starting missions STATUS [ ]
   - Test with ship already on mission
   - Test with non-existent ship
   - Test with unsupported mission type

#### Integration Tests
1. `test_startAndCompleteMission` - Test complete mission workflow STATUS [ ]
   - Start a mission and wait for completion
   - Verify all state changes and events

2. `test_missionFactoryInteraction` - Test interaction with MissionFactory STATUS [ ]
   - Verify factory contract is called correctly

3. `test_multipleConcurrentMissions` - Test multiple ships on missions simultaneously STATUS [ ]
   - Verify correct tracking of each mission
   - Verify independence of mission states

### 5.6 MissionsStorage Tests

#### Unit Tests
1. `test_setTransferMission` - Test setting a transfer mission STATUS [ ]
   - Verify mission data is stored correctly
   - Test with different mission types
   - Test authorization checks

2. `test_setRaidMission` - Test setting a raid mission STATUS [ ]
   - Verify mission data is stored correctly
   - Test authorization checks

3. `test_setHuntMission` - Test setting a hunt mission STATUS [ ]
   - Verify mission data is stored correctly
   - Test with NPC and player targets
   - Test authorization checks

4. `test_completeMission` - Test completing a mission STATUS [ ]
   - Verify mission status is updated
   - Test authorization checks

5. `test_isOnMission` - Test checking if ship is on mission STATUS [ ]

6. `test_getMissionInfo` - Test retrieving mission info STATUS [ ]

7. `test_getShipsByMissionType` - Test retrieving ships by mission type STATUS [ ]

8. `test_shipTrackingByMissionType` - Test tracking ships by mission type STATUS [ ]
   - Test adding ships to mission type
   - Test removing ships from mission type

9. `test_setTransferMission_RevertConditions` - Test error conditions for setting missions STATUS [ ]
   - Test with invalid mission type
   - Test with ship already on mission

### 5.7 ResourceTransferMission Tests

#### Unit Tests
1. `test_startMission` - Test starting a resource transfer mission STATUS [ ]
   - Verify mission data is stored correctly
   - Verify ship is locked
   - Verify resources are transferred from island to ship
   - Test authorization checks

2. `test_completeMission` - Test completing a resource transfer mission STATUS [ ]
   - Verify resources are transferred from ship to destination island
   - Verify ship is unlocked
   - Test authorization checks

3. `test_getMissionType` - Test retrieving mission type STATUS [ ]

4. `test_isReturnFromTradeMission` - Test detection of return journeys STATUS [ ]
   - Test with empty return journey
   - Test with active trade return

5. `test_validateIslandRequirements` - Test island requirement validation STATUS [ ]
   - Test with valid source and destination islands
   - Test with invalid buildings

6. `test_startMission_RevertConditions` - Test error conditions for starting missions STATUS [ ]
   - Test with insufficient ship capacity
   - Test with insufficient island resources
   - Test with duplicated mission ID

#### Integration Tests
1. `test_resourceTransferWorkflow` - Test complete resource transfer workflow STATUS [ ]
   - Start a mission, wait for completion, and complete it
   - Verify all state changes and events

2. `test_islandCapacityCheck` - Test island storage capacity handling STATUS [ ]
   - Test transfer with sufficient capacity
   - Test transfer with insufficient capacity

3. `test_completeEntireTradeMission` - Test handling trade mission completion STATUS [ ]
   - Verify correct interaction with TradeManager
   - Verify mission state after completion

### 5.8 TradeMission Tests

#### Unit Tests
1. `test_startMission` - Test starting a trade mission STATUS [ ]
   - Verify mission data is stored correctly
   - Verify ship is locked
   - Verify ARRC tokens are locked (if buying)
   - Verify resources are transferred (if selling)
   - Test authorization checks

2. `test_advanceMission` - Test advancing a trade mission STATUS [ ]
   - Test advancing from outbound to inbound journey
   - Test completing inbound journey
   - Verify state changes at each phase

3. `test_completeMission` - Test completing a trade mission STATUS [ ]
   - Verify mission is completed correctly
   - Test authorization checks

4. `test_getMissionState` - Test retrieving mission state STATUS [ ]

5. `test_getTimeRemaining` - Test retrieving time remaining for mission STATUS [ ]

6. `test_isPhaseComplete` - Test checking if phase is complete STATUS [ ]

7. `test_validateTradeOrder` - Test trade order validation STATUS [ ]
   - Test with valid trade order
   - Test with inactive trade order
   - Test with resource type mismatch
   - Test with excessive amount

8. `test_journeyStateTransitions` - Test all journey state transitions STATUS [ ]
   - Test Outbound to Inbound
   - Test each phase's timing requirements

9. `test_calculateTradeJourneyDuration` - Test journey duration calculation STATUS [ ]
   - Test with various island distances
   - Test with different ship speeds

#### Integration Tests
1. `test_tradeWorkflow` - Test complete trade workflow STATUS [ ]
   - Start a mission, complete outbound journey, complete inbound journey
   - Verify all state changes and events

2. `test_arrcLockingInteraction` - Test interaction with ArrcLocking STATUS [ ]
   - Verify tokens are locked appropriately
   - Verify tokens are transferred or unlocked at each phase

3. `test_tradeManagerInteraction` - Test interaction with TradeManager STATUS [ ]
   - Verify correct calls to initiateTrade
   - Verify correct calls to completeTrade
   - Verify correct calls to completeEntireTradeMission

4. `test_shipAttackedDuringMission` - Test handling of ship being attacked STATUS [ ]
   - Verify mission can continue after attack
   - Verify appropriate token and resource handling

### 5.9 TradeManager Tests

#### Unit Tests
1. `test_createTradeOrder` - Test creating a trade order STATUS [ ]
   - Verify order data is stored correctly
   - Verify resources are transferred to marketplace
   - Test with island owner and non-owner

2. `test_cancelTradeOrder` - Test canceling a trade order STATUS [ ]
   - Verify order is canceled
   - Verify resources are returned
   - Test with island owner and non-owner

3. `test_updateTradeOrder` - Test updating a trade order STATUS [ ]
   - Verify order data is updated
   - Test with island owner and non-owner

4. `test_initiateTrade` - Test initiating a trade STATUS [ ]
   - Verify trade data is stored correctly
   - Verify ARRC locking (if buying)
   - Verify resource transfer (if selling)

5. `test_completeTrade` - Test completing a trade STATUS [ ]
   - Verify resources are transferred
   - Verify ARRC tokens are transferred (if buying)

6. `test_startReturnJourney` - Test starting return journey STATUS [ ]
   - Verify state is updated correctly

7. `test_completeEntireTradeMission` - Test completing entire trade mission STATUS [ ]
   - Verify ARRC tokens are unlocked
   - Verify state is cleaned up

8. `test_pendingDeliveryOperations` - Test pending delivery functionality STATUS [ ]
   - Test tracking pending deliveries
   - Test claiming deliveries

9. `test_islandOwnerModifier` - Test island owner access control STATUS [ ]
   - Test with island owner
   - Test with non-owner

10. `test_validTradeOrderModifier` - Test trade order validation modifier STATUS [ ]
    - Test with valid trade order
    - Test with invalid trade order ID
    - Test with inactive trade order

11. `test_tradeOrderLimits` - Test maximum trade order limits STATUS [ ]
    - Test within limits
    - Test exceeding limits

12. `test_getPendingResourceAmount` - Test getting pending resource amounts STATUS [ ]
    - Test with pending resources
    - Test with no pending resources

13. `test_getPendingResourceTypes` - Test getting pending resource types STATUS [ ]
    - Test with multiple pending resource types
    - Test with no pending resources

14. `test_hasResourceTypePending` - Test checking if resource type is pending STATUS [ ]
    - Test with pending resource type
    - Test with non-pending resource type

#### Integration Tests
1. `test_tradeOrderLifecycle` - Test complete trade order lifecycle STATUS [ ]
   - Create, update, initiate trade, complete trade
   - Verify all state changes and events

2. `test_tradeMissionInteraction` - Test interaction with TradeMission STATUS [ ]
   - Verify mission contract is called correctly

3. `test_resourceTransferDuringTrade` - Test resource transfer during trade STATUS [ ]
   - Test resources transferred to/from marketplace storage
   - Test with selling vs buying scenarios

4. `test_eventEmissions` - Test all event emissions STATUS [ ]
   - Test TradeOrderCreated
   - Test TradeOrderCancelled
   - Test TradeOrderUpdated
   - Test TradeInitiated
   - Test TradeCompleted
   - Test ReturnJourneyStarted
   - Test ReturnJourneyCompleted
   - Test ResourceTypeTracked
   - Test ResourcesHeldForDelivery
   - Test PendingDeliveryClaimed

## 6. Test Environment Setup

Instead of using mock contracts, we'll deploy actual contract implementations for testing. This approach ensures that our tests are more realistic and can catch integration issues.

### 6.1 SetupFixture Pattern

Each test file will use the setupFixture pattern to deploy and configure all necessary contracts. Based on the example test files (CrewSailorRecruitment.test.js, CrewManagement.test.js, etc.), we'll structure our tests as follows:

```javascript
async function setupFixture() {
    // Deploy base infrastructure
    const baseInfrastructure = await deployBaseInfrastructure();
    const { admin, user, centralAuthorizationRegistry } = baseInfrastructure;
    
    // Deploy all needed contracts
    const contract1 = await deployAndAuthorizeContract("Contract1", centralAuthorizationRegistry);
    const contract2 = await deployAndAuthorizeContract("Contract2", centralAuthorizationRegistry);
    
    // Set up NFTs, tokens, and other dependencies
    const tokenInfrastructure = await setupTokenInfrastructure(centralAuthorizationRegistry, admin, [user]);
    
    // Set up mission infrastructure (new utility function)
    const missionInfrastructure = await setupMissionInfrastructure(centralAuthorizationRegistry);
    
    // Return all deployed contracts and configs
    return {
        ...baseInfrastructure,
        ...tokenInfrastructure,
        ...missionInfrastructure,
        contract1,
        contract2
    };
}
```

### 6.2 Contract Registration Flow

All contracts will be registered in the Central Authorization Registry to ensure proper authorization and contract addressing:

1. Deploy contract using `deployAndAuthorizeContract`
2. Register the contract in the CAR using its interface ID
3. Authorize the contract by adding it to authorized contracts list

## 7. Test Data Setup

1. **Players**: Create multiple test accounts representing different players
2. **Ships**: Create test ships with different:
   - Speeds
   - Storage capacities
   - Ownership
3. **Islands**: Create test islands with different:
   - Owners
   - Building types and levels
   - Resource storage capacities
4. **Resources**: Initialize various resource types and amounts
5. **Trade Orders**: Create test trade orders for different resources

## 8. Test Execution Plan

1. Setup the test environment with actual dependencies
2. Deploy and initialize contracts with test data
3. Execute unit tests for each contract
4. Execute integration tests for contract interactions
5. Verify all test cases pass

## 9. Edge Cases to Test

1. Ship attacked during mission
2. Island running out of storage capacity during mission
3. Trade order canceled while ship is en route
4. Insufficient resources at start or completion of mission
5. Multiple concurrent missions for different ships
6. Resource type limitations and constraints
7. Mission time manipulations and edge cases
8. Authorization and access control edge cases
9. Island owner changes during active trade orders
10. Re-entrance attempts during token transfers
11. Mission data hash collisions
12. Zero-valued trades or resource transfers
13. Maximum value trades (uint256 boundaries)
14. Mission completion with depleted resources

## 10. Gas Optimization Tests

1. Measure gas costs for common operations
2. Identify optimization opportunities
3. Verify gas costs are within acceptable limits

## 11. Security Considerations

1. Test reentrancy protection
2. Test access control mechanisms
3. Test edge cases for potential exploits
4. Verify token locking and unlocking security
5. Test authorization bypass attempts
6. Test front-running scenarios for trade orders
7. Test token approval manipulation
8. Test mission data tampering

## 12. Test Organization

Each test file will follow this structure:
- `ArrcLocking.test.js`
- `MissionFactory.test.js`
- `MissionRequirements.test.js`
- `MissionsManager.test.js`
- `MissionsStorage.test.js`
- `ResourceTransferMission.test.js`
- `TradeMission.test.js`
- `TradeManager.test.js`
- `MissionIntegration.test.js` (for testing multiple contracts together)

## 13. Conclusion

This test plan provides a comprehensive approach to testing the mission system contracts. By following this plan and using actual contract implementations rather than mocks, we can ensure the reliability, security, and correctness of the mission system implementation. 