const { ethers, network } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

/**
 * Deploy ResourceTransferManager and FeeManagement contracts
 * 
 * This script uses the correct contract addresses from docs/deployments.md:
 * - Amoy testnet: CentralAuthorizationRegistry and ShipNFT addresses
 * - Polygon mainnet: CentralAuthorizationRegistry and ShipNFT addresses
 * 
 * The script will automatically register the ShipNFT contract in CAR if not already present
 * and configure the ResourceTransferManager to require ship ownership for transfers.
 * It also deploys a new version of FeeManagement contract.
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying ResourceTransferManager with account:", deployer.address);
    console.log("Network:", network.name);

    // Network-specific addresses
    let centralAuthRegistryAddress, shipNftAddress, rumTokenAddress, arrcTokenAddress, maticFeeRecipient;

    if (network.name === "amoy") {
        // Amoy testnet
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
        shipNftAddress = '0xf7730613499c0d2756e555Cfeb88C6aD190c32AE'; // SHIP_COLLECTION_ADDRESS
        rumTokenAddress = '0x17fF13862c5665dE5676cab1db0927B4C97eebc1'; // RUM_TOKEN_ADDRESS
        arrcTokenAddress = '0x46210CC9243764b69bFD53a81D1b4355EB347504'; // ARRC_TOKEN_ADDRESS (testnet)
        maticFeeRecipient = '0x85831486902abc905E8a39dCf9CADF7286a84900'; // MATIC_FEE_RECIPIENT_TESTNET
    } else if (network.name === "polygon") {
        // Polygon mainnet
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
        shipNftAddress = '0x4DAeE3D7888B1CFC61432815FF209A554fbc1884'; // SHIP_COLLECTION_ADDRESS
        rumTokenAddress = '0x14e5386f47466a463f85d151653e1736c0c50fc3'; // RUM_TOKEN_ADDRESS
        arrcTokenAddress = '0x9fd7833ccE70F62323C0DAd31fDFB12a6a899d73'; // ARRC_TOKEN_ADDRESS (mainnet)
        maticFeeRecipient = '0x0cEc288905316197bA3BBf2F19D94286d684fe43'; // MATIC_FEE_RECIPIENT
    } else {
        throw new Error(`Unsupported network: ${network.name}. Please use "amoy" or "polygon"`);
    }

    console.log("Using addresses:");
    console.log("- CentralAuthorizationRegistry:", centralAuthRegistryAddress);
    console.log("- ShipNFT (hardcoded):", shipNftAddress);
    console.log("- RUM Token:", rumTokenAddress);
    console.log("- ARRC Token:", arrcTokenAddress);
    console.log("- MATIC Fee Recipient:", maticFeeRecipient);

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);

    // Deploy ResourceTransferManager
    const resourceTransferManager = await deployAndAuthorizeContract(
        "ResourceTransferManager",
        centralAuthorizationRegistry
    );

    const resourceTransferManagerAddress = await resourceTransferManager.getAddress();

    // Deploy FeeManagement
    console.log("\n=== Deploying FeeManagement Contract ===");
    const feeManagement = await deployAndAuthorizeContract(
        "FeeManagement",
        centralAuthorizationRegistry,
        rumTokenAddress,
        arrcTokenAddress,
        maticFeeRecipient
    );

    const feeManagementAddress = await feeManagement.getAddress();

    // Configure ShipNFT contract
    console.log("\n=== Configuring ShipNFT Contract ===");
    const shipNftInterfaceId = ethers.keccak256(ethers.toUtf8Bytes("IShipNFT"));
    
    try {
        // Check if ShipNFT is already registered in CAR
        let registeredShipNftAddress = await centralAuthorizationRegistry.getContractAddress(shipNftInterfaceId);
        
        if (registeredShipNftAddress === ethers.ZeroAddress) {
            console.log("⚠️  ShipNFT contract not found in CAR");
            console.log("🔧 Registering hardcoded ShipNFT address:", shipNftAddress);
            
            // Register the hardcoded ShipNFT address in CAR
            await centralAuthorizationRegistry.setContractAddress(shipNftInterfaceId, shipNftAddress);
            console.log("✅ ShipNFT contract registered in CAR");
            
            registeredShipNftAddress = shipNftAddress;
        } else {
            console.log("✅ ShipNFT contract already registered in CAR at:", registeredShipNftAddress);
            
            // Use the registered address instead of hardcoded one if they differ
            if (registeredShipNftAddress !== shipNftAddress) {
                console.log("ℹ️  Note: Using registered address instead of hardcoded address");
                shipNftAddress = registeredShipNftAddress;
            }
        }
        
        // Set the ship NFT contract in ResourceTransferManager
        console.log("🔧 Setting ship NFT contract in ResourceTransferManager...");
        await resourceTransferManager.setShipNftContract(shipNftAddress);
        console.log("✅ Ship NFT contract configured successfully");
        
    } catch (error) {
        console.log("❌ Error configuring ShipNFT contract:", error.message);
        console.log("   You may need to set the ship NFT contract address manually");
    }

    // Log deployment information
    console.log("\nDeployed Contracts:");
    console.log("-------------------");
    console.log("ResourceTransferManager:");
    console.log("- Address:", resourceTransferManagerAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - Default transfer fee:", ethers.formatEther(await resourceTransferManager.resourceTransferFee()), "ARRC");
    
    // Check current ship NFT contract setting
    const currentShipContract = await resourceTransferManager.shipNftContract();
    console.log("  - Ship NFT contract:", currentShipContract);
    
    if (currentShipContract === ethers.ZeroAddress) {
        console.log("    ⚠️  Ship NFT contract not set - transfers will be allowed without ship ownership requirement");
    } else {
        console.log("    ✅ Ship NFT contract configured - users must own ships to transfer resources");
    }
    
    console.log("\nFeeManagement:");
    console.log("- Address:", feeManagementAddress);
    console.log("- Parameters:");
    console.log("  - CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("  - RUM Token:", rumTokenAddress);
    console.log("  - ARRC Token:", arrcTokenAddress);
    console.log("  - MATIC Fee Recipient:", maticFeeRecipient);
    console.log("  - RUM Fee Per Day:", ethers.formatEther(await feeManagement.rumFeePerDay()), "RUM");
    console.log("  - MATIC Fee Per Day:", ethers.formatEther(await feeManagement.maticFeePerDay()), "MATIC");
    console.log("  - Stake Pirate ARRC Fee:", ethers.formatEther(await feeManagement.stakePirateArrcFee()), "ARRC");
    console.log("  - Ship Rebase ARRC Fee:", ethers.formatEther(await feeManagement.getShipRebaseArrcFee()), "ARRC");
    
    console.log("-------------------\n");

    // Contract verification
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contracts on Etherscan...");
        
        const resourceTransferManagerVerificationData = {
            address: resourceTransferManagerAddress,
            constructorArguments: [centralAuthRegistryAddress]
        };

        const feeManagementVerificationData = {
            address: feeManagementAddress,
            constructorArguments: [centralAuthRegistryAddress, rumTokenAddress, arrcTokenAddress, maticFeeRecipient]
        };

        console.log("\nTo verify contracts manually, run:");
        console.log(`npx hardhat verify --network ${network.name} ${resourceTransferManagerVerificationData.address} ${resourceTransferManagerVerificationData.constructorArguments.join(' ')}`);
        console.log(`npx hardhat verify --network ${network.name} ${feeManagementVerificationData.address} ${feeManagementVerificationData.constructorArguments.join(' ')}`);

        // Automatic verification
        console.log("\nAttempting automatic verification...");
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        // Verify ResourceTransferManager
        try {
            const command = `npx hardhat verify --network ${network.name} ${resourceTransferManagerVerificationData.address} ${resourceTransferManagerVerificationData.constructorArguments.join(' ')}`;
            console.log(`Verifying ResourceTransferManager at ${resourceTransferManagerVerificationData.address}...`);
            
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr) {
                console.error(`Error verifying ResourceTransferManager:`, stderr);
            } else {
                console.log(`ResourceTransferManager verified successfully`);
                console.log(stdout);
            }
        } catch (error) {
            console.error(`Error verifying ResourceTransferManager:`, error.message);
        }

        // Verify FeeManagement
        try {
            const command = `npx hardhat verify --network ${network.name} ${feeManagementVerificationData.address} ${feeManagementVerificationData.constructorArguments.join(' ')}`;
            console.log(`Verifying FeeManagement at ${feeManagementVerificationData.address}...`);
            
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr) {
                console.error(`Error verifying FeeManagement:`, stderr);
            } else {
                console.log(`FeeManagement verified successfully`);
                console.log(stdout);
            }
        } catch (error) {
            console.error(`Error verifying FeeManagement:`, error.message);
        }
    }

    return {
        resourceTransferManager: resourceTransferManagerAddress,
        feeManagement: feeManagementAddress,
        centralAuthRegistry: centralAuthRegistryAddress,
        shipNft: shipNftAddress || ethers.ZeroAddress
    };
}

// Usage:
// npx hardhat run scripts/deploys/deploy_resource_transfer_manager.js --network amoy
// npx hardhat run scripts/deploys/deploy_resource_transfer_manager.js --network polygon
// 
// This script deploys both ResourceTransferManager and FeeManagement contracts

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });