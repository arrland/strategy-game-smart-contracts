// Script to deploy MockBuildingStorage and MissionRequirements together

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying MockBuildingStorage and MissionRequirements...");

  // First, get the CentralAuthorizationRegistry address
  // Replace this with your actual CAR address
  const centralAuthorizationRegistryAddress = "YOUR_CENTRAL_AUTH_REGISTRY_ADDRESS";
  console.log(`Using CentralAuthorizationRegistry at: ${centralAuthorizationRegistryAddress}`);

  // Deploy MockBuildingStorage with CAR address
  const MockBuildingStorage = await ethers.getContractFactory("MockBuildingStorage");
  const mockBuildingStorage = await MockBuildingStorage.deploy(centralAuthorizationRegistryAddress);
  await mockBuildingStorage.waitForDeployment();
  const mockBuildingStorageAddress = await mockBuildingStorage.getAddress();
  console.log(`MockBuildingStorage deployed to: ${mockBuildingStorageAddress}`);

  // Get the CentralAuthorizationRegistry contract
  const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
  const car = CentralAuthorizationRegistry.attach(centralAuthorizationRegistryAddress);
  
  // Register the MockBuildingStorage in CAR
  console.log("Registering MockBuildingStorage in CentralAuthorizationRegistry...");
  const registrationTx = await car.registerContract(
    keccak256("BUILDING_STORAGE"), 
    mockBuildingStorageAddress
  );
  await registrationTx.wait();
  console.log("MockBuildingStorage registered successfully");

  // Deploy MissionRequirements with the CAR address
  const MissionRequirements = await ethers.getContractFactory("MissionRequirements");
  const missionRequirements = await MissionRequirements.deploy(centralAuthorizationRegistryAddress);
  await missionRequirements.waitForDeployment();
  const missionRequirementsAddress = await missionRequirements.getAddress();
  console.log(`MissionRequirements deployed to: ${missionRequirementsAddress}`);

  // Register MissionRequirements in CAR
  console.log("Registering MissionRequirements in CentralAuthorizationRegistry...");
  const mrRegistrationTx = await car.registerContract(
    InterfaceIdentifiers.MISSION_REQUIREMENTS_KEY, 
    missionRequirementsAddress
  );
  await mrRegistrationTx.wait();
  console.log("MissionRequirements registered successfully");

  console.log("Deployment complete!");
  console.log("---------------------------------------------------");
  console.log("CentralAuthorizationRegistry:", centralAuthorizationRegistryAddress);
  console.log("MockBuildingStorage:", mockBuildingStorageAddress);
  console.log("MissionRequirements:", missionRequirementsAddress);
  
  // Helper function for keccak256 string hashing
  function keccak256(str) {
    return ethers.keccak256(ethers.toUtf8Bytes(str));
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 