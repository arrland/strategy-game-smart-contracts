# Unit Testing Guidelines for Smart Contracts

## Introduction

This document outlines best practices and standards for unit testing smart contracts in our blockchain projects. Following these guidelines will ensure that tests are comprehensive, maintainable, and effective at identifying issues before deployment.

## Table of Contents

1. [Test Structure and Organization](#test-structure-and-organization)
2. [Setup and Deployment](#setup-and-deployment)
3. [Test Patterns](#test-patterns)
4. [Testing Different Scenarios](#testing-different-scenarios)
5. [Helper Functions and Utilities](#helper-functions-and-utilities)
6. [Assertions and Verifications](#assertions-and-verifications)
7. [Time Manipulation](#time-manipulation)
8. [Gas Optimization Testing](#gas-optimization-testing)
9. [Security Testing](#security-testing)
10. [Integration Testing](#integration-testing)
11. [Test Documentation](#test-documentation)
12. [Test Maintenance](#test-maintenance)

## Test Structure and Organization

### Describe-It Pattern

Organize tests using the "describe-it" pattern for better readability and organization:

```javascript
describe("ContractName", function () {
    describe("FunctionName", function () {
        it("should perform expected action under normal conditions", async function () {
            // Test code
        });
        
        it("should revert when invalid parameters are provided", async function () {
            // Test code for failure case
        });
    });
});
```

### File Naming

- Name test files after the contract they test: `ContractName.test.js`
- For complex contracts with many tests, consider splitting into multiple files with descriptive suffixes:
  - `ContractName.basic.test.js`
  - `ContractName.advanced.test.js`
  - `ContractName.edge.test.js`

### Test Case Naming

Use descriptive names for test cases that explain:
1. What is being tested
2. Under what conditions
3. Expected outcome

```javascript
it("should allow farming resources when the user owns the pirate", async function () {
    // Test code
});

it("should revert when farming resources with invalid resource names", async function () {
    // Test code
});
```

## Setup and Deployment

### Contract Deployment

Use a consistent pattern for contract deployment:

```javascript
const Contract = await ethers.getContractFactory("ContractName");
const contract = await Contract.deploy(constructorArg1, constructorArg2);
```

### Before Each Hook

Use `beforeEach` to set up the test environment:

```javascript
beforeEach(async function () {
    [admin, user, pirateOwner, contractAddress1, contractAddress2] = await ethers.getSigners();
    
    // Deploy contracts
    SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
    simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

    // Initialize contracts
    // ...
});
```

### Utility Function for Deployment

Create utility functions for common deployment patterns:

```javascript
const { deployAndAuthorizeContract } = require('./utils');

resourceFarming = await deployAndAuthorizeContract(
    "ResourceFarming", 
    centralAuthorizationRegistry
);
```

## Test Patterns

### Testing State Changes

Verify state changes after contract interactions:

```javascript
// Before state
const balanceBefore = await token.balanceOf(user.address);

// Action
await contract.transfer(recipient.address, amount);

// After state
const balanceAfter = await token.balanceOf(user.address);
expect(balanceAfter).to.equal(balanceBefore - amount);
```

### Testing Events

Verify events are emitted correctly:

```javascript
await expect(
    contract.connect(user).transferResourceToCapital(
        tokenAddress,
        tokenId,
        "wood",
        amount
    )
).to.emit(contract, "ResourceTransferredToCapital");
```

### Testing Reverts

Test that functions revert when expected:

```javascript
await expect(
    contract.connect(user).farmResource(
        invalidAddress,
        tokenId,
        "fish",
        days,
        useRum,
        resourceToBurn,
        { value: ethers.parseEther("0.05") }
    )
).to.be.revertedWith("Invalid collection address");
```

## Testing Different Scenarios

### Happy Path Testing

Test the primary successful path through a function:

```javascript
it("should stake a pirate with matic", async function () {
    await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
    await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
    
    await resourceFarming.connect(pirateOwner).farmResource(
        await simpleERC1155.getAddress(),
        1,
        "fish",
        1,
        false,
        "",
        false,
        { value: ethers.parseEther("0.05") }
    );
    
    const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
    expect(workingPirates.length).to.equal(1);
    expect(workingPirates[0]).to.equal(1n);
});
```

### Negative Testing

Test expected failure cases:

```javascript
it("should not allow non-owner to cancel farming", async function () {
    await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
    await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
    
    await resourceFarming.connect(pirateOwner).farmResource(
        await simpleERC1155.getAddress(),
        1,
        "fish",
        1,
        false,
        "",
        false,
        { value: ethers.parseEther("0.05") }
    );
    
    await expect(
        resourceFarming.connect(admin).cancelFarming(await simpleERC1155.getAddress(), 1)
    ).to.be.revertedWith("You do not own this pirate");
});
```

### Edge Cases

Test edge cases and boundary conditions:

```javascript
it("should revert when farming resources for more than the maximum allowed days", async function () {
    await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
    
    const maxDaysAllowed = 28n;
    
    await expect(
        resourceFarming.connect(pirateOwner).farmResource(
            await simpleERC1155.getAddress(),
            1,
            "fish",
            maxDaysAllowed + 1n,
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") }
        )
    ).to.be.revertedWith("Exceeds maximum allowed farming days");
});
```

## Helper Functions and Utilities

### Data Loading Helpers

Create helpers for loading test data:

```javascript
async function updatePirateSkillsFromJSON(filePath, pirateManagement, admin, genesisPiratesAddress) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    
    for (const tokenSkillSet of data) {
        // Process data and update contract state
        // ...
    }
}
```

### Common Setup Functions

Create functions for common setup tasks:

```javascript
async function setupPirateWithSkills(tokenId, skills) {
    await pirateManagement.connect(admin).batchUpdatePirateAttributes(
        genesisPiratesAddress,
        [{ tokenIds: [tokenId], skills: skills }]
    );
}
```

## Assertions and Verifications

### Balance Checks

Verify token balances after operations:

```javascript
const balance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
expect(balance).to.equal(3000000000000000000n);

const balanceOfContract = await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 1);
expect(balanceOfContract).to.equal(0);
```

### Ownership Checks

Verify token ownership after transfers:

```javascript
const ownerOfToken = await inhabitantNFT.ownerOf(1);
expect(ownerOfToken).to.equal(pirateOwner.address);
```

### Array Checks

Verify array contents:

```javascript
const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
expect(workingPirates.length).to.equal(1);
expect(workingPirates[0]).to.equal(1n);
```

### Complex Data Structures

Verify complex data structures:

```javascript
const farmingInfo = await resourceFarming.getFarmingInfo(await simpleERC1155.getAddress(), 2);
expect(farmingInfo.resource).to.equal("wood");
expect(farmingInfo.days_count).to.equal(2);
expect(farmingInfo.useRum).to.equal(true);
expect(farmingInfo.resourceToBurn).to.equal("fish");
```

## Time Manipulation

### Increasing Time

Manipulate blockchain time for testing time-dependent functions:

```javascript
// Increase time by 1 day
await ethers.provider.send("evm_increaseTime", [86402]);
await ethers.provider.send("evm_mine");
```

### Testing Time-Dependent Functions

Test functions that depend on time passing:

```javascript
it("should unstake a pirate after time has passed", async function () {
    // Stake the pirate
    await resourceFarming.connect(pirateOwner).farmResource(/* ... */);
    
    // Increase time
    await ethers.provider.send("evm_increaseTime", [86402]);
    await ethers.provider.send("evm_mine");
    
    // Unstake and verify
    await resourceFarming.connect(pirateOwner).claimResourcePirate(/* ... */);
    
    // Verify the NFT is returned
    const balanceOfPirateOwner = await simpleERC1155.balanceOf(pirateOwner.address, 1);
    expect(balanceOfPirateOwner).to.equal(1);
});
```

## Gas Optimization Testing

### Gas Usage Tracking

Track gas usage for operations:

```javascript
const tx = await contract.connect(user).function(param1, param2);
const receipt = await tx.wait();
console.log(`Gas used: ${receipt.gasUsed.toString()}`);
```

### Comparing Gas Usage

Compare gas usage between different implementations:

```javascript
const tx1 = await implementationA.function(param1, param2);
const receipt1 = await tx1.wait();

const tx2 = await implementationB.function(param1, param2);
const receipt2 = await tx2.wait();

console.log(`Implementation A gas: ${receipt1.gasUsed.toString()}`);
console.log(`Implementation B gas: ${receipt2.gasUsed.toString()}`);
```

## Security Testing

### Testing Access Control

Verify access control restrictions:

```javascript
it("should not allow unauthorized users to call restricted functions", async function () {
    await expect(
        contract.connect(unauthorizedUser).restrictedFunction()
    ).to.be.revertedWith("Caller is not authorized");
});
```

### Testing Reentrancy Protection

Test for reentrancy vulnerabilities:

```javascript
it("should protect against reentrancy attacks", async function () {
    // Deploy malicious contract that attempts reentrancy
    const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await Attacker.deploy(contract.address);
    
    // Attempt attack
    await expect(
        attacker.attack()
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
});
```

## Integration Testing

### Testing Contract Interactions

Test interactions between multiple contracts:

```javascript
it("should allow transferring resources from a pirate to an island", async function () {
    // Setup pirate with resources
    await storageManagement.connect(externalCaller).addResource(
        genesisPiratesAddress, 
        1, 
        pirateOwner.address, 
        "wood", 
        ethers.parseEther("50")
    );
    
    // Set up island as capital
    await islandManagement.connect(pirateOwner).setCapitalIsland(1);
    
    // Transfer resources
    await islandManagement.connect(pirateOwner).transferResourceToCapital(
        await simpleERC1155.getAddress(),
        1,
        "wood",
        ethers.parseEther("5")
    );
    
    // Verify balances on both ends
    const pirateBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
    const islandBalance = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "wood");
    
    expect(pirateBalance).to.equal(ethers.parseEther("45"));
    expect(islandBalance).to.equal(ethers.parseEther("5"));
});
```

### End-to-End Testing

Test complete user flows:

```javascript
it("should complete the full farming lifecycle", async function () {
    // 1. Setup pirate
    await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
    await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
    
    // 2. Start farming
    await resourceFarming.connect(pirateOwner).farmResource(/* ... */);
    
    // 3. Verify farming state
    const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
    expect(workingPirates.length).to.equal(1);
    
    // 4. Increase time
    await ethers.provider.send("evm_increaseTime", [86402]);
    await ethers.provider.send("evm_mine");
    
    // 5. Claim resources
    await resourceFarming.connect(pirateOwner).claimResourcePirate(/* ... */);
    
    // 6. Verify final state
    const balance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
    expect(balance).to.be.greaterThan(0);
    
    const balanceOfPirateOwner = await simpleERC1155.balanceOf(pirateOwner.address, 1);
    expect(balanceOfPirateOwner).to.equal(1);
});
```

## Test Documentation

### Test Case Comments

Add comments to explain complex test cases:

```javascript
/**
 * Tests the complete lifecycle of farming resources with a pirate:
 * 1. Minting and approving the pirate NFT
 * 2. Starting farming with specific parameters
 * 3. Advancing time to simulate farming duration
 * 4. Claiming resources and verifying balances
 */
it("should complete the full farming lifecycle", async function () {
    // Test code...
});
```

### Using Descriptive Variable Names

Use clear variable names that explain their purpose:

```javascript
// Good
const initialPirateBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
const resourceTransferAmount = ethers.parseEther("5");

// Instead of:
const b1 = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
const amt = ethers.parseEther("5");
```

## Test Maintenance

### Test Data Management

Separate test data from test code:

```javascript
// Store test data in separate files
const testData = require('../data/pirate_skills_test.json');

// Or define constants at the top of the file
const TEST_RESOURCES = {
    FISH: "fish",
    WOOD: "wood",
    STONE: "stone"
};
```

### Mocking External Dependencies

Mock external dependencies for isolation:

```javascript
// Mock external API or oracle
const mockOracle = await MockOracle.deploy();
await contract.setOracleAddress(await mockOracle.getAddress());

// Set mock data
await mockOracle.setPrice("ETH", ethers.parseEther("2000"));
```

## Conclusion

Following these guidelines will help ensure that our smart contracts are thoroughly tested, reliable, and maintainable. Remember that tests are a critical part of smart contract development, as bugs can lead to significant financial losses. Invest time in writing comprehensive tests that cover normal operations, edge cases, and potential attack vectors.

## References

- [Hardhat Testing Documentation](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [Chai Assertion Library](https://www.chaijs.com/)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/0.5/) 