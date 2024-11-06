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
        islandStorageAddress = "0xd6D83A36a5feCd3C2Ca64f94dac1B431Bd9C6041";
        inhabitantsAddress = "0xFBD5F4Db158125ee6FC69E44CAd77AA01c348654";
        inhabitantStorageAddress = "0x0f2c30DAA6ca392b6474E134384727D0bd256f51";
        resourceFarmingAddress = "0xFA5b69f4ee36f0a6AED92F7e4b4ff35C19642B73";
        
    } else {
        centralAuthorizationRegistryAddress = "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";
        genesisPiratesAddress = "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c";
        genesisIslandsAddress = "0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1";
        inhabitantsAddress = "0xa1b3afc3e025c617bac5bf89ed259fdb789d506c";
        inhabitantStorageAddress = "0xa02cc67D253B22473f5c2cC5E9f5B83eCEc53f7E";        
        islandStorageAddress = "0x5112435C6f6a9Bb10925BCaE523A7E758e45eF2B";   
        resourceFarmingAddress = "0x2B448C5218c3aABf8517B5B3DE54b0E817231daF";
    }




    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthorizationRegistryAddress);

    //const oldPirateStorageAddress = await centralAuthorizationRegistry.getContractAddress("0x49d822a9a81729b9fb9bd0986e4ed05a304a2929289c373c604a71089609de19");

    console.log("Old pirate storage address:", "0xC617FE2c8B4C0dF871E07b3796Fda41BD0996E7C");

    pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);
    await checkContractDeployed(await pirateStorage.getAddress());

    pirateStorageAddress = await pirateStorage.getAddress()

    const storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, pirateStorageAddress, islandStorageAddress, inhabitantStorageAddress);
    await checkContractDeployed(await storageManagement.getAddress());
    //storageManagement.addStorageContract(genesisPiratesAddress, await pirateStorage.getAddress());

    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Auto verify contracts
    const contractsToVerify = [        
        { contract: pirateStorage, args: [centralAuthorizationRegistryAddress, genesisPiratesAddress, false, genesisIslandsAddress] },
        { contract: storageManagement, args: [centralAuthorizationRegistryAddress, genesisPiratesAddress, genesisIslandsAddress, inhabitantsAddress, pirateStorageAddress, islandStorageAddress, inhabitantStorageAddress] }
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

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });