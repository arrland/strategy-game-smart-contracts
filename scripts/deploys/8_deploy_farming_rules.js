const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying ResourceFarmingRules with account:", deployer.address);

    // Get network-specific CentralAuthRegistry address
    let centralAuthRegistryAddress;
    if (network.name === "amoy") {
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    console.log("Using CentralAuthRegistry:", centralAuthRegistryAddress);

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);

    // Deploy ResourceFarmingRules
    const resourceFarmingRules = await deployAndAuthorizeContract(
        "ResourceFarmingRules",
        centralAuthorizationRegistry
    );

    console.log("\nResourceFarmingRules deployed to:", await resourceFarmingRules.getAddress());

    // Wait for verification
    console.log("\nWaiting 10 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Verify contract
    try {
        await hre.run("verify:verify", {
            address: await resourceFarmingRules.getAddress(),
            constructorArguments: [centralAuthRegistryAddress],
        });
        console.log("Contract verified successfully");
    } catch (error) {
        console.error("Error verifying contract:", error);
        console.log("\nTo verify manually:");
        console.log(`npx hardhat verify --network ${network.name} ${await resourceFarmingRules.getAddress()} ${centralAuthRegistryAddress}`);
    }

    return {
        resourceFarmingRules: await resourceFarmingRules.getAddress()
    };
}

// To run on Polygon mainnet:
// npx hardhat run scripts/deploys/8_deploy_farming_rules.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/deploys/8_deploy_farming_rules.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });