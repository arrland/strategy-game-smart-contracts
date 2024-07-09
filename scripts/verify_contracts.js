const { ethers, run } = require("hardhat");
require("dotenv").config();

async function main() {
    const CentralAuthorizationRegistry = process.env.CENTRAL_AUTHORIZATION_REGISTRY;
    const contracts = [
        { name: "ResourceTypeManager", address: process.env.RESOURCE_TYPE_MANAGER_1 },
        { name: "ResourceManagement", address: process.env.RESOURCE_MANAGEMENT_1 },
        { name: "CentralAuthorizationRegistry", address: process.env.CENTRAL_AUTHORIZATION_REGISTRY },
        { name: "ResourceTypeManager", address: process.env.RESOURCE_TYPE_MANAGER_2 },
        { name: "ResourceManagement", address: process.env.RESOURCE_MANAGEMENT_2 },
        { name: "FeeManagement", address: process.env.FEE_MANAGEMENT },
        { name: "PirateManagement", address: process.env.PIRATE_MANAGEMENT },
        { name: "PirateStorage", address: process.env.PIRATE_STORAGE },
        { name: "IslandStorage", address: process.env.ISLAND_STORAGE },
        { name: "StorageManagement", address: process.env.STORAGE_MANAGEMENT },
        { name: "ResourceSpendManagement", address: process.env.RESOURCE_SPEND_MANAGEMENT },
        { name: "ResourceFarmingRules", address: process.env.RESOURCE_FARMING_RULES },
        { name: "ResourceFarming", address: process.env.RESOURCE_FARMING }
    ];

    for (const contract of contracts) {
        try {
            await run("verify:verify", {
                address: contract.address,
                constructorArguments: [CentralAuthorizationRegistry],
            });
            console.log(`Verified ${contract.name} at ${contract.address}`);
        } catch (error) {
            console.error(`Failed to verify ${contract.name} at ${contract.address}:`, error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});