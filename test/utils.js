const { ethers } = require("hardhat");
const fs = require('fs');
const skillsHelpers = require("./utils/skills-helpers");
const { expect } = require("chai");

// Export all skills helper functions
const {
  setupPirateWithSkills,
  verifyPirateSkills,
  createCrewSkills,
  setupPirateSkillsViaPirateManagement
} = skillsHelpers;

/**
 * Deploys a standard base infrastructure with Central Authorization Registry
 * @returns {Object} Object containing admin, user, and centralAuthorizationRegistry
 */
async function deployBaseInfrastructure() {
  const [admin, user] = await ethers.getSigners();
  const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
  const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
  await centralAuthorizationRegistry.initialize(admin.address);
  await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
  return { admin, user, centralAuthorizationRegistry };
}

/**
 * Registers multiple contracts in Central Authorization Registry with their interfaces
 * @param {Object} centralAuthorizationRegistry The CAR contract
 * @param {Object} contracts Object mapping contract names to contract instances
 * @param {Object} interfaceNames Optional mapping of contract names to interface IDs
 */
async function registerContractInterfaces(centralAuthorizationRegistry, contracts, interfaceNames = {}) {
  for (const [name, contract] of Object.entries(contracts)) {
    if (contract && contract.getAddress) {
      const interfaceId = interfaceNames[name] || 
                          ethers.keccak256(ethers.toUtf8Bytes(name));
      await centralAuthorizationRegistry.setContractAddress(
        interfaceId,
        await contract.getAddress()
      );
    }
  }
}

/**
 * Verifies a contract state by calling a getter function and comparing to expected value
 * @param {Object} contract The contract to verify
 * @param {string} getterFn Name of the getter function
 * @param {any} expectedValue Expected return value
 * @param {string} errorMsg Optional custom error message
 * @returns {any} The actual value returned
 */
async function verifyContractState(contract, getterFn, expectedValue, errorMsg) {
  const actualValue = await contract[getterFn]();
  expect(actualValue).to.equal(expectedValue, errorMsg || `${getterFn} should return ${expectedValue}`);
  return actualValue;
}

/**
 * Creates a test configuration object with the provided parameters
 * @param {Object} config - Configuration options
 * @returns {Object} - Test configuration
 */
function createTestConfig(config) {
  return {
    ...config
  };
}

async function deployAndAuthorizeContract(contractName, centralAuthorizationRegistry, ...args) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    
    const contractInstance = await ContractFactory.deploy(await centralAuthorizationRegistry.getAddress(), ...args);
    const contractAddress = await contractInstance.getAddress();

    try {
        // Different contracts might use different ways to identify their interface
        let interfaceId;
        try {
            interfaceId = await contractInstance.INTERFACE_ID();
        } catch (error) {
            // Fallback to keccak hash of contract name if INTERFACE_ID isn't available
            interfaceId = ethers.keccak256(ethers.toUtf8Bytes(contractName));
        }
        
        await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
    } catch (error) {
        // Handle error silently
    }
    
    await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

    return contractInstance;
}

// Helper function to setup pirate skills for testing
async function setupPirateSkills(pirateSkills, admin, genesisPiratesAddress, inhabitantsAddress, pirateIds = {genesis: [1, 2], inhabitants: [1, 2]}) {
    // Genesis pirate skills (captain-level skills)
    const captainCharacterSkills = [10, 8, 7, 9, 10, 10, 7, 9, 8, 6, 9, 8, 7];
    const captainToolsSkills = [6, 6, 5, 6, 5, 10, 5, 5, 9];
    const captainSpecialSkills = [10, 9, 8, 10];
    const captainShipSkills = [10, 8, 7]; // High navigation, respect
    const captainMagicSkills = [5, 5, 8, 7, 6, 5];

    // Crew pirate skills
    const crewCharacterSkills = [8, 7, 7, 8, 7, 7, 7, 7, 7, 5, 8, 8, 6];
    const crewToolsSkills = [5, 5, 5, 5, 5, 8, 5, 5, 7];
    const crewSpecialSkills = [8, 7, 7, 8];
    const crewShipSkills = [8, 3, 6]; // Lower respect than genesis
    const crewMagicSkills = [4, 4, 6, 5, 5, 4];

    // Setup Genesis Pirates
    if (pirateIds.genesis && pirateIds.genesis.length > 0) {
        // Add skills for genesis captain
        if (pirateIds.genesis[0]) {
            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                pirateIds.genesis[0],
                captainCharacterSkills,
                captainToolsSkills,
                captainSpecialSkills,
                captainShipSkills,
                captainMagicSkills
            );
        }
        
        // Add skills for genesis crew
        for (let i = 1; i < pirateIds.genesis.length; i++) {
            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                pirateIds.genesis[i],
                crewCharacterSkills,
                crewToolsSkills,
                crewSpecialSkills,
                crewShipSkills,
                crewMagicSkills
            );
        }
    }
    
    // Setup Inhabitants
    if (pirateIds.inhabitants && pirateIds.inhabitants.length > 0) {
        // Add skills for inhabitant captain
        if (pirateIds.inhabitants[0]) {
            await pirateSkills.connect(admin).addAllSkills(
                inhabitantsAddress,
                pirateIds.inhabitants[0],
                captainCharacterSkills,
                captainToolsSkills,
                captainSpecialSkills,
                captainShipSkills,
                captainMagicSkills
            );
        }
        
        // Add skills for inhabitant crew
        for (let i = 1; i < pirateIds.inhabitants.length; i++) {
            await pirateSkills.connect(admin).addAllSkills(
                inhabitantsAddress,
                pirateIds.inhabitants[i],
                crewCharacterSkills,
                crewToolsSkills,
                crewSpecialSkills,
                crewShipSkills,
                crewMagicSkills
            );
        }
    }
}

// Helper function to set up crew for pirates
async function setupCrewForPirates(crewManagement, admin, genesisPiratesAddress, inhabitantsAddress, user, pirateIds = {genesis: [1, 2], inhabitants: [1, 2]}, crewType = "sailor", crewCounts = {captain: 3, crew: 2}) {
    // Add essential crew to Genesis Pirates
    for (let i = 0; i < pirateIds.genesis.length; i++) {
        const crewCount = i === 0 ? crewCounts.captain : crewCounts.crew;
        await crewManagement.connect(admin).addCrew(
            genesisPiratesAddress, 
            pirateIds.genesis[i], 
            user.address, 
            crewType, 
            crewCount
        );
    }
    
    // Add essential crew to Inhabitants
    for (let i = 0; i < pirateIds.inhabitants.length; i++) {
        const crewCount = i === 0 ? crewCounts.captain : crewCounts.crew;
        await crewManagement.connect(admin).addCrew(
            inhabitantsAddress, 
            pirateIds.inhabitants[i], 
            user.address, 
            crewType, 
            crewCount
        );
    }
}

// Helper function to set a mission active in MockMissionsStorage
async function setMissionActive(missionsStorage, shipId, active) {
    await missionsStorage.setMissionActive(shipId, active);
}

// Helper function to log contract addresses from central registry
async function logContractAddresses(centralAuthorizationRegistry, contractKeys=null) {
    // Get and log key contract addresses from the registry
    const addresses = {};
    
    if (!contractKeys) {
        contractKeys = [ 
            "IShipMetadata",                               
            "FeeManagement",                     
        ];
    }
    
    for (const key of contractKeys) {
        try {
            const address = await centralAuthorizationRegistry.getContractAddress(
                ethers.keccak256(ethers.toUtf8Bytes(key))
            );
            addresses[key] = address;
            console.log(`${key}: ${address}`);
        } catch (error) {
            console.log(`Error getting address for ${key}: ${error.message}`);
        }
    }
    
    return addresses;
}

