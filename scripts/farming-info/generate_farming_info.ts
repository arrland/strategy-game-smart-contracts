// scripts/farming-info/generate_farming_info.ts
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require('path');
const chalk = require('chalk');
const { log } = require("console");

// Configuration
const OUTPUT_DIR = path.join(__dirname, 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'farming_info.json');
const RESOURCE_REQUIREMENTS_FILE = path.join(OUTPUT_DIR, 'resource_requirements.json');
const DAY_IN_SECONDS = 86400;
const BATCH_SIZE = 50;
const CONCURRENT_BATCHES = 10;

// Interfaces
interface FarmingInfo {
    [tokenId: string]: {
        farmableResources: {
            [resource: string]: {
                dailyOutput: number;
                skillRequirements?: string[];
                requiredResources?: {
                    [resource: string]: {
                        amount: number;
                        isMandatory: boolean;                        
                    };
                };
            }
        };
        unfarmableResources: {
            [resource: string]: {
                skillRequirements: string[];
            }
        };        
    }
}

// Add cache interface and initialization
interface ResourceRequirementCache {
    [key: string]: {
        requiredResources: {
            [resource: string]: {
                amount: number;
                isMandatory: boolean;
            };
        };
    };
}

const resourceRequirementCache: ResourceRequirementCache = {};

// Helper functions
async function getContracts(deployer: any) {
    const centralAuthRegistryAddress = await getCentralAuthRegistryAddress();
    console.log('\nCentralAuthRegistryAddress:', centralAuthRegistryAddress);
    
    const centralAuthRegistry = await ethers.getContractAt(
        "CentralAuthorizationRegistry",
        centralAuthRegistryAddress
    )

    const resourceFarmingRules = await ethers.getContractAt(
        "ResourceFarmingRules",
        await centralAuthRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IResourceFarmingRules")))
    )

    const resourceFarming = await ethers.getContractAt(
        "ResourceFarming",
        await centralAuthRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IResourceFarming")))
    )

    const resourceSpendManagement = await ethers.getContractAt(
        "ResourceSpendManagement",
        await centralAuthRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IResourceSpendManagement")))
    )

    return {
        resourceFarmingRules,
        resourceFarming,
        resourceSpendManagement
    };
}

async function getCentralAuthRegistryAddress(): Promise<string> {    
    return "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";
}

async function processBatch(
    contracts: any,
    deployer: any,
    collectionAddress: string,
    tokenIds: number[],
    farmingInfo: FarmingInfo
) {
    try {
        console.log(`\n${chalk.cyan('📦 Processing batch of')} ${chalk.yellow(tokenIds.length)} ${chalk.cyan('tokens...')}`);
        console.log(`${chalk.gray('Token IDs:')} ${tokenIds.join(', ')}`);

        for (const tokenId of tokenIds) {
            console.log(`\n${chalk.cyan('🏴‍☠️ Processing token')} ${chalk.yellow(tokenId)}`);
            
            const [farmable, unfarmable] = await contracts.resourceFarmingRules.connect(deployer)
                .getFarmableResourcesForPirate(collectionAddress, tokenId);

            farmingInfo[tokenId.toString()] = {
                farmableResources: {},
                unfarmableResources: {}
            };

            for (const resource of farmable) {
                const dailyOutput = await contracts.resourceFarming.connect(deployer)
                    .simulateResourceProduction(
                        collectionAddress,
                        tokenId,
                        resource.name,
                        1
                    );

                const farmableResource = {
                    dailyOutput: Number(ethers.formatUnits(dailyOutput, 18)),
                    skillRequirements: resource.requirements || [],
                    requiredResources: {}
                };

                // Create cache key
                const cacheKey = `${resource.name}-${dailyOutput.toString()}`;

                // Check cache first
                if (!resourceRequirementCache[cacheKey]) {
                    const resourceRequirementsData = await contracts.resourceSpendManagement.connect(deployer)
                        .getResourceRequirementAmounts(
                            resource.name,
                            1,
                            dailyOutput
                        );

                    resourceRequirementCache[cacheKey] = {
                        requiredResources: {}
                    };

                    for (const requirement of resourceRequirementsData) {
                        const [requiredResource, amount] = requirement;
                        resourceRequirementCache[cacheKey].requiredResources[requiredResource] = {
                            amount: Number(ethers.formatUnits(amount, 18)),
                            isMandatory: requirement.isMandatory,
                        };
                    }
                }

                // Use cached data
                farmableResource.requiredResources = {
                    ...resourceRequirementCache[cacheKey].requiredResources
                };

                farmingInfo[tokenId.toString()].farmableResources[resource.name] = farmableResource;
            }

            for (const resource of unfarmable) {
                farmingInfo[tokenId.toString()].unfarmableResources[resource.name] = {
                    skillRequirements: resource.requirements || []
                };
            }
        }
    } catch (error) {
        console.error(`\n${chalk.red('❌ Error processing batch:')}`);
        console.error(error);
        throw error;
    }
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper function to get output file path for a collection
function getOutputFilePath(collectionAddress: string): string {
    // Remove '0x' prefix and add .json extension
    const fileName = `${collectionAddress.toLowerCase().replace('0x', '')}_farming_info.json`;
    return path.join(OUTPUT_DIR, fileName);
}

async function generateFarmingInfoForCollection(
    collectionName: string,
    contracts: any,
    deployer: any,
    collectionAddress: string,
    startId: number,
    endId: number    
): Promise<FarmingInfo> {
    const outputFile = getOutputFilePath(collectionName);
    let farmingInfo: FarmingInfo = {};

    // Load existing data if file exists
    if (fs.existsSync(outputFile)) {
        try {
            const existingData = fs.readFileSync(outputFile, 'utf8');
            farmingInfo = JSON.parse(existingData);
            console.log(`\n${chalk.green('✅ Loaded existing data for')} ${chalk.yellow(Object.keys(farmingInfo).length)} ${chalk.green('tokens')}`);
        } catch (error) {
            console.error(chalk.red('❌ Error loading existing data:'), error);
        }
    }

    const totalTokens = endId - startId + 1;
    let processed = 0;

    console.log(`\n${chalk.blue(`Processing ${totalTokens} tokens...`)}`);

    while (processed < totalTokens) {
        const batchSize = Math.min(BATCH_SIZE, totalTokens - processed);
        const tokenIds = Array.from({ length: batchSize }, (_, i) => startId + processed + i)
            .filter(id => !farmingInfo[id.toString()]); // Skip already processed tokens

        if (tokenIds.length === 0) {
            processed += batchSize;
            continue;
        }

        // Create batches of CONCURRENT_BATCH_SIZE
        const concurrentBatchSize = Math.ceil(tokenIds.length / CONCURRENT_BATCHES);
        const batches = Array.from({ length: CONCURRENT_BATCHES }, (_, i) => {
            const start = i * concurrentBatchSize;
            const end = Math.min(start + concurrentBatchSize, tokenIds.length);
            return tokenIds.slice(start, end);
        }).filter(batch => batch.length > 0);

        console.log(`Processing batches ${processed + 1}-${processed + batchSize}...`);

        // Process all batches concurrently
        await Promise.all(
            batches.map(batch => 
                processBatch(contracts, deployer, collectionAddress, batch, farmingInfo)
                    .then(() => {
                        // Save each token's data immediately after processing
                        batch.forEach(tokenId => {
                            const tokenData = farmingInfo[tokenId.toString()];
                            if (tokenData) {
                                const currentData = fs.existsSync(outputFile) ? 
                                    JSON.parse(fs.readFileSync(outputFile, 'utf8')) : {};
                                currentData[tokenId.toString()] = tokenData;
                                fs.writeFileSync(outputFile, JSON.stringify(currentData, bigIntReplacer, 2));
                            }
                        });
                    })
            )
        );

        processed += batchSize;
        console.log(`Processed ${processed} tokens`);
    }

    return farmingInfo;
}

// Add this helper function
function bigIntReplacer(key: string, value: any) {
    return typeof value === 'bigint' ? value.toString() : value;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    
    try {
        console.log(`\n${chalk.blue('🚀 Starting farming info generation...')}`);

        // Get contracts
        const contracts = await getContracts(deployer);

        console.log('\nContracts:', {
            resourceSpendManagement: await contracts.resourceSpendManagement.getAddress(),
            resourceFarming: await contracts.resourceFarming.getAddress(),
            resourceFarmingRules: await contracts.resourceFarmingRules.getAddress()
        });

        // Wait 5 seconds before proceeding
        console.log('\nWaiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Define collections and their ID ranges
        const collections = [
            {
                name: "pirates",
                address: "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c",
                startId: 1,
                endId: 2554
            }
            // {
            //     name: "inhabitants",
            //     address: "0xa1b3afc3e025c617bac5bf89ed259fdb789d506c",
            //     startId: 1,
            //     endId: 10845
            // }
        ];

        const allFarmingInfo: { [collection: string]: FarmingInfo } = {};

        for (const collection of collections) {
            console.log(`\n${chalk.blue(`Processing ${collection.name} collection...`)}`);
            allFarmingInfo[collection.name] = await generateFarmingInfoForCollection(
                collection.name,
                contracts,
                deployer,
                collection.address,
                collection.startId,
                collection.endId                
            );
        }

        // Save final output
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allFarmingInfo, bigIntReplacer, 2));

        console.log(`\n${chalk.green('✅ Farming info generation complete!')}`);
        console.log(`Output saved to ${OUTPUT_FILE}`);
        console.log(`Resource requirements saved to ${RESOURCE_REQUIREMENTS_FILE}`);
    } catch (error) {
        console.error(chalk.red('❌ Error:'), error);
        process.exit(1);
    }
}

// how to run:
// npx hardhat run scripts/farming-info/generate_farming_info.ts --network polygon

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });