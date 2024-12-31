const { ethers } = require("hardhat");
const { deployAndAuthorizeContract, authorizeDeployedContract } = require("../utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // Hardcoded addresses for Polygon/Amoy networks
    let centralAuthRegistryAddress, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, nftCollectionAddress;

    // Check if we're on Polygon mainnet or Amoy testnet


    if (network.name == "amoy") {
        // Polygon Mainnet addresses
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141'; // Replace with actual Polygon address
        genesisPiratesAddress = '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942';     // Replace with actual Polygon address
        genesisIslandsAddress = '0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59';     // Replace with actual Polygon address
        inhabitantsAddress = '0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654';        // Replace with actual Polygon address        
    } else if (network.name == "polygon") {
        // Amoy Testnet addresses  
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778'; // Replace with actual Amoy address
        genesisPiratesAddress = '0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c';     // Replace with actual Amoy address
        genesisIslandsAddress = '0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1';     // Replace with actual Amoy address
        inhabitantsAddress = '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c';        // Replace with actual Amoy address        
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    console.log("Using addresses:");
    console.log("- CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("- GenesisPirates:", genesisPiratesAddress);
    console.log("- GenesisIslands:", genesisIslandsAddress);
    console.log("- Inhabitants:", inhabitantsAddress);

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);

    // Get StorageManagement address from CentralAuthRegistry
    // const storageManagementAddress = await centralAuthorizationRegistry.getContractAddress(
    //     ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    // );
    // console.log("StorageManagement address:", storageManagementAddress);

    const storageManagementAddress = '0x4618c33C441538a5919b530d8fcD9F5Ab6301BDc';

    // Get StorageManagement contract
    const storageManagement = await ethers.getContractAt("StorageManagement", storageManagementAddress);

    // Get storage addresses for pirates and inhabitants
    const pirateStorageAddress = await storageManagement.getStorageByCollection(genesisPiratesAddress);
    const inhabitantStorageAddress = await storageManagement.getStorageByCollection(inhabitantsAddress);
    const oldIslandStorageAddress = await storageManagement.getStorageByCollection(genesisIslandsAddress);
    
    // Deploy PirateManagement
    // const pirateManagement = await deployAndAuthorizeContract(
    //     "PirateManagement",
    //     centralAuthorizationRegistry
    // );

    const pirateManagementAddress = '0x5d2E328Ac00043e17D539984082b38661595E34b';

    // Deploy ResourceFarmingRules
    // const resourceFarmingRules = await deployAndAuthorizeContract(
    //     "ResourceFarmingRules",
    //     centralAuthorizationRegistry
    // );

    const resourceFarmingRulesAddress = '0xaC4b2bc32D23C462eb7bEED2A96E984A397B82be';

    // 1. Deploy UpgradeConstructionTime
    // const upgradeConstructionTime = await deployAndAuthorizeContract(
    //     "UpgradeConstructionTime",
    //     centralAuthorizationRegistry
    // );

    const upgradeConstructionTimeAddress = '0x9DD91525087688d71809745cc58c04446aC8ef49';

    // 2. Deploy ResourceTypeManager
    // const resourceTypeManager = await deployAndAuthorizeContract(
    //     "ResourceTypeManager",
    //     centralAuthorizationRegistry
    // );

    const resourceTypeManagerAddress = '0xdFfc81c94Db8BAfa755545F7164F924c1aBf0125';

    // 3. Deploy IslandStorage
    // const islandStorage = await deployAndAuthorizeContract(
    //     "IslandStorage",
    //     centralAuthorizationRegistry,
    //     genesisIslandsAddress,
    //     true
    // );

    const islandStorageAddress = '0xbeB04A176c8a5EC72C79c2E53C884Cf8722dF9B3';

    // 4. Deploy StorageUpgrade
    // const storageUpgrade = await deployAndAuthorizeContract(
    //     "StorageUpgrade",
    //     centralAuthorizationRegistry, 
    //     genesisPiratesAddress, 
    //     genesisIslandsAddress, 
    //     inhabitantsAddress
    // );

    const storageUpgradeAddress = '0x57BaD518DeF9122f143C92Df4EB67FaC425Cd160';

    //await authorizeDeployedContract("StorageUpgrade", storageUpgradeAddress, centralAuthorizationRegistry);

    // // 5. Deploy IslandStorageMigrationV2
    // const islandStorageMigrationV2 = await deployAndAuthorizeContract(
    //     "IslandStorageMigrationV2",
    //     centralAuthorizationRegistry,
    //     oldIslandStorageAddress, // old storage
    //     islandStorageAddress, // new storage 
    //     genesisIslandsAddress // collection address
    // );

    const islandStorageMigrationV2Address = '0x93A070Db6E474eBC543ef101fd90EC3B8787B647';

    // // 6. Deploy StorageManagement
    // const newStorageManagement = await deployAndAuthorizeContract(
    //     "StorageManagement",
    //     centralAuthorizationRegistry,
    //     genesisPiratesAddress,
    //     genesisIslandsAddress, 
    //     inhabitantsAddress,
    //     pirateStorageAddress,
    //     islandStorageAddress,
    //     inhabitantStorageAddress
    // );

    const newStorageManagementAddress = '0xbe501A4E5b95d9b69b29a98FFE835Bb14421B9eE';





    // Log deployed contract addresses and parameters
    console.log("\nDeployed Contracts:");
    console.log("-------------------");
    console.log("PirateManagement:");
    console.log("- Address:", pirateManagementAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);

    console.log("\nResourceFarmingRules:");
    console.log("- Address:", resourceFarmingRulesAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);

    console.log("\nUpgradeConstructionTime:");
    console.log("- Address:", upgradeConstructionTimeAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);

    console.log("\nResourceTypeManager:");
    console.log("- Address:", resourceTypeManagerAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);

    console.log("\nIslandStorage:");
    console.log("- Address:", islandStorageAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - genesisIslandsAddress:", genesisIslandsAddress);
    console.log("  - Is NFT721:", true);

    console.log("\nStorageUpgrade:");
    console.log("- Address:", storageUpgradeAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - Genesis Pirates:", genesisPiratesAddress);
    console.log("  - Genesis Islands:", genesisIslandsAddress);
    console.log("  - Inhabitants:", inhabitantsAddress);
    console.log("-------------------\n");
    
    console.log("StorageManagement:");
    console.log("- Address:", newStorageManagementAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - Genesis Pirates:", genesisPiratesAddress);
    console.log("  - Genesis Islands:", genesisIslandsAddress);
    console.log("  - Inhabitants:", inhabitantsAddress);
    console.log("  - Pirate Storage:", pirateStorageAddress);
    console.log("  - Island Storage:", islandStorageAddress);
    console.log("  - Inhabitant Storage:", inhabitantStorageAddress);
    console.log("-------------------\n");

    console.log("IslandStorageMigrationV2:");
    console.log("- Address:", islandStorageMigrationV2Address);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - Old Island Storage:", oldIslandStorageAddress);
    console.log("  - New Island Storage:", islandStorageAddress);
    console.log("  - Collection Address:", genesisIslandsAddress);
    console.log("-------------------\n");

    // console.log("Waiting 10 seconds before verification...");
    // const waitTime = 10;
    // for (let i = waitTime; i > 0; i--) {
    //     console.log(`${i} seconds remaining...`);
    //     await new Promise(resolve => setTimeout(resolve, 1000));
    // }
    // console.log("Wait complete, proceeding with verification");

    // Verify contracts on Etherscan if API key is available
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contracts on Etherscan...");
        const contracts = [
            {
                address: pirateManagementAddress,
                constructorArguments: [centralAuthRegistryAddress]
            },
            {
                address: resourceFarmingRulesAddress,
                constructorArguments: [centralAuthRegistryAddress]
            },
            {
                address: upgradeConstructionTimeAddress,
                constructorArguments: [centralAuthRegistryAddress]
            },
            {
                address: resourceTypeManagerAddress,
                constructorArguments: [centralAuthRegistryAddress]
            },
            {
                address: islandStorageAddress,
                constructorArguments: [centralAuthRegistryAddress, genesisIslandsAddress, true]
            },
            {
                address: storageUpgradeAddress,
                constructorArguments: [centralAuthRegistryAddress, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress]
            },
            {
                address: newStorageManagementAddress,
                constructorArguments: [centralAuthRegistryAddress, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, pirateStorageAddress, islandStorageAddress, inhabitantStorageAddress]
            },
            {
                address: islandStorageMigrationV2Address,
                constructorArguments: [centralAuthRegistryAddress, oldIslandStorageAddress, islandStorageAddress, genesisIslandsAddress]
            }
        ];


        // for (const contract of contracts) {
        //     try {
        //         await hre.run("verify:verify", {
        //             address: contract.address,
        //             constructorArguments: contract.constructorArguments,
        //         });
        //         console.log(`Contract at ${contract.address} verified successfully`);
        //     } catch (error) {
        //         console.error(`Error verifying contract at ${contract.address}:`, error);
        //     }
        // }

        // Log verification commands for each contract
        console.log("\nTo verify contracts manually, run the following commands:\n");
        
        for (const contract of contracts) {
            console.log(`npx hardhat verify --network ${network.name} ${contract.address} ${contract.constructorArguments.join(' ')}`);
        }

        // Run verify commands one by one
        console.log("\nVerifying contracts sequentially...");
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        for (const contract of contracts) {
            try {
                const command = `npx hardhat verify --network ${network.name} ${contract.address} ${contract.constructorArguments.join(' ')}`;
                console.log(`\nVerifying contract at ${contract.address}...`);
                
                const { stdout, stderr } = await execPromise(command);
                
                if (stderr) {
                    console.error(`Error verifying contract at ${contract.address}:`, stderr);
                    continue;
                }
                
                console.log(`Contract at ${contract.address} verified successfully`);
                console.log(stdout);
                
                // Add small delay between verifications to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error verifying contract at ${contract.address}:`, error.message);
            }
        }


    }

    // Return all deployed addresses
    return {
        pirateManagement: pirateManagementAddress,
        resourceFarmingRules: resourceFarmingRulesAddress,
        upgradeConstructionTime: upgradeConstructionTimeAddress,
        resourceTypeManager: resourceTypeManagerAddress,
        islandStorage: islandStorageAddress,
        storageUpgrade: storageUpgradeAddress,
        islandStorageMigrationV2: islandStorageMigrationV2Address,
        centralAuthRegistry: centralAuthRegistryAddress,
        genesisPirates: genesisPiratesAddress,
        genesisIslands: genesisIslandsAddress,
        inhabitants: inhabitantsAddress
    };
}

// To run on Polygon mainnet:
// npx hardhat run scripts/deploys/7_deploy_storage_upgrade.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/deploys/7_deploy_storage_upgrade.js --network amoy
// npx hardhat run scripts/initialize_islands.js --network polygon
// npx hardhat run scripts/migrate-island-storage.js --network polygon

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 