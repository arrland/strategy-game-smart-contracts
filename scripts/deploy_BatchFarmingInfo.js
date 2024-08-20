const hre = require("hardhat");
const { ethers, network } = require("hardhat");

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

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying BatchFarmingInfo with the account:", deployer.address);

  // Get the ResourceFarming contract address
  // Replace this with the actual address of your deployed ResourceFarming contract
  let resourceFarmingAddress;
  if (network.name === "amoy") {
    resourceFarmingAddress = "0xFA5b69f4ee36f0a6AED92F7e4b4ff35C19642B73"; // Add your ResourceFarming contract address here
  } else {
    resourceFarmingAddress = "0x2B448C5218c3aABf8517B5B3DE54b0E817231daF"; // Add your ResourceFarming contract address here
  }

  // Deploy BatchFarmingInfo
  const BatchFarmingInfo = await ethers.getContractFactory("BatchFarmingInfo");
  const batchFarmingInfo = await BatchFarmingInfo.deploy(resourceFarmingAddress);

  const batchFarmingInfoAddress = await batchFarmingInfo.getAddress();
  await checkContractDeployed(batchFarmingInfoAddress);
  console.log("BatchFarmingInfo deployed to:", batchFarmingInfoAddress);

  // Verify the contract on Etherscan
  // Note: This step is optional and only works if you've set up Etherscan API key in your Hardhat config
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    await hre.run("verify:verify", {
      address: batchFarmingInfoAddress,
      constructorArguments: [resourceFarmingAddress],
    });
    console.log("Contract verified on Etherscan");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });