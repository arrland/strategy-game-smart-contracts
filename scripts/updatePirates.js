const { ethers } = require("hardhat");
const fs = require("fs");
const path = require('path');

const BATCH_SIZE = 200;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    const pirateManagementAddress = "0x860CB8e23681Bea5fBa8531D0c065E5D0Bddc687"; // Replace with your contract address
    const PirateManagement = await ethers.getContractFactory("PirateManagement");
    const pirateManagement = PirateManagement.attach(pirateManagementAddress);

    const collectionAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942"; // Replace with your collection address

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

        await pirateManagement.connect(deployer).batchUpdatePirateAttributes(
            collectionAddress,
            batchUpdates
            );
        }

    console.log("All pirate attributes updated successfully");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
