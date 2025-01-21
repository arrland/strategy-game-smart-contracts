const { ethers } = require("hardhat");
const { readStorageTokenIds, readResourceFarmingUsers } = require("./utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Running migration with account:", deployer.address);

    // Get network-specific addresses
    let centralAuthRegistryAddress, genesisPiratesAddress, genesisIslandsAddress;
    if (network.name === "amoy") {
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
        genesisPiratesAddress = '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942';
        genesisIslandsAddress = '0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59';        
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
        genesisPiratesAddress = '0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c';
        genesisIslandsAddress = '0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1';        
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    // Get contract instances
    const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);
    
    const pirateStorageMigrationAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IPirateStorageMigration"))
    );

    const pirateStorageMigration = await ethers.getContractAt("PirateStorageMigration", pirateStorageMigrationAddress);
    
    // Get StorageManagement address
    const storageManagementAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    );

    const storageManagement = await ethers.getContractAt("StorageManagement", storageManagementAddress);

    // Test inhabitantStorageMigration contract
    console.log("Testing pirateStorageMigration contract...");
    try {
        // Check if contract is accessible
        const migrationCompleted = await pirateStorageMigration.migrationCompleted();
        console.log("Migration completed status:", migrationCompleted);

        // Get old and new storage addresses
        const oldStorageAddress = await pirateStorageMigration.oldStorage();
        const newStorageAddress = await pirateStorageMigration.newStorage();
        console.log("Old storage address:", oldStorageAddress);
        console.log("New storage address:", newStorageAddress);

        console.log("\nPlease verify the following addresses are correct:");
        console.log("pirateStorageMigration:", pirateStorageMigrationAddress);
        console.log("Old Storage:", oldStorageAddress);
        console.log("New Storage:", newStorageAddress);

        // Prompt for user confirmation
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const confirmation = await new Promise(resolve => {
            readline.question('\nDo you want to continue with the migration? (yes/no): ', answer => {
                readline.close();
                resolve(answer.toLowerCase());
            });
        });

        if (confirmation !== 'yes') {
            console.log("Migration cancelled by user");
            process.exit(0);
        }

        console.log("Proceeding with migration...");

    } catch (error) {
        console.error("Error testing pirateStorageMigration contract:", error);
        throw new Error("pirateStorageMigration contract verification failed");
    }

    // Migrate resources for each owner
    const ownerMap = await readResourceFarmingUsers(
            network.name,
            genesisPiratesAddress
    );

    console.log(`Found ${ownerMap.size} resource farming users in CSV file`);
    
    if (ownerMap.size === 0) {
        throw new Error("No resource farming users found in CSV file!");
    }

    console.log("Starting migration process...");

    const storageTokenIds = await readStorageTokenIds(
        network.name, 
        genesisIslandsAddress
    );
    
    if (storageTokenIds.length === 0) {        
        throw new Error("No storage token IDs found in CSV file!");
    }

    console.log(`Found ${storageTokenIds.length} storage tokens to migrate`);




    const BATCH_SIZE = 50; // Process fewer storage tokens per batch to stay within gas limits
    
    // // Keep processing until all storage tokens are completed
    // let inProgressTokens;
    // do {
    //     // Process storage tokens in batches
    //     for (let i = 0; i < storageTokenIds.length; i += BATCH_SIZE) {
    //         const batchTokens = storageTokenIds.slice(i, i + BATCH_SIZE);
    //         console.log(`Processing storage tokens: ${batchTokens.join(', ')}...`);
            
    //         try {
    //             const tx = await pirateStorageMigration.migrateBatch(batchTokens);
    //             await tx.wait();
                
    //             // Log progress for each storage token
    //             for (const storageTokenId of batchTokens) {
    //                 const progress = await pirateStorageMigration.getMigrationProgress(storageTokenId);
    //                 console.log(`Storage ${storageTokenId} progress:`);
    //                 console.log(`- Total assignments: ${progress.totalAssignments}`);
    //                 console.log(`- Migrated: ${progress.migratedAssignments}`);
    //                 console.log(`- Remaining: ${progress.remainingAssignments}`);
    //                 console.log(`- Completed: ${progress.completed}`);
    //             }
    //         } catch (error) {
    //             console.error(`Error processing batch ${batchTokens.join(', ')}:`, error);
    //             // Continue with next batch even if current one fails
    //         }

    //         // Add delay between batches
    //         await new Promise(resolve => setTimeout(resolve, 2000));
    //     }

    //     // Check if any tokens are still in progress
    //     inProgressTokens = await pirateStorageMigration.getStorageTokensInProgress();
    //     if (inProgressTokens.length > 0) {
    //         console.log(`Still processing ${inProgressTokens.length} storage tokens...`);
    //     }
    // } while (inProgressTokens.length > 0);

    console.log("All storage tokens successfully migrated!");

    console.log("Storage migration completed. Starting resource migration...");



    // Migrate resources for each owner
    for (const [owner, tokens] of ownerMap.entries()) {
        console.log(`Processing owner ${owner} with ${tokens.length} tokens...`);
        console.log(`Tokens for owner: ${tokens.join(',')}`);
        
        // Split tokens into batches
        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
            const tokenBatch = tokens.slice(i, i + BATCH_SIZE);
            console.log(`Migrating batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(tokens.length/BATCH_SIZE)}`);
            console.log(`Batch tokens: ${tokenBatch.join(', ')}`);
            
            try {
                const tx = await pirateStorageMigration.migrateOwnerTokens(owner, tokenBatch);
                const receipt = await tx.wait();
                console.log(`Successfully migrated batch. Gas used: ${receipt.gasUsed.toString()}`);
            } catch (error) {
                console.error(`Error migrating batch for owner ${owner}:`, error);
                console.error(`Failed tokens in batch:`, tokenBatch);
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`Completed all batches for owner ${owner}`);
    }

    console.log("Resource migration completed. Updating storage management...");
    
    // try {
    //     const tx = await pirateStorageMigration.updateStorageManagement();
    //     await tx.wait();
    //     console.log("Storage management updated successfully");
    // } catch (error) {
    //     console.error("Error updating storage management:", error);
    // }
}

// To run on Polygon mainnet:
// npx hardhat run scripts/migrate-pirate-storagev2.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/migration/migrate-pirate-storagev2.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });