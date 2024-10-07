const { ethers } = require("hardhat");
const { checkContractDeployed, deployAndAuthorizeContract, verifyContract } = require("./utils");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    let centralAuthorizationRegistryAddress;
    // Replace with the actual address of your central authorization registry contract
    if (network.name !== "amoy") {
        centralAuthorizationRegistryAddress = "0x99a764fd156083aA343e2577C348c8cF110C7141";
    } else {
        centralAuthorizationRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    }

    // Deploy ResourceFarmingRules
    const ResourceFarmingRules = await ethers.getContractFactory("ResourceFarmingRules");
    const resourceFarmingRules = await ResourceFarmingRules.deploy(centralAuthorizationRegistryAddress);

    checkContractDeployed(await resourceFarmingRules.getAddress());

    console.log("ResourceFarmingRules deployed to:", await resourceFarmingRules.getAddress());

    // Deploy ResourceSpendManagement
    const ResourceSpendManagement = await ethers.getContractFactory("ResourceSpendManagement");
    const resourceSpendManagement = await ResourceSpendManagement.deploy(centralAuthorizationRegistryAddress);

    checkContractDeployed(await resourceSpendManagement.getAddress());

    console.log("ResourceSpendManagement deployed to:", await resourceSpendManagement.getAddress());

    // Deploy ResourceTypeManager
    const ResourceTypeManager = await ethers.getContractFactory("ResourceTypeManager");
    const resourceTypeManager = await ResourceTypeManager.deploy(centralAuthorizationRegistryAddress);

    checkContractDeployed(await resourceTypeManager.getAddress());

    console.log("ResourceTypeManager deployed to:", await resourceTypeManager.getAddress());

    // Print verify commands
    console.log(`\nVerify commands:`);
    console.log(`npx hardhat verify --network ${network.name} ${await resourceFarmingRules.getAddress()} ${centralAuthorizationRegistryAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${await resourceSpendManagement.getAddress()} ${centralAuthorizationRegistryAddress}`);
    console.log(`npx hardhat verify --network ${network.name} ${await resourceTypeManager.getAddress()} ${centralAuthorizationRegistryAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });