const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require('path');
const { log } = require("console");
const chalk = require('chalk');
const readline = require('readline');

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
    
    // Create a map of tokenId to expected skills for efficient lookup
    const tokenIdToSkillsMap: { [key: number]: any } = {};
    for (const tokenSkillSet of data) {
        const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));
        for (const tokenId of tokenIds) {
            tokenIdToSkillsMap[tokenId] = tokenSkillSet.skills;
        }
    }

    // Get all token IDs from the data
    const allTokenIds = Object.keys(tokenIdToSkillsMap).map(Number);
    
    // Use the same batch size as findSkillMismatches
    const verificationBatchSize = 100;
    let totalMismatches = 0;

    // Process in batches
    for (let i = 0; i < allTokenIds.length; i += verificationBatchSize) {
        const tokenBatch = allTokenIds.slice(i, i + verificationBatchSize);
        console.log(`${chalk.cyan('📦 Verifying batch')} ${Math.floor(i/verificationBatchSize) + 1}/${Math.ceil(allTokenIds.length/verificationBatchSize)}`);
        
        // Get skills for the entire batch
        const actualSkills = await pirateManagement.getManyPirateSkills(collectionAddress, tokenBatch);

        // Verify each token in the batch
        for (let j = 0; j < tokenBatch.length; j++) {
            const tokenId = tokenBatch[j];
            const actual = actualSkills[j];
            const expectedSkills = tokenIdToSkillsMap[tokenId];
            let hasMismatch = false;

            if (!actual.added) {
                console.error(`${chalk.red('❌ Error:')} Token ${chalk.yellow(tokenId)} skills not added`);
                totalMismatches++;
                continue;
            }

            // Verify character skills
            for (const [skill, value] of Object.entries(expectedSkills.characterSkills)) {
                if (actual.characterSkills[skill] !== BigInt(value as number)) {
                    console.error(`${chalk.red('⚠️  Mismatch:')} Token ${chalk.yellow(tokenId)} character skill ${chalk.cyan(skill)}: expected ${chalk.green(value)}, got ${chalk.red(actual.characterSkills[skill])}`);
                    hasMismatch = true;
                }
            }

            // Verify tools skills
            for (const [skill, value] of Object.entries(expectedSkills.toolsSkills)) {
                if (actual.toolsSkills[skill] !== BigInt(value as number)) {
                    console.error(`${chalk.red('⚠️  Mismatch:')} Token ${chalk.yellow(tokenId)} tools skill ${chalk.cyan(skill)}: expected ${chalk.green(value)}, got ${chalk.red(actual.toolsSkills[skill])}`);
                    hasMismatch = true;
                }
            }

            // Verify special skills
            for (const [skill, value] of Object.entries(expectedSkills.specialSkills)) {
                if (actual.specialSkills[skill] !== BigInt(value as number)) {
                    console.error(`${chalk.red('⚠️  Mismatch:')} Token ${chalk.yellow(tokenId)} special skill ${chalk.cyan(skill)}: expected ${chalk.green(value)}, got ${chalk.red(actual.specialSkills[skill])}`);
                    hasMismatch = true;
                }
            }

            if (hasMismatch) {
                totalMismatches++;
            }
        }

        // Add a small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (totalMismatches > 0) {
        console.log(`\n${chalk.red(`❌ Verification complete with ${totalMismatches} mismatches!`)}`);
    } else {
        console.log(`\n${chalk.green('✅ Verification complete! All skills match!')}`);
    }
}

// Add this helper function for console input
async function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, (ans: string) => {
        rl.close();
        resolve(ans);
    }));
}

// Add this helper function to compare skills and find mismatches
async function findSkillMismatches(
    pirateManagement: any,
    collectionAddress: string,
    tokenIds: number[],
    TokenIdToSkillsMap: { [key: number]: any },
    batchSize: number = 100
): Promise<number[]> {
    const mismatchedTokens: number[] = [];

    const displayDiff = false;
    // Process in batches to avoid hitting gas limits
    for (let i = 0; i < tokenIds.length; i += batchSize) {
        const tokenBatch = tokenIds.slice(i, i + batchSize);
        console.log(`${chalk.cyan('📊 Checking batch')} ${Math.floor(i/batchSize) + 1}/${Math.ceil(tokenIds.length/batchSize)}`);
        console.log(`${chalk.yellow('🔍 Found')} ${mismatchedTokens.length} tokens with mismatched skills...`);
        
        const onChainSkills = await pirateManagement.getManyPirateSkills(collectionAddress, tokenBatch);

        
        
        // Compare each token's skills
        for (let j = 0; j < tokenBatch.length; j++) {
            const tokenId = tokenBatch[j];
            const actualSkills = onChainSkills[j];
            const expectedSkills = TokenIdToSkillsMap[tokenId];
            let hasMismatch = false;

            // Compare character skills
            for (const [skill, value] of Object.entries(expectedSkills.characterSkills)) {
                if (actualSkills.characterSkills[skill] !== BigInt(value as number)) {
                    if (displayDiff) {
                        console.log(`${chalk.red('⚠️  Character Skill Mismatch:')} Token ${chalk.yellow(tokenId)} skill ${chalk.cyan(skill)}`);
                        console.log(`  Actual: ${chalk.red(actualSkills.characterSkills[skill])}`);
                        console.log(`  Expected: ${chalk.green(value)}`);
                    }
                    hasMismatch = true;
                }
            }

            // Compare tools skills
            for (const [skill, value] of Object.entries(expectedSkills.toolsSkills)) {
                if (actualSkills.toolsSkills[skill] !== BigInt(value as number)) {
                    if (displayDiff) {
                        console.log(`${chalk.red('⚠️  Tools Skill Mismatch:')} Token ${chalk.yellow(tokenId)} skill ${chalk.cyan(skill)}`);
                        console.log(`  Expected: ${chalk.green(value)}`);
                        console.log(`  Actual: ${chalk.red(actualSkills.toolsSkills[skill])}`);
                    }
                    hasMismatch = true;
                }
            }

            // Compare special skills
            for (const [skill, value] of Object.entries(expectedSkills.specialSkills)) {
                if (actualSkills.specialSkills[skill] !== BigInt(value as number)) {
                    if (displayDiff) {
                        console.log(`${chalk.red('⚠️  Special Skill Mismatch:')} Token ${chalk.yellow(tokenId)} skill ${chalk.cyan(skill)}`);
                        console.log(`  Expected: ${chalk.green(value)}`);
                        console.log(`  Actual: ${chalk.red(actualSkills.specialSkills[skill])}`);
                    }
                    hasMismatch = true;
                }
            }

            if (hasMismatch) {
                mismatchedTokens.push(tokenId);
            }
            // wait 5 seconds before checking the next batch
            if (displayDiff) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log("Waiting 2 seconds...");
            }
        }
        
        // Add a small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return mismatchedTokens;
}

async function main() {
    // Get command line arguments from environment variables
    const characterType = process.env.CHARACTER_TYPE;
    const isTestMode = process.env.TEST_MODE === 'true';
    const clearLogs = process.env.CLEAR_LOGS === 'true';
    const onlyMismatches = process.env.ONLY_MISMATCHES === 'true';
    
    // Print usage instructions if no character type provided
    if (!characterType) {
        console.log("\nUsage: CHARACTER_TYPE=<type> TEST_MODE=<bool> CLEAR_LOGS=<bool> ONLY_MISMATCHES=<bool> npx hardhat run scripts/skills-update/update_all_skills.ts --network [network]");
        console.log("\nEnvironment Variables:");
        console.log("  CHARACTER_TYPE: 'pirates' or 'inhabitants' (required)");
        console.log("  TEST_MODE: 'true' or 'false' (optional)"); 
        console.log("  CLEAR_LOGS: 'true' or 'false' (optional)");
        console.log("  ONLY_MISMATCHES: 'true' or 'false' (optional)");
        console.log("\nExample:");
        console.log("  # Update all pirates on Polygon:");
        console.log("  CHARACTER_TYPE=pirates CLEAR_LOGS=true ONLY_MISMATCHES=true npx hardhat run scripts/skills-update/update_all_skills.ts --network polygon");
        console.log("\n  # Update all inhabitants on Amoy testnet in test mode:");
        console.log("  CHARACTER_TYPE=inhabitants TEST_MODE=true ONLY_MISMATCHES=false npx hardhat run scripts/skills-update/update_all_skills.ts --network amoy");
        process.exit(1);
    }

    // Ask if user wants to process specific token IDs
    const useSpecificTokens = await askQuestion("\nDo you want to process specific token IDs? (y/n): ");
    
    let specificTokenIds: number[] | null = null;
    if (useSpecificTokens.toLowerCase() === 'y') {
        const tokenInput = await askQuestion("\nEnter token IDs (comma-separated, e.g., 1,2,3,4,5): ");
        specificTokenIds = tokenInput
            .split(',')
            .map(id => id.trim())
            .filter(id => id !== '')
            .map(id => {
                const num = parseInt(id);
                if (isNaN(num)) {
                    console.error(`${chalk.red('❌ Error:')} Invalid token ID: ${id}`);
                    process.exit(1);
                }
                return num;
            });

        if (specificTokenIds.length === 0) {
            console.error(`${chalk.red('❌ Error:')} No valid token IDs provided`);
            process.exit(1);
        }
    }

    // Validate character type
    if (!['pirates', 'inhabitants'].includes(characterType)) {
        console.error("\nError: CHARACTER_TYPE must be either 'pirates' or 'inhabitants'");
        process.exit(1);
    }

        // Configure addresses and batch sizes based on character type
        const config = {
            pirates: {
                batchSize: 5000,
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
                batchSize: 5000,
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

    const feeData = await ethers.provider.getFeeData();
    console.log("\nCurrent Gas Prices:");
    console.log("-------------------");
    console.log("🏷️  Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
    if (feeData.maxFeePerGas) {
        console.log("💰 Max Fee:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
        console.log("💎 Max Priority Fee:", ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
    }
    console.log("-------------------\n");

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

    const [signer] = await ethers.getSigners();
    if (!signer) {
        throw new Error('No signer available');
    }

    const signerAddress = await signer.getAddress();

    // Read and process data
    let data = JSON.parse(fs.readFileSync(
        path.join(__dirname, currentConfig.inputFile),
        "utf8"
    ));

    console.log("Waiting 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log("Wait complete, proceeding with updates");
    
    // If specific token IDs provided, filter data to only include those tokens
    if (specificTokenIds) {
        console.log(`\n${chalk.blue('🎯 Processing specific token IDs:')} ${chalk.yellow(specificTokenIds.join(', '))}`);
        
        // Create a Set for O(1) lookup
        const tokenIdSet = new Set(specificTokenIds);
        
        // Filter data to ONLY include the exact token IDs specified
        data = data.map(skillSet => ({
            ...skillSet,
            tokenIds: skillSet.tokenIds
                .map(id => parseInt(id.toString()))
                .filter(id => tokenIdSet.has(id))
        })).filter(skillSet => skillSet.tokenIds.length > 0);

        if (data.length === 0) {
            console.error(`${chalk.red('❌ Error:')} No matching token IDs found in skill data`);
            process.exit(1);
        }

        // Verify we only have the exact tokens requested
        const foundTokens = new Set(data.flatMap(skillSet => 
            skillSet.tokenIds.map(id => parseInt(id.toString()))
        ));
        
        console.log(`${chalk.green('✅ Found tokens:')} ${chalk.yellow(Array.from(foundTokens).map(Number).sort((a, b) => a-b).join(', '))}`);
        
        // Verify all requested tokens were found
        const missingTokens = specificTokenIds.filter(id => !foundTokens.has(id));
        if (missingTokens.length > 0) {
            console.log(`${chalk.yellow('⚠️  Warning: Some tokens not found:')} ${chalk.red(missingTokens.join(', '))}`);
        }

        // Double-check we're only processing requested tokens
        const allTokensInData = data.flatMap(skillSet => skillSet.tokenIds);
        const extraTokens = allTokensInData.filter(id => !tokenIdSet.has(id));
        if (extraTokens.length > 0) {
            console.error(`${chalk.red('❌ Error: Found extra tokens that weren\'t requested. This shouldn\'t happen.')}`);
            process.exit(1);
        }

        console.log(`${chalk.green('✅ Found')} ${chalk.yellow(data.length)} ${chalk.green('matching skill sets')}`);

        console.log("Waiting 5 seconds...");
         await new Promise(resolve => setTimeout(resolve, 5000));
        console.log("Wait complete, proceeding with updates");
    }

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

    let allBatchUpdates: BatchUpdate[] = [];

    let newTokenIds: number[] = [];
    let TokenIdToSkillsMap: { [key: number]: { characterSkills: any, toolsSkills: any, specialSkills: any } } = {};

    let totalGasSpent = BigInt(0);
    let totalTransactions = 0;

    // First step: Collect all batches
    for (let i = 0; i < data.length; i++) {
        const tokenSkillSet = data[i];
        const skills = tokenSkillSet.skills;
        
        // Extra verification for specific token mode
        if (specificTokenIds) {
            const invalidTokens = tokenSkillSet.tokenIds.filter(id => !specificTokenIds.includes(parseInt(id.toString())));
            if (invalidTokens.length > 0) {
                console.error(`${chalk.red('❌ Error: Found unauthorized tokens in batch:')} ${invalidTokens.join(', ')}`);
                process.exit(1);
            }
        }

        console.log(`\n${chalk.blue('🎭 Processing Skill Set')} ${chalk.yellow(i + 1)}/${chalk.yellow(data.length)}`);
        //console.log(`${chalk.cyan('💪 Skills:')} ${chalk.gray('Character:')} ${Object.entries(skills.characterSkills).map(([k,v]) => `${k}=${v}`).join(', ')}`);
        //console.log(`${chalk.gray('           Tools:')} ${Object.entries(skills.toolsSkills).map(([k,v]) => `${k}=${v}`).join(', ')}`);
        //console.log(`${chalk.gray('           Special:')} ${Object.entries(skills.specialSkills).map(([k,v]) => `${k}=${v}`).join(', ')}\n`);

        // Filter out already updated tokens
        const newTokenIdsToAdd = tokenSkillSet.tokenIds
            .map(id => parseInt(id))
            .filter(id => !updatedTokenIds.has(id));

        if (newTokenIdsToAdd.length === 0) {
            console.log(`${chalk.gray('⏭️  Skipping skill set - all tokens already updated')}`);
            continue;
        }

        for (const tokenId of newTokenIdsToAdd) {
            TokenIdToSkillsMap[tokenId] = skills;
        }

        newTokenIds = newTokenIds.concat(newTokenIdsToAdd);

    }

    // If onlyMismatches is true, check all tokens' current skills in batches
    let tokensToUpdate = newTokenIds;
    if (onlyMismatches) {
        console.log(`${chalk.blue('🔍 Checking for skill mismatches...')}`);
        
        tokensToUpdate = await findSkillMismatches(
            pirateManagement,
            collectionAddress,
            newTokenIds,
            TokenIdToSkillsMap
        );
        
        console.log(`${chalk.cyan('Found')} ${chalk.yellow(tokensToUpdate.length)} ${chalk.cyan('tokens with mismatched skills')}`);
        
        if (tokensToUpdate.length > 0) {
            console.log(`${chalk.yellow('Mismatched Token IDs:')} ${tokensToUpdate.slice(0, 10).join(', ')}${tokensToUpdate.length > 10 ? '...' : ''}`);
        }

        console.log("Waiting 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log("Wait complete, proceeding with updates");
    }

    // Create batches for tokens that need updates
    for (let j = 0; j < tokensToUpdate.length; j += currentConfig.batchSize) {
        const tokenBatch = tokensToUpdate.slice(j, j + currentConfig.batchSize);
        
        // Group tokens by identical skill sets
        const skillGroups = new Map();
        
        for (const tokenId of tokenBatch) {
            const skills = TokenIdToSkillsMap[tokenId];
            // Create a key from the skills to group identical ones
            const skillKey = JSON.stringify(skills);
            
            if (!skillGroups.has(skillKey)) {
                skillGroups.set(skillKey, {
                    tokenIds: [],
                    skills: skills
                });
            }
            skillGroups.get(skillKey).tokenIds.push(tokenId);
        }

        // Create batch updates for each group of tokens with identical skills
        for (const group of skillGroups.values()) {
            allBatchUpdates.push({
                tokenIds: group.tokenIds,
                skills: {
                    characterSkills: Object.fromEntries(
                        Object.entries(group.skills.characterSkills)
                            .map(([key, value]) => [key, BigInt(value as number)])
                    ),
                    toolsSkills: Object.fromEntries(
                        Object.entries(group.skills.toolsSkills)
                            .map(([key, value]) => [key, BigInt(value as number)])
                    ),
                    specialSkills: Object.fromEntries(
                        Object.entries(group.skills.specialSkills)
                            .map(([key, value]) => [key, BigInt(value as number)])
                    ),
                    added: true
                }
            });
        }
    }
    // Second step: Process all collected batches in groups
    const batchSize = 25;
    const totalBatchGroups = Math.ceil(allBatchUpdates.length/batchSize);
    console.log(`\n${chalk.blue('📊 Processing Updates:')} ${chalk.yellow(allBatchUpdates.length)} total batches in ${chalk.yellow(totalBatchGroups)} groups\n`);

    for (let j = 0; j < allBatchUpdates.length; j += batchSize) {
        const currentBatchGroup = allBatchUpdates.slice(j, j + batchSize);
        const currentGroupNumber = Math.floor(j/batchSize) + 1;
        
        console.log(`${chalk.blue('📦 Processing batch group')} ${chalk.yellow(currentGroupNumber)}/${chalk.yellow(totalBatchGroups)} ${chalk.gray(`(${currentBatchGroup.length} batches)`)}`);
        
        // Log token IDs being sent in current batch group
        console.log(`${chalk.cyan('🎯 Sending token IDs:')} ${currentBatchGroup.map(batch => 
            `${chalk.yellow('[')}${batch.tokenIds.length > 3 ? 
                `${batch.tokenIds.slice(0,3).join(', ')}...+${batch.tokenIds.length-3}` : 
                batch.tokenIds.join(', ')}${chalk.yellow(']')}`
        ).join(' ')}`);

        const tx = await batchUpdateWithRetry(
            pirateManagement,
            signer,
            collectionAddress,
            currentBatchGroup
        );

        const receipt = await tx.wait();
        
        // Track gas usage
        const gasSpent = receipt.gasUsed * receipt.gasPrice;
        totalGasSpent += BigInt(gasSpent);
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
