const fs = require('fs');
const csv = require('csv-parse/sync');
const { ethers } = require("hardhat");
const path = require('path');



async function saveResourceBalances(storageAddress, resourceManagementAddress, usersFilePath) {
    console.log("Reading resource balances for all users...");
    const resourceManagement = await ethers.getContractAt("ResourceManagement", resourceManagementAddress);
    
    // Read CSV
    const csvFilePath = path.join(__dirname, usersFilePath);
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Create output file
    const balancesLogPath = `island-balances-${storageAddress}_after.json`;
    const balances = [];

    console.log("storage address:", storageAddress);

    // Process each user
    for (const record of records) {
        const userAddress = record.ADDRESS.toLowerCase();
        console.log(`Fetching balances for user: ${userAddress}`);

        const tokenIds = record.TOKEN_IDS.split(',').map(id => parseInt(id.trim()));

        for (const tokenId of tokenIds) {
            try {
                const userBalances = await resourceManagement.getAllResourceBalances(storageAddress, tokenId);
                balances.push({
                    address: userAddress,
                    tokenId: tokenId,
                    balances: userBalances.map(b => b.toString())
                });
            } catch (error) {
                console.error(`Error fetching balances for ${userAddress}:`, error);
            }
        }

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Save all balances to file
    fs.writeFileSync(
        balancesLogPath, 
        JSON.stringify(balances, null, 2)
    );
    console.log(`Saved balances to ${balancesLogPath}`);

    return balances;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Executing with account:", deployer.address);

    let resourceManagementAddress;
    let islandStorageMigrationAddress;
    let oldIslandStorageAddress;
    let newIslandStorageAddress;
    let usersFilePath;

    if (network.name == "amoy") {
        resourceManagementAddress = "0x52b107ECd25148239A827FDE5b39246516825657";
        islandStorageMigrationAddress = "0x102477c43caEBd462Ba279a153E83C9846f317C6";
        oldIslandStorageAddress = "0x7F48EC25e88Db6F76104e62D0B7f0597001e2f7C"
        newIslandStorageAddress = "0x82A5Da5aDAd824fC542249523dfAB837a8E332ef"
        usersFilePath = "../resource-farming-users-0xFA5b69f4ee36f0a6AED92F7e4b4ff35C19642B73.csv";
    } else if (network.name == "polygon") {
        resourceManagementAddress = "0x526edD73D8f331f7469b36E8485FcE643b09bACB";
        islandStorageMigrationAddress = "0x93A070Db6E474eBC543ef101fd90EC3B8787B647";
        oldIslandStorageAddress = "0x5112435C6f6a9Bb10925BCaE523A7E758e45eF2B";
        newIslandStorageAddress = "0xbeB04A176c8a5EC72C79c2E53C884Cf8722dF9B3";
        usersFilePath = "../resource-farming-users-0x2B448C5218c3aABf8517B5B3DE54b0E817231daF.csv";
    } else {
        console.log("Unsupported network");
        process.exit(0);
        return;
    }



    const onlySaveBalances = false;

    const migrationContract = await ethers.getContractAt("IslandStorageMigrationV2", islandStorageMigrationAddress);

    if (onlySaveBalances) {
        console.log("Only saving resource balances...");
        await saveResourceBalances(oldIslandStorageAddress, resourceManagementAddress, usersFilePath); // Old Island Storage
        process.exit(0);
        return;
    }

    console.log("Executing full migration...");

    // Read CSV
    const csvFilePath = path.join(__dirname, usersFilePath);
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Token IDs per batch
    const OWNERS_PER_BATCH = 5;

    // Create batches of owners
    const batches = [];
    let currentBatch = [];
    
    records.forEach(record => {
        const owner = record.ADDRESS.toLowerCase();
        
        // Check if owner is already in current batch
        if (!currentBatch.includes(owner)) {
            currentBatch.push(owner);
            
            // When batch is full, add it to batches and start new batch
            if (currentBatch.length >= OWNERS_PER_BATCH) {
                batches.push([...currentBatch]);
                currentBatch = [];
            }
        }
    });

    // Add remaining owners if any
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    console.log(`Created ${batches.length} batches`);

    // Create migration log file
    const migrationLogPath = 'island-migration-log.txt';
    fs.writeFileSync(migrationLogPath, ''); // Clear/create file

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length}`);
        console.log("Batch contents:", batch);

        try {
            let tx = await migrationContract.migrateAllOwners(batch);
            console.log(`Batch ${i + 1} transaction hash:`, tx.hash);
            await tx.wait();
            console.log(`Batch ${i + 1} completed`);

            // Log successful migration
            fs.appendFileSync(migrationLogPath, 
                `Batch ${i + 1}: ${batch.join(', ')}\n`
            );

        } catch (error) {
            console.error(`Error processing batch ${i + 1}:`, error);
            fs.appendFileSync('failed-island-migrations.json', JSON.stringify({
                batch: i + 1,
                owners: batch
            }) + '\n');
        }

        // Delay between batches
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Save final balances
    await saveResourceBalances(newIslandStorageAddress, resourceManagementAddress, usersFilePath); // New Island Storage

    // Verify migration completion
    try {
        const migratedOwners = await migrationContract.getMigratedOwners();
        console.log("Total migrated owners:", migratedOwners.length);
        
        const tx = await migrationContract.updateStorageManagement();
        await tx.wait();
        console.log("Storage management updated successfully");

        // Log final migration stats
        fs.appendFileSync(migrationLogPath, 
            `\n=== Migration Summary ===\nTotal Migrated Owners: ${migratedOwners.length}\nStorage Management Updated: Yes\n`
        );
    } catch (error) {
        console.error("Error in final verification:", error);
        fs.appendFileSync(migrationLogPath, 
            `\n=== Migration Error ===\nFinal verification failed: ${error.message}\n`
        );
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 