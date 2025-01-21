const fs = require('fs');
const { ethers } = require('hardhat');
const csv = require('csv-writer').createObjectCsvWriter;
const chalk = require('chalk');

// Add logging utilities
const log = {
    info: (msg) => console.log(chalk.blue('ℹ️ ') + msg),
    success: (msg) => console.log(chalk.green('✅ ') + msg),
    warning: (msg) => console.log(chalk.yellow('⚠️ ') + msg),
    error: (msg) => console.log(chalk.red('❌ ') + msg),
    progress: (msg) => console.log(chalk.cyan('🔄 ') + msg),
    collection: (msg) => console.log(chalk.magenta('📦 ') + msg),
    token: (msg) => console.log(chalk.gray('🎫 ') + msg),
    resources: (msg) => console.log(chalk.green('💎 ') + msg)
};

async function main() {
    // Contract details
    log.info('Initializing script...');
    
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

    // Get StorageManagement contract
    const centralAuthRegistryAddress = network.name === "amoy" 
        ? "0x99a764fd156083aA343e2577C348c8cF110C7141" // Amoy address
        : "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778"; // Mainnet address
    
    const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);

    const storageManagementAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    );

    const resourceFarmingAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IResourceFarming"))
    );
    
    const storageManagement = await ethers.getContractAt("StorageManagement", storageManagementAddress);
    
    const endBlock = await ethers.provider.getBlockNumber();
    const batchSize = 10000; // Number of blocks to query at once

    // Get contract instance
    const ResourceFarming = await ethers.getContractFactory('ResourceFarming');
    const contract = ResourceFarming.attach(contractAddress);

    // Set up event filter
    const filter = contract.filters.ResourceFarmed();
    
    // Add interfaces for ERC721 and ERC1155
    const ERC721_ABI = [
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
    ];
    const ERC1155_ABI = [
        'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
        'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)'
    ];

    // Update data structure to store final ownership state
    const collectionUsers = new Map(); // Map of collectionAddress -> Map of token IDs -> current owner

    // Process ResourceFarmed events
    log.progress('Starting to fetch ResourceFarmed events...');
    for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
        const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);
        
        try {
            log.info(`Fetching events from block ${chalk.yellow(fromBlock)} to ${chalk.yellow(toBlock)}...`);
            const events = await contract.queryFilter(filter, fromBlock, toBlock);
            
            events.forEach(event => {
                const userAddress = event.args.user.toLowerCase();
                const tokenId = event.args.tokenId.toString();
                const collectionAddress = event.args.collectionAddress.toLowerCase();
                
                if (!collectionUsers.has(collectionAddress)) {
                    collectionUsers.set(collectionAddress, new Map());
                    log.collection(`New collection found: ${chalk.bold(collectionAddress)}`);
                }
                
                // Check if token already exists
                if (collectionUsers.get(collectionAddress).has(tokenId)) {
                    const existingUser = collectionUsers.get(collectionAddress).get(tokenId);
                    if (existingUser !== userAddress) {
                        log.warning(`Token ${chalk.bold(tokenId)} ownership changed from ${chalk.bold(existingUser)} to ${chalk.bold(userAddress)}`);
                    }
                } else {
                    log.token(`New token found: ${chalk.bold(tokenId)} for collection ${chalk.bold(collectionAddress)}`);
                }
                
                // Store token ownership
                collectionUsers.get(collectionAddress).set(tokenId, userAddress);
            });
            
            // Update progress message
            const totalCollections = collectionUsers.size;
            const totalUsers = Array.from(collectionUsers.values())
                .reduce((sum, userMap) => sum + userMap.size, 0);
            log.success(`Found ${chalk.bold(events.length)} events in this batch`);
            log.info(`Collections: ${chalk.bold(totalCollections)}, Users: ${chalk.bold(totalUsers)}`);
        } catch (error) {
            log.error(`Error fetching blocks ${fromBlock}-${toBlock}: ${error.message}`);
        }
    }

    // Process Transfer events for each collection
    log.progress('Starting to fetch Transfer events for each collection...');
    for (const collectionAddress of collectionUsers.keys()) {
        log.collection(`Processing collection: ${chalk.bold(collectionAddress)}`);
        
        // Try both ERC721 and ERC1155 interfaces
        const erc721Contract = new ethers.Contract(collectionAddress, ERC721_ABI, ethers.provider);
        const erc1155Contract = new ethers.Contract(collectionAddress, ERC1155_ABI, ethers.provider);

        // // Process ERC721 Transfer events
        // try {
        //     log.info(`Checking for ERC721 transfers...`);
        //     const transferFilter = erc721Contract.filters.Transfer();
        //     for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
        //         const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);
        //         log.info(`Fetching ERC721 transfers from block ${chalk.yellow(fromBlock)} to ${chalk.yellow(toBlock)}...`);
        //         const events = await erc721Contract.queryFilter(transferFilter, fromBlock, toBlock);
                
        //         log.info(`Found ${chalk.bold(events.length)} ERC721 transfer events in this batch`);
        //         events.forEach(event => {
        //             const tokenId = event.args.tokenId.toString();
        //             const toAddress = event.args.to.toLowerCase();
                    
        //             // Update ownership only if we're tracking this token
        //             if (collectionUsers.get(collectionAddress).has(tokenId)) {
        //                 collectionUsers.get(collectionAddress).set(tokenId, toAddress);
        //             }
        //         });
        //     }
        //     log.success(`Completed ERC721 transfer processing`);
        // } catch (error) {
        //     log.warning(`Not ERC721 or error: ${error.message}`);
        // }

        // Process ERC1155 Transfer events
        try {
            log.info(`Checking for ERC1155 transfers...`);
            const transferSingleFilter = erc1155Contract.filters.TransferSingle();
            const transferBatchFilter = erc1155Contract.filters.TransferBatch();
            
            for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
                const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);
                log.info(`Fetching ERC1155 transfers from block ${chalk.yellow(fromBlock)} to ${chalk.yellow(toBlock)}...`);
                
                // Handle TransferSingle events
                const singleEvents = await erc1155Contract.queryFilter(transferSingleFilter, fromBlock, toBlock);
                log.info(`Found ${chalk.bold(singleEvents.length)} TransferSingle events in this batch`);
                singleEvents.forEach(event => {
                    const tokenId = event.args.id.toString();
                    const toAddress = event.args.to.toLowerCase();
                    const fromAddress = event.args.from.toLowerCase();
                    
                    // Skip if to/from is resourceFarming contract
                    if (toAddress === resourceFarmingAddress.toLowerCase() || 
                        fromAddress === resourceFarmingAddress.toLowerCase()) {
                        log.warning(`Skipping event due to resourceFarming contract: ${event.transactionHash}`);
                        return;
                    }
                    
                    if (collectionUsers.get(collectionAddress).has(tokenId)) {
                        collectionUsers.get(collectionAddress).set(tokenId, toAddress);
                    }
                });

                // Handle TransferBatch events
                const batchEvents = await erc1155Contract.queryFilter(transferBatchFilter, fromBlock, toBlock);
                log.info(`Found ${chalk.bold(batchEvents.length)} TransferBatch events in this batch`);
                batchEvents.forEach(event => {
                    const tokenIds = event.args.ids.map(id => id.toString());
                    const toAddress = event.args.to.toLowerCase();
                    const fromAddress = event.args.from.toLowerCase();

                    // Skip if to/from is resourceFarming contract
                    if (toAddress === resourceFarmingAddress.toLowerCase() ||
                        fromAddress === resourceFarmingAddress.toLowerCase()) {
                        return;
                    }
                    
                    tokenIds.forEach(tokenId => {
                        if (collectionUsers.get(collectionAddress).has(tokenId)) {
                            collectionUsers.get(collectionAddress).set(tokenId, toAddress);
                        }
                    });
                });
            }
            log.success(`Completed ERC1155 transfer processing`);
        } catch (error) {
            log.warning(`Not ERC1155 or error: ${error.message}`);
        }
        
        log.success(`Finished processing all transfers for collection ${chalk.bold(collectionAddress)}`);
        const tokenCount = collectionUsers.get(collectionAddress).size;
        log.info(`Current token count for collection ${chalk.bold(collectionAddress)}: ${chalk.bold(tokenCount)}`);
    }
    log.success('Completed processing all collections');

    // Convert data structure for CSV output
    const processedCollections = new Map(); // Map of collectionAddress -> Map of user addresses -> Set of token IDs
    
    for (const [collectionAddress, tokenMap] of collectionUsers) {
        processedCollections.set(collectionAddress, new Map());
        
        // Group tokens by current owner
        for (const [tokenId, owner] of tokenMap) {
            if (!processedCollections.get(collectionAddress).has(owner)) {
                processedCollections.get(collectionAddress).set(owner, new Set());
            }
            processedCollections.get(collectionAddress).get(owner).add(tokenId);
        }
    }

    // Filter out tokens with zero resources
    log.progress('Checking resource balances in StorageManagement...');
    for (const [collectionAddress, userMap] of processedCollections) {
        log.collection(`Checking collection ${chalk.bold(collectionAddress)}...`);
        const filteredUserMap = new Map();

        for (const [address, tokens] of userMap) {
            log.info(`Checking tokens for address ${chalk.bold(address)}...`);
            const validTokens = new Set();

            for (const tokenId of tokens) {
                try {
                    log.token(`Checking resources for token ${chalk.bold(tokenId)}...`);
                    const totalResources = await storageManagement.getTotalResourcesInStorage(
                        collectionAddress,
                        tokenId
                    );
                    
                    if (totalResources > 0) {
                        log.resources(`Token ${chalk.bold(tokenId)} has ${chalk.bold(totalResources.toString())} resources`);
                        validTokens.add(tokenId);
                    } else {
                        log.warning(`Token ${chalk.bold(tokenId)} has no resources`);
                    }
                } catch (error) {
                    log.error(`Error checking resources for token ${tokenId}: ${error.message}`);
                }
            }

            if (validTokens.size > 0) {
                log.success(`Found ${chalk.bold(validTokens.size)} valid tokens for address ${chalk.bold(address)}`);
                filteredUserMap.set(address, validTokens);
            } else {
                log.warning(`No valid tokens found for address ${chalk.bold(address)}`);
            }
        }

        // Replace the original map with filtered one
        processedCollections.set(collectionAddress, filteredUserMap);
    }

    // Create directory structure for resource farming CSV files
    const baseDir = 'scripts/migration/resource-farming';
    const outputDir = `${baseDir}/${network.name}`;
    
    // Create directories if they don't exist
    [baseDir, outputDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    });

    // Write separate CSV files for each collection
    log.progress('Writing CSV files...');
    for (const [collectionAddress, userMap] of processedCollections) {
        const csvData = Array.from(userMap).map(([address, tokens]) => {
            return {
                address,
                tokenIds: Array.from(tokens).join(',')
            };
        });

        const csvWriter = csv({
            path: `${outputDir}/resource-farming-users-${collectionAddress}.csv`,
            header: [
                {id: 'address', title: 'ADDRESS'},
                {id: 'tokenIds', title: 'TOKEN_IDS'}
            ]
        });

        try {
            await csvWriter.writeRecords(csvData);
            log.success(`Saved ${chalk.bold(userMap.size)} unique users for collection ${chalk.bold(collectionAddress)}`);
        } catch (error) {
            log.error(`Error writing CSV for collection ${collectionAddress}: ${error.message}`);
        }
    }

    log.success('Script completed successfully! 🎉');
}
/**
 * Script to fetch users who have participated in resource farming
 * 
 * Usage:
 * 1. Set the contract address and block range in the network config section
 * 2. Run using: 
 * 
 * npx hardhat run scripts/migration/fetch-resource-farming-users.js --network amoy
 * 
 * The script will:
 * - Query events from the specified contract and block range
 * - Extract unique users and their token IDs
 * - Save results to a CSV file named resource-farming-users-<contractAddress>.csv
 */


main()
    .then(() => process.exit(0))
    .catch((error) => {
        log.error(error);
        process.exit(1);
    });