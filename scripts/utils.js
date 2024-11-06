const { ethers } = require("hardhat");
const fs = require('fs');


async function checkContractDeployed(tokenAddress) {
    let code = await ethers.provider.getCode(tokenAddress);
    
    let count = 0;
    while (code === '0x' && count < 36) {
      await new Promise(resolve => setTimeout(resolve, 12000));
      code = await ethers.provider.getCode(tokenAddress);
      count++;
    }
    if (code === '0x') {
      throw new Error("Contract deployment failed. No code at the given address after 180 seconds.");
    }
  }
  
  async function deployAndAuthorizeContract(contractName, centralAuthorizationRegistry, ...args) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractInstance = await ContractFactory.deploy(await centralAuthorizationRegistry.getAddress(), ...args);
    const contractAddress = await contractInstance.getAddress();
  
    await checkContractDeployed(contractAddress);
  
    try {
      const interfaceId = await contractInstance.INTERFACE_ID();
      await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
    } catch (error) {
      console.log(error);
    }
    await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);
  
    // Log deployed contract
    const logMessage = `${contractName} deployed at: ${contractAddress}`;
    console.log(logMessage);
    fs.appendFileSync('deployed_contracts.log', logMessage + '\n');
    // Add deployed contract addresses to .env file
    const envVariables = `\n${contractName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}=${contractAddress}`;
  
    fs.appendFileSync('.env', envVariables);
  
    return contractInstance;
  }
  
  async function verifyContract(address, contractName, constructorArguments) {
    console.log(`Verifying ${contractName} at ${address}...`);
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: constructorArguments,
      });
      console.log(`${contractName} verified successfully.`);
    } catch (error) {
      console.error(`Failed to verify ${contractName}:`, error);
    }
  }

  module.exports = { checkContractDeployed, deployAndAuthorizeContract, verifyContract };