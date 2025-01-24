const { ethers, network } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Get current gas prices
    const feeData = await ethers.provider.getFeeData();
    console.log("\nCurrent Gas Prices:");
    console.log("-------------------");
    console.log("🏷️  Gas Price:", ethers.formatUnits(feeData.gasPrice, "gwei"), "gwei");
    if (feeData.maxFeePerGas) {
        console.log("💰 Max Fee:", ethers.formatUnits(feeData.maxFeePerGas, "gwei"), "gwei");
        console.log("💎 Max Priority Fee:", ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei"), "gwei");
    }
    console.log("-------------------\n");

    let centralAuthRegistryAddress;
    let genesisPiratesAddress;
    let inhabitantsAddress;

    if (network.name === "amoy") {
        centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';       
    } else if (network.name === "polygon") {
        centralAuthRegistryAddress = '0xdAf8728C9eD7CBCCf8E24226B0794943E394f778';
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    const centralAuthorizationRegistry = await ethers.getContractAt(
        "CentralAuthorizationRegistry",
        centralAuthRegistryAddress
    );

    // Deploy PirateManagement
    const pirateManagement = await deployAndAuthorizeContract(
        "PirateManagement",
        centralAuthorizationRegistry,
    );
    const pirateManagementAddress = await pirateManagement.getAddress();

    // Log deployment details
    console.log("\nDeployed PirateManagement Contract:");
    console.log("-------------------");
    console.log("Address:", pirateManagementAddress);
    console.log("Parameters:");
    console.log("- CentralAuthRegistry:", centralAuthRegistryAddress);
    console.log("-------------------\n");

    // Verify contract if ETHERSCAN_API_KEY is available
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying contract on Etherscan...");
        
        const verifyCommand = `npx hardhat verify --network ${network.name} ${pirateManagementAddress} ${centralAuthRegistryAddress}`;
        
        console.log("\nTo verify contract manually, run:");
        console.log(verifyCommand);

        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execPromise = util.promisify(exec);

            const { stdout, stderr } = await execPromise(verifyCommand);
            
            if (stderr) {
                console.error("Error during verification:", stderr);
            } else {
                console.log("Verification output:", stdout);
                console.log("Contract verified successfully!");
            }
        } catch (error) {
            console.error("Error verifying contract:", error.message);
        }
    }

    return {
        pirateManagement: pirateManagementAddress,
        centralAuthorizationRegistry: centralAuthRegistryAddress,
        genesisPirates: genesisPiratesAddress,
        inhabitants: inhabitantsAddress
    };
}

// To run on Polygon mainnet:
// npx hardhat run scripts/deploys/10_deploy_pirate_management.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/deploys/10_deploy_pirate_management.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
