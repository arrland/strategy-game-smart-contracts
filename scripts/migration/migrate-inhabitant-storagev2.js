const { ethers } = require("hardhat");
const { readStorageTokenIds } = require("./utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Running migration with account:", deployer.address);

    // Get network-specific addresses
    let centralAuthRegistryAddress, inhabitantsAddress, genesisIslandsAddress;
    if (network.name === "amoy") {
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
        inhabitantsAddress = '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c';
        genesisIslandsAddress = '0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59';        
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
        inhabitantsAddress = '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c';
        genesisIslandsAddress = '0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1';        
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    // Get contract instances
    const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);
    
    const inhabitantStorageMigrationAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IInhabitantStorageMigration"))
    );
    const inhabitantStorageMigration = await ethers.getContractAt("InhabitantStorageMigration", inhabitantStorageMigrationAddress);

    // Test inhabitantStorageMigration contract
    console.log("Testing inhabitantStorageMigration contract...");
    try {
        // Check if contract is accessible
        const migrationCompleted = await inhabitantStorageMigration.migrationCompleted();
        console.log("Migration completed status:", migrationCompleted);

        // Get old and new storage addresses
        const oldStorageAddress = await inhabitantStorageMigration.oldStorage();
        const newStorageAddress = await inhabitantStorageMigration.newStorage();
        console.log("Old storage address:", oldStorageAddress);
        console.log("New storage address:", newStorageAddress);

        console.log("\nPlease verify the following addresses are correct:");
        console.log("InhabitantStorageMigration:", inhabitantStorageMigrationAddress);
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
        console.error("Error testing InhabitantStorageMigration contract:", error);
        throw new Error("InhabitantStorageMigration contract verification failed");
    }
    
    // Get StorageManagement address
    const storageManagementAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    );
    const storageManagement = await ethers.getContractAt("StorageManagement", storageManagementAddress);

    console.log("Starting migration process...");
    
    let storageTokenIds = await readStorageTokenIds(
        network.name, 
        genesisIslandsAddress
    );
    
    if (storageTokenIds.length === 0) {        
        throw new Error("No storage token IDs found in CSV file!");
    }

    // Filter out already migrated storage tokens
    // Create a Set of already migrated token IDs from the logs
    const migratedIds = new Set([
        4147, 3328, 24, 1103, 22, 2158, 3467, 3275, 3349, 3475, 1112, 2189, 3361, 3304, 2191, 2305, 1217, 3202, 2257, 2200, 2315, 19, 3264, 2271, 1097, 2136, 81, 32, 323, 362, 2564, 84, 4173, 4183, 3279, 3363, 3337, 2201, 167, 1111, 2585, 25, 103, 2307, 108, 1135, 3338, 3330, 1200, 1216, 1088, 1375, 327, 421, 374, 422, 383, 104, 4175, 2300, 2629, 184, 3359, 254, 4189, 1193, 2260, 2206, 1098, 2511, 954, 150, 1190, 2343, 2274, 1403, 291, 1336, 74, 8341, 8358, 8365, 8372, 8373, 8374, 8376, 8379, 8394, 8411, 8425, 8438, 8450, 8452, 8456, 637, 1006, 1746, 4317, 1509, 4341, 1716, 615, 1228, 12805, 12855, 10523, 10625, 14862, 14879, 14893, 14982, 14991, 14992, 16021, 14699, 8119,
        3401, 4179, 3385, 364, 338, 457, 2616, 1222, 1206, 2193, 1165, 3346, 4207, 3278, 963, 3332, 8335
    ]);
    const unmigratedStorageTokens = [];
    for (const tokenId of storageTokenIds) {
        // Check if this storage token was already migrated
        if (migratedIds.has(tokenId)) {
            continue;
        }
        const isMigrated = await inhabitantStorageMigration.isStorageMigrated(tokenId);
        if (!isMigrated) {
            unmigratedStorageTokens.push(tokenId);
        } else {
            console.log(`Storage token ${tokenId} already migrated, skipping...`);
        }
    }

    // Update storage tokens array to only include unmigrated tokens
    storageTokenIds = unmigratedStorageTokens;

    // Remove specific token IDs from migration list
    // List of token IDs to exclude from migration
    const excludedTokenIds = [];
    storageTokenIds = storageTokenIds.filter(id => !excludedTokenIds.includes(id));

    console.log(`Found ${storageTokenIds.length} storage tokens to migrate`);
    console.log(`storageTokenIds token IDs: ${storageTokenIds.join(', ')}`);



    const BATCH_SIZE = 1; // Process fewer storage tokens per batch to stay within gas limits
    
    // Keep processing until all storage tokens are completed
    let inProgressTokens;
    do {
        // Process storage tokens in batches
        for (let i = 0; i < storageTokenIds.length; i += BATCH_SIZE) {
            const batchTokens = storageTokenIds.slice(i, i + BATCH_SIZE);
            console.log(`Processing storage tokens: ${batchTokens.join(', ')}...`);
            // Filter out already migrated storage tokens
            const unmigratedBatchTokens = [];
            for (const tokenId of batchTokens) {
                // Check if this storage token was already migrated
                const isMigrated = await inhabitantStorageMigration.isStorageMigrated(tokenId);
                if (!isMigrated) {
                    unmigratedBatchTokens.push(tokenId);
                } else {
                    console.log(`Storage token ${tokenId} already migrated, skipping...`);
                }
            }

            // Skip batch if all tokens were already migrated
            if (unmigratedBatchTokens.length === 0) {
                console.log('All tokens in batch already migrated, continuing to next batch...');
                continue;
            } else {
                console.log(`Migrating batch ${unmigratedBatchTokens.join(', ')}...`);
            }
            try {
                const tx = await inhabitantStorageMigration.migrateBatch(unmigratedBatchTokens);
                await tx.wait();
                
                // Log progress for each storage token
                for (const storageTokenId of batchTokens) {
                    const progress = await inhabitantStorageMigration.getMigrationProgress(storageTokenId);
                    console.log(`Storage ${storageTokenId} progress:`);
                    console.log(`- Total assignments: ${progress.totalAssignments}`);
                    console.log(`- Migrated: ${progress.migratedAssignments}`);
                    console.log(`- Remaining: ${progress.remainingAssignments}`);
                    console.log(`- Completed: ${progress.completed}`);
                }
            } catch (error) {
                console.error(`Error processing batch ${batchTokens.join(', ')}:`, error);
                // Continue with next batch even if current one fails
            }

            // Add delay between batches
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Check if any tokens are still in progress
        inProgressTokens = await inhabitantStorageMigration.getStorageTokensInProgress();
        if (inProgressTokens.length > 0) {
            console.log(`Still processing ${inProgressTokens.length} storage tokens...`);
        }
    } while (inProgressTokens.length > 0);

    console.log("All storage tokens successfully migrated!");

    console.log("Storage migration completed. Updating storage management...");
    
    try {
        const tx = await inhabitantStorageMigration.updateStorageManagement();
        await tx.wait();
        console.log("Storage management updated successfully");
    } catch (error) {
        console.error("Error updating storage management:", error);
    }
}

// To run on Polygon mainnet:
// npx hardhat run scripts/migration/migrate-inhabitant-storagev2.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/migration/migrate-inhabitant-storagev2.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
