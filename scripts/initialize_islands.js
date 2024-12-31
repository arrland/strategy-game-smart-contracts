const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Initializing islands with account:", deployer.address);

    // Get network-specific IslandStorage address
    let islandStorageAddress;
    if (network.name === "amoy") {
        islandStorageAddress = ''; // Add Amoy address
    } else if (network.name === "polygon") {
        islandStorageAddress = '0xbeB04A176c8a5EC72C79c2E53C884Cf8722dF9B3'; // Add Polygon address
    } else {
        throw new Error('Network must be either "polygon" or "amoy"');
    }

    const islandStorage = await ethers.getContractAt("IslandStorage", islandStorageAddress);

    console.log("Initializing islands in batches...");
    
    const batches = [
        { part: 1, desc: "Small islands 337-600" },
        { part: 2, desc: "Small islands 1423-1723" },
        { part: 3, desc: "Small islands 2809-3258" },
        { part: 4, desc: "Small islands 3595-3895" },
        { part: 5, desc: "Medium islands 81-336" },
        { part: 6, desc: "Medium islands 1167-1422" },
        { part: 7, desc: "Medium islands 2253-2508" },
        { part: 8, desc: "Medium islands 3339-3594" },
        { part: 9, desc: "Large islands 17-80" },
        { part: 10, desc: "Large islands 1103-1166" },
        { part: 11, desc: "Large islands 2189-2252" },
        { part: 12, desc: "Large islands 3275-3338" },
        { part: 13, desc: "Huge islands 1-16" },
        { part: 14, desc: "Huge islands 1087-1102" },
        { part: 15, desc: "Huge islands 2173-2188" },
        { part: 16, desc: "Huge islands 3259-3274" },
        { part: 17, desc: "Small islands 600-1086" },
        { part: 18, desc: "Small islands 1723-2172" },
        { part: 19, desc: "Small islands 2509-2809" },
        { part: 20, desc: "Small islands 3895-4344" }
    ];

    for (const batch of batches) {
        try {
            console.log(`\nInitializing part ${batch.part} (${batch.desc})...`);
            const tx = await islandStorage.initializeIslands(batch.part);
            await tx.wait();
            console.log(`✅ Part ${batch.part} initialized successfully`);
        } catch (error) {
            console.error(`❌ Error initializing part ${batch.part}:`, error.message);
        }

        // Wait between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("\nIsland initialization complete!");
}

// npx hardhat run scripts/initialize_islands.js --network polygon
// # or
// npx hardhat run scripts/initialize_islands.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 