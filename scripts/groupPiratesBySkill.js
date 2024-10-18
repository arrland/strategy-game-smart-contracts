const fs = require('fs');

function loadPirateSkills(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const POLYGON_AMAY_RPC = process.env.POLYGON_AMAY_RPC;

const { ethers } = require("hardhat");

async function getMintedIds(contractAddress, userAddresses) {
    const abi = [
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "account",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "id",
                    "type": "uint256"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "address[]",
                    "name": "accounts",
                    "type": "address[]"
                },
                {
                    "internalType": "uint256[]",
                    "name": "ids",
                    "type": "uint256[]"
                }
            ],
            "name": "balanceOfBatch",
            "outputs": [
                {
                    "internalType": "uint256[]",
                    "name": "",
                    "type": "uint256[]"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const provider = new ethers.JsonRpcProvider("https://polygon-amoy.g.alchemy.com/v2/-PeyBhQ6CEkmr9xnWHxBoYOgwY1GPCNa");
    const contract = new ethers.Contract(contractAddress, abi, provider);

    const mintedIds = [];

    try {
        const accounts = userAddresses;
        const tokenIds = Array.from({ length: 600 }, (_, i) => i + 1);

        // Debug: Log the inputs
        console.log("Accounts:", accounts);
        console.log("Token IDs:", tokenIds);
        for (const account of accounts) {
            for (const tokenId of tokenIds) {
                const balance = await contract.balanceOf(account, tokenId);
                if (balance > 0) {
                    mintedIds.push(tokenId);
                }
            }
        
        }

        return mintedIds;
    } catch (error) {
        console.error("Error calling balanceOfBatch:", error);
        throw error;
    }
}


function initializeSkillToPirateIds(skills) {
    const skillToPirateIds = {};
    skills.forEach(skill => {
        skillToPirateIds[skill] = [];
    });
    return skillToPirateIds;
}

function groupPiratesBySkill(pirate, skillToPirateIds, requiredSkills, mintedIds) {
    const { characterSkills, toolsSkills, specialSkills } = pirate.skills;
    requiredSkills.forEach(skill => {
        if (characterSkills[skill] > 0 || toolsSkills[skill] > 0 || specialSkills[skill] > 0) {

            skillToPirateIds[skill].push(...pirate.tokenIds);
            skillToPirateIds[skill].sort((a, b) => a - b);
            
        }
    });
}

function outputGroupedPirateIds(skillToPirateIdsParam, mintedIds) {
    console.log(skillToPirateIdsParam);
    const newlist = [];
    for (const [skill, ids] of Object.entries(skillToPirateIdsParam)) {
        console.log(`Processing skill: ${skill}`); // Debug: Log the current skill
        let count = 0;
        for (const id of ids) {
            const parsedId = parseInt(id);
            if (isNaN(parsedId)) {                
                continue;
            }
            const isMinted = mintedIds.includes(parsedId);            
            if (!newlist.includes(parsedId) && !isMinted) {
                count++;
                console.log(`skill: ${skill} adding ID: ${parsedId}`); // Debug: Log the current ID being added
                newlist.push(parsedId);                
            }
            
            if (count > 2) {
                break;
            }
        }
    }
    console.log('Final list of IDs:', newlist); // Debug: Log the final list of IDs
}

const requiredSkills = [
    'agility', 'fruitPicking', 'swimming', 'luck', 'fishing', 'stamina',
    'harvest', 'cultivation', 'husbandry', 'woodcutting', 'slaughter',
    'hunting', 'crafting', 'wisdom'
];

async function main() {


    const mintedIds = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,1,   2,   3,  4,  5,  6,  7,  8, 14, 17,
        20,  21,  25, 27,  9, 10, 11, 15, 23, 28,
        30,  18,  24, 26, 31, 34, 43, 55, 71, 78,
        87, 107, 129, 39, 45, 51, 53, 58, 72, 12,
        16, 111, 29,  32,  33,  35,  36,  37, 38,  41,  46,  50,  59,  60,
        22,  40,  42,  44,  47,  48, 52,  54,  56,  57,  62,  63,
        65,  69,  76,  79,  81,  82, 49,  61,  64,  66,  67,  68,
        75,  84,  85,  91,  94,  95, 73,  92,  93,  99, 101, 114,
       135, 140, 150, 162, 163, 169, 80, 103, 113, 123, 130, 152,
       109, 112, 126, 132, 144, 154, 83,  96,  98, 104, 105, 108,
        70,  74,  77,  86,  88,  89];


        
    const pirateSkills = loadPirateSkills('scripts/pirate_skills.json');

    const skillToPirateIds = initializeSkillToPirateIds(requiredSkills);

    pirateSkills.forEach(pirate => groupPiratesBySkill(pirate, skillToPirateIds, requiredSkills, []));
    outputGroupedPirateIds(skillToPirateIds, mintedIds);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
