const { ethers, network } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

/**
 * Deploy ResourceTransferManager contract and configure it with ShipNFT contract
 * 
 * This script uses the correct contract addresses from docs/deployments.md:
 * - Amoy testnet: CentralAuthorizationRegistry and ShipNFT addresses
 * - Polygon mainnet: CentralAuthorizationRegistry and ShipNFT addresses
 * 
 * The script will automatically register the ShipNFT contract in CAR if not already present
 * and configure the ResourceTransferManager to require ship ownership for transfers.
 */

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying ResourceTransferManager with account:", deployer.address);
    console.log("Network:", network.name);

    // Network-specific addresses
    let centralAuthRegistryAddress, shipNftAddress;

    if (network.name === "amoy") {
        // Amoy testnet
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
        shipNftAddress = '0xf7730613499c0d2756e555Cfeb88C6aD190c32AE'; // SHIP_COLLECTION_ADDRESS
    } else if (network.name === "polygon") {
        // Polygon mainnet
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
        shipNftAddress = '0x4DAeE3D7888B1CFC61432815FF209A554fbc1884'; // SHIP_COLLECTION_ADDRESS
    } else {
        throw new Error(`Unsupported network: ${network.name}. Please use "amoy" or "polygon"`);
    }

    console.log("Using addresses:");
    console.log("- CentralAuthorizationRegistry:", centralAuthRegistryAddress);
    console.log("- ShipNFT (hardcoded):", shipNftAddress);

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);

    // Deploy ResourceTransferManager
    const resourceTransferManager = await deployAndAuthorizeContract(
        "ResourceTransferManager",
        centralAuthorizationRegistry
    );

    const resourceTransferManagerAddress = await resourceTransferManager.getAddress();

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
    console.log("\nDeployed Contract:");
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
    
    console.log("-------------------\n");

    // Contract verification
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contract on Etherscan...");
        
        const verificationData = {
            address: resourceTransferManagerAddress,
            constructorArguments: [centralAuthRegistryAddress]
        };

        console.log("\nTo verify contract manually, run:");
        console.log(`npx hardhat verify --network ${network.name} ${verificationData.address} ${verificationData.constructorArguments.join(' ')}`);

        // Automatic verification
        console.log("\nAttempting automatic verification...");
        const { exec } = require('child_process');
        const util = require('util');
        const execPromise = util.promisify(exec);

        try {
            const command = `npx hardhat verify --network ${network.name} ${verificationData.address} ${verificationData.constructorArguments.join(' ')}`;
            console.log(`Verifying contract at ${verificationData.address}...`);
            
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr) {
                console.error(`Error verifying contract:`, stderr);
            } else {
                console.log(`Contract verified successfully`);
                console.log(stdout);
            }
        } catch (error) {
            console.error(`Error verifying contract:`, error.message);
        }
    }

    return {
        resourceTransferManager: resourceTransferManagerAddress,
        centralAuthRegistry: centralAuthRegistryAddress,
        shipNft: shipNftAddress || ethers.ZeroAddress
    };
}

// Usage:
// npx hardhat run scripts/deploys/deploy_resource_transfer_manager.js --network amoy
// npx hardhat run scripts/deploys/deploy_resource_transfer_manager.js --network polygon

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });