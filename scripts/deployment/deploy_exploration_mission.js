// Deployment script for exploration mission
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Exploration Mission contracts...");

  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get contract factories
  const ExplorationMissionStorage = await ethers.getContractFactory("ExplorationMissionStorage");
  const ExplorationMission = await ethers.getContractFactory("ExplorationMission");

  // Get CentralAuthorizationRegistry address
  const centralAuthRegistry = await ethers.getContract("CentralAuthorizationRegistry");
  console.log("CentralAuthorizationRegistry address:", centralAuthRegistry.address);

  // Get MissionsStorage address
  const missionsStorage = await ethers.getContract("MissionsStorage");
  console.log("MissionsStorage address:", missionsStorage.address);

  // Get MissionFactory address
  const missionFactory = await ethers.getContract("MissionFactory");
  console.log("MissionFactory address:", missionFactory.address);

  // Deploy ExplorationMissionStorage
  console.log("Deploying ExplorationMissionStorage...");
  const explorationMissionStorage = await ExplorationMissionStorage.deploy(
    centralAuthRegistry.address
  );
  await explorationMissionStorage.deployed();
  console.log("ExplorationMissionStorage deployed to:", explorationMissionStorage.address);

  // Deploy ExplorationMission
  console.log("Deploying ExplorationMission...");
  const explorationMission = await ExplorationMission.deploy(
    centralAuthRegistry.address
  );
  await explorationMission.deployed();
  console.log("ExplorationMission deployed to:", explorationMission.address);

  // Register the exploration mission type storage
  console.log("Registering specialized storage with MissionsStorage...");
  const tx1 = await missionsStorage.registerSpecializedStorage(5, explorationMissionStorage.address);
  await tx1.wait();
  console.log("ExplorationMissionStorage registered successfully");

  // Register the exploration mission with MissionFactory
  console.log("Registering with MissionFactory...");
  const tx2 = await missionFactory.registerMissionContract(5, explorationMission.address);
  await tx2.wait();
  console.log("ExplorationMission registered successfully");

  console.log("Deployment and registration completed");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 