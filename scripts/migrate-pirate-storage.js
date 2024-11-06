const fs = require('fs');
const csv = require('csv-parse/sync');
const { ethers } = require("hardhat");
const path = require('path');

const resourceManagementAddress = "0x526edD73D8f331f7469b36E8485FcE643b09bACB";
const usersFilePath = "../resource-farming-users-0x2B448C5218c3aABf8517B5B3DE54b0E817231daF.csv";




async function saveResourceBalances(oldStorageAddress) {
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
    const balancesLogPath = `resource-balances-${oldStorageAddress}_after.json`;
    const balances = [];

    console.log("storage address:", oldStorageAddress);

    // Process each user
    for (const record of records) {
        const userAddress = record.ADDRESS.toLowerCase();
        console.log(`Fetching balances for user: ${userAddress}`);

        const tokenIds = record.TOKEN_IDS.split(',').map(id => parseInt(id.trim()));

        for (const tokenId of tokenIds) {
            try {
                const userBalances = await resourceManagement.getAllResourceBalances(oldStorageAddress, tokenId);
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


    const onlySaveBalances = false;

    // Contract addresses - replace these with your actual addresses
    const migrationAddress = "0x4d1af04801dd8E03439f3E17D50066231c8719aa";
    const migrationContract = await ethers.getContractAt("PirateStorageMigration", migrationAddress);

    if (onlySaveBalances) {
        console.log("Only saving resource balances...");
        await saveResourceBalances(await migrationContract.oldPirateStorage());
        process.exit(0);
        return;
    }
    

    console.log("Executing full migration...");
    //const balances = await saveResourceBalances(migrationContract.oldPirateStorage());


    // Read CSV
    const csvFilePath = path.join(__dirname, usersFilePath);

    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });

    // Token IDs per batch
    const TOKENS_PER_BATCH = 10;

    // Create batches based on token count
    const batches = [];
    records.forEach(record => {
        const owner = record.ADDRESS.toLowerCase();
        const tokenIds = record.TOKEN_IDS.split(',').map(id => parseInt(id.trim()));
        
        // Split token IDs into smaller batches
        for (let i = 0; i < tokenIds.length; i += TOKENS_PER_BATCH) {
            const tokenBatch = tokenIds.slice(i, i + TOKENS_PER_BATCH);
            batches.push({
                owner: owner,
                tokenIds: tokenBatch
            });
        }
    });

    console.log(`Created ${batches.length} batches`);

    // Example of how batches look
    batches.forEach((batch, index) => {
        console.log(`Batch ${index + 1}:`, {
            owner: batch.owner,
            tokenIds: batch.tokenIds
        });
    });

    // Create migration log file
    const migrationLogPath = 'migration-log.txt';
    fs.writeFileSync(migrationLogPath, ''); // Clear/create file

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1}/${batches.length}`);
        console.log("Batch contents:", batch);

        try {
            // Wrap single batch in array since contract expects array of owners
            const batchArray = [batch];
            let tx;
            try {
                tx = await migrationContract.migrateAllOwners(batchArray);
            } catch (error) {
                console.error("Fatal error during migration:", error, batch);
                process.exit(1);
            }
            console.log(`Batch ${i + 1} transaction hash:`, tx.hash);
            await tx.wait();
            console.log(`Batch ${i + 1} completed`);

            // Log successful migration
            fs.appendFileSync(migrationLogPath, 
                `${batch.owner} - ${batch.tokenIds.join(', ')}\n`
            );

        } catch (error) {
            console.error(`Error processing batch ${i + 1}:`, error);
            fs.appendFileSync('failed-migrations.json', JSON.stringify({
                batch: i + 1,
                owner: batch.owner,
                tokenIds: batch.tokenIds
            }) + '\n');
        }

        // Delay between batches
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await saveResourceBalances(await migrationContract.newPirateStorage());
    // Verify migration completion
    try {
        const migratedOwners = await migrationContract.getMigratedOwners();
        console.log("Total migrated owners:", migratedOwners.length);
        
        //const tx = await migrationContract.updateStorageManagement();
        //await tx.wait();
        //console.log("Storage management updated successfully");

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