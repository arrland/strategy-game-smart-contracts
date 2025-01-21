const fs = require('fs');
const { ethers } = require('hardhat');
const csv = require('csv-writer').createObjectCsvWriter;
const path = require('path');

async function main() {
    // Contract details
    let centralAuthRegistryAddress, genesisIslandsAddress, genesisPiratesAddress, inhabitantsAddress;
    
    if (network.name === "amoy") {
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
        genesisIslandsAddress = '0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59';
        genesisPiratesAddress = '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942';
        inhabitantsAddress = '0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654';
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
        genesisIslandsAddress = '0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1';
        genesisPiratesAddress = '0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c';
        inhabitantsAddress = '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c';
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    // Get contract instances
    const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);
    const contract = await ethers.getContractAt("InhabitantNFT", genesisIslandsAddress);
    
    // Get StorageManagement address and instance
    const storageManagementAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    );
    const storageManagement = await ethers.getContractAt("StorageManagement", storageManagementAddress);

    const totalSupply = await contract.totalSupply();
    console.log(`Total supply: ${totalSupply}`);

    // Store all valid token IDs (those without assignments)
    const tokenIds = [];
    
    // Fetch all token IDs and check assignments
    console.log('Starting to fetch token IDs and check storage assignments...');
    for (let i = 0; i < totalSupply; i++) {
        if (i % 100 === 0) {
            console.log(`Progress: ${i}/${totalSupply}`);
        }
        const tokenId = await contract.tokenByIndex(i);
        const owner = await contract.ownerOf(tokenId);
        
        // Check pirate assignments
        const pirateAssignments = await storageManagement.getAllAssignedToStorage(
            owner,
            genesisPiratesAddress,
            genesisIslandsAddress
        );
        
        // Check inhabitant assignments
        const inhabitantAssignments = await storageManagement.getAllAssignedToStorage(
            owner,
            inhabitantsAddress,
            genesisIslandsAddress
        );
        
        // Find if current tokenId has any assignments in either collection
        const currentPirateAssignment = pirateAssignments.find(
            assignment => assignment.storageTokenId.toString() === tokenId.toString()
        );
        
        const currentInhabitantAssignment = inhabitantAssignments.find(
            assignment => assignment.storageTokenId.toString() === tokenId.toString()
        );
        
        // Only include tokens that don't have any assignments in either collection
        const pirateAssignmentCount = currentPirateAssignment ? currentPirateAssignment.primaryTokens.length : 0;
        const inhabitantAssignmentCount = currentInhabitantAssignment ? currentInhabitantAssignment.primaryTokens.length : 0;
        
        if (!tokenIds.includes(tokenId.toString()) && (pirateAssignmentCount > 0 || inhabitantAssignmentCount > 0)) {
            console.log(`token ${tokenId} - has ${pirateAssignmentCount} pirate assignments and ${inhabitantAssignmentCount} inhabitant assignments`);    
            tokenIds.push(tokenId.toString());
        }
        
    }

    console.log(`Found ${tokenIds.length} assigned storage tokens out of ${totalSupply} total`);

    // Create directory structure
    const baseDir = 'scripts/migration/island-ids';
    const outputDir = `${baseDir}/${network.name}`;
    
    // Create directories if they don't exist
    [baseDir, outputDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    });

    // Prepare CSV data
    const csvData = tokenIds.map(tokenId => {
        return { tokenId };
    });

    // Write CSV file
    const csvWriter = csv({
        path: `${outputDir}/${genesisIslandsAddress}-islandids.csv`,
        header: [
            {id: 'tokenId', title: 'TOKEN_ID'}
        ]
    });

    try {
        await csvWriter.writeRecords(csvData);
        console.log(`Successfully saved ${tokenIds.length} unassigned island IDs to CSV`);
    } catch (error) {
        console.error('Error writing CSV:', error);
    }
}

/**
 * Script to fetch all island IDs from Genesis Islands contract
 * 
 * Usage:
 * Run using: 
 * npx hardhat run scripts/migration/fetch_island_ids.js --network polygon
 * npx hardhat run scripts/migration/fetch_island_ids.js --network amoy
 * 
 * The script will:
 * - Query all token IDs using tokenByIndex
 * - Save results to a CSV file in island-ids/<network>/<contractAddress>-islandids.csv
 */

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
