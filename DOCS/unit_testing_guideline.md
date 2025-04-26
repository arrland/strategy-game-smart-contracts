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

- **Always use utility functions for deployment and setup**. The `test/utils.js` file provides helpers like `deployBaseInfrastructure`, `deployAndAuthorizeContract`, `setupNFTsForStaking`, `setupStakingRequirements`, and `prepareAssetsForStaking`.
- **Deploy contracts in the correct order**. Many contracts depend on others (see the deployment guide in `test/ships/ShipAndPirateStaking.deployment.md`). Use the provided helpers to ensure dependencies are respected.
- **Use fixtures for test state**. Each test suite should have a `setupFixture` function that deploys and configures all required contracts and state. Use `beforeEach` to reset state for each test.
- **Example pattern:**
  ```js
  async function setupFixture() {
    const base = await deployBaseInfrastructure();
    const nfts = await setupNFTsForStaking(base.admin, base.user, base.centralAuthorizationRegistry);
    const core = await setupStakingRequirements(base.admin, base.centralAuthorizationRegistry, nfts);
    // ...additional setup
    return { ...base, ...nfts, ...core };
  }
  beforeEach(async function () { state = await setupFixture(); });
  ```

## 2. Using Mocks

- **Use mocks only when necessary**. Most contracts are deployed as real instances. Use mocks (e.g., `MockMissionsStorage`) only for external dependencies that are not the focus of the test or are difficult to set up.
- **Deploy mocks via utility functions**. Use `deployMockMissionsStorage` from `utils.js` to deploy and register mocks.
- **Register mocks in the central registry** if required by the system.

## 3. Using and Extending Utility Functions

- **Reuse provided helpers**. The `test/utils.js` file contains helpers for common setup and actions:
  - Deployment: `deployAndAuthorizeContract`, `deployBaseInfrastructure`
  - NFT setup: `setupGenesisPiratesNFT`, `setupInhabitantsNFT`, `setupNFTsForStaking`
  - Token setup: `setupTokenInfrastructure`
  - Staking: `stakeShipWithPirates`, `prepareAssetsForStaking`
  - Skills and crew: `setupPirateSkills`, `setupCrewForPirates`
  - Metadata: `setupShipMetadata`, `initializeShipStorage`
  - Registration: `registerContractAddresses`, `registerContractInterfaces`
- **Extend utils for new patterns**. If you find yourself repeating setup or actions, add a new helper to `utils.js`.
- **Keep helpers generic and composable**. Helpers should not hardcode test-specific logic; pass parameters for flexibility.

## 4. Test Structure and Best Practices

- **Organize tests by contract and feature**. Each contract should have its own test file (e.g., `ShipAndPirateStaking.test.js`).
- **Use `describe` blocks for logical grouping**. Group related tests (e.g., deployment, staking, error handling).
- **Use fixtures and reset state**. Use a fresh fixture for each test to avoid state bleed.
- **Prefer utility functions over inline setup**. This keeps tests concise and DRY.
- **Assert on both state and events**. Check contract state, return values, and emitted events.
- **Test both success and failure cases**. Use `.to.be.revertedWith` for expected errors.
- **Example structure:**
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

- **Use clear, descriptive test names**. State what is being tested and the expected outcome.
- **Keep tests independent**. Never rely on the order of test execution.
- **Minimize direct contract interaction in tests**. Use utility functions for all repetitive actions.
- **Document complex setups**. If a test requires a non-obvious setup, add comments or extend the utils with a helper.
- **Fail fast and clearly**. Use `expect` assertions liberally to catch errors early.
- **Update tests when contracts change**. If contract interfaces or behaviors change, update both the tests and the relevant utils.

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

### deployAndAuthorizeContract
- **Description:** Deploys a contract with the CAR address as the first argument, registers its interface, and authorizes it in the registry.
- **Parameters:**
  - `contractName` (string): Name of the contract.
  - `centralAuthorizationRegistry` (contract): CAR instance.
  - `...args`: Additional constructor arguments.
- **Returns:** Deployed contract instance.
- **Usage:**
  ```js
  const pirateSkills = await deployAndAuthorizeContract("PirateSkills", car);
  ```

### deployBaseInfrastructure
- **Description:** Deploys the Central Authorization Registry and returns admin/user signers.
- **Parameters:** None
- **Returns:** `{ admin, user, centralAuthorizationRegistry }`

### registerContractInterfaces
- **Description:** Registers multiple contracts in CAR with their interface IDs.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract)
  - `contracts` (object): Name → contract instance
  - `interfaceNames` (object, optional): Name → interface ID
- **Returns:** None

### verifyContractState
- **Description:** Asserts a contract getter returns the expected value.
- **Parameters:**
  - `contract` (contract)
  - `getterFn` (string)
  - `expectedValue` (any)
  - `errorMsg` (string, optional)
- **Returns:** Actual value

### createTestConfig
- **Description:** Creates a test configuration object.
- **Parameters:**
  - `config` (object)
- **Returns:** Test config object

### setupPirateSkills
- **Description:** Sets up skills for pirates (genesis and inhabitants) for tests.
- **Parameters:**
  - `pirateSkills` (contract)
  - `admin` (signer)
  - `genesisPiratesAddress` (address)
  - `inhabitantsAddress` (address)
  - `pirateIds` (object, optional)
- **Returns:** None

### setupCrewForPirates
- **Description:** Adds crew to pirates (genesis and inhabitants) for tests.
- **Parameters:**
  - `crewManagement` (contract)
  - `admin` (signer)
  - `genesisPiratesAddress` (address)
  - `inhabitantsAddress` (address)
  - `user` (signer)
  - `pirateIds` (object, optional)
  - `crewType` (string, optional)
  - `crewCounts` (object, optional)
- **Returns:** None

### setMissionActive
- **Description:** Sets a mission as active/inactive in MockMissionsStorage.
- **Parameters:**
  - `missionsStorage` (contract)
  - `shipId` (number)
  - `active` (bool)
- **Returns:** None

### logContractAddresses
- **Description:** Logs and returns contract addresses from CAR for given keys.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract)
  - `contractKeys` (array, optional)
- **Returns:** Object of key → address

### logCrewRequirements
- **Description:** Logs and returns crew requirements for a ship.
- **Parameters:**
  - `shipMetadata` (contract)
  - `crewManagement` (contract)
  - `crewTypeManager` (contract)
  - `shipId` (number)
  - `pirateId` (number)
  - `collection` (address)
- **Returns:** Object with shipAttrs, crewTypes, crewCounts, essentialTypes, essentialCount

### setupShipMetadata
- **Description:** Sets up ship metadata for one or more ships.
- **Parameters:**
  - `shipMetadata` (contract)
  - `admin` (signer)
  - `shipIds` (number|array)
  - `attributes` (object, optional)
- **Returns:** None

### setupStakingEnvironment
- **Description:** Prepares NFTs and contracts for staking tests (minting, approvals).
- **Parameters:**
  - `shipNFT`, `genesisPiratesNFT`, `inhabitantsNFT`, `shipAndPirateStaking`, `user`, `shipIds`, `approveForStaking`
- **Returns:** None

### stakeShipWithPirates
- **Description:** Stakes a ship with captain and crew using the contract.
- **Parameters:**
  - `shipAndPirateStaking` (contract)
  - `user` (signer)
  - `shipId` (number)
  - `captainId` (number)
  - `captainCollection` (address)
  - `genesisPirateIds` (array, optional)
  - `inhabitantIds` (array, optional)
- **Returns:** Transaction

### initializeShipStorage
- **Description:** Initializes storage for one or more ships.
- **Parameters:**
  - `shipStorage` (contract)
  - `shipIds` (number|array)
- **Returns:** None

### registerContractAddresses
- **Description:** Registers contract addresses in CAR by key.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract)
  - `contractAddresses` (object: key → address)
- **Returns:** None

### deployMockMissionsStorage
- **Description:** Deploys and registers a mock missions storage contract.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract)
- **Returns:** Deployed mock contract

### setupTokenInfrastructure
- **Description:** Deploys ARRC/RUM tokens, FeeManagement, mints tokens, sets approvals.
- **Parameters:**
  - `centralAuthorizationRegistry` (contract)
  - `admin` (signer)
  - `users` (array, optional)
  - `tokenAmount` (string, optional)
- **Returns:** `{ arrcToken, rumToken, feeManagement }`

### setupGenesisPiratesNFT
- **Description:** Deploys and registers Genesis Pirates NFT, mints to users.
- **Parameters:**
  - `admin` (signer)
  - `centralAuthorizationRegistry` (contract)
  - `users` (array, optional)
  - `pirateIds` (array, optional)
- **Returns:** `{ genesisPiratesNFT, genesisPiratesAddress }`

### setupInhabitantsNFT
- **Description:** Deploys and registers Inhabitants NFT, mints to users.
- **Parameters:**
  - `admin` (signer)
  - `centralAuthorizationRegistry` (contract)
  - `users` (array, optional)
  - `count` (number, optional)
- **Returns:** `{ inhabitantsNFT, inhabitantsAddress }`

### setupNFTsForStaking
- **Description:** Deploys Ship NFT, Genesis Pirates NFT, Inhabitants NFT, and returns all.
- **Parameters:**
  - `admin` (signer)
  - `user` (signer)
  - `centralAuthorizationRegistry` (contract)
- **Returns:** Object with all NFT instances and addresses

### setupStakingRequirements
- **Description:** Deploys and registers all core contracts needed for staking.
- **Parameters:**
  - `admin` (signer)
  - `centralAuthorizationRegistry` (contract)
  - `nfts` (object)
- **Returns:** Object with all core contract instances

### prepareAssetsForStaking
- **Description:** Prepares ships, metadata, and approvals for staking tests.
- **Parameters:**
  - `user` (signer)
  - `admin` (signer)
  - `contracts` (object)
  - `nfts` (object)
  - `config` (object)
- **Returns:** None

### createNonNFTCrewSkills
- **Description:** Creates a crew skills object for non-NFT crew types.
- **Parameters:**
  - `options` (object, optional)
- **Returns:** Crew skills object

### setupPirateWithSkills, verifyPirateSkills, createCrewSkills, setupPirateSkillsViaPirateManagement
- **Description:** Helpers imported from `utils/skills-helpers.js` for advanced pirate skill setup and verification.
- **Parameters/Returns:** See `skills-helpers.js` for details.

---

**Tip:** For the latest and most detailed usage, always check the function source in `test/utils.js`.
