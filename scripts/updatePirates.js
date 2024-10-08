const { ethers } = require("hardhat");
const fs = require("fs");

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
    const pirateManagementAddress = process.env.PIRATE_MANAGEMENT;
    const PirateManagement = await ethers.getContractFactory("PirateManagement");
    const pirateManagement = PirateManagement.attach(pirateManagementAddress);

    let collectionAddress;
    if (network.name === "amoy") {
        collectionAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942"; // Replace with your collection address
    } else {
        collectionAddress = "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c";
    }

    let data = JSON.parse(fs.readFileSync("/Users/dominik/blockchain/strategy-game-smart-contracts/scripts/pirate_skills.json", "utf8"));

    const specificTokenIds = [];
    if (specificTokenIds.length > 0) {
        data = data.filter(tokenSkillSet => {
            const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));
            return tokenIds.some(id => specificTokenIds.includes(id));
        });
    }

    const batchSize = 10;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch_nr = i / batchSize + 1;
        console.log(`Processing batch ${batch_nr} of ${Math.ceil(data.length / batchSize)}`);
        const batch = data.slice(i, i + batchSize);
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

        if (batchUpdates.length === 0) {
            throw new Error("No updates in this batch");
        }

        try {
            await batchUpdateWithRetry(pirateManagement, deployer, collectionAddress, batchUpdates);
        } catch (error) {
            console.error(`Failed to update batch ${batch_nr}:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log("All pirate attributes updated successfully");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });