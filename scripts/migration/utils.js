const fs = require('fs');
const path = require('path');

/**
 * Reads storage token IDs from a CSV file based on network and island address
 * @param {string} network - Network name (e.g., "amoy" or "polygon")
 * @param {string} islandAddress - Address of the island contract
 * @returns {Promise<number[]>} Array of token IDs
 */
async function readStorageTokenIds(network, islandAddress) {
    const csvPath = path.join(
        __dirname, 
        'island-ids', 
        network,
        `${islandAddress}-islandids.csv`
    );
    
    try {
        const data = fs.readFileSync(csvPath, 'utf8');
        // Split by newlines and filter out empty lines and header
        const tokenIds = data
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('TOKEN_ID')) // Skip header and empty lines
            .map(line => {
                const num = Number(line);
                return isNaN(num) ? null : num;
            })
            .filter(num => num !== null); // Filter out any NaN values
        
        console.log(`Loaded ${tokenIds.length} token IDs from CSV`);
        return tokenIds;
    } catch (error) {
        console.error(`Error reading CSV file: ${error.message}`);
        return [];
    }
}

/**
 * Reads owner addresses and their token IDs from a CSV file
 * @param {string} network - Network name (e.g., "amoy" or "polygon")
 * @param {string} collectionAddress - Address of the NFT collection
 * @returns {Promise<Map<string, number[]>>} Map of owner addresses to their token IDs
 */
async function readResourceFarmingUsers(network, collectionAddress) {
    const csvPath = path.join(
        __dirname,
        'resource-farming',
        network,
        `resource-farming-users-${collectionAddress}.csv`
    );

    try {
        const data = fs.readFileSync(csvPath, 'utf8');
        const lines = data.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('ADDRESS')); // Skip header and empty lines

        const ownerMap = new Map();
        
        for (const line of lines) {
            // First split by first comma only
            const firstCommaIndex = line.indexOf(',');
            if (firstCommaIndex === -1) continue;

            const address = line.substring(0, firstCommaIndex);
            const tokenIdsStr = line.substring(firstCommaIndex + 1);

            if (address && tokenIdsStr) {
                // Parse the token IDs string, handling the quoted format
                const tokenIds = tokenIdsStr
                    .replace(/^"|"$/g, '') // Remove surrounding quotes only
                    .split(',')
                    .map(id => Number(id.trim()))
                    .filter(id => !isNaN(id));

                ownerMap.set(address.toLowerCase(), tokenIds);
            }
        }

        console.log(`Loaded ${ownerMap.size} owners with their token IDs`);
        return ownerMap;
    } catch (error) {
        console.error(`Error reading resource farming users CSV: ${error.message}`);
        return new Map();
    }
}

module.exports = {
    readStorageTokenIds,
    readResourceFarmingUsers
};
