const { ethers } = require("hardhat");
const fs = require('fs');
const skillsHelpers = require("./utils/skills-helpers");
const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Define CalculationMethod enum (mirroring Solidity)
const CalculationMethod = {
    PerDay: 0,
    Divide: 1
};

const ONE_ETHER = ethers.parseEther("1");

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
  const [admin, user, otherAccount] = await ethers.getSigners();
  const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
  const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
  await centralAuthorizationRegistry.initialize(admin.address);
  await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
  return { admin, user, otherAccount, centralAuthorizationRegistry };
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

// Refined helper to deploy, authorize, and register using a specific registry key string
async function deployAndRegisterContract(contractName, centralAuthorizationRegistry, registryKeyString, ...args) {
    // Note: CAR address is automatically added by ContractFactory.deploy and should not be passed in args
    const carAddress = await centralAuthorizationRegistry.getAddress();
    
    // Check if args contains CAR address
    if (args.includes(carAddress)) {
        throw new Error('CAR address should not be passed in args as it is automatically added by ContractFactory.deploy');
    }

    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractInstance = await ContractFactory.deploy(carAddress, ...args);
    await contractInstance.waitForDeployment();
    const contractAddress = await contractInstance.getAddress();

    // Authorize the deployed contract in CAR
    await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

    // Register the contract address using the provided key string
    const keyBytes = ethers.keccak256(ethers.toUtf8Bytes(registryKeyString));
    await centralAuthorizationRegistry.setContractAddress(keyBytes, contractAddress);
        
    return contractInstance;
}

// The deployAndAuthorizeContract from lines 71-97 in the user's selection had an issue:
// It was: const contractInstance = await ContractFactory.deploy(await centralAuthorizationRegistry.getAddress(), ...args);
// This incorrectly prepends CAR address to all constructor args.
// For now, let's define a corrected version if it's intended to be used, 
// or it can be removed if deployAndRegisterContract is sufficient.

// Corrected version of the user-provided deployAndAuthorizeContract (if still needed):
// This version assumes the contract might have an INTERFACE_ID or falls back to naming convention.
// Crucially, it does NOT automatically pass CAR address as a constructor argument.
async function deployAndAuthorizeContract(contractName, centralAuthorizationRegistry, ...args) {
    const carAddress = await centralAuthorizationRegistry.getAddress();
    if (args.includes(carAddress)) {
        throw new Error("CAR address should not be passed in args as it is automatically added by ContractFactory.deploy");
    }
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractInstance = await ContractFactory.deploy(carAddress, ...args); 
    await contractInstance.waitForDeployment();
    const contractAddress = await contractInstance.getAddress();

    await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

    // Attempt to register with INTERFACE_ID or fallback
    try {
        let interfaceId;
        if (typeof contractInstance.INTERFACE_ID === 'function') {
            interfaceId = await contractInstance.INTERFACE_ID();
        } else {
            throw new Error("INTERFACE_ID not found");
            // Fallback: Construct interface name (e.g., IMyContract) or use contract name directly
            // This part needs a robust convention if INTERFACE_ID is not present.
            // For simplicity, let's try hashing the contractName as a default key if no INTERFACE_ID
            interfaceId = ethers.keccak256(ethers.toUtf8Bytes(`I${contractName}`)); // Common convention
        }        
        await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
    } catch (error) {
        throw new Error(`[UTIL ERROR] Failed to register ${contractName} in CAR after deployment: ${error.message}`);
    }

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
    // Get current mission info to preserve other details
    let missionInfo = await missionsStorage.getMissionInfo(shipId);

    // Create a new MissionInfo struct for the update
    // Solidity struct in JS: pass an array/object matching the struct order/keys
    const updatedInfo = {
        startTime: missionInfo.startTime,
        endTime: missionInfo.endTime,
        isActive: active, // Set the desired active state
        missionType: missionInfo.missionType,
        missionId: missionInfo.missionId
    };

    // If activating and no mission existed, set some defaults
    if (active && missionInfo.missionId == 0) {
        updatedInfo.startTime = await ethers.provider.getBlock('latest').then(block => block.timestamp);
        updatedInfo.endTime = updatedInfo.startTime + 3600; // Default 1 hour duration
        updatedInfo.missionType = 1; // Default mission type
        updatedInfo.missionId = 100; // Default mission ID
    }

    await missionsStorage.setMockMissionInfo(shipId, updatedInfo);
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
        cargoBay: 1000n, // Default if no attributes are passed; this would be scaled up.
        oars: false,
        shallowWaters: true,
        deepWaters: true,
        shipType: "Combat"
    };
    
    const shipAttributes = attributes || defaultAttributes;

    

    // Conditionally scale cargoBay only if it's not already scaled (e.g. coming from defaultAttributes)
    // We assume if `attributes` is provided, `attributes.cargoBay` is already in wei.
    if (!attributes || attributes.cargoBay < ethers.parseUnits("1", 10)) { // Heuristic: if cargoBay is small, it's likely not in wei
        // This check is a heuristic. A more robust way would be to have a flag or type indication.
        // For now, if `attributes` are provided, we assume `cargoBay` is already in wei from `ethers.parseUnits`.
        // If `attributes` is NOT provided (so `defaultAttributes` is used), then scale up the default `1000n`.
        if (!attributes) { // Only scale if we are using the defaultAttributes.cargoBay (which is 1000n)
           shipAttributes.cargoBay = shipAttributes.cargoBay * 10n ** 18n;
        }
    }
    // If `attributes` were provided, shipAttributes.cargoBay is taken as is (expected to be in wei).
    
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
        await shipNFT.safeMint(user.address, shipId);
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
    inhabitantIds = [],
    homeIslandId = 1,
    shipClass = "Small",
    options = {}
) {
    const stakingData = {
        shipId: shipId,
        captainId: captainId,
        captainCollection: captainCollection,
        genesisPirateIds: genesisPirateIds,
        inhabitantIds: inhabitantIds
    };
    

    
    const tx = await shipAndPirateStaking.connect(user).stakeShipWithPirates(
        stakingData, 
        homeIslandId, 
        shipClass
    );

    if (options.returnTxPromise) {
        return tx; 
    }
    
    return await tx.wait(); // Default behavior: wait for receipt
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

// Shared helper to deploy and register a mock contract
async function deployAndRegisterMock(contractName, registryKey, centralAuthorizationRegistry) {    
    // Explicitly load artifact
    const artifact = await hre.artifacts.readArtifact(contractName);
    // Create factory from ABI and bytecode
    const ContractFactory = await hre.ethers.getContractFactoryFromArtifact(artifact);

    const contract = await ContractFactory.deploy(await centralAuthorizationRegistry.getAddress());
    await contract.waitForDeployment();
    // RESTORED AUTHORIZATION AND REGISTRATION
    await centralAuthorizationRegistry.addAuthorizedContract(await contract.getAddress());
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes(registryKey)),
        await contract.getAddress()
    );
    return contract;
}

// Helper to deploy mock missions storage
async function deployMockMissionsStorage(centralAuthorizationRegistry) {
    return deployAndRegisterMock("MockMissionsStorage", "IMissionsStorage", centralAuthorizationRegistry);
}

// Helper to deploy mock building storage
async function deployMockBuildingStorage(centralAuthorizationRegistry) {
    return deployAndRegisterMock("MockBuildingStorage", "IBuildingStorage", centralAuthorizationRegistry);
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
    
    // Deploy FeeManagement using deployAndRegisterContract
    const feeManagement = await deployAndRegisterContract(
        "FeeManagement",
        centralAuthorizationRegistry,
        "IFeeManagement",        
        await rumToken.getAddress(),  // Corrected: RUM token address first for _rumTokenAddress
        await arrcToken.getAddress(), // Corrected: ARRC token address second for _arrcTokenAddress
        admin.address
    );
    
    // Transfer tokens to users and set up approvals
    if (users.length > 0) {
        let shipStakingAddress = ethers.ZeroAddress;
        try {
            shipStakingAddress = await centralAuthorizationRegistry.getContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("IShipAndPirateStaking"))
        );
        
        } catch (error) {            
        }
        
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
  // Deploy the correct ShipNFT contract, not SimpleERC721
  const ShipNFTFactory = await ethers.getContractFactory("ShipNFT"); 
  
  // Deploy ShipNFT with its required constructor arguments
  // (defaultAdmin, minter, royaltyRecipient)
  const shipNFT = await ShipNFTFactory.deploy(admin.address, admin.address, admin.address); 
  await shipNFT.waitForDeployment();
  
  // Explicitly grant MINTER_ROLE to admin, even if constructor does it, for safety.
  const MINTER_ROLE = await shipNFT.MINTER_ROLE();
  await shipNFT.grantRole(MINTER_ROLE, admin.address);

  // Register ShipNFT in CAR (assuming it needs to be registered)
  const shipNFTAddress = await shipNFT.getAddress();
  await centralAuthorizationRegistry.setContractAddress(
    ethers.keccak256(ethers.toUtf8Bytes("IShipNFT")), // Use the correct interface ID if applicable
    shipNFTAddress
  );
  
  // Set up Pirate NFTs
  const { genesisPiratesNFT, genesisPiratesAddress } = 
    await setupGenesisPiratesNFT(admin, centralAuthorizationRegistry, [user]);
  
  const { inhabitantsNFT, inhabitantsAddress } = 
    await setupInhabitantsNFT(admin, centralAuthorizationRegistry, [user]);

    const IslandNft = await ethers.getContractFactory("SimpleERC721");
    const islandNft = await IslandNft.deploy("Island", "ISL", "https://island.com/", admin.address);
    await islandNft.waitForDeployment();
    const genesisIslandsAddress = await islandNft.getAddress();
  
  return {
    shipNFT,
    genesisPiratesNFT,
    genesisPiratesAddress,
    inhabitantsNFT,
    inhabitantsAddress,
    islandNft,
    genesisIslandsAddress
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
  
  const pirateSkills = await deployAndRegisterContract(
    "PirateSkills", 
    centralAuthorizationRegistry, 
    "IPirateSkills" // No other args, CAR is prepended by helper
  );
  
  const pirateSkillsReader = await deployAndRegisterContract(
    "PirateSkillsReader", 
    centralAuthorizationRegistry,
    "IPirateSkillsReader" // No other args, CAR is prepended by helper
  );
  
  const shipMetadata = await deployAndRegisterContract("ShipMetadata", centralAuthorizationRegistry, "IShipMetadata");
  
  
  const shipStorage = await deployAndRegisterContract(
    "ShipStorage",
    centralAuthorizationRegistry,
    "IShipStorage",
    await shipNFT.getAddress(),
    true 
  );
  
  const crewTypeManager = await deployAndRegisterContract(
    "CrewTypeManager", 
    centralAuthorizationRegistry,
    "ICrewTypeManager",
    genesisPiratesAddress,
    inhabitantsAddress
  );
  
  // Deploy CrewManagement
  const crewManagement = await deployAndRegisterContract(
    "CrewManagement", 
    centralAuthorizationRegistry,
    "ICrewManagement"
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
  const { shipMetadata, shipStorage, shipAndPirateStaking, pirateSkills, crewManagement } = contracts;
  const { shipNFT, genesisPiratesNFT, inhabitantsNFT, genesisPiratesAddress, inhabitantsAddress } = nfts;
  const { ships, pirates, shipAttributes, crew } = config;
  
  // Mint ships
  const shipIds = Object.values(ships).map(ship => ship.id);
  for (const shipId of shipIds) {
    await shipNFT.connect(admin).safeMint(user.address, shipId);
    await shipNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), shipId);
  }
  
  // Approve pirate NFTs
  await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), pirates.CAPTAIN.id);
  if (pirates.CREW_1 && pirates.CREW_1.collection === 'inhabitants') {
      await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), pirates.CREW_1.id);
  }
  if (pirates.CREW_2 && pirates.CREW_2.collection === 'inhabitants') {
      await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), pirates.CREW_2.id);
  }
  await genesisPiratesNFT.connect(user).setApprovalForAll(await shipAndPirateStaking.getAddress(), true);
  
  // Set ship metadata
  await setupShipMetadata(shipMetadata, admin, shipIds, shipAttributes);
  
  // Initialize ship storage
  await initializeShipStorage(shipStorage, shipIds);

  // --- NEW: Setup Pirate Skills and Crew --- 
  const genesisPirateIdsForSetup = [];
  const inhabitantPirateIdsForSetup = [];

  if (pirates.CAPTAIN) {
    if (pirates.CAPTAIN.collection === 'genesis') genesisPirateIdsForSetup.push(pirates.CAPTAIN.id);
    else if (pirates.CAPTAIN.collection === 'inhabitants') inhabitantPirateIdsForSetup.push(pirates.CAPTAIN.id);
  }
  if (pirates.CREW_1) {
    if (pirates.CREW_1.collection === 'genesis') genesisPirateIdsForSetup.push(pirates.CREW_1.id);
    else if (pirates.CREW_1.collection === 'inhabitants') inhabitantPirateIdsForSetup.push(pirates.CREW_1.id);
  }
  if (pirates.CREW_2) {
    if (pirates.CREW_2.collection === 'genesis') genesisPirateIdsForSetup.push(pirates.CREW_2.id);
    else if (pirates.CREW_2.collection === 'inhabitants') inhabitantPirateIdsForSetup.push(pirates.CREW_2.id);
  }
  
  // Ensure contracts are defined before calling
  if (pirateSkills && (genesisPirateIdsForSetup.length > 0 || inhabitantPirateIdsForSetup.length > 0)) {
    await setupPirateSkills(pirateSkills, admin, genesisPiratesAddress, inhabitantsAddress, { genesis: genesisPirateIdsForSetup, inhabitants: inhabitantPirateIdsForSetup });
  }

  if (crewManagement && (genesisPirateIdsForSetup.length > 0 || inhabitantPirateIdsForSetup.length > 0)) {
    await setupCrewForPirates(crewManagement, admin, genesisPiratesAddress, inhabitantsAddress, user, 
      { genesis: genesisPirateIdsForSetup, inhabitants: inhabitantPirateIdsForSetup }, 
      crew.crewType, 
      { captain: crew.captainCrewCount, crew: crew.regularCrewCount }
    );
  }
  // --- End NEW --- 
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

/**
 * Deploys and registers a suite of core game contracts.
 * @param {Object} admin - Admin signer.
 * @param {Object} user - Primary user signer.
 * @param {Object} centralAuthorizationRegistry - CAR contract instance.
 * @param {Object} nfts - Object containing NFT instances (shipNFT, genesisPiratesAddress, inhabitantsAddress, genesisIslandsAddress).
 * @param {Object} options - Optional parameters.
 * @param {boolean} options.deployRealMissionsStorage - If true, deploys real MissionsStorage; otherwise, MockMissionsStorage. Defaults to false (mock).
 * @param {Object} options.tokenSetupResult - Optional. If provided, uses existing arrcToken, rumToken, feeManagement. Otherwise, deploys them.
 * @returns {Object} An object containing all deployed core contract instances.
 */
async function setupCoreGameContracts(admin, user, centralAuthorizationRegistry, nfts, options = {}) {
    const {
        shipNFT, // This is the contract instance
        genesisPiratesAddress, // Address string
        inhabitantsAddress,  // Address string
        genesisIslandsAddress // Address string for IslandNFT
    } = nfts;

    const carAddress = await centralAuthorizationRegistry.getAddress();
    const shipNFTAddress = await shipNFT.getAddress();


    // Optional: Use existing token infrastructure or set it up
    let arrcToken, rumToken, feeManagement;
    if (options.tokenSetupResult) {
        ({ arrcToken, rumToken, feeManagement } = options.tokenSetupResult);
    } else {
        const tokenInfra = await setupTokenInfrastructure(centralAuthorizationRegistry, admin, [user]);
        arrcToken = tokenInfra.arrcToken;
        rumToken = tokenInfra.rumToken;
        feeManagement = tokenInfra.feeManagement;
    }

    // Storage Suite
    // Assuming genesisIslandsAddress is the address of the ERC721 Island NFT contract
    const islandStorage = await deployAndRegisterContract("IslandStorage", centralAuthorizationRegistry, "IIslandStorage", genesisIslandsAddress, true);
    const pirateStorage = await deployAndRegisterContract("PirateStorage", centralAuthorizationRegistry, "IPirateStorage", genesisPiratesAddress, false, genesisIslandsAddress);
    const inhabitantStorage = await deployAndRegisterContract("InhabitantStorage", centralAuthorizationRegistry, "IInhabitantStorage", inhabitantsAddress, true, genesisIslandsAddress);
    const shipStorage = await deployAndRegisterContract("ShipStorage", centralAuthorizationRegistry, "IShipStorage", shipNFTAddress, true);

    await islandStorage.initializeIslands(1, { gasLimit: 30000000 });        
    await islandStorage.initializeIslands(13, { gasLimit: 30000000 });
    
    const storageManagement = await deployAndRegisterContract(
        "StorageManagement", centralAuthorizationRegistry, "IStorageManagement",
        genesisPiratesAddress,
        genesisIslandsAddress, 
        inhabitantsAddress,
        await pirateStorage.getAddress(),
        await islandStorage.getAddress(),
        await inhabitantStorage.getAddress()
    );
    // Link storages to StorageManagement
    await storageManagement.connect(admin).addStorageContract(shipNFTAddress, await shipStorage.getAddress());
    await storageManagement.connect(admin).addStorageContract(genesisPiratesAddress, await pirateStorage.getAddress());
    await storageManagement.connect(admin).addStorageContract(inhabitantsAddress, await inhabitantStorage.getAddress());
    await storageManagement.connect(admin).addStorageContract(genesisIslandsAddress, await islandStorage.getAddress());


    // Resource Management
    const resourceTypeManager = await deployAndRegisterContract("ResourceTypeManager", centralAuthorizationRegistry, "IResourceTypeManager");
    const resourceManagement = await deployAndRegisterContract("ResourceManagement", centralAuthorizationRegistry, "IResourceManagement");
    // MockBuildingStorage constructor takes CAR address and IslandStorage address
    const buildingStorage = await deployAndRegisterContract("MockBuildingStorage", centralAuthorizationRegistry, "IBuildingStorage", await islandStorage.getAddress());
    const resourceSpendManagement = await deployAndRegisterContract("ResourceSpendManagement", centralAuthorizationRegistry, "IResourceSpendManagement");

    // Crew Management
    const crewTypeManager = await deployAndRegisterContract("CrewTypeManager", centralAuthorizationRegistry, "ICrewTypeManager", genesisPiratesAddress, inhabitantsAddress);
    const crewManagement = await deployAndRegisterContract("CrewManagement", centralAuthorizationRegistry, "ICrewManagement");

    // Skills
    const pirateSkills = await deployAndRegisterContract("PirateSkills", centralAuthorizationRegistry, "IPirateSkills");
    const pirateSkillsReader = await deployAndRegisterContract("PirateSkillsReader", centralAuthorizationRegistry, "IPirateSkillsReader");

    // Ship & Staking
    const shipMetadata = await deployAndRegisterContract("ShipMetadata", centralAuthorizationRegistry, "IShipMetadata");
    const dockingManagement = await deployAndRegisterContract("DockingManagement", centralAuthorizationRegistry, "IDockingManagement");
    const shipAndPirateStaking = await deployAndRegisterContract("ShipAndPirateStaking", centralAuthorizationRegistry, "IShipAndPirateStaking", shipNFTAddress, genesisPiratesAddress, inhabitantsAddress);

    // Mission Infrastructure
    const cooldownManager = await deployAndRegisterContract("CooldownManager", centralAuthorizationRegistry, "ICooldownManager");
    const travelTimeCalculator = await deployAndRegisterContract("TravelTimeCalculator", centralAuthorizationRegistry, "ITravelTimeCalculator");
    const missionTravelCalculator = await deployAndRegisterContract("MissionTravelCalculator", centralAuthorizationRegistry, "IMissionTravelCalculator");
    const missionValidator = await deployAndRegisterContract("MissionValidator", centralAuthorizationRegistry, "IMissionValidator");
    
    let missionsStorageInstance;
    if (options.deployRealMissionsStorage) {
        missionsStorageInstance = await deployAndRegisterContract("MissionsStorage", centralAuthorizationRegistry, "IMissionsStorage");
    } else {
        // deployAndRegisterMock expects (contractName, registryKey, car, ...args)
        // MockMissionsStorage constructor only takes CAR address.
        missionsStorageInstance = await deployAndRegisterMock("MockMissionsStorage", "IMissionsStorage", centralAuthorizationRegistry);
    }
    
    const mockIslandManager = await deployAndRegisterMock("MockIslandManager", "IIslandManager", centralAuthorizationRegistry);
    const missionRequirements = await deployAndRegisterMock("MockMissionRequirements", "MISSION_REQUIREMENTS", centralAuthorizationRegistry);

    // Deploy IslandRegionManagement
    const islandRegionManagement = await deployAndRegisterContract("IslandRegionManagement", centralAuthorizationRegistry, "IIslandRegionManagement");

    await islandRegionManagement.connect(admin).setIslandRegion(1, 0); 
    await islandRegionManagement.connect(admin).setIslandRegion(2, 6);
    // Initializing some common states
    await islandStorage.connect(admin).setIslandSize(1, 1); 
    await islandStorage.connect(admin).setIslandSize(2, 2); 
    await islandStorage.connect(admin).setIslandSize(3, 0); 

    return {
        arrcToken, rumToken, feeManagement,
        islandStorage, pirateStorage, inhabitantStorage, shipStorage, storageManagement,
        resourceTypeManager, resourceManagement, buildingStorage, resourceSpendManagement,
        crewTypeManager, crewManagement,
        pirateSkills, pirateSkillsReader,
        shipMetadata, dockingManagement, shipAndPirateStaking,
        cooldownManager, travelTimeCalculator, missionTravelCalculator, missionValidator,
        missionsStorage: missionsStorageInstance,
        mockIslandManager,
        missionRequirements,
        islandRegionManagement
    };
}

/**
 * Prepares a ship and user for a journey (rebase or mission) by ensuring necessary tokens and food resources.
 * @param {ethers.Signer} user - The user undertaking the journey.
 * @param {ethers.Signer} admin - The admin signer (for minting/adding resources).
 * @param {Object} contracts - Object containing contract instances.
 * @param {ethers.Contract} contracts.arrcToken - ARRC token contract.
 * @param {ethers.Contract} contracts.rumToken - RUM token contract.
 * @param {ethers.Contract} contracts.feeManagement - FeeManagement contract.
 * @param {ethers.Contract} contracts.shipStorage - ShipStorage contract.
 * @param {ethers.Contract} contracts.resourceSpendManagement - ResourceSpendManagement contract.
 * @param {Object} journeyDetails - Details for the journey.
 * @param {number|string} journeyDetails.shipId - ID of the ship.
 * @param {number|string|BigInt} journeyDetails.nftCrewCount - Number of crew members represented by the NFT.
 * @param {number|string|BigInt} journeyDetails.totalFoodCrewCount - Total crew members.
 * @param {number|string|BigInt} journeyDetails.travelDays - Travel days for the journey.
 * @param {string} journeyDetails.foodPrimaryType - String identifier for primary food (e.g., "citrus").
 * @param {string} journeyDetails.foodRationType - String identifier for ration food (e.g., "fish").
 * @param {BigInt} [journeyDetails.arrcFee] - Optional. Specific ARRC fee for the action.
 * @param {BigInt} [journeyDetails.rumAmountToBurn] - Optional. Specific RUM amount to burn (in wei).
 * @param {Object.<string, BigInt>} [journeyDetails.overrideLoadAmounts] - Optional. Map of resource name to specific amount to load, overriding calculation.
 * @returns {Promise<Object>} An object containing the amounts of resources prepared.
 */
async function prepareShipForJourney(user, admin, contracts, journeyDetails) {
    // Destructure contracts first
    const { arrcToken, rumToken, feeManagement, shipStorage, resourceSpendManagement } = contracts;

    // Parameter Validation: Check for essential journeyDetails
    if (journeyDetails === undefined || journeyDetails === null) {
        throw new Error("[prepareShipForJourney] Error: journeyDetails object is missing.");
    }

    const requiredGeneralParams = [
        "shipId", 
        "travelDays", 
        "foodPrimaryType" 
        // foodRationType is optional, handled by its presence
    ];

    for (const param of requiredGeneralParams) {
        if (journeyDetails[param] === undefined || journeyDetails[param] === null) {
            // Allow zero for travelDays if it's a valid scenario for preloading without travel.
            if (param === "travelDays" && Number(journeyDetails[param]) === 0) {
                // Continue if 0 is valid for travelDays in some contexts
            } else {
                 throw new Error(`[prepareShipForJourney] Error: Missing required general parameter '${param}' in journeyDetails.`);
            }
        }
    }

    // Conditional checks for crew counts based on other parameters
    if (journeyDetails.rumAmountToBurn === undefined && journeyDetails.nftCrewCount === undefined) {
        throw new Error("[prepareShipForJourney] Error: Missing 'nftCrewCount' in journeyDetails (required for RUM calculation when rumAmountToBurn is not provided).");
    }
    
    if ((journeyDetails.foodPrimaryType || journeyDetails.foodRationType) && journeyDetails.totalFoodCrewCount === undefined) {
         throw new Error("[prepareShipForJourney] Error: Missing 'totalFoodCrewCount' in journeyDetails (required for food calculation when food types are specified).");
    }

    // Type validation for numeric inputs that are expected to be numbers from the test
    if (typeof journeyDetails.travelDays !== 'number' || isNaN(journeyDetails.travelDays)) {
        throw new Error(`[prepareShipForJourney] Error: 'travelDays' must be a valid number. Received: ${journeyDetails.travelDays}`);
    }
    if (journeyDetails.nftCrewCount !== undefined && (typeof journeyDetails.nftCrewCount !== 'number' || isNaN(journeyDetails.nftCrewCount))) {
        throw new Error(`[prepareShipForJourney] Error: 'nftCrewCount' must be a valid number if provided. Received: ${journeyDetails.nftCrewCount}`);
    }
    if (journeyDetails.totalFoodCrewCount !== undefined && (typeof journeyDetails.totalFoodCrewCount !== 'number' || isNaN(journeyDetails.totalFoodCrewCount))) {
        throw new Error(`[prepareShipForJourney] Error: 'totalFoodCrewCount' must be a valid number if provided. Received: ${journeyDetails.totalFoodCrewCount}`);
    }
    
    // Now destructure with more confidence
    let { 
        shipId, 
        nftCrewCount,
        totalFoodCrewCount,
        travelDays, 
        foodPrimaryType, foodRationType, 
        arrcFee, 
        rumAmountToBurn, // This can be undefined, handled below
        overrideLoadAmounts 
    } = journeyDetails;

    const ONE_ETHER = ethers.parseEther("1");
    
    // Calculate RUM to Burn
    let expectedRumToBurnWei;
    if (rumAmountToBurn !== undefined) {
        expectedRumToBurnWei = BigInt(rumAmountToBurn);
    } else {
        expectedRumToBurnWei = BigInt(travelDays) * BigInt(nftCrewCount) * ONE_ETHER;
    }

    const feeManagementAddress = await feeManagement.getAddress();
    

    // 1. ARRC Handling
    if (arrcFee && arrcFee > 0n) {
        const userArrcBalance = await arrcToken.balanceOf(user.address);
        if (userArrcBalance < arrcFee) {
            await arrcToken.connect(admin).mint(user.address, arrcFee - userArrcBalance);
        }
        await arrcToken.connect(user).approve(feeManagementAddress, arrcFee);
    } else {
        // General approval if no specific fee, or fee is 0
        await arrcToken.connect(user).approve(feeManagementAddress, ethers.MaxUint256);
    }

    // 2. RUM Handling
    const userRumBalance = await rumToken.balanceOf(user.address);
    if (userRumBalance < expectedRumToBurnWei) {
        await rumToken.connect(admin).mint(user.address, expectedRumToBurnWei - userRumBalance);
    }
    await rumToken.connect(user).approve(feeManagementAddress, expectedRumToBurnWei); 

    // 4. Calculate Food to Burn
    // Uses totalFoodCrewCount for Food calculation
    let expectedPrimaryFoodToBurnWei = 0n;
    let expectedRationFoodToBurnWei = 0n;

    if (foodPrimaryType) {
        try {
            const { rateWei: primaryRate, method: primaryMethod } = 
                await resourceSpendManagement.getOptionalActionResourceRate("consumePrimaryFood", foodPrimaryType);
            
            if (Number(primaryMethod) === CalculationMethod.PerDay) {
                expectedPrimaryFoodToBurnWei = BigInt(primaryRate) * BigInt(totalFoodCrewCount) * BigInt(travelDays);
            }
        } catch (error) {
            console.error(`Error calculating primary food burn: ${error.message}`);
        }
    }

    if (foodRationType) {
        try {
            const { rateWei: rationRate, method: rationMethod } = 
                await resourceSpendManagement.getOptionalActionResourceRate("consumeRationFood", foodRationType);

            if (Number(rationMethod) === CalculationMethod.PerDay) {
                expectedRationFoodToBurnWei = BigInt(rationRate) * BigInt(totalFoodCrewCount) * BigInt(travelDays);
            }
        } catch (error) {
            console.error(`Error calculating ration food burn: ${error.message}`);
        }
    }

    // 5. Preload Food in Ship Storage
    let primaryLoadAmount;
    if (overrideLoadAmounts && overrideLoadAmounts[foodPrimaryType] !== undefined) {
        // If override is provided, assume it's ALREADY IN WEI
        primaryLoadAmount = BigInt(overrideLoadAmounts[foodPrimaryType]); // Use directly
    } else {
        primaryLoadAmount = expectedPrimaryFoodToBurnWei; // Already in wei
    }
    
    let rationLoadAmount;
    if (overrideLoadAmounts && overrideLoadAmounts[foodRationType] !== undefined) {
        // If override is provided, assume it's ALREADY IN WEI
        rationLoadAmount = BigInt(overrideLoadAmounts[foodRationType]); // Use directly
    } else {
        rationLoadAmount = expectedRationFoodToBurnWei; // Already in wei
    }

    // Add logging before adding resources
    // CONSOLE LOGS TO REMOVE
    // console.log(`[prepareShipForJourney DEBUG] About to load ${foodPrimaryType}: ${primaryLoadAmount.toString()} wei`);
    // const capacityBeforePrimary = await shipStorage.getAvailableCapacity(shipId);
    // console.log(`[prepareShipForJourney DEBUG] Available capacity BEFORE loading ${foodPrimaryType}: ${capacityBeforePrimary.toString()}`);
    // END CONSOLE LOGS TO REMOVE
    
    if (primaryLoadAmount > 0n) { // Only add if there's an amount
        await shipStorage.connect(admin).addResource(shipId, user.address, foodPrimaryType, primaryLoadAmount);
    }
    // CONSOLE LOGS TO REMOVE
    // const capacityAfterPrimary = await shipStorage.getAvailableCapacity(shipId);
    // console.log(`[prepareShipForJourney DEBUG] Available capacity AFTER loading ${foodPrimaryType}: ${capacityAfterPrimary.toString()}`);
    //
    // console.log(`[prepareShipForJourney DEBUG] About to load ${foodRationType}: ${rationLoadAmount.toString()} wei`);
    // const capacityBeforeRation = await shipStorage.getAvailableCapacity(shipId);
    // console.log(`[prepareShipForJourney DEBUG] Available capacity BEFORE loading ${foodRationType}: ${capacityBeforeRation.toString()}`);
    // END CONSOLE LOGS TO REMOVE

    if (rationLoadAmount > 0n) { // Only add if there's an amount
        await shipStorage.connect(admin).addResource(shipId, user.address, foodRationType, rationLoadAmount);
    }
    // CONSOLE LOGS TO REMOVE
    // const capacityAfterRation = await shipStorage.getAvailableCapacity(shipId);
    // console.log(`[prepareShipForJourney DEBUG] Available capacity AFTER loading ${foodRationType}: ${capacityAfterRation.toString()}`);
    // END CONSOLE LOGS TO REMOVE

    return {
        expectedPrimaryFoodToBurnWei,
        expectedRationFoodToBurnWei,
        actuallyLoadedPrimary: primaryLoadAmount,
        actuallyLoadedRation: rationLoadAmount,
        expectedRumToBurnWei,
        arrcFeeProvided: arrcFee // to confirm if a specific fee was handled
    };
}

/**
 * Ensures specified resources have no production requirements in ResourceSpendManagement
 * and exist in ResourceTypeManager.
 * @param {ethers.Signer} admin - The admin signer.
 * @param {ethers.Contract} resourceSpendManagement - Instance of ResourceSpendManagement.
 * @param {ethers.Contract} resourceTypeManager - Instance of ResourceTypeManager.
 * @param {string[]} resourceNames - Array of resource names (e.g., ["citrus", "fish"]).
 */
async function setupEmptyResourceProduction(admin, resourceSpendManagement, resourceTypeManager, resourceNames) {
    const emptyRequirements = []; // Reusable empty array

    for (const resourceName of resourceNames) {
        try {
            // Attempt to add the resource type; ignore error if it already exists.
            await resourceTypeManager.connect(admin).addResourceType(resourceName, true, true);
        } catch (error) {
            // console.warn(`[UTIL DEBUG] Could not add resource type ${resourceName} (may already exist): ${error.message}`);
        }

        // Set empty production requirements for the resource.
        await resourceSpendManagement.connect(admin).setResourceRequirements(
            resourceName,
            emptyRequirements, // inputResources
            emptyRequirements  // byproductResources
        );
    }
}

module.exports = {
  deployBaseInfrastructure,
  deployAndAuthorizeContract,
  deployAndRegisterContract,
  setupPirateWithSkills,
  verifyPirateSkills,
  createCrewSkills,
  setupPirateSkillsViaPirateManagement,
  registerContractInterfaces,
  verifyContractState,
  createTestConfig,
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
  deployMockBuildingStorage,
  setupTokenInfrastructure,
  setupGenesisPiratesNFT,
  setupInhabitantsNFT,
  setupNFTsForStaking,
  setupStakingRequirements,
  prepareAssetsForStaking,
  createNonNFTCrewSkills,
  deployAndRegisterMock,
  setupCoreGameContracts,
  prepareShipForJourney,
  setupEmptyResourceProduction
};