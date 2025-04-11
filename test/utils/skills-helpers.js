const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Deploy and authorize a contract through the CentralAuthorizationRegistry
 * @param {string} contractName - Name of the contract to deploy
 * @param {Contract} centralAuthorizationRegistry - CentralAuthorizationRegistry contract instance
 * @param {...any} args - Constructor arguments for the contract
 * @returns {Promise<Contract>} - Deployed contract instance
 */
async function deployAndAuthorizeContract(contractName, centralAuthorizationRegistry, ...args) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contract = await ContractFactory.deploy(...args);
    
    if (centralAuthorizationRegistry) {
        const contractAddress = await contract.getAddress();
        await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);
    }
    
    return contract;
}

/**
 * Generate a mock skill set for testing
 * @param {Object} options - Configuration options for the skills
 * @returns {Object} - Mock skill set
 */
function generateMockSkillSet(options = {}) {
    const defaultOptions = {
        characterSkills: {
            // Default character skills with values
            0: options.characterSkillValue || 5, // STRENGTH
            1: options.characterSkillValue || 5, // STAMINA
            2: options.characterSkillValue || 5, // SWIMMING
            3: options.characterSkillValue || 5, // MELEE
            4: options.characterSkillValue || 5, // SHOOTING
            5: options.characterSkillValue || 5, // CANNONS
            6: options.characterSkillValue || 5, // AGILITY
            7: options.characterSkillValue || 5, // ENGINEERING
            8: options.characterSkillValue || 5, // WISDOM
            9: options.characterSkillValue || 5, // LUCK
            10: options.characterSkillValue || 5, // HEALTH
            11: options.characterSkillValue || 5, // SPEED
            12: options.characterSkillValue || 5  // ARMOUR
        },
        toolsSkills: {
            // Default tools skills with values
            0: options.toolsSkillValue || 5, // HARVEST
            1: options.toolsSkillValue || 5, // MINING
            2: options.toolsSkillValue || 5, // QUARRYING
            3: options.toolsSkillValue || 5, // EXCAVATION
            4: options.toolsSkillValue || 5, // HUSBANDRY
            5: options.toolsSkillValue || 5, // WOODCUTTING
            6: options.toolsSkillValue || 5, // SLAUGHTER
            7: options.toolsSkillValue || 5, // HUNTING
            8: options.toolsSkillValue || 5  // CULTIVATION
        },
        specialSkills: {
            // Default special skills with values
            0: options.specialSkillValue || 5, // ROPE
            1: options.specialSkillValue || 5, // CRAFTING
            2: options.specialSkillValue || 5, // BUILDING
            3: options.specialSkillValue || 5  // REPAIR
        },
        shipSkills: {
            // Default ship skills with values
            0: options.shipSkillValue || 5, // NAVIGATION
            1: options.shipSkillValue || 5, // RESPECT 
            2: options.shipSkillValue || 5  // SHIP_DETECTION
        },
        magicSkills: {
            // Default magic skills with values
            0: options.magicSkillValue || 5, // ELEMENTAL
            1: options.magicSkillValue || 5, // VOODOO
            2: options.magicSkillValue || 5, // WATER
            3: options.magicSkillValue || 5, // AIR
            4: options.magicSkillValue || 5, // FIRE
            5: options.magicSkillValue || 5  // EARTH
        }
    };

    // Override defaults with any provided options
    return {
        characterSkills: { ...defaultOptions.characterSkills, ...options.characterSkills },
        toolsSkills: { ...defaultOptions.toolsSkills, ...options.toolsSkills },
        specialSkills: { ...defaultOptions.specialSkills, ...options.specialSkills },
        shipSkills: { ...defaultOptions.shipSkills, ...options.shipSkills },
        magicSkills: { ...defaultOptions.magicSkills, ...options.magicSkills }
    };
}

/**
 * Sets up a pirate with complete skill set directly via PirateSkills contract
 * @param {Contract} pirateSkillsContract - Instance of the PirateSkills contract
 * @param {string} collection - Address of the collection
 * @param {number} tokenId - Token ID of the pirate
 * @param {Object} skills - Object containing all skill sets
 * @returns {Promise<void>}
 */
async function setupPirateWithSkills(pirateSkillsContract, collection, tokenId, skills) {
    // Convert skills object to arrays expected by the contract
    const characterSkillsArray = convertSkillsToArray(skills.characterSkills, 13); // CHARACTER_SKILL_COUNT
    const toolsSkillsArray = convertSkillsToArray(skills.toolsSkills, 9);         // TOOLS_SKILL_COUNT
    const specialSkillsArray = convertSkillsToArray(skills.specialSkills, 4);     // SPECIAL_SKILL_COUNT
    const shipSkillsArray = convertSkillsToArray(skills.shipSkills, 3);           // SHIP_SKILL_COUNT
    const magicSkillsArray = convertSkillsToArray(skills.magicSkills, 6);         // MAGIC_SKILL_COUNT

    // Add all skills in one transaction
    await pirateSkillsContract.addAllSkills(
        collection,
        tokenId,
        characterSkillsArray,
        toolsSkillsArray,
        specialSkillsArray,
        shipSkillsArray,
        magicSkillsArray
    );
}

/**
 * Verifies that a pirate has the expected skills
 * @param {Contract} pirateSkillsContract - Instance of the PirateSkills contract
 * @param {string} collection - Address of the collection
 * @param {number} tokenId - Token ID of the pirate
 * @param {Object} expectedSkills - Object containing expected skill sets
 * @returns {Promise<boolean>} - True if all skills match
 */
async function verifyPirateSkills(pirateSkillsContract, collection, tokenId, expectedSkills) {
    // Get actual skills from contract
    const characterSkills = await pirateSkillsContract.getCharacterSkills(collection, tokenId);
    const toolsSkills = await pirateSkillsContract.getToolsSkills(collection, tokenId);
    const specialSkills = await pirateSkillsContract.getSpecialSkills(collection, tokenId);
    const shipSkills = await pirateSkillsContract.getShipSkills(collection, tokenId);
    const magicSkills = await pirateSkillsContract.getMagicSkills(collection, tokenId);

    // Convert expected skills to arrays
    const expectedCharacterArray = convertSkillsToArray(expectedSkills.characterSkills, 13);
    const expectedToolsArray = convertSkillsToArray(expectedSkills.toolsSkills, 9);
    const expectedSpecialArray = convertSkillsToArray(expectedSkills.specialSkills, 4);
    const expectedShipArray = convertSkillsToArray(expectedSkills.shipSkills, 3);
    const expectedMagicArray = convertSkillsToArray(expectedSkills.magicSkills, 6);
    
    // Check each skill category
    for (let i = 0; i < characterSkills.length; i++) {
        if (characterSkills[i] != expectedCharacterArray[i]) return false;
    }
    
    for (let i = 0; i < toolsSkills.length; i++) {
        if (toolsSkills[i] != expectedToolsArray[i]) return false;
    }
    
    for (let i = 0; i < specialSkills.length; i++) {
        if (specialSkills[i] != expectedSpecialArray[i]) return false;
    }
    
    for (let i = 0; i < shipSkills.length; i++) {
        if (shipSkills[i] != expectedShipArray[i]) return false;
    }
    
    for (let i = 0; i < magicSkills.length; i++) {
        if (magicSkills[i] != expectedMagicArray[i]) return false;
    }
    
    return true;
}

/**
 * Creates a standard set of pirate skills focused on specific crew roles
 * @param {string} specialty - Skill specialty: "sailor", "gunner", "carpenter", "cook", or "generic"
 * @returns {Object} - Complete skills object with all categories
 */
function createCrewSkills(specialty = "generic") {
    // Create baseline skills
    const skills = {
        characterSkills: {
            strength: 6,
            stamina: 6,
            swimming: 6,
            melee: 6,
            shooting: 6,
            cannons: 6,
            agility: 6,
            engineering: 6,
            wisdom: 6,
            luck: 6,
            health: 6,
            speed: 6,
            armour: 6
        },
        toolsSkills: {
            harvest: 4,
            mining: 4,
            quarrying: 4,
            excavation: 4,
            husbandry: 4,
            woodcutting: 4,
            slaughter: 4,
            hunting: 4,
            cultivation: 4
        },
        specialSkills: {
            rope: 5,
            crafting: 5,
            building: 5,
            repair: 5
        },
        shipSkills: {
            navigation: 6,
            respect: 6,
            shipDetection: 6
        },
        magicSkills: {
            elemental: 3,
            voodoo: 3,
            water: 3,
            air: 3,
            fire: 3,
            earth: 3
        }
    };
    
    // Adjust skills based on specialty
    if (specialty === "sailor") {
        skills.specialSkills.rope = 10;
        skills.shipSkills.navigation = 10;
        skills.magicSkills.water = 8;
    } else if (specialty === "gunner") {
        skills.characterSkills.strength = 10;
        skills.characterSkills.shooting = 10;
        skills.characterSkills.cannons = 10;
    } else if (specialty === "carpenter") {
        skills.characterSkills.engineering = 9;
        skills.toolsSkills.woodcutting = 10;
        skills.specialSkills.crafting = 9;
        skills.specialSkills.repair = 10;
    } else if (specialty === "cook") {
        skills.toolsSkills.cultivation = 9;
        skills.toolsSkills.harvest = 8;
        skills.characterSkills.wisdom = 8;
    }
    
    return skills;
}

/**
 * Sets up pirate skills using PirateManagement contract (for tests)
 * @param {Contract} pirateManagementContract - Instance of PirateManagement contract
 * @param {string} signer - The signer to use for the transaction
 * @param {string} collection - Collection address
 * @param {number} tokenId - Token ID
 * @param {string|Object} skillsOrSpecialty - Either a specialty string or complete skills object
 * @returns {Promise<void>}
 */
async function setupPirateSkillsViaPirateManagement(pirateManagementContract, signer, collection, tokenId, skillsOrSpecialty) {
    // Determine if we have a specialty string or skills object
    const skills = typeof skillsOrSpecialty === 'string' 
        ? createCrewSkills(skillsOrSpecialty) 
        : skillsOrSpecialty;
    
    // Format for PirateManagement
    const formattedSkills = {
        characterSkills: {},
        toolsSkills: {},
        specialSkills: {},
        added: true
    };
    
    // Copy and convert to BigInt
    for (const [key, value] of Object.entries(skills.characterSkills)) {
        formattedSkills.characterSkills[key] = BigInt(value);
    }
    
    for (const [key, value] of Object.entries(skills.toolsSkills)) {
        formattedSkills.toolsSkills[key] = BigInt(value);
    }
    
    for (const [key, value] of Object.entries(skills.specialSkills)) {
        formattedSkills.specialSkills[key] = BigInt(value);
    }
    
    // Update the pirate attributes
    await pirateManagementContract.connect(signer).batchUpdatePirateAttributes(
        collection,
        [{ tokenIds: [tokenId], skills: formattedSkills }]
    );
}

/**
 * Helper function to convert a skills object to an array
 * @param {Object} skillsObj - Object with skill values
 * @param {number} length - Expected length of resulting array
 * @returns {number[]} - Array of skill values
 */
function convertSkillsToArray(skillsObj, length) {
    const result = new Array(length).fill(0);
    
    // Convert object to array based on keys/indices
    Object.entries(skillsObj).forEach(([key, value]) => {
        // If key is a number, use as index
        if (!isNaN(key)) {
            result[parseInt(key)] = value;
        } else {
            // Otherwise we need mapping based on skill names
            // This would need a more comprehensive mapping for each skill type
            // This is a simplified approach
            const index = getSkillIndex(key);
            if (index !== -1) {
                result[index] = value;
            }
        }
    });
    
    return result;
}

/**
 * Get the index of a named skill
 * @param {string} skillName - Name of the skill
 * @returns {number} - Index of the skill or -1 if not found
 */
function getSkillIndex(skillName) {
    // Character skills
    const characterSkills = ['strength', 'stamina', 'swimming', 'melee', 
                             'shooting', 'cannons', 'agility', 'engineering', 
                             'wisdom', 'luck', 'health', 'speed', 'armour'];
    
    // Tools skills
    const toolsSkills = ['harvest', 'mining', 'quarrying', 'excavation', 
                        'husbandry', 'woodcutting', 'slaughter', 'hunting', 'cultivation'];
    
    // Special skills
    const specialSkills = ['rope', 'crafting', 'building', 'repair'];
    
    // Ship skills
    const shipSkills = ['navigation', 'respect', 'shipDetection'];
    
    // Magic skills
    const magicSkills = ['elemental', 'voodoo', 'water', 'air', 'fire', 'earth'];
    
    // Check in each category
    const characterIndex = characterSkills.indexOf(skillName);
    if (characterIndex !== -1) return characterIndex;
    
    const toolsIndex = toolsSkills.indexOf(skillName);
    if (toolsIndex !== -1) return toolsIndex;
    
    const specialIndex = specialSkills.indexOf(skillName);
    if (specialIndex !== -1) return specialIndex;
    
    const shipIndex = shipSkills.indexOf(skillName);
    if (shipIndex !== -1) return shipIndex;
    
    const magicIndex = magicSkills.indexOf(skillName);
    if (magicIndex !== -1) return magicIndex;
    
    return -1;
}

/**
 * Create test data JSON file for pirate skills
 * @param {string} outputPath - Path to save the JSON file
 * @param {number} numPirates - Number of pirates to generate
 * @returns {Promise<void>}
 */
async function createTestDataJSON(outputPath, numPirates = 5) {
    const data = [];
    
    for (let i = 0; i < numPirates; i++) {
        const tokenId = i + 1;
        
        // Generate random skill values
        const skillSet = {
            tokenIds: [tokenId],
            skills: {
                characterSkills: {},
                toolsSkills: {},
                specialSkills: {},
                shipSkills: {},
                magicSkills: {}
            }
        };
        
        // Character skills (13 skills)
        for (let j = 0; j < 13; j++) {
            skillSet.skills.characterSkills[j] = Math.floor(Math.random() * 10) + 1;
        }
        
        // Tools skills (9 skills)
        for (let j = 0; j < 9; j++) {
            skillSet.skills.toolsSkills[j] = Math.floor(Math.random() * 10) + 1;
        }
        
        // Special skills (4 skills)
        for (let j = 0; j < 4; j++) {
            skillSet.skills.specialSkills[j] = Math.floor(Math.random() * 10) + 1;
        }
        
        // Ship skills (3 skills)
        for (let j = 0; j < 3; j++) {
            skillSet.skills.shipSkills[j] = Math.floor(Math.random() * 10) + 1;
        }
        
        // Magic skills (6 skills)
        for (let j = 0; j < 6; j++) {
            skillSet.skills.magicSkills[j] = Math.floor(Math.random() * 10) + 1;
        }
        
        data.push(skillSet);
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`Test data saved to ${outputPath}`);
}

module.exports = {
    deployAndAuthorizeContract,
    generateMockSkillSet,
    setupPirateWithSkills,
    verifyPirateSkills,
    createCrewSkills,
    setupPirateSkillsViaPirateManagement,
    createTestDataJSON
}; 