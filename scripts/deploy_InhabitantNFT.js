const { ethers } = require("hardhat");
const { checkContractDeployed } = require("./utils");
require('dotenv').config();

async function main() {
    // Get the contract factory
    const InhabitantNFT = await ethers.getContractFactory("InhabitantNFT");

    const [admin] = await ethers.getSigners();    
    const defaultAdmin = process.env.ADMIN_MULTI_SIG;
    const _minter = process.env.MINTER_ADDRESS;
    const _royaltyRecipient = process.env.MATIC_FEE_RECIPIENT;

    console.log("Deploying InhabitantNFT with the following parameters:");
    console.log("Default Admin:", defaultAdmin);
    console.log("Minter:", _minter);
    console.log("Royalty Recipient:", _royaltyRecipient);

    if (!defaultAdmin || !_minter || !_royaltyRecipient) {
        throw new Error("One or more required environment variables are not set.");
    }
    // Deploy the contract
    const inhabitantNFT = await InhabitantNFT.deploy(defaultAdmin, _minter, _royaltyRecipient);

    // Get the address of the deployed contract
    const InhabitantsAddress = await inhabitantNFT.getAddress();
    await checkContractDeployed(InhabitantsAddress);

    // Log the address of the deployed contract
    console.log("InhabitantNFT deployed to:", InhabitantsAddress);

    await run("verify:verify", {
        address: inhabitantNFT.address,
        constructorArguments: [defaultAdmin, _minter, _royaltyRecipient],
    });
    console.log(`Verified InhabitantNFT at ${inhabitantNFT.address}`);

    
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});