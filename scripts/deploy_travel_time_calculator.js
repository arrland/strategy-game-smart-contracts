const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying TravelTimeCalculator...");

  // Get the Central Authorization Registry address
  // Replace with your actual registry address if needed
  const registryAddress = process.env.REGISTRY_ADDRESS;
  if (!registryAddress) {
    throw new Error("Registry address not found in environment variables");
  }

  // Deploy TravelTimeCalculator
  const TravelTimeCalculator = await ethers.getContractFactory("TravelTimeCalculator");
  const calculator = await TravelTimeCalculator.deploy(registryAddress);
  await calculator.deployed();

  console.log("TravelTimeCalculator deployed to:", calculator.address);

  // Get the CAR contract
  const centralAuthorizationRegistry = await ethers.getContractAt(
    "CentralAuthorizationRegistry",
    registryAddress
  );

  // Register the contract in the CAR
  console.log("Registering in Central Authorization Registry...");
  const tx = await centralAuthorizationRegistry.registerAddress(
    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TRAVEL_TIME_CALCULATOR")),
    calculator.address
  );
  await tx.wait();

  console.log("TravelTimeCalculator registered in CAR successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 