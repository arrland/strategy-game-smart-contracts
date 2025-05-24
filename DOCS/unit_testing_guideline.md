# Unit Testing Guidelines

This document provides best practices and patterns for writing unit tests in this codebase, based on the existing test suites and utility functions. It is designed to help you write maintainable, robust, and DRY tests that follow SOLID principles.

---

## How to Compile Contracts and Run Tests

Before writing or running tests, ensure your environment is set up and contracts are compiled.

### 1. Install Dependencies

From the project root, install all required dependencies:

```bash
yarn install
```

### 2. Compile Contracts

Compile all smart contracts using Hardhat:

```bash
npx hardhat compile
```

### 3. Run Tests

Execute the test suite (all tests in the `test/` directory) with:

```bash
npx hardhat test
```

- This will compile contracts (if needed) and run all test files.
- Test results, including any failures, will be shown in the terminal.

> **Tip:** If you are not using the Hardhat Network, ensure a local Ethereum node is running.

How to run tests in a specific file:

```bash
npx hardhat test test/ships/ShipAndPirateStaking.test.js
```

---

## 1. Contract Deployment and Setup

- **Prioritize `setupCoreGameContracts` for comprehensive setups.** For tests involving multiple interconnected systems (staking, missions, resources, etc.), the `setupCoreGameContracts` utility function is the preferred method for deploying and configuring the core game environment. It returns a pack of essential contract instances.
- **Use `deployBaseInfrastructure` for simpler or foundational tests.** This helper is still useful for basic CAR setup and obtaining admin/user signers.
- **Leverage other specific setup utilities** like `setupNFTsForStaking`, `setupTokenInfrastructure`, `prepareAssetsForStaking`, and `stakeShipWithPirates` as building blocks within your main `setupFixture` or for more targeted tests.
- **Deploy contracts in the correct order if manual deployment is unavoidable.** However, prefer utility functions to manage dependencies.
- **Use fixtures for test state.** Each test suite **MUST** have an `async function setupFixture() { ... }` that deploys and configures all required contracts and state. Use `beforeEach(async function () { state = await loadFixture(setupFixture); });` (importing `loadFixture` from `@nomicfoundation/hardhat-network-helpers`) to reset state for each test. The `state` object should hold all signers, contract instances, and test configurations.
- **Example pattern (recommended for complex tests):**
  ```js
  const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
  const { setupCoreGameContracts, setupNFTsForStaking, deployBaseInfrastructure, createTestConfig /*, ... other utils */ } = require("../utils");

  // Define a test-specific configuration object
  const MyContractTestConfig = createTestConfig({
    shipIds: { MAIN_SHIP: 1 },
    pirateIds: { CAPTAIN: 101 },
    // ...other test-specific parameters
  });

  describe("MyContract", function () {
    let state = {}; // Holds all fixture results

    async function setupFixture() {
      const base = await deployBaseInfrastructure();
      const nfts = await setupNFTsForStaking(base.admin, base.user, base.centralAuthorizationRegistry);
      // Deploy a comprehensive set of core contracts
      const coreContractsPack = await setupCoreGameContracts(
        base.admin,
        base.user,
        base.centralAuthorizationRegistry,
        nfts,
        { deployRealMissionsStorage: false } // Example option
      );

      // Deploy the contract under test (if not part of coreContractsPack)
      const myContract = await deployAndAuthorizeContract("MyContract", base.centralAuthorizationRegistry /*, ...args */);

      // Return everything needed by tests, including the config
      return {
        ...base,         // admin, user, otherAccount, centralAuthorizationRegistry
        ...nfts,         // shipNFT, genesisPiratesNFT, etc.
        ...coreContractsPack, // All core game contracts
        myContract,      // The contract under test
        config: MyContractTestConfig // Test-specific configuration
      };
    }

    beforeEach(async function () {
      state = await loadFixture(setupFixture);
    });

    it("should behave correctly under condition X", async function () {
      const { myContract, user, config } = state; // Destructure from state
      // Access config: config.shipIds.MAIN_SHIP
      // ... test logic ...
    });
  });
  ```

### 1.1. Configuration-Driven Testing with `createTestConfig`

- **Centralize Test Parameters:** Define a constant configuration object at the top of your test file (e.g., `MyFeatureTestConfig`) using the `createTestConfig` utility. This object should hold all test-specific parameters like NFT IDs, entity names/IDs, default values, or specific attributes being tested.
- **Readability and Maintainability:** This pattern makes tests more readable by abstracting constants and parameters. It also simplifies updates if these values need to change.
- **Access in Tests:** Pass this config object as part of the returned state from `setupFixture` (e.g., `return { ..., config: MyFeatureTestConfig }`). Tests can then destructure `config` from the `state` object.
- **Example:**
  ```js
  const MyTestConfig = createTestConfig({
    mainShipId: 1,
    captainPirateId: 101,
    defaultCargoAmount: ethers.parseUnits("100", 18),
    // ... other specific values for this test suite
  });

  // In setupFixture:
  // return { ..., config: MyTestConfig };

  // In an 'it' block:
  // const { config, myContract, user } = state;
  // await myContract.connect(user).loadCargo(config.mainShipId, config.defaultCargoAmount);
  ```

## 2. Using Mocks

- **Use mocks strategically.** Most contracts should be tested using their real instances, especially when their interactions are core to the feature under test. Mocks are best for:
  - External dependencies not central to the current test's focus.
  - Simulating specific return values or states that are hard to achieve with real contracts.
  - Isolating the unit under test.
- **Deploy mocks via utility functions where available.** `deployAndRegisterMock` or specific helpers like `deployMockMissionsStorage` (often handled by `setupCoreGameContracts` with `deployRealMissionsStorage: false`).
- **Test-Specific Mocks:** For simple interfaces or when a standard mock isn't available, you can deploy a minimal mock contract (e.g., `MockMission.sol`, `MockCaller.sol`) directly within your `setupFixture`. Ensure it's registered in CAR if other contracts will look it up.
  ```js
  // Example: Deploying a simple test-specific mock in setupFixture
  // const MockMissionFactory = await ethers.getContractFactory("MockMission");
  // const mockMission = await MockMissionFactory.connect(admin).deploy();
  // await mockMission.waitForDeployment();
  // // If needed, register it with another contract, e.g., a MissionFactory
  // await missionFactory.connect(admin).registerMissionContract(testMissionType, await mockMission.getAddress());
  ```
- **Controlling Mock Behavior:** Utilize setter functions on your mocks within individual tests to dictate their behavior for specific scenarios. This is crucial for testing different branches of logic in the contract under test.
  ```js
  // Example: Controlling a mock's return value in a test
  it("should revert if island requirements are not met", async function () {
    const { missionValidator, missionRequirements, config } = state;
    const targetIslandId = config.islands.ISLAND_2.id;
    const missionType = 1;

    // Configure mockMissionRequirements to make the island invalid for this test
    await missionRequirements.setIslandValidity(targetIslandId, missionType, false);

    await expect(missionValidator.validateIslandRequirements(0, targetIslandId, missionType))
      .to.be.revertedWith("Destination island missing required buildings");
  });

  // Example: Setting a mock state
  // await setMissionActive(missionsStorageMock, shipId, true); // sets ship on mission via mock
  ```
- **Register mocks in the Central Authorization Registry (CAR)** if other contracts will discover them via CAR lookups.

## 3. Using and Extending Utility Functions

- **Embrace High-Level Utilities:** For complex scenarios involving multiple setup steps (e.g., preparing a ship with resources for a journey, staking a ship with pirates, setting up specific resource production states), use high-level utility functions like `prepareAssetsForStaking`, `stakeShipWithPirates`, `prepareShipForJourney`, and `setupEmptyResourceProduction`. These encapsulate common complex workflows.
- **Compose Utilities:** Build your `setupFixture` by composing these utilities. Start with `deployBaseInfrastructure`, then `setupNFTsForStaking`, then `setupCoreGameContracts`, and then layer on more specific preparations using other utilities or direct contract calls as needed.
- **Reuse provided helpers**. The `test/utils.js` file contains helpers for common setup and actions:
  - Deployment: `deployAndAuthorizeContract`, `deployBaseInfrastructure`
  - NFT setup: `setupGenesisPiratesNFT`, `setupInhabitantsNFT`, `setupNFTsForStaking`
  - Token setup: `setupTokenInfrastructure`
  - Staking: `stakeShipWithPirates`, `prepareAssetsForStaking`
  - Skills and crew: `setupPirateSkills`, `setupCrewForPirates`
  - Metadata: `setupShipMetadata`, `initializeShipStorage`
  - Registration: `registerContractAddresses`, `registerContractInterfaces`
  - **Complex Scenario Setup**: `setupCoreGameContracts`, `prepareAssetsForStaking`, `prepareShipForJourney`, `setupEmptyResourceProduction`.
- **Extend utils for new patterns**. If you find yourself repeating setup or actions, add a new helper to `utils.js`.
- **Keep helpers generic and composable**. Helpers should not hardcode test-specific logic; pass parameters for flexibility.

## 4. Test Structure and Best Practices

- **Organize tests by contract and feature**. Each contract should have its own test file (e.g., `ShipAndPirateStaking.test.js`).
- **Use `describe` blocks for logical grouping**. Group related tests (e.g., deployment, staking, rebasing, error handling).
- **Use fixtures and reset state via `loadFixture`**. Ensure `beforeEach(async function () { state = await loadFixture(setupFixture); });` is used to maintain test independence. All shared setup (signers, contract instances, config) should be accessed via the `state` object.
- **Prefer utility functions over inline setup**. This keeps tests concise and DRY.
- **Assert on both state and events**. Check contract state, return values, and emitted events.
  - For event testing, use `expect(...).to.emit(contract, "EventName").withArgs(...)` for straightforward cases.
  - For more complex event assertions, or when checking events from indirectly called contracts, you may need to parse logs manually from the transaction receipt. See `ShipAndPirateStaking.test.js` for examples of iterating through `receipt.logs` and using `contract.interface.parseLog(log)` for complex cases.
- **Test both success and failure cases**. Use `.to.be.revertedWith("ReasonString")` or `.to.be.revertedWithCustomError(contract, "CustomErrorName").withArgs(...)` for expected errors.
- **Example structure (re-emphasized):**
  ```js
  describe("Feature", function () {
    beforeEach(async function () { state = await setupFixture(); });
    it("should do X", async function () { /* ... */ });
    it("should revert on Y", async function () { /* ... */ });
  });
  ```

## 5. SOLID and DRY Principles in Tests

- **Single Responsibility (S)**: Each test should verify one behavior or requirement.
- **Open/Closed (O)**: Add new tests for new features; avoid modifying existing tests unless requirements change.
- **Liskov Substitution (L)**: Use mocks or stubs only if they behave like the real contract for the tested interface.
- **Interface Segregation (I)**: Use only the contract methods needed for the test; avoid unnecessary dependencies.
- **Dependency Inversion (D)**: Use utility functions to abstract setup and dependencies; tests should not depend on low-level deployment details.
- **DRY**: Extract repeated setup or actions into utility functions. Never duplicate deployment or configuration logic in multiple tests.

## 6. General Advice for Maintainable, Robust Tests

