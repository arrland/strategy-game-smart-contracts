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
        { name: "InhabitantNFT", address: process.env.INHABITANT_NFT_ADDRESS, args: [process.env.ADMIN_MULTI_SIG, process.env.MINTER_ADDRESS, process.env.MATIC_FEE_RECIPIENT] },
        //{ name: "IslandManagement", address: process.env.ISLAND_MANAGEMENT, args: [CentralAuthorizationRegistry, GenesisIslandsAddress] },
        //{ name: "StorageManagement", address: process.env.STORAGE_MANAGEMENT, args: [CentralAuthorizationRegistry, GenesisPiratesAddress, GenesisIslandsAddress, PirateStorageAddress, IslandStorageAddress] },
        //{ name: "ResourceSpendManagement", address: process.env.RESOURCE_SPEND_MANAGEMENT, args: [CentralAuthorizationRegistry] },
        //{ name: "ResourceFarmingRules", address: process.env.RESOURCE_FARMING_RULES, args: [CentralAuthorizationRegistry] },
        //{ name: "ResourceFarming", address: process.env.RESOURCE_FARMING, args: [CentralAuthorizationRegistry] },
        //{ name: "ActivityStats", address: process.env.ACTIVITY_STATS, args: [CentralAuthorizationRegistry, 1, LastRewardMintBlock, Blocks28Days] }

        
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