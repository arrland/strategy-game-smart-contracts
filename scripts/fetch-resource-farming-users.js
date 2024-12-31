const fs = require('fs');
const { ethers } = require('hardhat');
const csv = require('csv-writer').createObjectCsvWriter;





async function main() {
    // Contract details
    let contractAddress;
    let startBlock;    
    
    // Replace with the actual address of your central authorization registry contract
    if (network.name == "amoy") {
        contractAddress = '0xFA5b69f4ee36f0a6AED92F7e4b4ff35C19642B73'; // Replace with actual address
        startBlock = 9675938;        
    } else {
        contractAddress = '0x2B448C5218c3aABf8517B5B3DE54b0E817231daF'; // Replace with actual address
        startBlock = 59559641;
        
    }
    
    const endBlock = await ethers.provider.getBlockNumber();
    const batchSize = 10000; // Number of blocks to query at once

    // Get contract instance
    const ResourceFarming = await ethers.getContractFactory('ResourceFarming');
    const contract = ResourceFarming.attach(contractAddress);

    // Set up event filter
    const filter = contract.filters.ResourceFarmed();
    
    // Store user addresses and their token IDs
    const userTokens = new Map(); // Map of address -> Set of token IDs
    
    // Process blocks in batches
    console.log('Starting to fetch events...');
    for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
        const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);
        
        try {
            console.log(`Fetching events from block ${fromBlock} to ${toBlock}...`);
            const events = await contract.queryFilter(filter, fromBlock, toBlock);
            
            events.forEach(event => {
                const userAddress = event.args.user.toLowerCase();
                const tokenId = event.args.tokenId.toString();
                
                if (!userTokens.has(userAddress)) {
                    userTokens.set(userAddress, new Set());
                }
                userTokens.get(userAddress).add(tokenId);
            });
            
            console.log(`Found ${events.length} events in this batch. Total unique users so far: ${userTokens.size}`);
        } catch (error) {
            console.error(`Error fetching blocks ${fromBlock}-${toBlock}:`, error);
        }
    }

    // Convert Map to array and prepare data for CSV
    const csvData = Array.from(userTokens).map(([address, tokens]) => {
        return {
            address,
            tokenIds: Array.from(tokens).join(',')
        };
    });

    // Set up CSV writer
    const csvWriter = csv({
        path: `resource-farming-users-${contractAddress}.csv`,
        header: [
            {id: 'address', title: 'ADDRESS'},
            {id: 'tokenIds', title: 'TOKEN_IDS'}
        ]
    });

    // Write to CSV
    try {
        await csvWriter.writeRecords(csvData);
        console.log(`Successfully saved ${userTokens.size} unique users to resource-farming-users-${contractAddress}.csv`);
    } catch (error) {
        console.error('Error writing to CSV:', error);
    }
}
/**
 * Script to fetch users who have participated in resource farming
 * 
 * Usage:
 * 1. Set the contract address and block range in the network config section
 * 2. Run using: npx hardhat run scripts/fetch-resource-farming-users.js --network <network_name>
 * 
 * The script will:
 * - Query events from the specified contract and block range
 * - Extract unique users and their token IDs
 * - Save results to a CSV file named resource-farming-users-<contractAddress>.csv
 */


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });