const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require('path');
const { log } = require("console");
const chalk = require('chalk');

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

// Add this interface before the main function
interface BatchUpdate {
    tokenIds: number[];
    skills: {
        characterSkills: Record<string, bigint>;
        toolsSkills: Record<string, bigint>;
        specialSkills: Record<string, bigint>;
        added: boolean;
    };
}

async function checkSkillsAdded(pirateManagement, collectionAddress, tokenId) {
    try {
        const skills = await pirateManagement.getPirateSkills(collectionAddress, tokenId);
        return skills.added;
    } catch (error) {
        console.error(`Error checking skills for tokenId ${tokenId}: ${error}`);
        return false;
    }
}

async function batchUpdateWithRetry(pirateManagement, deployer, collectionAddress, batchUpdates, retries = 0) {
    try {
        const tx = await pirateManagement.connect(deployer).batchUpdatePirateAttributes(collectionAddress, batchUpdates);
        console.log(`Transaction ID: ${tx.hash}`);
        await tx.wait();
        return tx;
    } catch (error) {
        if (retries < MAX_RETRIES) {
            console.warn(`Retrying batch update... (${retries + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return batchUpdateWithRetry(pirateManagement, deployer, collectionAddress, batchUpdates, retries + 1);
        } else {
            throw error;
        }
    }
}

async function verifySkills(pirateManagement: any, collectionAddress: string, data: any[]) {
    console.log(`\n${chalk.blue('🔍 Starting Verification Process...')}`);
    
    for (let i = 0; i < data.length; i++) {
        const tokenSkillSet = data[i];
        const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));
        const expectedSkills = tokenSkillSet.skills;
        
        // Reduced batch size from 500 to 100 for verification
        const verificationBatchSize = 100;
        for (let j = 0; j < tokenIds.length; j += verificationBatchSize) {
            const tokenBatch = tokenIds.slice(j, j + verificationBatchSize);
            console.log(`${chalk.cyan('📦 Verifying batch')} ${Math.floor(j/verificationBatchSize) + 1}/${Math.ceil(tokenIds.length/verificationBatchSize)} ${chalk.cyan('of skill set')} ${i + 1}/${data.length}`);
            
            const actualSkills = await pirateManagement.getManyPirateSkills(collectionAddress, tokenBatch);
            
            // Verify each token's skills
            for (let k = 0; k < tokenBatch.length; k++) {
                const tokenId = tokenBatch[k];
                const actual = actualSkills[k];
                
                if (!actual.added) {
                    console.error(`${chalk.red('❌ Error:')} Token ${chalk.yellow(tokenId)} skills not added`);
                    continue;
                }

                // Verify character skills
                for (const [skill, value] of Object.entries(expectedSkills.characterSkills)) {
                    if (actual.characterSkills[skill] !== BigInt(value as number)) {
                        console.error(`${chalk.red('⚠️  Mismatch:')} Token ${chalk.yellow(tokenId)} character skill ${chalk.cyan(skill)}: expected ${chalk.green(value)}, got ${chalk.red(actual.characterSkills[skill])}`);
                    }
                }

                // Verify tools skills
                for (const [skill, value] of Object.entries(expectedSkills.toolsSkills)) {
                    if (actual.toolsSkills[skill] !== BigInt(value as number)) {
                        console.error(`${chalk.red('⚠️  Mismatch:')} Token ${chalk.yellow(tokenId)} tools skill ${chalk.cyan(skill)}: expected ${chalk.green(value)}, got ${chalk.red(actual.toolsSkills[skill])}`);
                    }
                }

                // Verify special skills
                for (const [skill, value] of Object.entries(expectedSkills.specialSkills)) {
                    if (actual.specialSkills[skill] !== BigInt(value as number)) {
                        console.error(`${chalk.red('⚠️  Mismatch:')} Token ${chalk.yellow(tokenId)} special skill ${chalk.cyan(skill)}: expected ${chalk.green(value)}, got ${chalk.red(actual.specialSkills[skill])}`);
                    }
                }
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n${chalk.green('✅ Verification complete!')}`);
}

async function main() {
    // Get command line arguments from environment variables
    const characterType = process.env.CHARACTER_TYPE;
    const isTestMode = process.env.TEST_MODE === 'true';
    const clearLogs = process.env.CLEAR_LOGS === 'true';

    // Print usage instructions if no character type provided
    if (!characterType) {
        console.log("\nUsage: CHARACTER_TYPE=<type> TEST_MODE=<bool> CLEAR_LOGS=<bool> npx hardhat run scripts/skills-update/update_all_skills.ts --network [network]");
        console.log("\nEnvironment Variables:");
        console.log("  CHARACTER_TYPE: 'pirates' or 'inhabitants' (required)");
        console.log("  TEST_MODE: 'true' or 'false' (optional)"); 
        console.log("  CLEAR_LOGS: 'true' or 'false' (optional)");
        console.log("\nExamples:");
        console.log("  Update pirates on polygon:");
        console.log("    CHARACTER_TYPE=pirates CLEAR_LOGS=true npx hardhat run scripts/skills-update/update_all_skills.ts --network polygon");
        console.log("\n  Update inhabitants on amoy in test mode:");
        console.log("    CHARACTER_TYPE=inhabitants TEST_MODE=true CLEAR_LOGS=true npx hardhat run scripts/skills-update/update_all_skills.ts --network amoy");
        console.log("\n  Update pirates on polygon and clear logs:");
        console.log("    CHARACTER_TYPE=pirates CLEAR_LOGS=true npx hardhat run scripts/skills-update/update_all_skills.ts --network polygon");
        process.exit(1);
    }

    // Validate character type
    if (!['pirates', 'inhabitants'].includes(characterType)) {
        console.error("\nError: CHARACTER_TYPE must be either 'pirates' or 'inhabitants'");
        process.exit(1);
    }

        // Configure addresses and batch sizes based on character type
        const config = {
            pirates: {
                batchSize: 500,
                inputFile: "pirate_skills.json",
                addresses: {
                    amoy: {
                        collection: '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942',
                        registry: '0x99a764fd156083aA343e2577C348c8cF110C7141'
                    },
                    polygon: {
                        collection: '0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c',
                        registry: '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778'
                    }
                }
            },
            inhabitants: {
                batchSize: 500,
                inputFile: "ihabitants_skills.json",
                addresses: {
                    amoy: {
                        collection: '0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654',
                        registry: '0x99a764fd156083aA343e2577C348c8cF110C7141'
                    },
                    polygon: {
                        collection: '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c',
                        registry: '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778'
                    }
                }
            }
        };
    
    const currentConfig = config[characterType];

    let collectionAddress, centralAuthRegistryAddress;
    if (network.name === "amoy") {
        centralAuthRegistryAddress = currentConfig.addresses.amoy.registry;
        collectionAddress = currentConfig.addresses.amoy.collection;
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = currentConfig.addresses.polygon.registry;
        collectionAddress = currentConfig.addresses.polygon.collection;
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);
    const pirateManagementAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IPirateManagement"))
    );
    const PirateManagement = await ethers.getContractFactory("PirateManagement");
    const pirateManagement = PirateManagement.attach(pirateManagementAddress);

    // Log all options being used
    console.log(`\n${chalk.blue('🚀 Running with options:')}`);
    console.log(`${chalk.cyan('👤 Character Type:')} ${characterType}`);
    console.log(`${chalk.cyan('🧪 Test Mode:')} ${isTestMode ? chalk.green('✅ Enabled') : chalk.yellow('❌ Disabled')}`);
    console.log(`${chalk.cyan('🗑️  Clear Logs:')} ${clearLogs ? chalk.green('✅ Yes') : chalk.yellow('❌ No')}`);
    console.log(`${chalk.cyan('🏴‍☠️ Pirate Management:')} ${pirateManagementAddress}`);
    console.log(`${chalk.cyan('🌐 Network:')} ${network.name}`);
    console.log(`${chalk.cyan('🔢 Batch Size:')} ${currentConfig.batchSize}`);
    console.log(chalk.blue('----------------------------------------\n'));

    // Wait 5 seconds before proceeding
    console.log("Waiting 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Wait complete, proceeding with updates");
    // Clear logs if requested
    const logDir = path.join(__dirname, 'logs');
    if (clearLogs) {
        console.log("Clearing logs directory...");
        if (fs.existsSync(logDir)) {
            fs.rmSync(logDir, { recursive: true });
        }
        fs.mkdirSync(logDir);
        console.log("Logs directory cleared");
    }

    const logFilePath = path.join(logDir, `added_token_ids_${characterType}_${network.name}.txt`);

    // Create empty file if it doesn't exist
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '');
    }

    // Read already updated token IDs
    let updatedTokenIds = new Set();
    if (fs.existsSync(logFilePath)) {
        const logContent = fs.readFileSync(logFilePath, 'utf8');
        updatedTokenIds = new Set(
            logContent.split(',')
                .filter(id => id.trim())
                .map(id => parseInt(id.trim()))
        );
    }

    console.log(`${chalk.blue('📋 Previously updated:')} ${chalk.yellow(updatedTokenIds.size)} tokens`);

    const [deployer] = await ethers.getSigners();
    let totalGasSpent = ethers.parseEther("0");
    let totalTransactions = 0;
    
    console.log("Deployer address:", deployer.address);

    // Read and process data
    let data = JSON.parse(fs.readFileSync(
        path.join(__dirname, currentConfig.inputFile),
        "utf8"
    ));

    // If test mode, limit to first 20 skills
    if (isTestMode) {
        console.log("Running in test mode - limiting to 20 skills");
        let totalTokens = 0;
        data = data.filter(item => {
            if (totalTokens >= 200) return false;
            totalTokens += item.tokenIds.length;
            return true;
        });
    }

    // Modify the batch processing section
    for (let i = 0; i < data.length; i++) {
        const tokenSkillSet = data[i];
        const skills = tokenSkillSet.skills;
        console.log(`\n${chalk.blue('🎭 Processing Skill Set')} ${chalk.yellow(i + 1)}/${chalk.yellow(data.length)}`);
        console.log(`${chalk.cyan('💪 Skills:')} ${chalk.gray('Character:')} ${Object.entries(skills.characterSkills).map(([k,v]) => `${k}=${v}`).join(', ')}`);
        console.log(`${chalk.gray('           Tools:')} ${Object.entries(skills.toolsSkills).map(([k,v]) => `${k}=${v}`).join(', ')}`);
        console.log(`${chalk.gray('           Special:')} ${Object.entries(skills.specialSkills).map(([k,v]) => `${k}=${v}`).join(', ')}\n`);

        // Filter out already updated tokens
        const newTokenIds = tokenSkillSet.tokenIds
            .map(id => parseInt(id))
            .filter(id => !updatedTokenIds.has(id));

        if (newTokenIds.length === 0) {
            console.log(`${chalk.gray('⏭️  Skipping skill set - all tokens already updated')}`);
            continue;
        }

        const batchUpdates: BatchUpdate[] = [];
        // Split token IDs into smaller batches (max 500 tokens per batch)
        const maxTokensPerBatch = currentConfig.batchSize;
        for (let j = 0; j < newTokenIds.length; j += maxTokensPerBatch) {
            const tokenBatch = newTokenIds.slice(j, j + maxTokensPerBatch);
            
            batchUpdates.push({
                tokenIds: tokenBatch,
                skills: {
                    characterSkills: Object.fromEntries(
                        Object.entries(skills.characterSkills)
                            .map(([key, value]) => [key, BigInt(value as number)])
                    ),
                    toolsSkills: Object.fromEntries(
                        Object.entries(skills.toolsSkills)
                            .map(([key, value]) => [key, BigInt(value as number)])
                    ),
                    specialSkills: Object.fromEntries(
                        Object.entries(skills.specialSkills)
                            .map(([key, value]) => [key, BigInt(value as number)])
                    ),
                    added: true
                }
            });
        }

        // Process batches in groups of 30
        const batchSize = 30;
        const totalBatchGroups = Math.ceil(batchUpdates.length/batchSize);
        console.log(`${chalk.blue('📊 Processing Updates:')} ${chalk.yellow(batchUpdates.length)} total batches in ${chalk.yellow(totalBatchGroups)} groups for skill set ${i + 1}/${data.length}\n`);

        for (let j = 0; j < batchUpdates.length; j += batchSize) {
            const currentBatchGroup = batchUpdates.slice(j, j + batchSize);
            const currentGroupNumber = Math.floor(j/batchSize) + 1;
            
            console.log(`${chalk.blue('📦 Processing batch group')} ${chalk.yellow(currentGroupNumber)}/${chalk.yellow(totalBatchGroups)} ${chalk.gray(`(${currentBatchGroup.length} batches)`)}`);
            
            // Log token IDs being sent in current batch group
            console.log(`${chalk.cyan('🎯 Sending token IDs:')} ${currentBatchGroup.map(batch => 
                `${chalk.yellow('[')}${batch.tokenIds.join(', ')}${chalk.yellow(']')}`
            ).join(' ')}`);

            const tx = await pirateManagement.connect(deployer).batchUpdatePirateAttributes(
                collectionAddress,
                currentBatchGroup
            );
            console.log(`${chalk.cyan('🔗 Transaction ID:')} ${tx.hash}`);
            const receipt = await tx.wait();
            
            // Track gas usage
            const gasSpent = receipt.gasUsed * receipt.gasPrice;
            totalGasSpent += gasSpent;
            totalTransactions++;
            
            console.log(`${chalk.yellow('⛽ Gas used:')} ${ethers.formatEther(gasSpent)} MATIC`);
            console.log(`${chalk.yellow('💰 Total gas:')} ${ethers.formatEther(totalGasSpent)} MATIC`);
            console.log(`${chalk.gray('⏱️  Progress:')} ${Math.round((currentGroupNumber/totalBatchGroups) * 100)}%\n`);
            
            // Log processed token IDs
            for (const batchUpdate of currentBatchGroup) {
                const updatedTokenIds = batchUpdate.tokenIds.map(id => id.toString()).join(',');
                fs.appendFileSync(logFilePath, updatedTokenIds + ',');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log(`\n${chalk.green('✅ All updates completed. Starting verification...')}`);
    await verifySkills(pirateManagement, collectionAddress, data);

    console.log(`${chalk.green('✅ Verification complete!')}`);

    console.log(`\n${chalk.blue('📊 Final Statistics:')}`);
    console.log(`${chalk.cyan('🔢 Total Transactions:')} ${totalTransactions}`);
    console.log(`${chalk.yellow('💰 Total Gas Spent:')} ${ethers.formatEther(totalGasSpent)} MATIC`);
    console.log(`${chalk.green('✅ All')} ${characterType} ${chalk.green('attributes updated successfully')}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