// Helper function to log crew requirements for a ship
async function logCrewRequirements(shipMetadata, crewManagement, crewTypeManager, shipId, pirateId, collection) {
    // Get ship metadata
    const shipAttrs = await shipMetadata.getShipMetadata(shipId);
    
    
    // Get pirate's crew counts
    const [crewTypes, crewCounts] = await crewManagement.getAllCrewCountsForShip(collection, pirateId);
    
    // Check which types can be essential crew
    const essentialTypes = [];
    for (let i = 0; i < crewTypes.length; i++) {
        const canBeEssential = await crewTypeManager.canBeEssentialCrew(crewTypes[i]);
        if (canBeEssential) {
            essentialTypes.push(crewTypes[i]);
        }
    }
    
    // Calculate essential crew count
    const essentialCount = await crewManagement.getEssentialCrewCount(collection, pirateId);
    
    return {
        shipAttrs,
        crewTypes,
        crewCounts,
        essentialTypes,
        essentialCount
    };
}

// Helper to set up ship metadata for testing
async function setupShipMetadata(shipMetadata, admin, shipIds, attributes = null) {
    if (!Array.isArray(shipIds)) {
        shipIds = [shipIds];
    }
    
    // Default attributes if none provided
    const defaultAttributes = {
        class: "SMALL_SHIP",
        durability: 100,
        speed: 20,
        agility: 15,
        viewingRange: 10,
        cannonsCapacity: 10,
        armor: 50,
        ramming: 30,
        crewMin: 2,
        crewMax: 10,
        cargoBay: 1000,
        oars: false,
        shallowWaters: true,
        deepWaters: true,
        shipType: "Combat"
    };
    
    const shipAttributes = attributes || defaultAttributes;
    
    // Update metadata for all ship IDs
    for (const shipId of shipIds) {
        await shipMetadata.connect(admin).updateShipMetadata(shipId, shipAttributes);
    }
}

// Helper to prepare NFTs and contracts for staking tests
async function setupStakingEnvironment(
    shipNFT, 
    genesisPiratesNFT, 
    inhabitantsNFT, 
    shipAndPirateStaking, 
    user, 
    shipIds = [1, 2], 
    approveForStaking = true
) {
    // Mint ships to user
    for (const shipId of shipIds) {
        await shipNFT.mintSpecific(user.address, shipId);
        if (approveForStaking) {
            await shipNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), shipId);
        }
    }
    
    // Mint Genesis Pirates (ERC1155)
    await genesisPiratesNFT.connect(user.address).mint(user.address, 1);
    await genesisPiratesNFT.connect(user.address).mint(user.address, 2);
    await genesisPiratesNFT.connect(user.address).mint(user.address, 3);
    
    if (approveForStaking) {
        await genesisPiratesNFT.connect(user).setApprovalForAll(await shipAndPirateStaking.getAddress(), true);
    }
    
    // Mint Inhabitants (ERC721)
    await inhabitantsNFT.connect(user.address).mint(user.address);
    await inhabitantsNFT.connect(user.address).mint(user.address);
    await inhabitantsNFT.connect(user.address).mint(user.address);
    
    if (approveForStaking) {
        for (let i = 1; i <= 3; i++) {
            await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), i);
        }
    }
}

// Helper for staking a ship with pirates
async function stakeShipWithPirates(
    shipAndPirateStaking,
    user,
    shipId,
    captainId,
    captainCollection,
    genesisPirateIds = [],
    inhabitantIds = []
) {
    const stakingData = {
        shipId,
        captainId,
        captainCollection,
        genesisPirateIds,
        inhabitantIds
    };
    
    return shipAndPirateStaking.connect(user).stakeShipWithPirates(stakingData);
}

// Helper to set up ship storage
async function initializeShipStorage(shipStorage, shipIds) {
    if (!Array.isArray(shipIds)) {
        shipIds = [shipIds];
    }
    
    for (const shipId of shipIds) {
        await shipStorage.initializeStorage(shipId);
    }
}

// Helper to set up common contract registrations
async function registerContractAddresses(centralAuthorizationRegistry, contractAddresses) {
    for (const [key, address] of Object.entries(contractAddresses)) {
        await centralAuthorizationRegistry.setContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes(key)),
            address
        );
    }
}

// Helper to deploy mock missions storage
async function deployMockMissionsStorage(centralAuthorizationRegistry) {
    const MockMissionsStorage = await ethers.getContractFactory("MockMissionsStorage");
    const missionsStorage = await MockMissionsStorage.deploy();
    await missionsStorage.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(await missionsStorage.getAddress());
    
    // Register with the correct key
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IMissionsStorage")),
        await missionsStorage.getAddress()
    );
    
    return missionsStorage;
}

// Helper to set up token infrastructure (ARRC, RUM tokens and FeeManagement)
async function setupTokenInfrastructure(centralAuthorizationRegistry, admin, users = [], tokenAmount = "1000") {
    // Deploy tokens
    const MockERC20 = await ethers.getContractFactory("DummyERC20Burnable");
    const arrcToken = await MockERC20.deploy("ARRC Token", "ARRC");
    await arrcToken.waitForDeployment();
    
    const rumToken = await MockERC20.deploy("RUM Token", "RUM");
    await rumToken.waitForDeployment();
    
    // Calculate how many tokens to mint
    // Each user needs tokenAmount, and we also need extra tokens for safety
    const parsedAmount = ethers.parseEther(tokenAmount);
    const usersCount = users.length;
    
    // DummyERC20Burnable already mints 1000 tokens to the deployer in constructor
    // Only mint more if we need more than 1000 tokens
    if (usersCount > 0) {
        // Calculate extra amount to mint: (usersCount * tokenAmount) - 1000 (already minted)
        const totalNeeded = parsedAmount * BigInt(usersCount);
        const alreadyMinted = ethers.parseEther("1000");
        
        if (totalNeeded > alreadyMinted) {
            const extraToMint = totalNeeded - alreadyMinted + ethers.parseEther("1000"); // Add 1000 for buffer
            
            
            try {
                await arrcToken.mint(admin.address, extraToMint);
                await rumToken.mint(admin.address, extraToMint);
            } catch (error) {
                console.error("Error minting additional tokens:", error.message);
                throw error;
            }
        }
    }
    
    // Deploy FeeManagement
    const feeManagement = await deployAndAuthorizeContract(
        "FeeManagement",
        centralAuthorizationRegistry,
        await rumToken.getAddress(),
        await arrcToken.getAddress(),
        admin.address
    );
    
    // Transfer tokens to users and set up approvals
    if (users.length > 0) {
        const shipStakingAddress = await centralAuthorizationRegistry.getContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("IShipAndPirateStaking"))
        );
        
        for (const user of users) {
            try {
                await arrcToken.connect(admin).transfer(user.address, parsedAmount);
                await rumToken.connect(admin).transfer(user.address, parsedAmount);
                
                if (shipStakingAddress !== ethers.ZeroAddress) {
                    await arrcToken.connect(user).approve(shipStakingAddress, parsedAmount);
                }
                
                await arrcToken.connect(user).approve(await feeManagement.getAddress(), parsedAmount);
                await rumToken.connect(user).approve(await feeManagement.getAddress(), parsedAmount);
            } catch (error) {
                console.error(`Error setting up tokens for user ${user.address}:`, error.message);
                throw error; // Re-throw to make sure tests fail if this critical setup fails
            }
        }
    }
    
    return { arrcToken, rumToken, feeManagement };
}

