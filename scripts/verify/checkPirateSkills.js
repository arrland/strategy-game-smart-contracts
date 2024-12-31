const { ethers } = require("hardhat");

async function main() {
    // Connect to the network
    const [deployer] = await ethers.getSigners();
    console.log("Checking with account:", deployer.address);

    // Addresses for Amoy testnet
    const centralAuthRegistryAddress = '0x99a764fd156083aA343e2577C348c8cF110C7141';
    const genesisPiratesAddress = '0xbCab2d7264B555227e3B6C1eF686C5FCA3863942';

    try {
        // Get CentralAuthRegistry contract
        const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);
        
        // Get PirateManagement address
        const pirateManagementInterface = ethers.keccak256(ethers.toUtf8Bytes("IPirateManagement"));
        const pirateManagementAddress = await centralAuthRegistry.getContractAddress(pirateManagementInterface);
        console.log("\nPirateManagement address:", pirateManagementAddress);

        // Verify PirateManagement contract exists
        if (pirateManagementAddress === ethers.ZeroAddress) {
            throw new Error("PirateManagement contract not registered in CentralAuthRegistry");
        }

        // Get PirateManagement contract
        const pirateManagement = await ethers.getContractAt("PirateManagement", pirateManagementAddress);

        // First verify the contract interface
        console.log("\nVerifying contract interface...");
        const code = await ethers.provider.getCode(pirateManagementAddress);
        if (code === '0x') {
            throw new Error("No contract code at PirateManagement address");
        }

        // Test with a few pirate IDs
        const pirateIds = [2471]; // Add more IDs if needed

        for (const pirateId of pirateIds) {
            console.log(`\nChecking Pirate #${pirateId}:`);
            
            // First check if the pirate exists
            try {
                const nftContract = await ethers.getContractAt("IERC721", genesisPiratesAddress);
                try {
                    const owner = await nftContract.ownerOf(pirateId);
                    console.log(`Pirate #${pirateId} owner:`, owner);
                } catch (error) {
                    console.log(`Pirate #${pirateId} does not exist or is not owned`);
                    continue;
                }
            } catch (error) {
                console.error("Error checking pirate ownership:", error.message);
                continue;
            }

            // Then try to get skills
            try {
                console.log("Attempting to get skills...");
                console.log("Collection:", genesisPiratesAddress);
                console.log("Token ID:", pirateId);
                
                const skills = await pirateManagement.getPirateSkills(genesisPiratesAddress, pirateId);
                
                if (!skills) {
                    console.log(`No skills found for Pirate #${pirateId}`);
                    continue;
                }

                // Convert BigInt values to regular numbers and divide by 1e18 for readable format
                const formattedSkills = {
                    characterSkills: {
                        strength: Number(skills.characterSkills.strength) / 1e18,
                        agility: Number(skills.characterSkills.agility) / 1e18,
                        wisdom: Number(skills.characterSkills.wisdom) / 1e18
                    },
                    specialSkills: {
                        building: Number(skills.specialSkills.building) / 1e18
                    }
                };

                console.log("\nSkills found:");
                console.log("Character Skills:");
                console.log("- Strength:", formattedSkills.characterSkills.strength);
                console.log("- Agility:", formattedSkills.characterSkills.agility);
                console.log("- Wisdom:", formattedSkills.characterSkills.wisdom);
                console.log("Special Skills:");
                console.log("- Building:", formattedSkills.specialSkills.building);

            } catch (error) {
                console.error("Error getting skills:", error);
                console.error("Error details:", {
                    message: error.message,
                    code: error.code,
                    data: error.data
                });
            }
        }
    } catch (error) {
        console.error("Top level error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 