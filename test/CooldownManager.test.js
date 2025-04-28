const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deployBaseInfrastructure, deployAndAuthorizeContract } = require("./utils");
const path = require('path');
const fs = require('fs');

// Helper to compile and deploy MockCaller
async function deployAndAuthorizeMockCaller(deployer, registry) {
    const MockCallerFactory = await ethers.getContractFactory("MockCaller", deployer);
    const registryAddress = await registry.getAddress();
    console.log(`[CooldownManager Test] Deploying MockCaller with CAR: ${registryAddress}`)
    const mockCaller = await MockCallerFactory.deploy(registryAddress);
    await mockCaller.waitForDeployment();
    const mockCallerAddress = await mockCaller.getAddress();
    console.log(`[CooldownManager Test] MockCaller deployed at: ${mockCallerAddress}`);

    // Authorize the deployed MockCaller in the CentralAuthorizationRegistry
    console.log(`[CooldownManager Test] Authorizing MockCaller ${mockCallerAddress} in CAR ${registryAddress}`);
    await registry.connect(deployer).addAuthorizedContract(mockCallerAddress);
    console.log(`[CooldownManager Test] MockCaller authorization complete.`);

    return mockCaller;
}

describe("CooldownManager", function () {
    let admin, user, unauthorized, centralAuthorizationRegistry, cooldownManager, authorizedContract;

    // Fixture to deploy base infrastructure and CooldownManager
    async function setupFixture() {
        const base = await deployBaseInfrastructure();
        admin = base.admin;
        user = base.user;
        centralAuthorizationRegistry = base.centralAuthorizationRegistry;
        [, , unauthorized] = await ethers.getSigners(); // Assign unauthorized signer

        // Deploy CooldownManager
        const CooldownManagerFactory = await ethers.getContractFactory("CooldownManager");
        cooldownManager = await CooldownManagerFactory.deploy(await centralAuthorizationRegistry.getAddress());
        await cooldownManager.waitForDeployment();
        // Authorize CooldownManager itself in CAR (needed for its own checks?)
        // await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(await cooldownManager.getAddress());
        // Register CooldownManager interface
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("ICooldownManager"), await cooldownManager.getAddress());

        // Deploy and authorize the MockCaller using the helper
        authorizedContract = await deployAndAuthorizeMockCaller(admin, centralAuthorizationRegistry);

        return { admin, user, unauthorized, centralAuthorizationRegistry, cooldownManager, authorizedContract };
    }

    beforeEach(async function () {
        ({ admin, user, unauthorized, centralAuthorizationRegistry, cooldownManager, authorizedContract } = await loadFixture(setupFixture));
    });

    describe("Deployment", function () {
        it("Should set the correct CentralAuthorizationRegistry address", async function () {
            expect(await cooldownManager.centralAuthorizationRegistry()).to.equal(await centralAuthorizationRegistry.getAddress());
        });
    });

    describe("setCooldown", function () {
        it("Should allow an authorized contract to set a cooldown", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:1"));
            const duration = 3600; // 1 hour
            const context = "testCooldown";

            const setCooldownTx = await authorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, duration, context);
            const receipt = await setCooldownTx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const expectedEndTime = block.timestamp + duration;

            await expect(setCooldownTx)
                .to.emit(cooldownManager, "CooldownSet")
                .withArgs(entityKey, expectedEndTime, context);

            expect(await cooldownManager.getCooldownEndTime(entityKey)).to.equal(expectedEndTime);
        });

        it("Should overwrite an existing cooldown if set again", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:2"));
            const initialDuration = 100;
            const newDuration = 5000;
            const context1 = "initial";
            const context2 = "overwrite";

            // Set initial cooldown
            let tx1 = await authorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, initialDuration, context1);
            let receipt1 = await tx1.wait();
            let block1 = await ethers.provider.getBlock(receipt1.blockNumber);
            let expectedEndTime1 = block1.timestamp + initialDuration;
            expect(await cooldownManager.getCooldownEndTime(entityKey)).to.equal(expectedEndTime1);

            // Set new cooldown
            let tx2 = await authorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, newDuration, context2);
            let receipt2 = await tx2.wait();
            let block2 = await ethers.provider.getBlock(receipt2.blockNumber);
            let expectedEndTime2 = block2.timestamp + newDuration;

            await expect(tx2)
                .to.emit(cooldownManager, "CooldownSet")
                .withArgs(entityKey, expectedEndTime2, context2);
            expect(await cooldownManager.getCooldownEndTime(entityKey)).to.equal(expectedEndTime2);
        });

        it("Should prevent an unauthorized address from setting a cooldown", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:3"));
            const duration = 60;
            const context = "unauthorizedAttempt";

            // Attempt call directly from unauthorized user
            await expect(cooldownManager.connect(unauthorized).setCooldown(entityKey, duration, context))
                .to.be.reverted;
        });

        it("Should prevent a non-authorized contract from setting a cooldown", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:4"));
            const duration = 60;
            const context = "unauthorizedContractAttempt";

            // Deploy another mock caller but don't authorize it
            const MockCallerFactory = await ethers.getContractFactory("MockCaller");
            const unauthorizedContract = await MockCallerFactory.deploy(await centralAuthorizationRegistry.getAddress());
            await unauthorizedContract.waitForDeployment();

            await expect(unauthorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, duration, context))
                .to.be.reverted; // Should revert because MockCaller itself isn't authorized on CooldownManager
        });
    });

    describe("isOnCooldown", function () {
        it("Should return true if the entity is on cooldown", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:5"));
            const duration = 1000;
            await authorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, duration, "activeCooldown");

            expect(await cooldownManager.isOnCooldown(entityKey)).to.be.true;
        });

        it("Should return false if the cooldown has expired", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:6"));
            const duration = 500;
            await authorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, duration, "expiredCooldown");

            // Increase time beyond the duration
            await time.increase(duration + 1);

            expect(await cooldownManager.isOnCooldown(entityKey)).to.be.false;
        });

        it("Should return false if no cooldown was ever set", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:7_never_set"));
            expect(await cooldownManager.isOnCooldown(entityKey)).to.be.false;
        });
    });

    describe("getCooldownEndTime", function () {
        it("Should return the correct end time for an active cooldown", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:8"));
            const duration = 2000;
            const tx = await authorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, duration, "getEndTime");
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const expectedEndTime = block.timestamp + duration;

            expect(await cooldownManager.getCooldownEndTime(entityKey)).to.equal(expectedEndTime);
        });

        it("Should return 0 if no cooldown was ever set", async function () {
            const entityKey = ethers.keccak256(ethers.toUtf8Bytes("ship:9_never_set"));
            expect(await cooldownManager.getCooldownEndTime(entityKey)).to.equal(0);
        });
    });
});

// Mock contract to test authorized calls
const MOCK_CALLER_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;
import "../AuthorizationModifiers.sol";
import "../interfaces/ICooldownManager.sol";

contract MockCaller is AuthorizationModifiers {
    constructor(address _registry) AuthorizationModifiers(_registry, bytes32(0)) {}

    function callSetCooldown(address target, bytes32 key, uint256 duration, string calldata context) external {
        ICooldownManager(target).setCooldown(key, duration, context);
    }
}
`;

// Compile MockCaller before tests run
const solc = require('solc');

// Ensure the directory exists
const contractsDir = path.join(__dirname, '../contracts');
const interfacesDir = path.join(contractsDir, 'interfaces');
const mocksDir = path.join(contractsDir, 'mocks');
if (!fs.existsSync(mocksDir)) {
    fs.mkdirSync(mocksDir, { recursive: true });
}
const mockCallerPath = path.join(mocksDir, 'MockCaller.sol');

// Write the mock contract source to a temporary file
fs.writeFileSync(mockCallerPath, MOCK_CALLER_SOURCE);

// Prepare solc input
const input = {
    language: 'Solidity',
    sources: {
        'MockCaller.sol': {
            content: MOCK_CALLER_SOURCE
        },
        'AuthorizationModifiers.sol': {
            content: fs.readFileSync(path.join(contractsDir, 'AuthorizationModifiers.sol'), 'utf8')
        },
        'ICentralAuthorizationRegistry.sol': {
             content: fs.readFileSync(path.join(interfacesDir, 'ICentralAuthorizationRegistry.sol'), 'utf8')
        },
        'ICooldownManager.sol': {
            content: fs.readFileSync(path.join(interfacesDir, 'ICooldownManager.sol'), 'utf8')
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*']
            }
        },
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};

// Function to find imports
function findImports(importPath) {
    // Basic import resolution, adjust paths as necessary for your project structure
    const pathsToTry = [
        path.join(__dirname, '../../node_modules', importPath),
        path.join(contractsDir, importPath),
        path.join(interfacesDir, importPath)
    ];
    for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
            return { contents: fs.readFileSync(p, 'utf8') };
        }
    }
    return { error: 'File not found' };
}

// Compile the contract
// Load the specific compiler version
solc.loadRemoteVersion('v0.8.25+commit.b61c2a91', function(err, solcSnapshot) {
    if (err) {
        console.error("Failed to load Solc:", err);
        process.exit(1);
    }
    console.log("Solc v0.8.25 loaded.");
    const output = JSON.parse(solcSnapshot.compile(JSON.stringify(input), { import: findImports }));

    // Check for compilation errors
    if (output.errors) {
        output.errors.forEach(err => {
            console.error(err.formattedMessage);
        });
        if (output.errors.some(err => err.severity === 'error')) {
            throw new Error('Solidity compilation failed');
        }
    }

    // Make MockCaller artifact available to Hardhat tests
    const mockCallerArtifact = {
        _format: "hh-sol-artifact-1",
        contractName: "MockCaller",
        sourceName: "contracts/mocks/MockCaller.sol", // Relative path for hardhat
        abi: output.contracts['MockCaller.sol'].MockCaller.abi,
        bytecode: output.contracts['MockCaller.sol'].MockCaller.evm.bytecode.object,
        deployedBytecode: output.contracts['MockCaller.sol'].MockCaller.evm.deployedBytecode.object,
        linkReferences: {},
        deployedLinkReferences: {}
    };

    // Save artifact for Hardhat (optional, but good practice)
    const artifactsDir = path.join(__dirname, '../artifacts/contracts/mocks');
    if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(artifactsDir, 'MockCaller.json'), JSON.stringify(mockCallerArtifact, null, 2));
    console.log(`[CooldownManager Test Script] MockCaller artifact successfully written to: ${path.join(artifactsDir, 'MockCaller.json')}`);

}); // End solc.loadRemoteVersion callback

// Clean up temporary source file
// fs.unlinkSync(mockCallerPath); // Keep it for hardhat to find? 