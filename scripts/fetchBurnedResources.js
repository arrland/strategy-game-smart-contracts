const { ethers } = require("hardhat");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function main() {
    //const contractAddress = "0xcb38d3AcC98a4B60dA5a51ab80A9ecF1d150ae09";
    const fromBlock = 59559641;
    const toBlock = 62544715;
    const provider = ethers.provider; // Use the current network provider
    let abi;
    let filter;
    let contract;
    const contractAddress = "0x526edD73D8f331f7469b36E8485FcE643b09bACB";
    //const contractAddress = "0xcb38d3AcC98a4B60dA5a51ab80A9ecF1d150ae09";
    if (contractAddress == "0xcb38d3AcC98a4B60dA5a51ab80A9ecF1d150ae09") {
        abi = [
            "event ResourceDumped(address indexed collectionAddress, uint256 indexed tokenId, address indexed owner, string resource, uint256 amount)"
        ];
        contract = new ethers.Contract(contractAddress, abi, provider);
        filter = contract.filters.ResourceDumped();
    } else {
        abi = [
            "event ResourceBurned(address indexed contractAddress, uint256 indexed tokenId, address indexed owner, string resource, uint256 amount)"
        ];
        contract = new ethers.Contract(contractAddress, abi, provider);
        filter = contract.filters.ResourceBurned();
    }
    
    const events = await contract.queryFilter(filter, fromBlock, toBlock);

    let csvWriter;
    let exclude = [];
    if (contractAddress == "0xcb38d3AcC98a4B60dA5a51ab80A9ecF1d150ae09"){
        csvWriter = createCsvWriter({
            path: 'resource_burned_events2.csv',
            header: [
                {id: 'id', title: 'id'},
                {id: 'txid', title: 'txid'},
                {id: 'timestamp', title: 'timestamp'},
                {id: 'collectionAddress', title: 'collectionAddress'},
                {id: 'tokenId', title: 'tokenId'},
                {id: 'owner', title: 'owner'},
                {id: 'resource', title: 'resource'},
                {id: 'amount', title: 'amount'},
                {id: 'blockNumber', title: 'blockNumber'}
            ]
        });
    } else {
        csvWriter = createCsvWriter({
            path: 'resource_burned_events.csv',
            header: [
                {id: 'id', title: 'id'},
                {id: 'txid', title: 'txid'},
                {id: 'timestamp', title: 'timestamp'},
                {id: 'contractAddress', title: 'contractAddress'},
                {id: 'tokenId', title: 'tokenId'},
                {id: 'owner', title: 'owner'},
                {id: 'resource', title: 'resource'},
                {id: 'amount', title: 'amount'},
                {id: 'blockNumber', title: 'blockNumber'}
            ]
        });
        exclude = ["0x22536b28894e70344be74207cda36e670042fbef".toLowerCase(), "0x159ee3453fc6e21833cd130be063354f5d5405a0".toLowerCase(), "0x5F55943c56c73DE8e292b6491a8f3B7A54a5aE20".toLowerCase()];
    }


    

    const records = await Promise.all(events.filter(event => !exclude.includes(event.args.owner.toLowerCase())).map(async event => {
        const block = await provider.getBlock(event.blockNumber);
        
        let code = await ethers.provider.getCode(event.args.owner);
        if (code != "0x") {
            console.log(`Owner address is a contract: ${event.args.owner}`);
        }
        //console.log(JSON.stringify(event));
        return {
            id: event.id,
            txid: event.transactionHash,
            timestamp: new Date(block.timestamp * 1000).toISOString(),
            contractAddress: event.args.contractAddress,
            tokenId: event.args.tokenId.toString(),
            owner: event.args.owner,
            resource: event.args.resource,
            amount: event.args.amount.toString(),
            blockNumber: event.blockNumber
        };
    }));

    await csvWriter.writeRecords(records);
    console.log('CSV file written successfully');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});