// Helper to deploy and set up Genesis Pirates NFT (ERC1155)
async function setupGenesisPiratesNFT(admin, centralAuthorizationRegistry, users = [], pirateIds = [1, 2, 3]) {
    // Deploy Genesis Pirates NFT (ERC1155)
    const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
    const genesisPiratesNFT = await SimpleERC1155.deploy(admin.address, "https://genesis.com/");
    await genesisPiratesNFT.waitForDeployment();
    const genesisPiratesAddress = await genesisPiratesNFT.getAddress();
    
    // Register it in CAR
    await centralAuthorizationRegistry.registerPirateNftContract(genesisPiratesAddress);
    
    // Mint pirates to users
    for (const user of users) {
        for (const id of pirateIds) {
            try {
                await genesisPiratesNFT.connect(admin).mint(user.address, id);                
            } catch (error) {
                console.error(`Error minting Genesis Pirate #${id} to ${user.address}:`, error.message);
                throw error;
            }
        }
    }
    
    return { genesisPiratesNFT, genesisPiratesAddress };
}

// Helper to deploy and set up Inhabitants NFT (ERC721)
async function setupInhabitantsNFT(admin, centralAuthorizationRegistry, users = [], count = 3) {
    // Deploy Inhabitants NFT (ERC721)
    const SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
    const inhabitantsNFT = await SimpleERC721.deploy("Inhabitant", "INH", "https://inhabitant.com/", admin.address);
    await inhabitantsNFT.waitForDeployment();
    const inhabitantsAddress = await inhabitantsNFT.getAddress();
    
    // Register it in CAR
    await centralAuthorizationRegistry.registerPirateNftContract(inhabitantsAddress);
    
    // Mint pirates to users
    for (const user of users) {        
        for (let i = 1; i <= count; i++) {
            try {
                await inhabitantsNFT.connect(admin).mintSpecific(user.address, i);                
            } catch (error) {
                throw error;
            }
        }
    }
    
    return { inhabitantsNFT, inhabitantsAddress };
}

/**
 * Sets up NFTs for staking tests
 * @param {Object} admin - Admin signer
 * @param {Object} user - User signer
 * @param {Object} centralAuthorizationRegistry - CAR contract instance
 * @returns {Object} - Object containing NFT instances and addresses
 */
async function setupNFTsForStaking(admin, user, centralAuthorizationRegistry) {
  const SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
  
  // Ship NFT
  const shipNFT = await SimpleERC721.deploy("Ship NFT", "SHIP", "https://ship.com/", admin.address);
  await shipNFT.waitForDeployment();
  
  // Set up Pirate NFTs
  const { genesisPiratesNFT, genesisPiratesAddress } = 
    await setupGenesisPiratesNFT(admin, centralAuthorizationRegistry, [user]);
  
  const { inhabitantsNFT, inhabitantsAddress } = 
    await setupInhabitantsNFT(admin, centralAuthorizationRegistry, [user]);
  
  return {
    shipNFT,
    genesisPiratesNFT,
    genesisPiratesAddress,
    inhabitantsNFT,
    inhabitantsAddress
  };
}

/**
 * Sets up requirements for staking, including metadata, storage, and other core contracts
 * @param {Object} admin - Admin signer
 * @param {Object} centralAuthorizationRegistry - CAR contract instance
 * @param {Object} nfts - Object containing NFT instances and addresses
 * @returns {Object} - Object containing core contract instances
 */
async function setupStakingRequirements(admin, centralAuthorizationRegistry, nfts) {
  const { genesisPiratesAddress, inhabitantsAddress, shipNFT } = nfts;
  
  // Deploy PirateSkills
  const pirateSkills = await deployAndAuthorizeContract("PirateSkills", centralAuthorizationRegistry);
  
  // Deploy PirateSkillsReader
  const pirateSkillsReader = await deployAndAuthorizeContract(
    "PirateSkillsReader", 
    centralAuthorizationRegistry
  );
  
  // Deploy ShipMetadata
  const shipMetadata = await deployAndAuthorizeContract("ShipMetadata", centralAuthorizationRegistry);
  
  // Deploy ShipStorage
  const shipStorage = await deployAndAuthorizeContract(
    "ShipStorage",
    centralAuthorizationRegistry,
    await shipNFT.getAddress(),
    true // isNft721
  );
  
  // Deploy CrewTypeManager
  const crewTypeManager = await deployAndAuthorizeContract(
    "CrewTypeManager", 
    centralAuthorizationRegistry,
    genesisPiratesAddress,
    inhabitantsAddress
  );
  
  // Deploy CrewManagement
  const crewManagement = await deployAndAuthorizeContract(
    "CrewManagement", 
    centralAuthorizationRegistry
  );
  
  // Deploy MockMissionsStorage
  const missionsStorage = await deployMockMissionsStorage(centralAuthorizationRegistry);
  
  return {
    pirateSkills,
    pirateSkillsReader,
    shipMetadata,
    shipStorage,
    crewTypeManager,
    crewManagement,
    missionsStorage
  };
}

/**
 * Prepares assets for staking, including metadata setup and approvals
 * @param {Object} user - User signer
 * @param {Object} admin - Admin signer
 * @param {Object} contracts - Object containing contract instances
 * @param {Object} nfts - Object containing NFT instances and addresses
 * @param {Object} config - Test configuration
 */
async function prepareAssetsForStaking(user, admin, contracts, nfts, config) {
  const { shipMetadata, shipStorage, shipAndPirateStaking } = contracts;
  const { shipNFT, genesisPiratesNFT, inhabitantsNFT } = nfts;
  const { ships, shipAttributes } = config;
  
  // Mint ships
  const shipIds = Object.values(ships).map(ship => ship.id);
  for (const shipId of shipIds) {
    await shipNFT.mintSpecific(user.address, shipId);
    await shipNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), shipId);
  }
  
  // Approve pirate NFTs
  await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 1);
  await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 2);
  await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), 3);
  await genesisPiratesNFT.connect(user).setApprovalForAll(await shipAndPirateStaking.getAddress(), true);
  
  // Set ship metadata
  await setupShipMetadata(shipMetadata, admin, shipIds, shipAttributes);
  
  // Initialize ship storage
  await initializeShipStorage(shipStorage, shipIds);
}

/**
 * Creates crew skills object for testing
 * @param {Object} options Skill options
 * @returns {Object} Crew skills object with the new Skills struct format
 */
function createNonNFTCrewSkills(options = {}) {
  return {
    skills: {
      farming: options.farming || 0,
      fishing: options.fishing || 0,
      woodpicking: options.woodpicking || 0,
      woodcutting: options.woodcutting || 0,
      building: options.building || 0,
      defense: options.defense || 0,
      abordage: options.abordage || 0,
      bombarding: options.bombarding || 0,
      shooting: options.shooting || 0,
      mining: options.mining || 0,
      quarrying: options.quarrying || 0,
      excavation: options.excavation || 0,
      crafting: options.crafting || 0
    },
    name: options.name || "",
    canBeEssentialCrew: options.canBeEssentialCrew || false,
    isValid: options.isValid || true
  };
}

module.exports = {
  deployAndAuthorizeContract,
  setupPirateWithSkills,
  verifyPirateSkills,
  createNonNFTCrewSkills,
  setupPirateSkillsViaPirateManagement,
  setupPirateSkills,
  setupCrewForPirates,
  setMissionActive,
  logContractAddresses,
  logCrewRequirements,
  setupShipMetadata,
  setupStakingEnvironment,
  stakeShipWithPirates,
  initializeShipStorage,
  registerContractAddresses,
  deployMockMissionsStorage,
  setupTokenInfrastructure,
  setupGenesisPiratesNFT,
  setupInhabitantsNFT,
  // New utility functions
  deployBaseInfrastructure,
  registerContractInterfaces,
  verifyContractState,
  createTestConfig,
  setupNFTsForStaking,
  setupStakingRequirements,
  prepareAssetsForStaking
};