// Script to deploy MockBuildingStorage and register it in CentralAuthorizationRegistry

const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying MockBuildingStorage and registering in CentralAuthorizationRegistry...");

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
  
  // Check if there's already a registered building storage contract
  try {
    const existingAddress = await car.getContractAddress(keccak256("BUILDING_STORAGE"));
    if (existingAddress !== ethers.ZeroAddress) {
      console.log(`There is an existing BuildingStorage registered at: ${existingAddress}`);
      console.log("Updating to use the new MockBuildingStorage instead...");
    }
  } catch (error) {
    console.log("No existing BuildingStorage found. Registering new MockBuildingStorage.");
  }
  
  // Register the MockBuildingStorage in CAR
  console.log("Registering MockBuildingStorage in CentralAuthorizationRegistry...");
  const registrationTx = await car.registerContract(
    keccak256("BUILDING_STORAGE"), 
    mockBuildingStorageAddress
  );
  await registrationTx.wait();
  console.log("MockBuildingStorage registered successfully");

  console.log("Deployment complete!");
  console.log("---------------------------------------------------");
  console.log("CentralAuthorizationRegistry:", centralAuthorizationRegistryAddress);
  console.log("MockBuildingStorage:", mockBuildingStorageAddress);
  
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