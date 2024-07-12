const { ethers } = require("hardhat");
const fs = require("fs");
const path = require('path');

const BATCH_SIZE = 200;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

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
        collectionAddress = "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c"; // Replace with your collection address
    }

    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'pirate_skills.json'), "utf8"));

    const batchSize = 10;
    for (let i = 0; i < data.length; i += batchSize) {
        console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(data.length / batchSize)}`);
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
        });

        let retries = 0;
        while (retries < MAX_RETRIES) {
            try {
                await pirateManagement.connect(deployer).batchUpdatePirateAttributes(
                    collectionAddress,
                    batchUpdates
                );
                break; // Exit loop if successful
            } catch (error) {
                if (retries === MAX_RETRIES - 1) {
                    throw error; // Rethrow error if max retries reached
                }
                console.log(`Retrying batch ${i / batchSize + 1} due to error: ${error.message}`);
                retries++;
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
    }

    console.log("All pirate attributes updated successfully");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });