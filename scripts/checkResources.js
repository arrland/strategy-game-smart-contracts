const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

function getOwners(file_path) {
    const ownersData = fs.readFileSync(path.join(__dirname, file_path), 'utf8');
    const owners = ownersData.split('\n').map(line => line.trim());
    return Array.from(owners);
}

async function main() {
    const [deployer] = await ethers.getSigners();

    // Replace with your contract addresses
    const islandStorageMigrationAddress = "0x22536b28894E70344BE74207CDA36E670042FbEf";
    const islandStorageAddress = "0xAeB73203c0b648F143C1234b0b62906519b98aD5";
    let ownerAddresses = getOwners('owners.csv');

    const ownersWithoutResources = getOwners('ownersWithoutResources.csv');

    //ownerAddresses = ownerAddresses.filter(owner => !ownersWithoutResources.includes(owner));

    // Get contract instances
    const IslandStorageMigration = await ethers.getContractFactory("IslandStorageMigration");
    const islandStorageMigration = await IslandStorageMigration.attach(islandStorageMigrationAddress);

    const IslandStorage = await ethers.getContractFactory("IslandStorage");
    const islandStorage = await IslandStorage.attach(islandStorageAddress);

    const ownersWithResources = [];
    

    for (const [index, ownerAddress] of ownerAddresses.entries()) {
        console.log(ownerAddress);
        console.log(`Processing owner address ${index + 1} of ${ownerAddresses.length}`);
        // Get token IDs by owner
        const tokenIds = await islandStorageMigration.getTokenIdsByOwner(ownerAddress);

        if (tokenIds.length === 0) {
            console.log(`Owner ${ownerAddress} has no token IDs`);
            continue;
        }

        // Check resource balances for each token ID
        let hasValue = false;
        for (const tokenId of tokenIds) {            
            const [resourceTypes, resourceBalances] = await islandStorage.getAllResourceBalances(tokenId);
        
            for (let i = 0; i < resourceTypes.length; i++) {
                if (resourceBalances[i] > 0) {
                    hasValue = true;
                    console.log(`Owner ${ownerAddress} has resource ${resourceTypes[i]} with balance ${resourceBalances[i]} for token ID ${tokenId}`);
                    break;
                }
            }            
        }
        
        if (hasValue) {
            ownersWithResources.push(ownerAddress);
        } else {
            fs.appendFileSync(path.join(__dirname, 'ownersWithoutResources.csv'), `${ownerAddress}\n`);
            ownersWithoutResources.push(ownerAddress);
        }
    }

    if (ownersWithResources.length > 0) {
        console.log(`Owners with resources: \n ${ownersWithResources.join(',')}`);
    } else {
        console.log(`No owners with resources found`);
    }


}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});