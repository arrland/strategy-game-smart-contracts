const { ethers } = require("hardhat");

async function main() {
  // Contract address on Amoy testnet
  const resourceAdditionAddress = "0xC011A3cE1E4aacC1d173738962700556edd170cd";
  
  // Connect to the contract
  const ResourceAddition = await ethers.getContractFactory("ResourceAdditionTest");
  const resourceAddition = ResourceAddition.attach(resourceAdditionAddress);

  // Parameters for addResource
  const collectionAddress = "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942"; // Replace with your NFT collection address
  const tokenId = 373; // Replace with your token ID
  // List of resources to add
  const resources = [    
    { name: "fish", amount: "7" },
    { name: "wood", amount: "5" },
    { name: "cotton", amount: "25" }

  ];

  console.log("Adding resources...");
  try {
    for (const resource of resources) {
      const tx = await resourceAddition.addResource(
        collectionAddress,
        tokenId,
        resource.name,
        ethers.parseEther(resource.amount)
      );
      
      console.log(`Transaction sent for ${resource.name}:`, tx.hash);
      await tx.wait();
      console.log(`${resource.name} added successfully!`);
    }
    console.log("All resources added successfully!");
  } catch (error) {
    console.error("Error adding resources:", error.message);
  }
}
//npx hardhat run scripts/addResource.js --network amoy
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 