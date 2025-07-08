const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

async function main() {
    // Check for required arguments
    const collectionType = process.env.COLLECTION_TYPE || 'pirates';
    const networkName = process.env.HARDHAT_NETWORK || 'localhost';
    
    console.log(`\n${chalk.blue('🚀 Loading skills for:')} ${collectionType}`);
    console.log(`${chalk.blue('🌐 Network:')} ${networkName}`);
    
    // Get the first account (admin)
    const [admin] = await ethers.getSigners();
    console.log(`${chalk.blue('👤 Admin:')} ${admin.address}`);
    
    // Get CentralAuthorizationRegistry
    let centralAuthRegistryAddress;
    
    if (networkName === 'localhost' || networkName === 'hardhat') {
        // For local development, deploy a new registry
        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);
        centralAuthRegistryAddress = await centralAuthorizationRegistry.getAddress();
    } else {
        // You should specify the address for other networks
        if (networkName === 'polygon') {
            centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778'; // Replace with actual address
        } else if (networkName === 'amoy') {
            centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141'; // Replace with actual address
        } else {
            throw new Error(`Network ${networkName} not supported. Specify registry address.`);
        }
    }
    
    console.log(`${chalk.blue('📝 CentralAuthRegistry:')} ${centralAuthRegistryAddress}`);
    
    // Connect to existing registry
    const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);
    
    // Get or deploy PirateSkills contract
    let pirateSkillsAddress;
    
    if (networkName === 'localhost' || networkName === 'hardhat') {
        // For local development, deploy a new PirateSkills contract
        const PirateSkills = await ethers.getContractFactory("PirateSkills");
        const pirateSkills = await PirateSkills.deploy(centralAuthRegistryAddress);
        pirateSkillsAddress = await pirateSkills.getAddress();
        
        // Authorize the contract
        await centralAuthRegistry.addAuthorizedContract(pirateSkillsAddress);
        
        // Set interface ID
        await centralAuthRegistry.setContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IPirateSkills")), pirateSkillsAddress);
    } else {
        // Retrieve existing PirateSkills contract address
        pirateSkillsAddress = await centralAuthRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IPirateSkills")));
        
        if (pirateSkillsAddress === ethers.ZeroAddress) {
            throw new Error("PirateSkills contract not found in registry");
        }
    }
    
    console.log(`${chalk.blue('📝 PirateSkills:')} ${pirateSkillsAddress}`);
    
    // Connect to existing PirateSkills contract
    const pirateSkills = await ethers.getContractAt("PirateSkills", pirateSkillsAddress);
    
    // Get or deploy NFT Collection
    let collectionAddress;
    
    if (networkName === 'localhost' || networkName === 'hardhat') {
        // For local development, deploy a new Collection contract
        if (collectionType === 'pirates') {
            const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
            const simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");
            collectionAddress = await simpleERC1155.getAddress();
            
            // Mint some NFTs for testing
            for (let i = 1; i <= 5; i++) {
                await simpleERC1155.mint(admin.address, i);
            }
        } else if (collectionType === 'inhabitants') {
            const SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
            const simpleERC721 = await SimpleERC721.deploy("Inhabitant", "INH", "https://inhabitant.com/", admin.address);
            collectionAddress = await simpleERC721.getAddress();
            
            // Mint some NFTs for testing
            for (let i = 1; i <= 5; i++) {
                await simpleERC721.mint(admin.address);
            }
        } else {
            throw new Error(`Invalid collection type: ${collectionType}`);
        }
        
        // Register the collection with the CentralAuthorizationRegistry
        await centralAuthRegistry.registerPirateNftContract(collectionAddress);
    } else {
        // For production networks, use defined addresses
        if (networkName === 'polygon') {
            if (collectionType === 'pirates') {
                collectionAddress = '0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c'; // Replace with actual address
            } else if (collectionType === 'inhabitants') {
                collectionAddress = '0xa1b3afc3e025c617bac5bf89ed259fdb789d506c'; // Replace with actual address
            }
        } else if (networkName === 'amoy') {
            if (collectionType === 'pirates') {
                collectionAddress = '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942'; // Replace with actual address
            } else if (collectionType === 'inhabitants') {
                collectionAddress = '0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654'; // Replace with actual address
            }
        }
        
        if (!collectionAddress) {
            throw new Error(`No address found for ${collectionType} on ${networkName}`);
        }
    }
    
    console.log(`${chalk.blue('🏴‍☠️ Collection:')} ${collectionAddress}`);
    
    // Load skills from JSON file
    const dataFilePath = path.join(__dirname, '../test/data/pirate_skills_test.json');
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    
    console.log(`\n${chalk.green('✅ Loaded data from:')} ${dataFilePath}`);
    console.log(`${chalk.green('✅ Found:')} ${data.length} skill entries for ${data.flatMap(entry => entry.tokenIds).length} tokens`);
    
    // Process each token and skill set
    for (const tokenSkillSet of data) {
        const tokenIds = tokenSkillSet.tokenIds;
        const skills = tokenSkillSet.skills;
        
        // Convert skills to arrays
        const characterSkillsArray = Object.values(skills.characterSkills).map(BigInt);
        const toolsSkillsArray = Object.values(skills.toolsSkills).map(BigInt);
        const specialSkillsArray = Object.values(skills.specialSkills).map(BigInt);
        const shipSkillsArray = skills.shipSkills ? Object.values(skills.shipSkills).map(BigInt) : Array(3).fill(BigInt(5));
        const magicSkillsArray = skills.magicSkills ? Object.values(skills.magicSkills).map(BigInt) : Array(6).fill(BigInt(5));
        
        console.log(`\n${chalk.yellow('⏳ Processing tokens:')} ${tokenIds.join(', ')}`);
        
        for (const tokenId of tokenIds) {
            try {
                console.log(`${chalk.cyan('📊 Adding skills for token')} ${tokenId}`);
                
                // Add skills for each token
                const tx = await pirateSkills.addAllSkills(
                    collectionAddress,
                    tokenId,
                    characterSkillsArray,
                    toolsSkillsArray,
                    specialSkillsArray,
                    shipSkillsArray,
                    magicSkillsArray
                );
                
                const receipt = await tx.wait();
                console.log(`${chalk.green('✅ Successfully added skills for token')} ${tokenId}`);
                console.log(`   ${chalk.gray('Transaction:')} ${receipt.hash}`);
                console.log(`   ${chalk.gray('Gas used:')} ${receipt.gasUsed.toString()}`);
            } catch (error) {
                if (error.message.includes("already exist")) {
                    console.log(`${chalk.yellow('⚠️ Skills already exist for token')} ${tokenId}`);
                } else {
                    console.error(`${chalk.red('❌ Error adding skills for token')} ${tokenId}:`);
                    console.error(error.message);
                }
            }
        }
    }
    
    console.log(`\n${chalk.green('✅ All skills loaded successfully!')}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 