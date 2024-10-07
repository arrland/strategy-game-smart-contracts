const { ethers } = require("hardhat");


async function checkPirateSkillAdded(pirateManagement, collectionAddress, tokenId) {
    try {
        const pirateSkills = await pirateManagement.getPirateSkills(collectionAddress, tokenId);
        return pirateSkills.added;
    } catch (error) {
        console.error(`Error checking pirate skill for tokenId ${tokenId}: ${error}`);
        return false;
    }
}

async function main() {
    const pirateManagementAddress = process.env.PIRATE_MANAGEMENT;
    const args = process.argv.slice(2);
    const collectionAddress = args[0];
    const totalTokens = parseInt(args[1], 10);


    console.log(`Collection Address: ${collectionAddress}`);
    console.log(`Total Tokens: ${totalTokens}`);

    if (!collectionAddress) {
        console.error("Please provide the collection address as a parameter.");
        process.exit(1);
    }

    const pirateManagementABI = JSON.stringify(require('../ABIS/PirateManagement.json'));
    console.log(pirateManagementABI);
    const pirateManagement = new ethers.Contract(pirateManagementAddress, pirateManagementABI, ethers.provider);

    const tokenIds = [...Array(totalTokens).keys()].map(id => id + 1);

    console.log(tokenIds);

    const batchSize = 10;
    for (let i = 0; i < tokenIds.length; i += batchSize) {
        const batch = tokenIds.slice(i, i + batchSize);
        console.log(`Collection Address: ${collectionAddress}`);
        console.log(`Batch: ${batch}`);
        
        try {
            const skills = await pirateManagement.getManyPirateSkills(collectionAddress, batch);
            console.log(skills);
            
            console.log(`Batch ${i / batchSize + 1}:`);
            for (const skill of skills) {
                if (!skill.added) {
                    console.log(`Token ID ${batch[i]}: Skills not added`);
                }
            }
        } catch (error) {
            console.error("Error calling getManyPirateSkills:", error);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });