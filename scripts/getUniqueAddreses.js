const { ethers, network } = require("hardhat");

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllTransactionsForContract(contractAddress, startBlock, endBlock, rpcUrl) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  let uniqueAddresses = new Set();

  for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
    let success = false;
    let retryCount = 0;
    const maxRetries = 5;
    console.log(`Fetching block ${blockNumber}...`);

    while (!success && retryCount < maxRetries) {
      try {
        const block = await provider.getBlock(blockNumber);
        //await delay();
        const transactions = await Promise.all(block.transactions.map(txHash => provider.getTransaction(txHash)));
        transactions.forEach(tx => {
          if (tx.to === contractAddress || tx.from === contractAddress) {
            uniqueAddresses.add(tx.from); // Add the address to the set
            uniqueAddresses.add(tx.to); // Add the contract address itself if not already added
          }
        });
        success = true;
      } catch (error) {
        console.error(`Error fetching block ${blockNumber}:`, error);
        retryCount++;
        const delayTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
        await delay(delayTime);
      }
    }

    if (!success) {
      console.error(`Failed to fetch block ${blockNumber} after ${maxRetries} retries.`);
      break;
    }

    await delay(200); // Delay between block requests to avoid rate limiting
  }

  console.log(`Unique addresses interacting with ${contractAddress}: ${uniqueAddresses.size}`);
  return uniqueAddresses;
}

// Replace 'your_rpc_url_here' with your actual RPC URL


async function main() {
  const uniqueAddresses1 = await getAllTransactionsForContract('0x2B448C5218c3aABf8517B5B3DE54b0E817231daF', 59559641, 60675907, 'https://polygon.llamarpc.com');
  const uniqueAddresses2 = await getAllTransactionsForContract('0x14e5386f47466a463f85d151653e1736c0c50fc3', 55973992, 60675907, 'https://polygon.llamarpc.com');

  // Join uniqueAddresses1 and uniqueAddresses2
  const combinedAddresses = new Set([...uniqueAddresses1, ...uniqueAddresses2]);

  // Print the number of unique addresses
  console.log(`Total number of unique addresses: ${combinedAddresses.size}`);

  // If you want to save the addresses to a file
  const fs = require('fs');
  fs.writeFileSync('uniqueAddresses.json', JSON.stringify([...combinedAddresses], null, 2));
  console.log('Unique addresses saved to uniqueAddresses.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
