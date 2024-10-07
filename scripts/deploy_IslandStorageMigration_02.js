// scripts/deploy_IslandStorageMigration.js
const { ethers } = require("hardhat");
const { checkContractDeployed, deployAndAuthorizeContract } = require("./utils");
const path = require('path');
const fs = require('fs');

async function getAllOwners() {
    const ownersPath = path.join(__dirname, 'owners.csv');
    const ownersData = fs.readFileSync(ownersPath, 'utf8');
    const owners = ownersData.split('\n').map(line => line.trim());
    return Array.from(owners);
}

async function main() {
    const [admin] = await ethers.getSigners();
    let centralAuthorizationRegistryAddress, GENESIS_ISLANDS_ADDRESS, OLD_ISLAND_STORAGE_ADDRESS, NEW_ISLAND_STORAGE_ADDRESS, NEW_ISLAND_MANAGEMENT_ADDRESS;
    

    if (network.name === "amoy") {
        centralAuthorizationRegistryAddress = "0x99a764fd156083aA343e2577C348c8cF110C7141";
        GENESIS_ISLANDS_ADDRESS = "0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59";
        OLD_ISLAND_STORAGE_ADDRESS = "0xd6D83A36a5feCd3C2Ca64f94dac1B431Bd9C6041";
        NEW_ISLAND_MANAGEMENT_ADDRESS = "0x326E6d79d2d1f9B9476da9863D65596Ca8A6515B";
    } else {
        centralAuthorizationRegistryAddress = "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";
        GENESIS_ISLANDS_ADDRESS = "0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1";
        OLD_ISLAND_STORAGE_ADDRESS = "0xAeB73203c0b648F143C1234b0b62906519b98aD5";
        NEW_ISLAND_STORAGE_ADDRESS = "0x5112435C6f6a9Bb10925BCaE523A7E758e45eF2B";
        NEW_ISLAND_MANAGEMENT_ADDRESS = "0xa28F15cf6F9E616A8870563325A47765B92a0290";
    }

    const owners = await getAllOwners();



    if (owners.length === 0) {
        throw new Error("No owners found for the given contract address.");
    }

    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    const centralAuthorizationRegistry = await CentralAuthorizationRegistry.attach(centralAuthorizationRegistryAddress);

    const IslandStorage = await ethers.getContractFactory("IslandStorage");
    const islandStorage = await IslandStorage.deploy(centralAuthorizationRegistryAddress, GENESIS_ISLANDS_ADDRESS, true);
    const newIslandStorageAddress = await islandStorage.getAddress();
    await checkContractDeployed(newIslandStorageAddress);

    console.log("IslandStorage deployed to:", newIslandStorageAddress);

    const IslandStorageMigration = await ethers.getContractFactory("IslandStorageMigration");
    const islandStorageMigration = await IslandStorageMigration.deploy(
        centralAuthorizationRegistryAddress,
        OLD_ISLAND_STORAGE_ADDRESS,
        NEW_ISLAND_STORAGE_ADDRESS,        
        GENESIS_ISLANDS_ADDRESS,        
        NEW_ISLAND_MANAGEMENT_ADDRESS
    );

    await checkContractDeployed(await islandStorageMigration.getAddress());

    console.log("IslandStorageMigration deployed to:", await islandStorageMigration.getAddress());

    const batchSize = 3;
    for (let i = 0; i < owners.length; i += batchSize) {
        const batchOwners = owners.slice(i, i + batchSize);
        await islandStorageMigration.migrateAllOwners(batchOwners, { gasLimit: '30000000' });
        console.log(`Batch migration completed for owners: ${batchOwners.join(', ')}`);
    }


    console.log(`npx hardhat verify --network ${network.name} 0x5F55943c56c73DE8e292b6491a8f3B7A54a5aE20 ${centralAuthorizationRegistryAddress} ${OLD_ISLAND_STORAGE_ADDRESS} ${NEW_ISLAND_STORAGE_ADDRESS} ${GENESIS_ISLANDS_ADDRESS} ${NEW_ISLAND_MANAGEMENT_ADDRESS}`);
    console.log(`npx hardhat verify --network ${network.name} ${NEW_ISLAND_STORAGE_ADDRESS} ${centralAuthorizationRegistryAddress} ${GENESIS_ISLANDS_ADDRESS} true`);
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });