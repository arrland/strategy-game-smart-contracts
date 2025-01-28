const { ethers, network } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Get current gas prices
    const feeData = await ethers.provider.getFeeData();
    console.log("\nCurrent Gas Prices:");
    console.log("-------------------");
    console.log("🏷️  Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
    if (feeData.maxFeePerGas) {
        console.log("💰 Max Fee:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
        console.log("💎 Max Priority Fee:", ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
    }
    console.log("-------------------\n");

    // Get network-specific addresses
    let centralAuthRegistryAddress;
    let genesisPiratesAddress;
    let genesisIslandsAddress;
    let inhabitantsAddress;

    if (network.name === "amoy") {
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
        genesisPiratesAddress = '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942';
        genesisIslandsAddress = '0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59';
        inhabitantsAddress = '0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654';
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
        genesisPiratesAddress = '0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c';
        genesisIslandsAddress = '0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1';
        inhabitantsAddress = '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c';
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    const centralAuthorizationRegistry = await ethers.getContractAt(
        "CentralAuthorizationRegistry",
        centralAuthRegistryAddress
    );

    const OldstorageManagementAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    );
    console.log("Current StorageManagement address:", OldstorageManagementAddress);

    const oldStorageManagement = await ethers.getContractAt("StorageManagement", OldstorageManagementAddress);

    // Get storage addresses for pirates and inhabitants
    const oldPirateStorageAddress = await oldStorageManagement.getStorageByCollection(genesisPiratesAddress);
    const oldInhabitantStorageAddress = await oldStorageManagement.getStorageByCollection(inhabitantsAddress);
    const oldIslandStorageAddress = await oldStorageManagement.getStorageByCollection(genesisIslandsAddress);

    // Deploy ResourceTypeManager first
    const resourceTypeManager = await deployAndAuthorizeContract(
        "ResourceTypeManager",
        centralAuthorizationRegistry
    );
    const resourceTypeManagerAddress = await resourceTypeManager.getAddress();

    // Deploy ResourceFarmingRules
    const resourceFarmingRules = await deployAndAuthorizeContract(
        "ResourceFarmingRules",
        centralAuthorizationRegistry
    );
    const resourceFarmingRulesAddress = await resourceFarmingRules.getAddress();

    // Deploy StorageManagement
    const storageManagement = await deployAndAuthorizeContract(
        "StorageManagement",
        centralAuthorizationRegistry,
        genesisPiratesAddress,
        genesisIslandsAddress, 
        inhabitantsAddress,
        oldPirateStorageAddress,
        oldIslandStorageAddress,
        oldInhabitantStorageAddress
    );
    const storageManagementAddress = await storageManagement.getAddress();

    // Deploy ResourceSpendManagement
    const resourceSpendManagement = await deployAndAuthorizeContract(
        "ResourceSpendManagement",
        centralAuthorizationRegistry
    );
    const resourceSpendManagementAddress = await resourceSpendManagement.getAddress();

    // Log deployment details
    console.log("\nDeployed Contracts:");
    console.log("-------------------");
    console.log("ResourceTypeManager:");
    console.log("- Address:", resourceTypeManagerAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);

    console.log("\nResourceFarmingRules:");
    console.log("- Address:", resourceFarmingRulesAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);

    console.log("\nStorageManagement:");
    console.log("- Address:", storageManagementAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - GenesisPirates:", genesisPiratesAddress);
    console.log("  - GenesisIslands:", genesisIslandsAddress);
    console.log("  - Inhabitants:", inhabitantsAddress);
    console.log("  - PirateStorage:", oldPirateStorageAddress);
    console.log("  - IslandStorage:", oldIslandStorageAddress);
    console.log("  - InhabitantStorage:", oldInhabitantStorageAddress);

    console.log("\nResourceSpendManagement:");
    console.log("- Address:", resourceSpendManagementAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("-------------------\n");

    // Verify contracts if ETHERSCAN_API_KEY is available
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contracts on Etherscan...");

        const contracts = [
            {
                name: "ResourceTypeManager",
                address: resourceTypeManagerAddress,
                constructorArguments: [centralAuthRegistryAddress]
            },
            {
                name: "ResourceFarmingRules",
                address: resourceFarmingRulesAddress,
                constructorArguments: [centralAuthRegistryAddress]
            },
            {
                name: "StorageManagement",
                address: storageManagementAddress,
                constructorArguments: [centralAuthRegistryAddress, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, oldPirateStorageAddress, oldIslandStorageAddress, oldInhabitantStorageAddress]
            },
            {
                name: "ResourceSpendManagement",
                address: resourceSpendManagementAddress,
                constructorArguments: [centralAuthRegistryAddress]
            }
        ];

        // Log verification commands
        console.log("\nTo verify contracts manually, run the following commands:\n");
        for (const contract of contracts) {
            console.log(`npx hardhat verify --network ${network.name} ${contract.address} ${contract.constructorArguments.join(' ')}`);
        }

        // Run verify commands sequentially
        console.log("\nVerifying contracts sequentially...");
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        for (const contract of contracts) {
            try {
                const command = `npx hardhat verify --network ${network.name} ${contract.address} ${contract.constructorArguments.join(' ')}`;
                console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
                
                const { stdout, stderr } = await execPromise(command);
                
                if (stderr) {
                    console.error(`Error verifying ${contract.name}:`, stderr);
                    continue;
                }
                
                console.log(`${contract.name} verified successfully!`);
                console.log(stdout);
                
                // Add small delay between verifications
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error verifying ${contract.name}:`, error.message);
            }
        }
    }

    return {
        resourceTypeManager: resourceTypeManagerAddress,
        resourceFarmingRules: resourceFarmingRulesAddress,
        storageManagement: storageManagementAddress,
        resourceSpendManagement: resourceSpendManagementAddress,
        centralAuthorizationRegistry: centralAuthRegistryAddress
    };
}

// To run on Polygon mainnet:
// npx hardhat run scripts/deploys/11_deploy_new_farming_rules.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/deploys/11_deploy_new_farming_rules.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
