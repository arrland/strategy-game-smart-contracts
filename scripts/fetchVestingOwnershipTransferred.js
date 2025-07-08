// scripts/fetchVestingOwnershipTransferred.js
const { ethers } = require("hardhat");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function main() {
    const contractAddresses = [
        "0x41e543B53e3b67584beA2b990eA32344c9445B73",
        "0xE578B98EA436a905d61dD17E899B44e3b12f951B",
        "0x7452b88d1eA57D76b0C9F46695ec9d8204eE4F24",
        "0x6821a79C7654A7D85CD1aD86C6BaE9E69b1C7EcE"
    ];
    const abi = [
        {
            "anonymous": false,
            "inputs": [
                { "indexed": true, "internalType": "address", "name": "previousBeneficiary", "type": "address" },
                { "indexed": true, "internalType": "address", "name": "newBeneficiary", "type": "address" }
            ],
            "name": "VestingOwnershipTransferred",
            "type": "event"
        }
    ];

    const provider = ethers.provider;
    const allRecords = [];

    const fromBlock = 56176003;
    const toBlock = 62640282;
    const batchSize = 10000;

    for (const contractAddress of contractAddresses) {
        const contract = new ethers.Contract(contractAddress, abi, provider);
        const filter = contract.filters.VestingOwnershipTransferred();

        for (let startBlock = fromBlock; startBlock <= toBlock; startBlock += batchSize) {
            const endBlock = Math.min(startBlock + batchSize - 1, toBlock);
            const events = await contract.queryFilter(filter, startBlock, endBlock);

            const records = events.map(event => ({
                previousBeneficiary: event.args.previousBeneficiary,
                newBeneficiary: event.args.newBeneficiary,
                contractAddress: contractAddress
            }));

            allRecords.push(...records);
            console.log(`Processed blocks ${startBlock} to ${endBlock} for contract ${contractAddress}`);
        }
    }

    const csvWriter = createCsvWriter({
        path: 'vesting_ownership_transferred_events_all.csv',
        header: [
            { id: 'previousBeneficiary', title: 'Previous Beneficiary' },
            { id: 'newBeneficiary', title: 'New Beneficiary' },
            { id: 'contractAddress', title: 'Contract Address' }
        ]
    });

    await csvWriter.writeRecords(allRecords);
    console.log('CSV file written successfully with all contract data');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});