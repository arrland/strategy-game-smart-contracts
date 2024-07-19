const { ethers, run } = require("hardhat");
require("dotenv").config();

async function main() {
    const CentralAuthorizationRegistry = process.env.CENTRAL_AUTHORIZATION_REGISTRY;
    const RumTokenAddress = process.env.RUM_TOKEN_ADDRESS;
    const MaticFeeRecipient = process.env.MATIC_FEE_RECIPIENT;
    const GenesisPiratesAddress = process.env.GENESIS_PIRATES_ADDRESS;
    const GenesisIslandsAddress = process.env.GENESIS_ISLANDS_ADDRESS;
    const PirateStorageAddress = process.env.PIRATE_STORAGE;
    const IslandStorageAddress = process.env.ISLAND_STORAGE;
    const LastRewardMintBlock = process.env.LAST_REWARD_MINT_BLOCK;
    const Blocks28Days = process.env.BLOCKS_28_DAYS;

    const contracts = [
        { name: "ResourceTypeManager", address: process.env.RESOURCE_TYPE_MANAGER, args: [CentralAuthorizationRegistry] },
        { name: "ResourceManagement", address: process.env.RESOURCE_MANAGEMENT, args: [CentralAuthorizationRegistry] },
        { name: "CentralAuthorizationRegistry", address: process.env.CENTRAL_AUTHORIZATION_REGISTRY, args: [] },
        { name: "FeeManagement", address: process.env.FEE_MANAGEMENT, args: [CentralAuthorizationRegistry, RumTokenAddress, MaticFeeRecipient] },
        { name: "PirateManagement", address: process.env.PIRATE_MANAGEMENT, args: [CentralAuthorizationRegistry] },
        { name: "PirateStorage", address: process.env.PIRATE_STORAGE, args: [CentralAuthorizationRegistry, GenesisPiratesAddress, false] },
        { name: "IslandStorage", address: process.env.ISLAND_STORAGE, args: [CentralAuthorizationRegistry, GenesisIslandsAddress, true] },
        { name: "IslandManagement", address: process.env.ISLAND_MANAGEMENT, args: [CentralAuthorizationRegistry, GenesisIslandsAddress] },
        { name: "StorageManagement", address: process.env.STORAGE_MANAGEMENT, args: [CentralAuthorizationRegistry, GenesisPiratesAddress, GenesisIslandsAddress, PirateStorageAddress, IslandStorageAddress] },
        { name: "ResourceSpendManagement", address: process.env.RESOURCE_SPEND_MANAGEMENT, args: [CentralAuthorizationRegistry] },
        { name: "ResourceFarmingRules", address: process.env.RESOURCE_FARMING_RULES, args: [CentralAuthorizationRegistry] },
        { name: "ResourceFarming", address: process.env.RESOURCE_FARMING, args: [CentralAuthorizationRegistry] },
        { name: "ActivityStats", address: process.env.ACTIVITY_STATS, args: [CentralAuthorizationRegistry, 1, LastRewardMintBlock, Blocks28Days] }
    ];

    for (const contract of contracts) {
        try {
            await run("verify:verify", {
                address: contract.address,
                constructorArguments: contract.args,
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