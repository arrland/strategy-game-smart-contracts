const { ethers } = require("hardhat");
const fs = require('fs');
const csv = require('csv-parse/sync');

async function main() {
    console.log("Starting script to check for unassigned storage...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Running check with account:", deployer.address);

    // Contract addresses for Polygon
    console.log("\nInitializing contract addresses...");
    const resourceFarmingAddress = '0x2B448C5218c3aABf8517B5B3DE54b0E817231daF';
    const inhabitantStorageAddress = '0xDf8d9FCE7B4AAA064b8A5C3AF362241b707091a4';
    const inhabitantsAddress = '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c';
    console.log("ResourceFarming:", resourceFarmingAddress);
    console.log("InhabitantStorage:", inhabitantStorageAddress);
    console.log("Inhabitants:", inhabitantsAddress);

    // Get contract instances
    console.log("\nConnecting to contracts...");
    const ResourceFarming = await ethers.getContractFactory("ResourceFarming");
    const InhabitantStorage = await ethers.getContractFactory("InhabitantStorage");
    
    const resourceFarming = ResourceFarming.attach(resourceFarmingAddress);
    const inhabitantStorage = InhabitantStorage.attach(inhabitantStorageAddress);
    console.log("Successfully connected to contracts");

    // Read and parse CSV file
    console.log("\nReading CSV file...");
    const csvFilePath = 'scripts/migration/resource-farming/polygon/resource-farming-users-0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c.csv';
    const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
    const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    });
    console.log(`Found ${records.length} users in CSV file`);

    let unassignedTokens = [];
    let totalPiratesChecked = 0;

    // Process each user
    console.log("\nStarting user checks...");
    
    // Allow checking specific users if provided as command line args
    let usersToCheck = [];

    // Use all users from CSV if no specific users provided
    usersToCheck = records.map(record => record.ADDRESS);
    console.log(`Will check all ${usersToCheck.length} users from CSV`);
    

    for (const userAddress of usersToCheck) {
        console.log(`\nChecking user ${userAddress}`);

        // Get all pirates (total, working, and finished) for this user
        const [totalPirates, workingPirates, finishedPirates] = await resourceFarming.getPirates(userAddress, inhabitantsAddress);
        
        // Check all pirates (both working and finished)
        for (const tokenId of totalPirates) {
            totalPiratesChecked++;
            try {                
                const assignedStorage = await inhabitantStorage.getAssignedStorage(inhabitantsAddress, tokenId);
                if (assignedStorage == 0) {
                    unassignedTokens.push({
                        user: userAddress,
                        tokenId: tokenId.toString()
                    });
                    console.log(`WARNING: Token ${tokenId} has no storage assigned`);
                }
            } catch (error) {
                console.error(`Error checking token ${tokenId}:`, error.message);
            }
        }
    }

    
    // Write results to file
    console.log("\nWriting results to file...");
    const outputPath = 'scripts/migration/unassigned-storage-tokens.csv';
    
    // Group tokens by user address
    const groupedByUser = unassignedTokens.reduce((acc, token) => {
        if (!acc[token.user]) {
            acc[token.user] = [];
        }
        acc[token.user].push(token.tokenId);
        return acc;
    }, {});

    // Convert to CSV format with grouped token IDs
    const csvData = Object.entries(groupedByUser)
        .map(([user, tokens]) => `${user},"${tokens.join(',')}"`)
        .join('\n');
    
    const csvHeader = 'user,tokenIds\n';
    fs.writeFileSync(outputPath, csvHeader + csvData);

    console.log(`\nSummary:`);
    console.log(`Total users checked: ${usersToCheck.length}`);
    console.log(`Total pirates checked: ${totalPiratesChecked}`);
    console.log(`Found ${unassignedTokens.length} tokens without storage assignments`);
    console.log(`Results written to ${outputPath}`);
}

// how to run:
// npx hardhat run scripts/migration/check-unassigned-storage.js --network polygon

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 