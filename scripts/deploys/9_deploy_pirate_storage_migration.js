// ## Testnet Amoy Deployed Addresses

// The following are the addresses of the deployed contracts on the Amoy testnet:

// - **CentralAuthorizationRegistry**: 0x99a764fd156083aA343e2577C348c8cF110C7141
// - **ResourceTypeManager**: 0x8C6F2881a25a1b699ccC1A728901fefD6811b2aa
// - **ResourceManagement**: 0x52b107ECd25148239A827FDE5b39246516825657 
// - **FeeManagement**: 0x9f9582f104e352528BDd4B4af1CCe5577B5A9A2b
// - **PirateManagement**: 0xE7039a9e36f0facf3d9815564C3a5a97728E52DE
// - **PirateStorage**: 0x3326830Da20D336c3213024e23fB422c96E2315A
// - **InhabitantStorage**: 0x0f2c30DAA6ca392b6474E134384727D0bd256f51
// - **IslandStorage**: 0x82A5Da5aDAd824fC542249523dfAB837a8E332ef
// - **StorageManagement**: 0xD2416BfeAFdfa1C7289A86041512cE4B35403fC9
// - **ResourceSpendManagement**: 0xa2AFac25393749C3e6b094637A6138837A033266
// - **ResourceFarmingRules**: 0x044F5C6b18Ce43646670c119C56db19D16e12479
// - **ResourceFarming**: 0xFA5b69f4ee36f0a6AED92F7e4b4ff35C19642B73
// - **IslandManagement**: 0x326E6d79d2d1f9B9476da9863D65596Ca8A6515B
// - **ActivityStats**: 0xf8d6F0bEfeA585d6A2a9f55F4a84E36Bd0268Fd1
// - **BatchFarmingInfo**: 0x5AE007084c18249A5dfe0529687d6deD2c837baB
// - **ISLANDS_COLLECTION_ADDRESS**: 0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59
// - **GENESIS_PIRATES_COLLECTION_ADDRESS**: 0xbCab2d7264B555227e3B6C1eF686C5FCA3863942
// - **INHABITANTS_COLLECTION_ADDRESS**: 0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654
// - **SHIP_COLLECTION_ADDRESS**: 0xf7730613499c0d2756e555Cfeb88C6aD190c32AE
// - **RUM_TOKEN_ADDRESS**: 0x17fF13862c5665dE5676cab1db0927B4C97eebc1
// - **StorageUpgrade**: 0xcbD935feEA45019F54146A798d881BD1b132A5a5
// - **UpgradeConstructionTime**: 0x836159812D4a0D3b2f3239e7AeE1A27D9702d001

// ## Mainnet Deployed Addresses

// The following are the addresses of the deployed contracts on the Mainnet:

// - **CentralAuthorizationRegistry**: 0xdAf8728C9eD7CBCCf8E24226B0794943E394f778
// - **ResourceTypeManager**: 0xdFfc81c94Db8BAfa755545F7164F924c1aBf0125
// - **ResourceManagement**: 0x526edD73D8f331f7469b36E8485FcE643b09bACB
// - **FeeManagement**: 0xA4C960945F5fa18409D3e52692e10AE408d4AaC2
// - **PirateManagement**: 0x5d2E328Ac00043e17D539984082b38661595E34b
// - **PirateStorage**: 0xc1294579561e5337893F8253040156a89601b1FA
// - **IslandStorage**: 0xbeB04A176c8a5EC72C79c2E53C884Cf8722dF9B3
// - **IslandManagement**: 0xa28F15cf6F9E616A8870563325A47765B92a0290
// - **InhabitantStorage**: 0xa02cc67D253B22473f5c2cC5E9f5B83eCEc53f7E
// - **StorageManagement**: 0xbe501A4E5b95d9b69b29a98FFE835Bb14421B9eE
// - **ResourceSpendManagement**: 0x3fcB8A2EB956F21b81559BBF83A8A584725C3EB6
// - **ResourceFarmingRules**: 0xaC4b2bc32D23C462eb7bEED2A96E984A397B82be
// - **ResourceFarming**: 0x2B448C5218c3aABf8517B5B3DE54b0E817231daF
// - **ActivityStats**: 0x047A28670A824307bE2bFFE072246645dEFD5486
// - **BatchFarmingInfo**: 0xB3Ac4dF1dCb0102881548E76c2AAA053431ad85c
// - **ISLANDS_COLLECTION_ADDRESS**: 0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1
// - **GENESIS_PIRATES_COLLECTION_ADDRESS**: 0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c
// - **INHABITANTS_COLLECTION_ADDRESS**: 0xa1b3afc3e025c617bac5bf89ed259fdb789d506c
// - **SHIP_COLLECTION_ADDRESS**: 0x4DAeE3D7888B1CFC61432815FF209A554fbc1884
// - **StorageUpgrade**: 0x57BaD518DeF9122f143C92Df4EB67FaC425Cd160
// - **UpgradeConstructionTime**: 0x9DD91525087688d71809745cc58c04446aC8ef49




const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    let centralAuthRegistryAddress;
    let genesisPiratesAddress;
    let genesisIslandsAddress;
    let inhabitantsAddress;

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

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);

    const storageManagementAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    );
    console.log("Current StorageManagement address:", storageManagementAddress);

    const storageManagement = await ethers.getContractAt("StorageManagement", storageManagementAddress);

    // Get storage addresses for pirates and inhabitants
    const oldPirateStorageAddress = await storageManagement.getStorageByCollection(genesisPiratesAddress);
    const oldInhabitantStorageAddress = await storageManagement.getStorageByCollection(inhabitantsAddress);
    const oldIslandStorageAddress = await storageManagement.getStorageByCollection(genesisIslandsAddress);


    console.log("Old PirateStorage address:", oldPirateStorageAddress);
    console.log("Old InhabitantStorage address:", oldInhabitantStorageAddress);
    console.log("Old IslandStorage address:", oldIslandStorageAddress);

    const dummyContract = await deployAndAuthorizeContract(
        "DummyContract",
        centralAuthorizationRegistry
    );
    const dummyContractAddress = await dummyContract.getAddress();
    console.log("DummyContract address:", dummyContractAddress);
    // Deploy PirateStorage
    const newPirateStorage = await deployAndAuthorizeContract(
        "PirateStorage",
        centralAuthorizationRegistry,
        genesisPiratesAddress,
        false, // isNft721
        genesisIslandsAddress
    );
        
    // Deploy PirateStorageMigration
    const pirateStorageMigration = await deployAndAuthorizeContract(
        "PirateStorageMigration",
        centralAuthorizationRegistry,
        oldPirateStorageAddress,
        newPirateStorageAddress
    );
    const pirateStorageMigrationAddress = await pirateStorageMigration.getAddress();

    // Deploy InhabitantStorage
    const newInhabitantStorage = await deployAndAuthorizeContract(
        "InhabitantStorage",
        centralAuthorizationRegistry,
        inhabitantsAddress,
        true, // isNft721
        genesisIslandsAddress
    );
    const newInhabitantStorageAddress = await newInhabitantStorage.getAddress();

    const inhabitantStorageMigration = await deployAndAuthorizeContract(
        "InhabitantStorageMigration",
        centralAuthorizationRegistry,
        oldInhabitantStorageAddress,
        newInhabitantStorageAddress
    );
    const inhabitantStorageMigrationAddress = await inhabitantStorageMigration.getAddress();

    const newStorageManagement = await deployAndAuthorizeContract(
        "StorageManagement",
        centralAuthorizationRegistry,
        genesisPiratesAddress,
        genesisIslandsAddress, 
        inhabitantsAddress,
        newPirateStorageAddress,
        oldIslandStorageAddress,
        newInhabitantStorageAddress
    );

    const newStorageManagementAddress = await newStorageManagement.getAddress();

    const resourceFarmingRules = await deployAndAuthorizeContract(
        "ResourceFarmingRules",
        centralAuthorizationRegistry
    );
    const resourceFarmingRulesAddress = await resourceFarmingRules.getAddress();
    //Log deployed contract addresses and parameters
    console.log("\nDeployed Contracts:");
    console.log("-------------------");
    console.log("PirateStorage:");
    console.log("- Address:", newPirateStorageAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - PirateNFTCollection:", genesisPiratesAddress);
    console.log("  - IsNFT721:", false);
    console.log("  - IslandStorage:", genesisIslandsAddress);

    console.log("\nInhabitantStorage:");
    console.log("- Address:", newInhabitantStorageAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - InhabitantNFTCollection:", inhabitantsAddress);
    console.log("  - IsNFT721:", true);
    console.log("  - IslandStorage:", genesisIslandsAddress);

    console.log("\nPirateStorageMigration:");
    console.log("- Address:", pirateStorageMigrationAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - OldPirateStorage:", oldPirateStorageAddress);
    console.log("  - NewPirateStorage:", newPirateStorageAddress);
    console.log("-------------------\n");

    console.log("\nInhabitantStorageMigration:");
    console.log("- Address:", inhabitantStorageMigrationAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - OldInhabitantStorage:", oldInhabitantStorageAddress);
    console.log("  - NewInhabitantStorage:", newInhabitantStorageAddress);
    console.log("-------------------\n");

    console.log("\nStorageManagement:");
    console.log("- Address:", newStorageManagementAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - GenesisPirates:", genesisPiratesAddress);
    console.log("  - GenesisIslands:", genesisIslandsAddress);
    console.log("  - Inhabitants:", inhabitantsAddress);
    console.log("  - PirateStorage:", newPirateStorageAddress);
    console.log("  - IslandStorage:", oldIslandStorageAddress);
    console.log("  - InhabitantStorage:", newInhabitantStorageAddress);
    console.log("-------------------\n");

    console.log("\nResourceFarmingRules:");
    console.log("- Address:", resourceFarmingRulesAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("-------------------\n");

    // Verify contracts on Etherscan if API key is available
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contracts on Etherscan...");
        const contracts = [
            {
                address: newPirateStorageAddress,
                constructorArguments: [centralAuthRegistryAddress, genesisPiratesAddress, false, genesisIslandsAddress]
            },
            {
                address: pirateStorageMigrationAddress,
                constructorArguments: [centralAuthRegistryAddress, oldPirateStorageAddress, newPirateStorageAddress]
            },
            {
                address: newInhabitantStorageAddress,
                constructorArguments: [centralAuthRegistryAddress, inhabitantsAddress, true, genesisIslandsAddress]
            },
            {
                address: inhabitantStorageMigrationAddress,
                constructorArguments: [centralAuthRegistryAddress, oldInhabitantStorageAddress, newInhabitantStorageAddress]
            }
            {
                address: newStorageManagementAddress,
                constructorArguments: [centralAuthRegistryAddress, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, newPirateStorageAddress, oldIslandStorageAddress, newInhabitantStorageAddress]
            },
            {
                address: resourceFarmingRulesAddress,
                constructorArguments: [centralAuthRegistryAddress]
            }
        ];

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

    return {
        pirateStorage: newPirateStorageAddress,
        pirateStorageMigration: pirateStorageMigrationAddress,
        oldPirateStorage: oldPirateStorageAddress,
        centralAuthorizationRegistry: centralAuthorizationRegistry,
        pirateNftCollection: genesisPiratesAddress,
        islandStorage: genesisIslandsAddress,
        inhabitantStorage: newInhabitantStorageAddress,
        inhabitantStorageMigration: inhabitantStorageMigrationAddress
    };
}

// To run on Polygon mainnet:
// npx hardhat run scripts/deploys/9_deploy_pirate_storage_migration.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/deploys/9_deploy_pirate_storage_migration.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
