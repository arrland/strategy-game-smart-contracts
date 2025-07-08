const { ethers } = require("hardhat");
const { checkContractDeployed, deployAndAuthorizeContract, verifyContract } = require("../utils");



async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    let centralAuthorizationRegistryAddress;
    let genesisPiratesAddress;
    let genesisIslandsAddress;
    let pirateStorageAddress;
    let islandStorageAddress;    
    let inhabitantsAddress;
    let inhabitantStorageAddress;
    let resourceFarmingAddress;
    let pirateStorage;


    
    // Replace with the actual address of your central authorization registry contract
    if (network.name == "amoy") {
        centralAuthorizationRegistryAddress = "0x99a764fd156083aA343e2577C348c8cF110C7141";
        genesisPiratesAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942";
        genesisIslandsAddress = "0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59";        
        islandStorageAddress = "0x8217Eb2029F07395F0cEC9CaeD6b874e2cbb1a3A";
        inhabitantsAddress = "0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654";
        inhabitantStorageAddress = "0x5673f6Ae41b51B7De3E82f8E45F735acE8F91f7b";
        resourceFarmingAddress = "0xFA5b69f4ee36f0a6AED92F7e4b4ff35C19642B73";
        pirateStorageAddress = "0x8e2367F6061De04957F827348046A9BD8cafd878";
        
    } else {
        centralAuthorizationRegistryAddress = "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";
        genesisPiratesAddress = "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c";
        genesisIslandsAddress = "0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1";
        inhabitantsAddress = "0xa1b3afc3e025c617bac5bf89ed259fdb789d506c";
        inhabitantStorageAddress = "0xa02cc67D253B22473f5c2cC5E9f5B83eCEc53f7E";        
        islandStorageAddress = "0x5112435C6f6a9Bb10925BCaE523A7E758e45eF2B";   
        resourceFarmingAddress = "0x2B448C5218c3aABf8517B5B3DE54b0E817231daF";
        pirateStorageAddress = "0xc1294579561e5337893F8253040156a89601b1FA";
    }


    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthorizationRegistryAddress);

    const currentStorageManagementAddress = "0xD2416BfeAFdfa1C7289A86041512cE4B35403fC9"

    const currentStorageManagement = await ethers.getContractAt("StorageManagement", currentStorageManagementAddress);

    // Get storage addresses for pirates and inhabitants
    const currentIslandStorageAddress = await currentStorageManagement.getStorageByCollection(genesisIslandsAddress);
    

    const storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, pirateStorageAddress, currentIslandStorageAddress, inhabitantStorageAddress);
    await checkContractDeployed(await storageManagement.getAddress());


    
    // Auto verify contracts
    const contractsToVerify = [
        { contract: storageManagement, args: [centralAuthorizationRegistryAddress, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, pirateStorageAddress, currentIslandStorageAddress, inhabitantStorageAddress] }
    ];

    for (const { contract, args } of contractsToVerify) {
        try {
            await run("verify:verify", {
                address: await contract.getAddress(),
                constructorArguments: args,
            });
            console.log(`Verified ${contract.constructor.name} at ${await contract.getAddress()}`);
        } catch (error) {
            console.error(`Failed to verify ${contract.constructor.name} at ${await contract.getAddress()}:`, error);
        }
    }


}

// npx hardhat run scripts/deploys/5_deploy_storage_managment.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });