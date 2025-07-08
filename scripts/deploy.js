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

  console.log("Deploying to network:", network.name);
  console.log("Deployer address:", admin.address);

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  await sleep(5000);

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
    maticFeeRecipient = "0x0cEc288905316197bA3BBf2F19D94286d684fe43";
    genesisPiratesAddress = "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c";
    genesisIslandsAddress = "0xd861ae58f9f098ed0d6fe6347288ff26bda6aad1";
    rumTokenAddress = "0x14e5386f47466a463f85d151653e1736c0c50fc3";
    admin_multi_sig = "0x0cEc288905316197bA3BBf2F19D94286d684fe43";
    lastRewardMintBlock = 60862541;
    _blocks28Days = 41890 * 28;

    // Add to .env file
//     const envVariables = `
// MATIC_FEE_RECIPIENT=${maticFeeRecipient}
// GENESIS_PIRATES_ADDRESS=${genesisPiratesAddress}
// GENESIS_ISLANDS_ADDRESS=${genesisIslandsAddress}
// RUM_TOKEN_ADDRESS=${rumTokenAddress}
// ADMIN_MULTI_SIG=${admin_multi_sig}
// LAST_REWARD_MINT_BLOCK=${lastRewardMintBlock}
// BLOCKS_28_DAYS=${_blocks28Days}`;

//     fs.appendFileSync('.env', envVariables);
}

// CENTRAL_AUTHORIZATION_REGISTRY=0xdAf8728C9eD7CBCCf8E24226B0794943E394f778
// RESOURCE_TYPE_MANAGER=0x0234DDf078c9D3BF23e4Ca30E13FA73ec4acf255
// RESOURCE_MANAGEMENT=0x526edD73D8f331f7469b36E8485FcE643b09bACB
// FEE_MANAGEMENT=0xA4C960945F5fa18409D3e52692e10AE408d4AaC2
// PIRATE_MANAGEMENT=0x5AD5fDda0Eb4Cc6847286490467cdf31aDd4d6F5
// PIRATE_STORAGE=0xC617FE2c8B4C0dF871E07b3796Fda41BD0996E7C
// ISLAND_STORAGE=0x784aa2dA52F97aaBDD3B6d702F566dfaa1c5124A
// ISLAND_MANAGEMENT=0xf9F7cc10c3C8770243C6599f9455E3F341eC8E30
// STORAGE_MANAGEMENT=0xb6C641F0C124947A1aaA0A5426660ABE88600Cc7
// RESOURCE_SPEND_MANAGEMENT=0xd64468E3eeFb2719260808969dD502fc5fd65457
// RESOURCE_FARMING_RULES=0x3f91573fe369DAD2F40cBCF9f0D44c3d59Dcf233
// RESOURCE_FARMING=0x2B448C5218c3aABf8517B5B3DE54b0E817231daF
// ACTIVITY_STATS=0x047A28670A824307bE2bFFE072246645dEFD5486

  let centralAuthorizationRegistryAddress = "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778";

  if (centralAuthorizationRegistryAddress == "") {
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
    await centralAuthorizationRegistry.initialize(admin_multi_sig);
    centralAuthorizationRegistryAddress = await centralAuthorizationRegistry.getAddress();
    await checkContractDeployed(centralAuthorizationRegistryAddress);
    const envVariables = `\nCENTRAL_AUTHORIZATION_REGISTRY=${centralAuthorizationRegistryAddress}`;
    fs.appendFileSync('.env', envVariables);

    console.log("CentralAuthorizationRegistry deployed at:", centralAuthorizationRegistryAddress);
    fs.appendFileSync('deployed_contracts.log', `CentralAuthorizationRegistry deployed at: ${centralAuthorizationRegistryAddress}` + '\n');
  } else {
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    centralAuthorizationRegistry = await CentralAuthorizationRegistry.attach(centralAuthorizationRegistryAddress);    
  }
  
  // const resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthorizationRegistry);
  // const resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthorizationRegistry);

  // const feeManagement = await deployAndAuthorizeContract("FeeManagement", centralAuthorizationRegistry, rumTokenAddress, maticFeeRecipient);
  // const pirateManagement = await deployAndAuthorizeContract("PirateManagement", centralAuthorizationRegistry);

  // const pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false);
  // const islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);
  const pirateStorageAddress = "0xC617FE2c8B4C0dF871E07b3796Fda41BD0996E7C";
  const islandStorageAddress = "0x784aa2dA52F97aaBDD3B6d702F566dfaa1c5124A";
  //const pirateStorageAddress = await pirateStorage.getAddress();
  //const islandStorageAddress = await islandStorage.getAddress();

  // await islandStorage.initializeIslands(1);
  // await islandStorage.initializeIslands(2);
  // await islandStorage.initializeIslands(3);
  // await islandStorage.initializeIslands(4);
  // await islandStorage.initializeIslands(5);
  // await islandStorage.initializeIslands(6);
  // await islandStorage.initializeIslands(7);
  // await islandStorage.initializeIslands(8);
  // await islandStorage.initializeIslands(9);
  // await islandStorage.initializeIslands(10);
  // await islandStorage.initializeIslands(11);
  // await islandStorage.initializeIslands(12);
  // await islandStorage.initializeIslands(13);
  // await islandStorage.initializeIslands(14);
  // await islandStorage.initializeIslands(15);
  // await islandStorage.initializeIslands(16);
  
  
  // const islandManagement = await deployAndAuthorizeContract("IslandManagement", centralAuthorizationRegistry, genesisIslandsAddress);

  const storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, pirateStorageAddress, islandStorageAddress);
//   const resourceSpendManagement = await deployAndAuthorizeContract("ResourceSpendManagement", centralAuthorizationRegistry);
//   const resourceFarmingRules = await deployAndAuthorizeContract("ResourceFarmingRules", centralAuthorizationRegistry);
//   const resourceFarming = await deployAndAuthorizeContract("ResourceFarming", centralAuthorizationRegistry);
//   const activityStats = await deployAndAuthorizeContract("ActivityStats", centralAuthorizationRegistry, 1, lastRewardMintBlock, _blocks28Days);
//   await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);
  }

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });