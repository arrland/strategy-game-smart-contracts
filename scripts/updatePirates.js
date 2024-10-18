const { ethers } = require("hardhat");
const fs = require("fs");
const path = require('path');
const { log } = require("console");

const BATCH_SIZE = 500; // Reduced batch size to fit within transaction limits
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

async function checkPirateSkillAdded(pirateManagement, collectionAddress, tokenId) {
    try {
        const pirateSkills = await pirateManagement.getPirateSkills(collectionAddress, tokenId);
        return pirateSkills.added;
    } catch (error) {
        console.error(`Error checking pirate skill for tokenId ${tokenId}: ${error}`);
        return false;
    }
}

async function batchUpdateWithRetry(pirateManagement, deployer, collectionAddress, batchUpdates, retries = 0) {
    try {
        const tx = await pirateManagement.connect(deployer).batchUpdatePirateAttributes(collectionAddress, batchUpdates);
        console.log(`Transaction ID: ${tx.hash}`);
        await tx.wait(); // Wait until the transaction is confirmed
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

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    const pirateManagementAddress = "0x490b32F2Ee77F733F8a143deD9fB1bD8715Af86F";
    const PirateManagement = await ethers.getContractFactory("PirateManagement");
    const pirateManagement = PirateManagement.attach(pirateManagementAddress);
    console.log("Deployer address:", deployer.address);
    console.log("PirateManagement address:", pirateManagementAddress);

    let collectionAddress;
    if (network.name === "amoy") {
        collectionAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942"; // Replace with your collection address
    } else {
        collectionAddress = "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c";
    }

    let data = JSON.parse(fs.readFileSync("/Users/dominik/blockchain/strategy-game-smart-contracts/scripts/pirate_skills.json", "utf8"));

    // Define the range of token IDs to be updated
    const specificTokenIds = [];

    if (specificTokenIds.length > 0) {
        // Filter the data to include only the specific token IDs
        data = data.filter(tokenSkillSet => {
            const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));
            return tokenIds.some(id => specificTokenIds.includes(id));
        });
    }

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(data.length / BATCH_SIZE)}`);
        const batch = data.slice(i, i + BATCH_SIZE);
        const batchUpdates = batch.map(tokenSkillSet => {
            const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));
            const skills = tokenSkillSet.skills;

            const characterSkills = {
                strength: BigInt(skills.characterSkills.strength),
                stamina: BigInt(skills.characterSkills.stamina),
                swimming: BigInt(skills.characterSkills.swimming),
                melee: BigInt(skills.characterSkills.melee),
                shooting: BigInt(skills.characterSkills.shooting),
                cannons: BigInt(skills.characterSkills.cannons),
                agility: BigInt(skills.characterSkills.agility),
                engineering: BigInt(skills.characterSkills.engineering),
                wisdom: BigInt(skills.characterSkills.wisdom),
                luck: BigInt(skills.characterSkills.luck),
                health: BigInt(skills.characterSkills.health),
                speed: BigInt(skills.characterSkills.speed)
            };

            const toolsSkills = {
                harvest: BigInt(skills.toolsSkills.harvest),
                mining: BigInt(skills.toolsSkills.mining),
                quarrying: BigInt(skills.toolsSkills.quarrying),
                excavation: BigInt(skills.toolsSkills.excavation),
                husbandry: BigInt(skills.toolsSkills.husbandry),
                woodcutting: BigInt(skills.toolsSkills.woodcutting),
                slaughter: BigInt(skills.toolsSkills.slaughter),
                hunting: BigInt(skills.toolsSkills.hunting),
                cultivation: BigInt(skills.toolsSkills.cultivation)
            };

            const specialSkills = {
                fruitPicking: BigInt(skills.specialSkills.fruitPicking),
                fishing: BigInt(skills.specialSkills.fishing),
                building: BigInt(skills.specialSkills.building),
                crafting: BigInt(skills.specialSkills.crafting)
            };

            const pirateSkills = {
                characterSkills: characterSkills,
                toolsSkills: toolsSkills,
                specialSkills: specialSkills,
                added: true
            };

            return { tokenIds: tokenIds, skills: pirateSkills };
        }).filter(update => update !== null); // Filter out null updates

        const batchUpdatesWithBatches = [];
        for (const update of batchUpdates) {
            const tokenIds = update.tokenIds;
            const skills = update.skills;
            const batchSize = 500;
            for (let j = 0; j < tokenIds.length; j += batchSize) {
                const tokenBatch = tokenIds.slice(j, j + batchSize);
                batchUpdatesWithBatches.push({ tokenIds: tokenBatch, skills: skills });
            }
        }

        if (batchUpdatesWithBatches.length === 0) {
            throw new Error("No updates in this batch");
        }
        batchSizeToSend = 20;
        for (let i = 0; i < batchUpdatesWithBatches.length; i += batchSizeToSend) {
            const batchGroup = batchUpdatesWithBatches.slice(i, i + batchSizeToSend);
            console.log(`Batch Group ${i / batchSizeToSend + 1} out of ${Math.ceil(batchUpdatesWithBatches.length / batchSizeToSend)}`);

            const logDir = path.join(__dirname, 'logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir);
            }
            const logFilePath = path.join(logDir, `added_token_ids_${collectionAddress}.txt`);

            // Check if the file exists, if not, create it
            if (!fs.existsSync(logFilePath)) {
                fs.writeFileSync(logFilePath, '');
            }

            const addedTokenIds = fs.readFileSync(logFilePath, "utf8").split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            for (const batchUpdate of batchGroup) {
                batchUpdate.tokenIds = batchUpdate.tokenIds.filter(id => !addedTokenIds.includes(id));
                if (batchUpdate.tokenIds.length === 0) {                    
                    continue;
                }
            }

            const filteredBatchGroup = batchGroup.filter(batchUpdate => batchUpdate.tokenIds.length > 0);
            if (filteredBatchGroup.length === 0) {
                console.log("No new token IDs to update in this batch group");
                continue;
            }

            const tx = await pirateManagement.connect(deployer).batchUpdatePirateAttributes(
                collectionAddress,
                filteredBatchGroup                
            );
            console.log(`Transaction ID: ${tx.hash}`);
            await tx.wait(); // Wait until the transaction is confirmed
            console.log("Transaction confirmed");
            for (const batchUpdate of filteredBatchGroup) {
                console.log(batchUpdate.tokenIds);
                const updatedTokenIds = batchUpdate.tokenIds.map(id => id.toString()).join(',');
                fs.appendFileSync(logFilePath, updatedTokenIds + ',');
            }
            
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("All pirate attributes updated successfully");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