- **Use clear, descriptive test names**. State what is being tested and the expected outcome (e.g., `it("should fail to rebase if primary food is insufficient")`).
- **Keep tests independent**. Never rely on the order of test execution. `loadFixture` helps ensure this.
- **Minimize direct contract interaction in tests for common actions**. Use utility functions for all repetitive or complex setup/actions (e.g., `stakeShipWithPirates` instead of manually calling approve and stake).
- **Document complex setups or non-obvious test logic** with comments if a utility function cannot fully abstract it.
- **Fail fast and clearly**. Use `expect` assertions liberally to catch errors early and provide meaningful failure messages.
- **Update tests when contracts change**. If contract interfaces or behaviors change, update both the tests and any relevant utility functions.
- **Explicitly set up precise preconditions for failure tests.** Don't rely on incidental states from previous operations. Use utility functions with overrides (e.g., `overrideLoadAmounts` in `prepareShipForJourney`) or direct state manipulation where necessary to ensure the test is verifying exactly the intended failure condition. For instance, to test insufficient ARRC, ensure the user account has *exactly* less than the required amount before the operation.

---

## Example: Adding a New Test Suite

1. **Create a new test file** in the appropriate directory (e.g., `test/feature/MyFeature.test.js`).
2. **Import utility functions** from `test/utils.js`.
3. **Write a fixture** using the helpers for deployment and setup.
4. **Write tests using the established structure**:
   - Use `describe` for grouping
   - Use `beforeEach` for setup
   - Use `it` for individual test cases
   - Use utility functions for actions and assertions

---

## References
- See `test/ships/ShipAndPirateStaking.test.js`, `test/crew/CrewTypeManager.test.js`, `test/crew/CrewSailorRecruitment.test.js`, `test/utils/TravelTimeCalculator.test.js` for real-world patterns.
- See `test/utils.js` for all available helpers and how to extend them.
- See `test/ships/ShipAndPirateStaking.deployment.md` for deployment order and contract dependencies.

---

By following these guidelines, you will ensure that your tests are robust, maintainable, and easy to extend as the codebase evolves.

---

## Utility Functions Reference

This section documents all utility functions available in `test/utils.js`. Use these helpers to keep your tests DRY, maintainable, and consistent.

### deployBaseInfrastructure
- **Description:** Deploys a standard base infrastructure with Central Authorization Registry.
- **Parameters:** None
- **Returns:** `{ admin, user, otherAccount, centralAuthorizationRegistry }`
- **Usage:**
  ```js
  const { admin, user, centralAuthorizationRegistry } = await deployBaseInfrastructure();
  ```

### registerContractInterfaces
- **Description:** Registers multiple contracts in Central Authorization Registry with their interfaces.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract): The CAR contract instance.
  - `contracts` (object): Object mapping contract names to contract instances.
  - `interfaceNames` (object, optional): Optional mapping of contract names to interface ID strings (e.g., `ethers.keccak256(ethers.toUtf8Bytes("IMyContract"))`).
- **Returns:** None
- **Usage:**
  ```js
  await registerContractInterfaces(car, { MyContract: myContractInstance }, { MyContract: "IMyContract" });
  ```

### verifyContractState
- **Description:** Verifies a contract state by calling a getter function and comparing to an expected value.
- **Parameters:**
  - `contract` (contract): The contract to verify.
  - `getterFn` (string): Name of the getter function (as a string).
  - `expectedValue` (any): The expected return value.
  - `errorMsg` (string, optional): Optional custom error message for the assertion.
- **Returns:** The actual value returned by the getter.
- **Usage:**
  ```js
  await verifyContractState(myContract, "getSomeValue", 42, "Value should be 42");
  ```

### createTestConfig
- **Description:** Creates a test configuration object by merging with provided parameters.
- **Parameters:**
  - `config` (object): Configuration options.
- **Returns:** A new test configuration object.
- **Usage:**
  ```js
  const testConfig = createTestConfig({ settingA: true, settingB: 123 });
  ```

