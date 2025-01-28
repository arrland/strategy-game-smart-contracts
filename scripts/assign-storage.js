const fs = require('fs');
const { ethers } = require('hardhat');
const chalk = require('chalk');

// Add logging utilities
const log = {
    info: (msg) => console.log(chalk.blue('ℹ️ ') + msg),
    success: (msg) => console.log(chalk.green('✅ ') + msg),
    warning: (msg) => console.log(chalk.yellow('⚠️ ') + msg),
    error: (msg) => console.log(chalk.red('❌ ') + msg),
    progress: (msg) => console.log(chalk.cyan('🔄 ') + msg),
    pirate: (msg) => console.log(chalk.magenta('🏴‍☠️ ') + msg),
    island: (msg) => console.log(chalk.yellow('🏝️ ') + msg)
};

async function main() {
    // Configuration
    const BATCH_SIZE = 20; // Number of assignments per transaction
    const DELAY_MS = 2000; // Delay between batches in milliseconds
    
    // Get contract addresses based on network
    const centralAuthRegistryAddress = network.name === "amoy" 
        ? "0x99a764fd156083aA343e2577C348c8cF110C7141" // Amoy address
        : "0xdAf8728C9eD7CBCCf8E24226B0794943E394f778"; // Mainnet address

    const piratesCollectionAddress = network.name === "amoy"
        ? "0xbCab2d7264B555227e3B6C1eF686C5FCA3863942"
        : "0x5e0a64e69ee74fbaed5e4ec4e4e40cb4a45e3b6c";
    

    // Script parameters (replace with your values)
    const islandId = "2"; // The island to assign pirates to
    const pirateTokenIds = [
        363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419, 420
    ];

    log.info(`Initializing script on ${network.name}...`);


    // Get contract instances
    const centralAuthRegistry = await ethers.getContractAt("CentralAuthorizationRegistry", centralAuthRegistryAddress);
    
    const storageManagementAddress = await centralAuthRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IStorageManagement"))
    );
    
    const storageManagement = await ethers.getContractAt("StorageManagement", storageManagementAddress);

    log.info(`StorageManagement contract: ${storageManagementAddress}`);
    log.island(`Target Island ID: ${islandId}`);
    log.info(`Total pirates to assign: ${pirateTokenIds.length}`);

    // Process in batches
    for (let i = 0; i < pirateTokenIds.length; i += BATCH_SIZE) {
        const batch = pirateTokenIds.slice(i, i + BATCH_SIZE);
        log.progress(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(pirateTokenIds.length/BATCH_SIZE)}`);

        try {
            // Assign storage for each pirate in the batch
            for (const pirateId of batch) {
                try {
                    const tx = await storageManagement.assignStorageToPrimary(
                        piratesCollectionAddress,
                        pirateId,
                        islandId
                    );
                    await tx.wait();
                    log.success(`Assigned Pirate #${pirateId} to Island #${islandId}`);
                } catch (error) {
                    log.error(`Failed to assign Pirate #${pirateId}: ${error.message}`);
                }
            }

            // Add delay between batches
            if (i + BATCH_SIZE < pirateTokenIds.length) {
                log.info(`Waiting ${DELAY_MS/1000} seconds before next batch...`);
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        } catch (error) {
            log.error(`Batch processing error: ${error.message}`);
        }
    }

    log.success('Assignment process completed! 🎉');
}
// To run on Polygon mainnet:
// npx hardhat run scripts/assign-storage.js --network polygon

// To run on Amoy testnet:
// npx hardhat run scripts/assign-storage.js --network amoy

main()
    .then(() => process.exit(0))
    .catch((error) => {
        log.error(error);
        process.exit(1);
    });