// Deployment script for trade mission
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Trade Mission contracts...");

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get contract factories
  const TradeMissionStorage = await ethers.getContractFactory("TradeMissionStorage");
  const TradeMission = await ethers.getContractFactory("TradeMission");

  // Get CentralAuthorizationRegistry address
  const centralAuthRegistry = await ethers.getContract("CentralAuthorizationRegistry");
  console.log("CentralAuthorizationRegistry address:", centralAuthRegistry.address);

  // Get MissionsStorage address
  const missionsStorage = await ethers.getContract("MissionsStorage");
  console.log("MissionsStorage address:", missionsStorage.address);

  // Get MissionFactory address
  const missionFactory = await ethers.getContract("MissionFactory");
  console.log("MissionFactory address:", missionFactory.address);

  // Deploy TradeMissionStorage
  console.log("Deploying TradeMissionStorage...");
  const tradeMissionStorage = await TradeMissionStorage.deploy(
    centralAuthRegistry.address
  );
  await tradeMissionStorage.deployed();
  console.log("TradeMissionStorage deployed to:", tradeMissionStorage.address);

  // Deploy TradeMission
  console.log("Deploying TradeMission...");
  const tradeMission = await TradeMission.deploy(
    centralAuthRegistry.address
  );
  await tradeMission.deployed();
  console.log("TradeMission deployed to:", tradeMission.address);

  // Register the trade mission type storage
  console.log("Registering specialized storage with MissionsStorage...");
  const MISSION_TYPE_TRADE = 1; // Trade mission type
  const tx1 = await missionsStorage.registerSpecializedStorage(MISSION_TYPE_TRADE, tradeMissionStorage.address);
  await tx1.wait();
  console.log("TradeMissionStorage registered with MissionsStorage");
  
  // Register trade mission in the factory
  console.log("Registering TradeMission with MissionFactory...");
  const tx2 = await missionFactory.registerMission(MISSION_TYPE_TRADE, tradeMission.address);
  await tx2.wait();
  console.log("TradeMission registered with MissionFactory");
  
  // Set the storage address in the TradeMission contract
  console.log("Setting TradeMissionStorage in TradeMission contract...");
  const tx3 = await tradeMission.setTradeMissionStorage(tradeMissionStorage.address);
  await tx3.wait();
  console.log("TradeMissionStorage set in TradeMission contract");

  console.log("Trade Mission deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 