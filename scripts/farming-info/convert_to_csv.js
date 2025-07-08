const fs = require('fs');
const path = require('path');

// Input and output paths
const INPUT_FILE = path.join(__dirname, 'output/pirates_farming_info.json');
const OUTPUT_FILE = path.join(__dirname, 'output/pirates_farming_info_wide.csv');

// Read JSON file
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// Extract all unique resources
const allResources = new Set();
for (const info of Object.values(data)) {
    Object.keys(info.farmableResources).forEach(resource => allResources.add(resource));
    Object.keys(info.unfarmableResources).forEach(resource => allResources.add(resource));
}

// Function to limit numbers to 4 decimal places
const formatNumber = (num) => {
    if (typeof num === 'number') {
        return parseFloat(num.toFixed(4));
    }
    return num;
};

// Create CSV header
const header = ['TokenID', ...Array.from(allResources)].join(',');
let csvContent = header + '\n';

// Process each token
for (const [tokenId, info] of Object.entries(data)) {
    const row = [tokenId];
    for (const resource of allResources) {
        if (info.farmableResources[resource]) {
            row.push(formatNumber(info.farmableResources[resource].dailyOutput));
        } else if (info.unfarmableResources[resource]) {
            row.push(0); // Unfarmable resources have 0 daily output
        } else {
            row.push(''); // Resource not available for this token
        }
    }
    csvContent += row.join(',') + '\n';
}

// Write CSV file
fs.writeFileSync(OUTPUT_FILE, csvContent);
console.log(`Wide CSV file created at ${OUTPUT_FILE}`);

// node scripts/farming-info/convert_to_csv.js