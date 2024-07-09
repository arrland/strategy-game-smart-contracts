### IslandManagement Smart Contract Documentation

#### Overview
The [IslandManagement](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L10-L10) contract is designed to manage islands within a game. It allows users to set a capital island, transfer resources to islands, and interact with storage and resource management contracts.

#### Prerequisites
- Ensure you have the contract address of the deployed [IslandManagement](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L10-L10) contract.
- Use ethers.js v6 for interacting with the contract.
- Ensure you have the ABI of the [IslandManagement](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L10-L10) contract.

#### Functions

1. **getIslandStorageCapacity**
   - **Description**: Retrieves the storage capacity of a specific island.
   - **Parameters**:
     - [owner](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L25-L44) (address): The address of the island owner.
     - [islandId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L25-L67) (uint256): The ID of the island.
   - **Access**: Public.
   - **Link**: [getIslandStorageCapacity](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L30)

2. **verifyIslandStorage**
   - **Description**: Verifies if an island has enough storage capacity for a given amount.
   - **Parameters**:
     - [owner](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L25-L44) (address): The address of the island owner.
     - [islandId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L25-L67) (uint256): The ID of the island.
     - [amount](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L26-L112) (uint256): The amount to verify.
   - **Access**: Public.
   - **Link**: [verifyIslandStorage](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L37)

3. **setCapitalIsland**
   - **Description**: Sets the capital island for a user.
   - **Parameters**:
     - [islandId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L25-L67) (uint256): The ID of the island to set as capital.
   - **Access**: Public.
   - **Link**: [setCapitalIsland](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L44)

4. **getCapitalIsland**
   - **Description**: Retrieves the capital island of a user.
   - **Parameters**:
     - [owner](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L25-L44) (address): The address of the user.
   - **Access**: Public.
   - **Link**: [getCapitalIsland](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L58)

5. **transferResourceToIsland**
   - **Description**: Transfers resources to a specific island.
   - **Parameters**:
     - [user](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L15-L53) (address): The address of the user.
     - [pirateCollectionContract](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L72-L61) (address): The address of the pirate collection contract.
     - [pirateTokenId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L72-L95) (uint256): The ID of the pirate token.
     - [islandId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L25-L67) (uint256): The ID of the island.
     - [resource](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L26-L94) (string): The name of the resource.
     - [amount](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L26-L112) (uint256): The amount of the resource to transfer.
   - **Access**: Internal.
   - **Link**: [transferResourceToIsland](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L65)

6. **transferResourceToCapital**
   - **Description**: Transfers resources to the capital island of a user.
   - **Parameters**:
     - [pirateCollectionContract](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L72-L61) (address): The address of the pirate collection contract.
     - [pirateTokenId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L72-L95) (uint256): The ID of the pirate token.
     - [resource](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L26-L94) (string): The name of the resource.
     - [amount](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L26-L112) (uint256): The amount of the resource to transfer.
   - **Access**: Public.
   - **Link**: [transferResourceToCapital](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L89)

7. **getUsersWithCapitalIslands**
   - **Description**: Retrieves the list of all users who have set their capital island.
   - **Parameters**: None.
   - **Access**: Public.
   - **Link**: [getUsersWithCapitalIslands](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L108)

8. **getAllCapitalIslands**
   - **Description**: Retrieves all capital islands.
   - **Parameters**: None.
   - **Access**: Public.
   - **Link**: [getAllCapitalIslands](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#L114)

#### Example Integration

```javascript
import { ethers } from 'ethers';

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider('YOUR_RPC_URL');
const signer = provider.getSigner();

// Contract address and ABI
const islandManagementAddress = 'YOUR_CONTRACT_ADDRESS';
const islandManagementABI = [ /* ABI array here */ ];

// Create contract instance
const islandManagement = new ethers.Contract(islandManagementAddress, islandManagementABI, signer);

// Example: Set capital island
async function setCapitalIsland(islandId) {
    const tx = await islandManagement.setCapitalIsland(islandId);
    await tx.wait();
    console.log('Capital island set');
}

// Example: Get capital island
async function getCapitalIsland(owner) {
    const capitalIsland = await islandManagement.getCapitalIsland(owner);
    console.log(`Capital island: ${capitalIsland}`);
}

// Example: Transfer resources to capital island
async function transferResourceToCapital(pirateCollectionContract, pirateTokenId, resource, amount) {
    const tx = await islandManagement.transferResourceToCapital(pirateCollectionContract, pirateTokenId, resource, amount);
    await tx.wait();
    console.log('Resources transferred to capital island');
}

// Call the functions as needed
setCapitalIsland(1);
getCapitalIsland('0xUserAddress');
transferResourceToCapital('0xPirateCollectionAddress', 1, 'gold', 100);
```

This documentation provides an overview of the `IslandManagement` contract functions, their parameters, access control, and example integration using ethers.js.
