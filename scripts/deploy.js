const { ethers, network } = require("hardhat");
const fs = require('fs');


async function checkContractDeployed(tokenAddress) {
  let code = await ethers.provider.getCode(tokenAddress);
  
  let count = 0;
  while (code === '0x' && count < 36) {
    await new Promise(resolve => setTimeout(resolve, 6000));
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
    console.log("");
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

async function main() {
  const [admin] = await ethers.getSigners();

  let admin_multi_sig, maticFeeRecipient, genesisPiratesAddress, genesisIslandsAddress, rumTokenAddress;

  let centralAuthorizationRegistry, lastRewardMintBlock, _blocks28Days;

  if (network.name === "amoy") {
    maticFeeRecipient = "0x62D14D7aDFE5Fbb771490a94B3aC64E7dba4bD2B";
    genesisPiratesAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942";
    genesisIslandsAddress = "0xbD90d1984BAbE50Cb1d9D75EB1eD08688d3Dea59";
    rumTokenAddress = "0x17fF13862c5665dE5676cab1db0927B4C97eebc1";
    admin_multi_sig = "0x136be3a1671f19f764a3c7bd0454dd83fd643e71";
    lastRewardMintBlock = 0;
    _blocks28Days = 100;
  } else {
    maticFeeRecipient = "";
    genesisPiratesAddress = "";
    genesisIslandsAddress = "";
    rumTokenAddress = "";
    admin_multi_sig = "";
    lastRewardMintBlock = 60862541;
    _blocks28Days = 41890 * 28;
  }

  let centralAuthorizationRegistryAddress = "";

  if (centralAuthorizationRegistryAddress == "") {
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
    await centralAuthorizationRegistry.initialize(admin_multi_sig);
    centralAuthorizationRegistryAddress = await centralAuthorizationRegistry.getAddress();
    await checkContractDeployed(centralAuthorizationRegistryAddress);
    const envVariables = `CENTRAL_AUTHORIZATION_REGISTRY=${centralAuthorizationRegistryAddress}`;
    fs.appendFileSync('.env', envVariables);

    console.log("CentralAuthorizationRegistry deployed at:", centralAuthorizationRegistryAddress);
    fs.appendFileSync('deployed_contracts.log', `CentralAuthorizationRegistry deployed at: ${centralAuthorizationRegistryAddress}` + '\n');
  } else {
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    centralAuthorizationRegistry = await CentralAuthorizationRegistry.attach(centralAuthorizationRegistryAddress);    
  }
  
  const resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthorizationRegistry);
  const resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthorizationRegistry);

  const feeManagement = await deployAndAuthorizeContract("FeeManagement", centralAuthorizationRegistry, rumTokenAddress, maticFeeRecipient);
  const pirateManagement = await deployAndAuthorizeContract("PirateManagement", centralAuthorizationRegistry);

  const pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false);
  const islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);

  const pirateStorageAddress = await pirateStorage.getAddress();
  const islandStorageAddress = await islandStorage.getAddress();

  await islandStorage.initializeIslands(1);
  await islandStorage.initializeIslands(2);
  await islandStorage.initializeIslands(3);
  await islandStorage.initializeIslands(4);
  await islandStorage.initializeIslands(5);
  await islandStorage.initializeIslands(6);
  await islandStorage.initializeIslands(7);
  await islandStorage.initializeIslands(8);
  await islandStorage.initializeIslands(9);
  await islandStorage.initializeIslands(10);
  await islandStorage.initializeIslands(11);
  await islandStorage.initializeIslands(12);
  await islandStorage.initializeIslands(13);
  await islandStorage.initializeIslands(14);
  await islandStorage.initializeIslands(15);
  await islandStorage.initializeIslands(16);
  
  
  const islandManagement = await deployAndAuthorizeContract("IslandManagement", centralAuthorizationRegistry, genesisIslandsAddress);

  const storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, pirateStorageAddress, islandStorageAddress);
  const resourceSpendManagement = await deployAndAuthorizeContract("ResourceSpendManagement", centralAuthorizationRegistry);
  const resourceFarmingRules = await deployAndAuthorizeContract("ResourceFarmingRules", centralAuthorizationRegistry);
  const resourceFarming = await deployAndAuthorizeContract("ResourceFarming", centralAuthorizationRegistry);
  const activityStats = await deployAndAuthorizeContract("ActivityStats", centralAuthorizationRegistry, 1, lastRewardMintBlock, _blocks28Days);
  await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });