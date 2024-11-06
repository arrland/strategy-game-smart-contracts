const { ethers } = require("hardhat");
const { checkContractDeployed, deployAndAuthorizeContract, verifyContract } = require("../utils");



async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    let centralAuthorizationRegistryAddress;
    let genesisPiratesAddress;    
    let pirateStorageAddress;
    let islandStorageAddress;        
    let pirateStorage;
    let oldPirateStorageAddress;
    let newPirateStorageAddress;
    
    // Replace with the actual address of your central authorization registry contract
    if (network.name == "amoy") {
        centralAuthorizationRegistryAddress = "0x99a764fd156083aA343e2577C348c8cF110C7141"; 
        oldPirateStorageAddress = "0x1DcF91086B9bf55A1E1002424B3F2b11d60a7B6C";
        newPirateStorageAddress = "0x3326830Da20D336c3213024e23fB422c96E2315A";   
        
    } else {
        centralAuthorizationRegistryAddress = "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";                 
        oldPirateStorageAddress = "0xC617FE2c8B4C0dF871E07b3796Fda41BD0996E7C";
        newPirateStorageAddress = "0xc1294579561e5337893F8253040156a89601b1FA";                
    }


//     Old pirate storage address: 0xa02cc67D253B22473f5c2cC5E9f5B83eCEc53f7E
// PirateStorage deployed at: 0x1be4FE43620D96fB9b23c766B9a16e1A5aFF8BA1
// StorageManagement deployed at: 0x137D2AffDf384d86cb1ab7BC45B09727c488d3F2

    const centralAuthorizationRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthorizationRegistryAddress);    

    const pirateStorageMigration = await deployAndAuthorizeContract(
        "PirateStorageMigration", 
        centralAuthorizationRegistry,        
        oldPirateStorageAddress, // old storage
        newPirateStorageAddress, // new storage   
    );

    await new Promise(resolve => setTimeout(resolve, 10000));

    
    // Auto verify contracts
    const contractsToVerify = [        
        { contract: pirateStorageMigration, args: [centralAuthorizationRegistryAddress, oldPirateStorageAddress, newPirateStorageAddress] },
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