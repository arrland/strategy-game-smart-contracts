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
    console.log(`Contract ${contractName} deployed at: ${contractAddress}`);
    console.log(`Checking contract deployment...`);
    await checkContractDeployed(contractAddress);
  
    try {
      const interfaceId = await contractInstance.INTERFACE_ID();
      await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
    } catch (error) {
      console.log(error);
    }
    console.log(`Adding contract to authorized contracts...`);
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

  async function authorizeDeployedContract(contractName, contractAddress, centralAuthorizationRegistry) {
    // Get contract instance at deployed address
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractInstance = ContractFactory.attach(contractAddress);

    console.log(`Authorizing deployed contract ${contractName} at ${contractAddress}...`);

    try {
      // Get interface ID and set contract address in registry
      const interfaceId = await contractInstance.INTERFACE_ID();
      await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
    } catch (error) {
      console.log(error);
    }

    // Add to authorized contracts
    console.log(`Adding contract to authorized contracts...`);
    await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

    // Log the authorized contract
    const logMessage = `${contractName} authorized at: ${contractAddress}`;
    console.log(logMessage);
    fs.appendFileSync('deployed_contracts.log', logMessage + '\n');
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

  module.exports = { checkContractDeployed, deployAndAuthorizeContract, verifyContract, authorizeDeployedContract };