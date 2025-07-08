const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Hardcoded addresses for Polygon/Amoy networks
    let centralAuthRegistryAddress;

    // Check if we're on Polygon mainnet or Amoy testnet
    if (network.name === "amoy") {
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    console.log("Using CentralAuthRegistry address:", centralAuthRegistryAddress);

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);


    // Deploy UpgradeConstructionTime
    const upgradeConstructionTime = await deployAndAuthorizeContract(
        "UpgradeConstructionTime",
        centralAuthorizationRegistry
    );

    // Log deployed contract address and parameters
    console.log("\nDeployed Contract:");
    console.log("-------------------");
    console.log("UpgradeConstructionTime:");
    console.log("- Address:", await upgradeConstructionTime.getAddress());
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("-------------------\n");

    // Wait before verification
    console.log("Waiting 10 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log("Wait complete, proceeding with verification");

    // Verify contract
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contract on Etherscan...");
        
        const verifyCommand = `npx hardhat verify --network ${network.name} ${await upgradeConstructionTime.getAddress()} ${centralAuthRegistryAddress}`;
        console.log("\nTo verify manually, run:");
        console.log(verifyCommand);

        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            const { stdout, stderr } = await execPromise(verifyCommand);
            
            if (stderr) {
                console.error("Verification error:", stderr);
            } else {
                console.log("Verification output:", stdout);
                console.log("Contract verified successfully");
            }
        } catch (error) {
            console.error("Error during verification:", error.message);
        }
    }

    return {
        upgradeConstructionTime: await upgradeConstructionTime.getAddress(),
        centralAuthRegistry: centralAuthRegistryAddress
    };
}

// To run on Polygon mainnet:
// npx hardhat run scripts/deploys/deploy_upgrade_construction_time.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/deploys/deploy_upgrade_construction_time.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 