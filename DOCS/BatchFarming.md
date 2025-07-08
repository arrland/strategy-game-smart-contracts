# BatchFarming Contract Guide for Frontend Developers

## Overview

The `BatchFarming` contract is designed to streamline farming operations by allowing users to batch process multiple resource farming tasks in a single transaction. This approach helps optimize gas costs and simplifies the transaction process.

### Key Components

- **ResourceFarming**: A reference to the `ResourceFarming` contract, which handles the core farming logic.
- **FarmResourceParams**: A struct that contains parameters for each farming operation.

### Constructor

- **`constructor(address _resourceFarmingAddress)`**: Initializes the contract with the address of the `ResourceFarming` contract.

## batchFarmResource Function

### Purpose

The `batchFarmResource` function enables users to farm multiple resources in one transaction. It accepts an array of `FarmResourceParams` and processes each entry.

### Parameters

- **`address collectionAddress`**: The address of the NFT collection being farmed.
- **`FarmResourceParams[] memory params`**: An array of parameters for each farming operation. Each entry should include:
  - `tokenId`: The ID of the token being farmed.
  - `resource`: The type of resource to farm.
  - `daysCount`: The number of days to farm the resource.
  - `resourceToBurn`: The type of resource to burn during the farming process.
- **`bool useRum`**: A flag indicating whether to use "Rum" for the farming operation.
- **`msg.value`**: The total ether sent with the transaction, divided among the operations if `useRum` is false.

### How to Call

1. **Prepare the Parameters**: Create an array of `FarmResourceParams` with the necessary details for each operation.
2. **Determine Ether Value**: If `useRum` is false, calculate the total ether to send (`msg.value`) and ensure it's sufficient for all operations.
3. **Call the Function**: Use a web3 library (like ethers.js) to call `batchFarmResource` with the prepared parameters and ether value.

### Example Call

Here's a basic example using ethers.js v6:

```
import { ethers } from 'ethers';
// Assume provider and signer are already set up
const contractAddress = '0xYourContractAddress';
const abi = [ /* ABI of BatchFarming contract */ ];
const contract = new ethers.Contract(contractAddress, abi, signer);
const params = [
  { tokenId: 1, resource: 'Gold', daysCount: 5, resourceToBurn: 'Wood' },
  { tokenId: 2, resource: 'Silver', daysCount: 3, resourceToBurn: 'Stone' }
];
const collectionAddress = '0xCollectionAddress';
const useRum = false;
const totalValue = ethers.parseEther('0.1'); // Example value
async function batchFarm() {
  const tx = await contract.batchFarmResource(collectionAddress, params, useRum, { value: totalValue });
  await tx.wait();
  console.log('Batch farming completed');
}
batchFarm().catch(console.error);
```

### Notes

- Ensure the `ResourceFarming` contract is deployed and its address is correctly passed to the `BatchFarming` constructor.
- Adjust `totalValue` based on the number of operations and the cost per operation if `useRum` is false.
- Handle any exceptions or errors that may occur during the transaction.
