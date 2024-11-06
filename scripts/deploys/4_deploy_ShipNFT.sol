const { ethers } = require("hardhat");
const { checkContractDeployed } = require("../utils");
require('dotenv').config();

async function main() {
    // Get the contract factory
    const ShipNFT = await ethers.getContractFactory("ShipNFT");

    const [admin] = await ethers.getSigners();    
    let defaultAdmin;
    let _minter;
    let _royaltyRecipient;
    if (network.name == "polygon") {
        defaultAdmin = process.env.ADMIN_MULTI_SIG;
        _minter = process.env.MINTER_ADDRESS;
        _royaltyRecipient = process.env.MATIC_FEE_RECIPIENT;
    } else {
        defaultAdmin = process.env.ADMIN_MULTI_SIG_TESTNET;
        _minter = process.env.MINTER_ADDRESS_TESTNET;
        _royaltyRecipient = process.env.MATIC_FEE_RECIPIENT_TESTNET;
    }
    
    

    console.log("Deploying ShipNFT with the following parameters:");
    console.log("Default Admin:", defaultAdmin);
    console.log("Minter:", _minter);
    console.log("Royalty Recipient:", _royaltyRecipient);

    if (!defaultAdmin || !_minter || !_royaltyRecipient) {
        throw new Error("One or more required environment variables are not set.");
    }
    // Deploy the contract
    const shipNFT = await ShipNFT.deploy(defaultAdmin, _minter, _royaltyRecipient);

    // Get the address of the deployed contract
    const ShipAddress = await shipNFT.getAddress();
    await checkContractDeployed(ShipAddress);

    // Log the address of the deployed contract
    console.log("ShipNFT deployed to:", ShipAddress);

    await run("verify:verify", {
        address: ShipAddress,
        constructorArguments: [defaultAdmin, _minter, _royaltyRecipient],
        contract: "contracts/ShipNFT.sol:ShipNFT"
    });
    console.log(`Verified ShipNFT at ${shipNFT.address}`);

    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});