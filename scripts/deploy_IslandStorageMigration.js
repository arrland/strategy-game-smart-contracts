// scripts/deploy_IslandStorageMigration.js
const { ethers } = require("hardhat");
const { checkContractDeployed, deployAndAuthorizeContract, verifyContract } = require("./utils");
const path = require('path');
const fs = require('fs');

async function getAllOwners(contractAddress) {
    // const contract = await ethers.getContractAt("InhabitantNFT", contractAddress);
    // const totalSupply = await contract.totalSupply();
    // const tempOwners = [];
    // const uniqueOwners = new Set();

    // for (let i = 0; i < totalSupply; i++) {
    //     const tokenId = await contract.tokenByIndex(i);
    //     const owner = await contract.ownerOf(tokenId);

    //     if (!uniqueOwners.has(owner)) {
    //         uniqueOwners.add(owner);
    //         tempOwners.push(owner);
    //     }
    // }

    // return Array.from(uniqueOwners);
    const ownersPath = path.join(__dirname, 'owners.csv');
    const ownersData = fs.readFileSync(ownersPath, 'utf8');
    const owners = ownersData.split('\n').map(line => line.trim());
    return Array.from(owners);
}


async function readUsersWithCapitalIslands(contractAddress) {
    

    // Get the contract ABI and create a contract instance
    const IslandManagement = await ethers.getContractFactory("IslandManagement");
    const islandManagement = IslandManagement.attach(contractAddress);

    // Call the getAllCapitalIslands function
    const users = await islandManagement.getUsersWithCapitalIslands();
    const capitalIslands = [];
    for (let i = 0; i < users.length; i++) {
        const capitalID = await islandManagement.getCapitalIsland(users[i]);
        capitalIslands.push(capitalID);

    }

    return {users: Array.from(users), capitalIslands: Array.from(capitalIslands)};
}

async function readAllAssignedToStorage(contractAddress) {
    const storageManagement = await ethers.getContractAt("StorageManagement", contractAddress);
    const users = await storageManagement.getAllAssignedToStorage();
    return users;
}


async function main() {
    // Get the signers
    const [admin] = await ethers.getSigners();
    let centralAuthorizationRegistryAddress;
    let GENESIS_PIRATES_ADDRESS;
    let GENESIS_ISLANDS_ADDRESS;
    let PIRATE_STORAGE_ADDRESS;
    let OLD_ISLAND_STORAGE_ADDRESS;
    let OLD_ISLAND_MANAGEMENT_ADDRESS;
    let InhabitantsAddress;
    let NEW_ISLAND_STORAGE_ADDRESS;
    let NEW_PIRATE_MANAGEMENT_ADDRESS;  
    let NEW_INHABITANT_STORAGE_ADDRESS;
    let NEW_ISLAND_STORAGE_MIGRATION_ADDRESS;
    let NEW_ISLAND_MANAGEMENT_ADDRESS;
    let NEW_STORAGE_MANAGEMENT_ADDRESS;
    if (network.name === "amoy") {
        centralAuthorizationRegistryAddress = "0x99a764fd156083aA343e2577C348c8cF110C7141";
        GENESIS_PIRATES_ADDRESS = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942";
        GENESIS_ISLANDS_ADDRESS = "0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59";
        PIRATE_STORAGE_ADDRESS = "0xE218A366e07a358Cf7782641E6CE7a7920C10A90";
        OLD_ISLAND_STORAGE_ADDRESS = "0xd8e8E86D8a86A2F07778f082C008Ee4B0a0Eebf3";
        OLD_ISLAND_MANAGEMENT_ADDRESS = "0x3538Ca3f7109652BC1B05aeC16cBc9C1B514abe9";
        InhabitantsAddress = "0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654";
    } else {
        centralAuthorizationRegistryAddress = "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";
        GENESIS_PIRATES_ADDRESS = "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c";
        GENESIS_ISLANDS_ADDRESS = "0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1";
        PIRATE_STORAGE_ADDRESS = "0xC617FE2c8B4C0dF871E07b3796Fda41BD0996E7C";
        OLD_ISLAND_STORAGE_ADDRESS = "0x784aa2dA52F97aaBDD3B6d702F566dfaa1c5124A";
        OLD_ISLAND_MANAGEMENT_ADDRESS = "0xf9F7cc10c3C8770243C6599f9455E3F341eC8E30";
        InhabitantsAddress = "0xa1B3Afc3e025C617BAc5BF89ed259FDb789d506C";
        NEW_ISLAND_STORAGE_ADDRESS = "0xAeB73203c0b648F143C1234b0b62906519b98aD5";
        NEW_PIRATE_MANAGEMENT_ADDRESS = "0x490b32F2Ee77F733F8a143deD9fB1bD8715Af86F";
        NEW_INHABITANT_STORAGE_ADDRESS = "0xa02cc67D253B22473f5c2cC5E9f5B83eCEc53f7E";
        NEW_ISLAND_STORAGE_MIGRATION_ADDRESS = "0x159Ee3453Fc6e21833cd130bE063354F5d5405A0";
        NEW_ISLAND_MANAGEMENT_ADDRESS = "0xa28F15cf6F9E616A8870563325A47765B92a0290";
        NEW_STORAGE_MANAGEMENT_ADDRESS = "0xcb38d3AcC98a4B60dA5a51ab80A9ecF1d150ae09";
    }

    const owners = await getAllOwners(GENESIS_ISLANDS_ADDRESS);
    console.log("Owners:", owners);
    

    const dataIslandManagement = await readUsersWithCapitalIslands(OLD_ISLAND_MANAGEMENT_ADDRESS);
    const capitalIslandUsers = dataIslandManagement.users;
    const capitalIslandsIDs = dataIslandManagement.capitalIslands;


    if (owners.length === 0) {
        throw new Error("No owners found for the given contract address.");
    }
    
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    const centralAuthorizationRegistry = await CentralAuthorizationRegistry.attach(centralAuthorizationRegistryAddress);  

    //const pirateManagement = await deployAndAuthorizeContract("PirateManagement", centralAuthorizationRegistry);
    
    // Deploy the new version of IslandStorage    
    //const IslandStorage = await ethers.getContractFactory("IslandStorage");
    //const islandStorage = await IslandStorage.deploy(centralAuthorizationRegistryAddress, GENESIS_ISLANDS_ADDRESS, true);
    //const NEW_ISLAND_STORAGE_ADDRESS = await islandStorage.getAddress();
    //await checkContractDeployed(NEW_ISLAND_STORAGE_ADDRESS);

    //const interfaceId = await islandStorage.INTERFACE_ID();

    //await centralAuthorizationRegistry.setContractAddress(interfaceId, NEW_ISLAND_STORAGE_ADDRESS);
    
    //await centralAuthorizationRegistry.registerPirateNftContract(InhabitantsAddress);

    // Deploy the new version of StorageManagement using deployAndAuthorizeContract
    //const storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, GENESIS_PIRATES_ADDRESS, GENESIS_ISLANDS_ADDRESS, PIRATE_STORAGE_ADDRESS, OLD_ISLAND_STORAGE_ADDRESS);
    //const islandManagement = await deployAndAuthorizeContract("IslandManagement", centralAuthorizationRegistry, GENESIS_ISLANDS_ADDRESS);
    const StorageManagement = await ethers.getContractFactory("StorageManagement");
    const storageManagement = await StorageManagement.attach(NEW_STORAGE_MANAGEMENT_ADDRESS);  



    //const NEW_ISLAND_MANAGEMENT_ADDRESS = await islandManagement.getAddress();
    //console.log("islandManagement deployed to:", NEW_ISLAND_MANAGEMENT_ADDRESS);

    // if (network.name === "amoy") {
    //     await islandStorage.initializeIslands(1);   
    //     await islandStorage.initializeIslands(13); 
    // } else {
    //     await islandStorage.initializeIslands(1);   
    //     await islandStorage.initializeIslands(2);   
    //     await islandStorage.initializeIslands(3);   
    //     await islandStorage.initializeIslands(4);   
    //     await islandStorage.initializeIslands(5);   
    //     await islandStorage.initializeIslands(6);   
    //     await islandStorage.initializeIslands(7);   
    //     await islandStorage.initializeIslands(8);   
    //     await islandStorage.initializeIslands(9);   
    //     await islandStorage.initializeIslands(10);   
    //     await islandStorage.initializeIslands(11);   
    //     await islandStorage.initializeIslands(12);   
    //     await islandStorage.initializeIslands(13);   
    //     await islandStorage.initializeIslands(14);   
    //     await islandStorage.initializeIslands(15);   
    //     await islandStorage.initializeIslands(16);  
    // }    
 
    
    
    console.log("NEW IslandStorage deployed to:", NEW_ISLAND_STORAGE_ADDRESS);

    

    //await centralAuthorizationRegistry.addAuthorizedContract(NEW_ISLAND_STORAGE_ADDRESS);

    // Deploy the InhabitantStorage contract using deployAndAuthorizeContract
    
    //const inhabitantStorage = await deployAndAuthorizeContract("InhabitantStorage", centralAuthorizationRegistry, InhabitantsAddress, true, GENESIS_ISLANDS_ADDRESS);
    //console.log("InhabitantStorage deployed to:", await inhabitantStorage.getAddress());

    await storageManagement.addStorageContract(InhabitantsAddress, NEW_INHABITANT_STORAGE_ADDRESS);

    // Deploy the IslandStorageMigration contract
    // const IslandStorageMigration = await ethers.getContractFactory("IslandStorageMigration");
    // const islandStorageMigration = await IslandStorageMigration.deploy(
    //   OLD_ISLAND_STORAGE_ADDRESS,
    //   NEW_ISLAND_STORAGE_ADDRESS,
    //   await storageManagement.getAddress(),
    //   GENESIS_ISLANDS_ADDRESS,
    //   admin.address,
    //   NEW_ISLAND_MANAGEMENT_ADDRESS

    // );

    //await checkContractDeployed(await islandStorageMigration.getAddress());

    
    const IslandStorageMigration = await ethers.getContractFactory("IslandStorageMigration");
    const islandStorageMigration = await IslandStorageMigration.attach(NEW_ISLAND_STORAGE_MIGRATION_ADDRESS);  

    //console.log("IslandStorageMigration deployed to:", await islandStorageMigration.getAddress());
    
    //await centralAuthorizationRegistry.addAuthorizedContract(await islandStorageMigration.getAddress());

    const batchSize = 3;
    for (let i = 0; i < owners.length; i += batchSize) {
        
        const batch_nr = i / batchSize + 1;
        console.log(`Batch number start: ${batch_nr}`);
        if (batch_nr <  83) {
            console.log(`Batch number skip: ${batch_nr}`);
            continue;
        }
        const batchOwners = owners.slice(i, i + batchSize);
        console.log("batchOwners:", batchOwners);
        await islandStorageMigration.migrateAllOwners(batchOwners, { gasLimit: '30000000' });
        console.log(`Batch number done: ${batch_nr}`);
        //console.log(`Batch migration completed for owners: ${batchOwners.join(', ')}`);
    }

    for (let i = 0; i < capitalIslandUsers.length; i += batchSize) {
        const batchCapitalIslandUsers = capitalIslandUsers.slice(i, i + batchSize);
        const batchCapitalIslandsIDs = capitalIslandsIDs.slice(i, i + batchSize);
        await islandStorageMigration.migrateCapitalIslands(batchCapitalIslandUsers, batchCapitalIslandsIDs);
        console.log(`Batch number: ${i / batchSize + 1}`);
        //console.log(`Batch migration completed for capital islands: ${batchCapitalIslandsIDs.join(', ')}`);
        //console.log(`Batch migration completed for capital islands: ${batchCapitalIslandUsers.join(', ')}`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Waiting for 5 seconds...");

    const oldStorageAddress = await storageManagement.getStorageByCollection(GENESIS_ISLANDS_ADDRESS);
    console.log("oldStorageAddress:", oldStorageAddress);
    console.log("OLD_ISLAND_STORAGE_ADDRESS:", OLD_ISLAND_STORAGE_ADDRESS);
    if (oldStorageAddress == OLD_ISLAND_STORAGE_ADDRESS) {
        try {
            await storageManagement.removeStorageContract(GENESIS_ISLANDS_ADDRESS);
        } catch (error) {
            console.error("Failed to remove storage contract:", error);
        }        
    }
    await storageManagement.addStorageContract(GENESIS_ISLANDS_ADDRESS, NEW_ISLAND_STORAGE_ADDRESS);
    await islandStorageMigration.updateStorageManagement();

    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Waiting for 5 seconds...");

    const newStorageAddress = await storageManagement.getStorageByCollection(GENESIS_ISLANDS_ADDRESS);
    console.log("newStorageAddress:", newStorageAddress);
    console.log("islandStorage address:", NEW_ISLAND_STORAGE_ADDRESS);
    if (newStorageAddress === NEW_ISLAND_STORAGE_ADDRESS) {
        console.log("IslandStorage is the new storage for GENESIS_ISLANDS_ADDRESS.");
    } else {
        console.log("IslandStorage is not the new storage for GENESIS_ISLANDS_ADDRESS.");
    }

    const migratedOwners = await islandStorageMigration.getMigratedOwners();
    console.log("Migrated owners:", migratedOwners.length);
    const migratedOwnersFilePath = path.join(__dirname, 'migrated_owners.txt');
    fs.writeFileSync(migratedOwnersFilePath, migratedOwners.join(', ') + '\n');
    console.log(`Migrated owners logged to file: ${migratedOwnersFilePath}`);
    // // Verify all deployed contracts
    
    const verifyCommands = [
        `npx hardhat verify --network ${network.name} ${NEW_ISLAND_STORAGE_ADDRESS} ${centralAuthorizationRegistryAddress} ${GENESIS_ISLANDS_ADDRESS} true`,
        `npx hardhat verify --network ${network.name} ${NEW_INHABITANT_STORAGE_ADDRESS} ${centralAuthorizationRegistryAddress} ${InhabitantsAddress} true ${GENESIS_ISLANDS_ADDRESS}`,
        `npx hardhat verify --network ${network.name} ${NEW_ISLAND_STORAGE_MIGRATION_ADDRESS} ${OLD_ISLAND_STORAGE_ADDRESS} ${NEW_ISLAND_STORAGE_ADDRESS} ${OLD_ISLAND_STORAGE_ADDRESS} ${GENESIS_ISLANDS_ADDRESS} ${admin.address} ${NEW_ISLAND_MANAGEMENT_ADDRESS}`,
        `npx hardhat verify --network ${network.name} ${NEW_STORAGE_MANAGEMENT_ADDRESS} ${centralAuthorizationRegistryAddress} ${GENESIS_PIRATES_ADDRESS} ${GENESIS_ISLANDS_ADDRESS} ${PIRATE_STORAGE_ADDRESS} ${OLD_ISLAND_STORAGE_ADDRESS}`,
        `npx hardhat verify --network ${network.name} ${NEW_ISLAND_MANAGEMENT_ADDRESS} ${centralAuthorizationRegistryAddress} ${GENESIS_ISLANDS_ADDRESS}`,
        `npx hardhat verify --network ${network.name} ${NEW_PIRATE_MANAGEMENT_ADDRESS} ${centralAuthorizationRegistryAddress}`
    ];

    const newDeployedAddresses = [
        `ISLAND_STORAGE_MIGRATION_ADDRESS=${NEW_ISLAND_STORAGE_MIGRATION_ADDRESS}`,
        `INHABITANT_STORAGE_ADDRESS=${NEW_INHABITANT_STORAGE_ADDRESS}`,
        `STORAGE_MANAGEMENT_ADDRESS=${NEW_STORAGE_MANAGEMENT_ADDRESS}`,
        `PIRATE_MANAGEMENT_ADDRESS=${NEW_PIRATE_MANAGEMENT_ADDRESS}`,
        `ISLAND_MANAGEMENT_ADDRESS=${NEW_ISLAND_MANAGEMENT_ADDRESS}`,
        `ISLAND_STORAGE_ADDRESS=${NEW_ISLAND_STORAGE_ADDRESS}`,
    ];

    const newDeployedAddressesFilePath = path.join(__dirname, 'new_deployed_addresses.txt');
    fs.appendFileSync(newDeployedAddressesFilePath, newDeployedAddresses.join('\n') + '\n');
    console.log(`New deployed addresses logged to file: ${newDeployedAddressesFilePath}`);

    const verifyCommandsFilePath = path.join(__dirname, 'verify_commands.txt');

    fs.writeFileSync(verifyCommandsFilePath, verifyCommands.join('\n') + '\n');

    console.log(`Verify commands logged to file: ${verifyCommandsFilePath}`);
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });