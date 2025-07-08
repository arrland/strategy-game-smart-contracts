const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require("../utils");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    let centralAuthorizationRegistryAddress;
    
    // Replace with the actual address of your central authorization registry contract
    if (network.name == "amoy") {
        centralAuthorizationRegistryAddress = "0x99a764fd156083aA343e2577C348c8cF110C7141";
    } else {
        centralAuthorizationRegistryAddress = "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";
    }

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthorizationRegistryAddress);

    // Deploy ResourceSpendManagement
    const resourceSpendManagement = await deployAndAuthorizeContract("ResourceSpendManagement", centralAuthorizationRegistry);

    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Auto verify contract
    try {
        await run("verify:verify", {
            address: await resourceSpendManagement.getAddress(),
            constructorArguments: [centralAuthorizationRegistryAddress],
        });
        console.log(`Verified ResourceSpendManagement at ${await resourceSpendManagement.getAddress()}`);
    } catch (error) {
        console.error(`Failed to verify ResourceSpendManagement at ${await resourceSpendManagement.getAddress()}:`, error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