### deployAndRegisterContract
- **Description:** Deploys a contract, authorizes it in CAR, and registers it using a specific string key (which is then hashed). The CAR address is automatically passed as the first constructor argument to the deploying contract.
- **Parameters:**
  - `contractName` (string): Name of the contract to deploy.
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `registryKeyString` (string): The string to be hashed and used as the key for CAR registration (e.g., "IMyContractInterface").
  - `...args`: Additional constructor arguments to be passed to the contract *after* the CAR address.
- **Returns:** Deployed contract instance.
- **Usage:**
  ```js
  const myContract = await deployAndRegisterContract("MyContract", car, "IMyContract", arg1, arg2);
  ```

### deployAndAuthorizeContract
- **Description:** Deploys a contract and authorizes it in CAR. It attempts to register the contract using its `INTERFACE_ID()` function if present, otherwise it falls back to a convention like `I<ContractName>`. The CAR address is automatically passed as the first constructor argument to the deploying contract.
- **Parameters:**
  - `contractName` (string): Name of the contract to deploy.
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `...args`: Additional constructor arguments to be passed to the contract *after* the CAR address.
- **Returns:** Deployed contract instance.
- **Usage:**
  ```js
  const myOtherContract = await deployAndAuthorizeContract("MyOtherContract", car, arg1);
  ```

### setupPirateSkills
- **Description:** Sets up predefined character, tools, special, ship, and magic skills for Genesis and Inhabitant pirates.
- **Parameters:**
  - `pirateSkills` (contract): Instance of the PirateSkills contract.
  - `admin` (signer): Admin signer.
  - `genesisPiratesAddress` (address): Address of the Genesis Pirates NFT contract.
  - `inhabitantsAddress` (address): Address of the Inhabitants NFT contract.
  - `pirateIds` (object, optional): Object with `genesis` and `inhabitants` arrays of token IDs. Defaults to `{genesis: [1, 2], inhabitants: [1, 2]}`.
- **Returns:** None

### setupCrewForPirates
- **Description:** Adds a specified type and count of crew to Genesis and Inhabitant pirates.
- **Parameters:**
  - `crewManagement` (contract): Instance of the CrewManagement contract.
  - `admin` (signer): Admin signer.
  - `genesisPiratesAddress` (address): Address of the Genesis Pirates NFT contract.
  - `inhabitantsAddress` (address): Address of the Inhabitants NFT contract.
  - `user` (signer): User signer (owner of the crew).
  - `pirateIds` (object, optional): Object with `genesis` and `inhabitants` arrays of token IDs. Defaults to `{genesis: [1, 2], inhabitants: [1, 2]}`.
  - `crewType` (string, optional): Type of crew (e.g., "sailor"). Defaults to "sailor".
  - `crewCounts` (object, optional): Object with `captain` and `crew` counts. Defaults to `{captain: 3, crew: 2}`.
- **Returns:** None

### setMissionActive
- **Description:** Sets a mission as active or inactive in a MockMissionsStorage contract for a given ship ID.
- **Parameters:**
  - `missionsStorage` (contract): Instance of the MockMissionsStorage contract.
  - `shipId` (number | string | BigInt): ID of the ship.
  - `active` (boolean): True to set active, false for inactive.
- **Returns:** None

### logContractAddresses
- **Description:** Logs and returns contract addresses from CAR for a given array of string keys.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `contractKeys` (array, optional): Array of string keys (e.g., ["IShipMetadata", "FeeManagement"]). Defaults to a predefined list if null.
- **Returns:** Object mapping keys to their addresses.

### logCrewRequirements
- **Description:** Logs and returns detailed crew requirements and current crew counts for a specific pirate on a ship.
- **Parameters:**
  - `shipMetadata` (contract): ShipMetadata contract instance.
  - `crewManagement` (contract): CrewManagement contract instance.
  - `crewTypeManager` (contract): CrewTypeManager contract instance.
  - `shipId` (number | string | BigInt): ID of the ship.
  - `pirateId` (number | string | BigInt): ID of the pirate.
  - `collection` (address): Address of the pirate's NFT collection.
- **Returns:** Object containing `shipAttrs`, `crewTypes`, `crewCounts`, `essentialTypes`, `essentialCount`.

### setupShipMetadata
- **Description:** Sets up or updates ship metadata for one or more ships.
- **Parameters:**
  - `shipMetadata` (contract): ShipMetadata contract instance.
  - `admin` (signer): Admin signer.
  - `shipIds` (number | array): A single ship ID or an array of ship IDs.
  - `attributes` (object, optional): Object containing ship attributes. If null, default attributes are used. `cargoBay` is expected in base units if default, or wei if provided in `attributes`.
- **Returns:** None

### setupStakingEnvironment
- **Description:** Prepares NFTs (ShipNFT, GenesisPirates, Inhabitants) and contracts for staking tests, including minting and approvals for a user.
- **Parameters:**
  - `shipNFT` (contract): ShipNFT contract instance.
  - `genesisPiratesNFT` (contract): GenesisPirates NFT contract instance.
  - `inhabitantsNFT` (contract): Inhabitants NFT contract instance.
  - `shipAndPirateStaking` (contract): ShipAndPirateStaking contract instance.
  - `user` (signer): User signer to receive NFTs and make approvals.
  - `shipIds` (array, optional): Array of ship IDs to mint. Defaults to `[1, 2]`.
  - `approveForStaking` (boolean, optional): Whether to approve NFTs for staking. Defaults to `true`.
- **Returns:** None

### stakeShipWithPirates
- **Description:** Stakes a ship with a captain and optional crew members using the `ShipAndPirateStaking` contract.
- **Parameters:**
  - `shipAndPirateStaking` (contract): ShipAndPirateStaking contract instance.
  - `user` (signer): User signer performing the staking.
  - `shipId` (number | string | BigInt): ID of the ship to stake.
  - `captainId` (number | string | BigInt): ID of the captain pirate.
  - `captainCollection` (address): Address of the captain's NFT collection.
  - `genesisPirateIds` (array, optional): Array of Genesis Pirate IDs for crew. Defaults to `[]`.
  - `inhabitantIds` (array, optional): Array of Inhabitant IDs for crew. Defaults to `[]`.
  - `homeIslandId` (number | string | BigInt, optional): ID of the home island. Defaults to `1`.
  - `shipClass` (string, optional): Class of the ship. Defaults to `"Small"`.
  - `options` (object, optional): Object with `returnTxPromise` (boolean). If true, returns the transaction promise instead of waiting for receipt.
- **Returns:** Transaction receipt (default) or transaction promise (if `options.returnTxPromise` is true).

### initializeShipStorage
- **Description:** Initializes storage for one or more ships in the ShipStorage contract.
- **Parameters:**
  - `shipStorage` (contract): ShipStorage contract instance.
  - `shipIds` (number | array): A single ship ID or an array of ship IDs.
- **Returns:** None

### registerContractAddresses
- **Description:** Registers multiple contract addresses in CAR using string keys.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `contractAddresses` (object): Object mapping string keys to addresses (e.g., `{"IMyInterface": "0x123..."}`).
- **Returns:** None

### deployAndRegisterMock
- **Description:** Deploys a mock contract, authorizes it in CAR, and registers it using a specific string key. Assumes mock constructor takes CAR address.
- **Parameters:**
  - `contractName` (string): Name of the mock contract (must have an artifact).
  - `registryKey` (string): The string key for CAR registration.
  - `centralAuthorizationRegistry` (contract): CAR instance.
- **Returns:** Deployed mock contract instance.

### deployMockMissionsStorage
- **Description:** Deploys and registers a `MockMissionsStorage` contract.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract): CAR instance.
- **Returns:** Deployed `MockMissionsStorage` instance.

### deployMockBuildingStorage
- **Description:** Deploys and registers a `MockBuildingStorage` contract.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract): CAR instance.
- **Returns:** Deployed `MockBuildingStorage` instance.

### setupTokenInfrastructure
- **Description:** Deploys ARRC and RUM (DummyERC20Burnable) tokens and FeeManagement. Mints tokens to admin and optionally to specified users, setting approvals for FeeManagement and optionally ShipAndPirateStaking.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `admin` (signer): Admin signer.
  - `users` (array, optional): Array of user signers to receive tokens. Defaults to `[]`.
  - `tokenAmount` (string, optional): Amount of tokens (as a string, e.g., "1000") to mint/transfer to each user. Defaults to "1000".
- **Returns:** `{ arrcToken, rumToken, feeManagement }`

### setupGenesisPiratesNFT
- **Description:** Deploys `SimpleERC1155` as Genesis Pirates NFT, registers it in CAR, and mints specified token IDs to users.
- **Parameters:**
  - `admin` (signer): Admin signer.
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `users` (array, optional): Array of user signers to receive NFTs. Defaults to `[]`.
  - `pirateIds` (array, optional): Array of pirate token IDs to mint. Defaults to `[1, 2, 3]`.
- **Returns:** `{ genesisPiratesNFT, genesisPiratesAddress }`

### setupInhabitantsNFT
- **Description:** Deploys `SimpleERC721` as Inhabitants NFT, registers it in CAR, and mints a specified count of NFTs to users.
- **Parameters:**
  - `admin` (signer): Admin signer.
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `users` (array, optional): Array of user signers to receive NFTs. Defaults to `[]`.
  - `count` (number, optional): Number of NFTs to mint to each user (token IDs will be 1 to count). Defaults to `3`.
- **Returns:** `{ inhabitantsNFT, inhabitantsAddress }`

### setupNFTsForStaking
- **Description:** Deploys ShipNFT, Genesis Pirates NFT (SimpleERC1155), and Inhabitants NFT (SimpleERC721). Also deploys a SimpleERC721 as IslandNFT. Registers pirate NFTs in CAR.
- **Parameters:**
  - `admin` (signer): Admin signer.
  - `user` (signer): User signer (typically to receive some NFTs).
  - `centralAuthorizationRegistry` (contract): CAR instance.
- **Returns:** `{ shipNFT, genesisPiratesNFT, genesisPiratesAddress, inhabitantsNFT, inhabitantsAddress, islandNft, genesisIslandsAddress }`

### setupStakingRequirements
- **Description:** Deploys and registers a suite of core contracts necessary for staking operations, including skills, metadata, storage, and crew management components.
- **Parameters:**
  - `admin` (signer): Admin signer.
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `nfts` (object): Object containing NFT instances and addresses (typically from `setupNFTsForStaking`). Requires `genesisPiratesAddress`, `inhabitantsAddress`, `shipNFT`.
- **Returns:** `{ pirateSkills, pirateSkillsReader, shipMetadata, shipStorage, crewTypeManager, crewManagement, missionsStorage (mock) }`

### prepareAssetsForStaking
- **Description:** A comprehensive helper to prepare ships, pirate NFTs, metadata, skills, crew, and approvals for staking tests based on a configuration object.
- **Parameters:**
  - `user` (signer): User signer.
  - `admin` (signer): Admin signer.
  - `contracts` (object): Object containing core contract instances (e.g., `shipMetadata`, `shipStorage`, `shipAndPirateStaking`, `pirateSkills`, `crewManagement`).
  - `nfts` (object): Object containing NFT instances and addresses (e.g., `shipNFT`, `genesisPiratesNFT`, `inhabitantsNFT`, `genesisPiratesAddress`, `inhabitantsAddress`).
  - `config` (object): Configuration object detailing `ships`, `pirates`, `shipAttributes`, and `crew` setups.
- **Returns:** None

### createNonNFTCrewSkills
- **Description:** Creates a crew skills object structure (conforming to `CrewTypeManager`'s expected format for non-NFT crew) for testing purposes.
- **Parameters:**
  - `options` (object, optional): Object with skill names (e.g., `farming`, `fishing`) and their values, plus `name`, `canBeEssentialCrew`, `isValid`.
- **Returns:** Crew skills object.

### setupCoreGameContracts
- **Description:** Deploys and registers a comprehensive suite of core game contracts including tokens, storage contracts for various entities (islands, pirates, inhabitants, ships), resource management, crew management, skills, ship/staking systems, and mission infrastructure.
- **Parameters:**
  - `admin` (signer): Admin signer.
  - `user` (signer): Primary user signer.
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `nfts` (object): Object from `setupNFTsForStaking` (requires `shipNFT`, `genesisPiratesAddress`, `inhabitantsAddress`, `genesisIslandsAddress`).
  - `options` (object, optional):
    - `deployRealMissionsStorage` (boolean): If true, deploys real `MissionsStorage`; otherwise, `MockMissionsStorage`. Defaults to `false` (mock).
    - `tokenSetupResult` (object): Optional. If provided, uses existing `arrcToken`, `rumToken`, `feeManagement`. Otherwise, deploys them.
- **Returns:** Object containing all deployed core contract instances.

### prepareShipForJourney
- **Description:** Prepares a ship and user for a journey (rebase or mission) by ensuring necessary ARRC/RUM tokens and food resources (primary and ration) are available and loaded into ship storage.
- **Parameters:**
  - `user` (signer): The user undertaking the journey.
  - `admin` (signer): The admin signer (for minting/adding resources if needed).
  - `contracts` (object): Contains `arrcToken`, `rumToken`, `feeManagement`, `shipStorage`, `resourceSpendManagement`.
  - `journeyDetails` (object):
    - `shipId` (number|string)
    - `travelDays` (number)
    - `foodPrimaryType` (string)
    - `nftCrewCount` (number, required if `rumAmountToBurn` is not set)
    - `totalFoodCrewCount` (number, required if food types are set)
    - `foodRationType` (string, optional)
    - `arrcFee` (BigInt, optional): Specific ARRC fee.
    - `rumAmountToBurn` (BigInt, optional): Specific RUM to burn (in wei), overrides calculation.
    - `overrideLoadAmounts` (object, optional): Map of resource name to BigInt amount (in wei) to load, overriding calculation.
- **Returns:** Promise<Object> containing `expectedPrimaryFoodToBurnWei`, `expectedRationFoodToBurnWei`, `actuallyLoadedPrimary`, `actuallyLoadedRation`, `expectedRumToBurnWei`, `arrcFeeProvided`.

### setupEmptyResourceProduction
- **Description:** Ensures specified resources have no production input/byproduct requirements in `ResourceSpendManagement` and attempts to add them to `ResourceTypeManager` (ignoring errors if they already exist).
- **Parameters:**
  - `admin` (signer): Admin signer.
  - `resourceSpendManagement` (contract): `ResourceSpendManagement` instance.
  - `resourceTypeManager` (contract): `ResourceTypeManager` instance.
  - `resourceNames` (array of strings): E.g., `["citrus", "fish"]`.
- **Returns:** None

### Skills Helpers (from `./utils/skills-helpers`)
- **`setupPirateWithSkills`**
- **`verifyPirateSkills`**
- **`createCrewSkills`**
- **`setupPirateSkillsViaPirateManagement`**
- **Description:** These are imported from `test/utils/skills-helpers.js`. Refer to that file for detailed parameters and descriptions. They are used for more advanced or specific pirate skill setups and verifications.
- **Parameters/Returns:** See `test/utils/skills-helpers.js` for details.

---

**Tip:** For the latest and most detailed usage, always check the function source in `test/utils.js`.
