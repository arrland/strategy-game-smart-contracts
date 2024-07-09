const fs = require('fs');
const path = require('path');

const artifactsDir = '/Users/dominik/blockchain/strategy-game-smart-contracts/artifacts/contracts';
const outputDir = path.join(__dirname, '../ABIS');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Function to recursively get all JSON files in a directory
function getAllJsonFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllJsonFiles(filePath));
        } else if (file.endsWith('.json')) {
            results.push(filePath);
        }
    });
    return results;
}

// Function to extract ABI and contractName from JSON files
function extractAbiAndContractName(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const jsonContent = JSON.parse(content);
    if (jsonContent.abi && jsonContent.contractName) {
        return {
            contractName: jsonContent.contractName,
            abi: jsonContent.abi
        };
    }
    return null;
}

// Main function to process files and save ABIs
function saveAbis() {
    const jsonFiles = getAllJsonFiles(artifactsDir);
    jsonFiles.forEach(file => {
        const abiData = extractAbiAndContractName(file);
        if (abiData) {
            const outputFilePath = path.join(outputDir, `${abiData.contractName}.json`);
            fs.writeFileSync(outputFilePath, JSON.stringify(abiData.abi, null, 2));
            console.log(`Saved ABI for ${abiData.contractName} to ${outputFilePath}`);
        }
    });
}

// Run the script
saveAbis();