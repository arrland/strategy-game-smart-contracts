const { ethers } = require("hardhat");
const fs = require('fs');

async function deployAndAuthorizeContract(contractName, centralAuthorizationRegistry, ...args) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractInstance = await ContractFactory.deploy(await centralAuthorizationRegistry.getAddress(), ...args);
    const contractAddress = await contractInstance.getAddress();

    try {
        const interfaceId = await contractInstance.INTERFACE_ID(); // Correct property access
        await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
    } catch (error) {
        console.log("Contract already authorized");
    }
    await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

    return contractInstance;
}

module.exports = { deployAndAuthorizeContract };