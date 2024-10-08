### StorageManagement Frontend Integration Documentation

#### Overview
The [StorageManagement](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L8) contract is designed to manage storage contracts associated with different collections. It allows authorized users to add, remove, and interact with storage contracts.

#### Prerequisites
- Ensure you have the contract address of the deployed [StorageManagement](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L8) contract.
- Use ethers.js v6 for interacting with the contract.
- Ensure you have the ABI of the [StorageManagement](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L8) contract.

#### Functions

1. **addStorageContract**
   - **Description**: Adds a new storage contract for a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
     - [contractAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (address): The address of the storage contract.
   - **Access**: Only callable by an admin.

2. **removeStorageContract**
   - **Description**: Removes an existing storage contract for a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
   - **Access**: Only callable by an admin.

3. **getStorageCapacity**
   - **Description**: Retrieves the storage capacity for a specific token in a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
     - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the token.
   - **Access**: Public.

4. **getTotalResourcesInStorage**
   - **Description**: Retrieves the total resources stored for a specific token in a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
     - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the token.
   - **Access**: Public.

5. **checkStorageLimit**
   - **Description**: Checks if adding a certain amount of resources would exceed the storage capacity for a specific token in a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
     - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the token.
     - [amount](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L77) (uint256): The amount of resources to check.
   - **Access**: Public.

6. **updateStorageCapacity**
   - **Description**: Updates the storage capacity for a specific token in a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
     - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the token.
     - [newCapacity](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The new storage capacity.
   - **Access**: Only callable by authorized users.

7. **isStorageEntity**
   - **Description**: Checks if an address is a registered storage entity.
   - **Parameters**:
     - [entity](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L87) (address): The address to check.
   - **Access**: Public.

8. **getResourceBalance**
   - **Description**: Retrieves the balance of a specific resource for a token in a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
     - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the token.
     - [resource](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L91) (string): The name of the resource.
   - **Access**: Public.

9. **getAllResourceBalances**
   - **Description**: Retrieves all resource balances for a token in a collection.
   - **Parameters**:
     - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
     - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the token.
   - **Access**: Public.

10. **getStorageByCollection**
    - **Description**: Retrieves the storage contract address for a collection.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
    - **Access**: Public.

11. **getAllStorageContracts**
    - **Description**: Retrieves all storage contracts and their associated collection addresses.
    - **Parameters**: None.
    - **Access**: Public.

12. **getStorageDetails**
    - **Description**: Retrieves the storage details for a specific token in a collection.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the collection.
      - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the token.
    - **Returns**: A `StorageDetails` struct containing the following fields:
      - [totalResourcesInStorage](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L64) (uint256): The total amount of resources currently stored.
      - [storageCapacity](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L65) (uint256): The maximum storage capacity.
      - [resourceTypes](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L66) (string[]): An array of resource types stored.
      - [resourceBalances](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L67) (uint256[]): An array of balances corresponding to each resource type.
    - **Access**: Public.

13. **assignStorageToPrimary**
- **Description**: Assigns a storage token to a primary token in a collection.
- **Parameters**:
  - [primaryCollection](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the primary collection.
  - [primaryTokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the primary token.
  - [storageTokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the storage token.
- **Access**: Only callable by the owner of the primary token.

14. **getPrimaryTokensForStorage**
- **Description**: Retrieves all primary tokens assigned to a specific storage token.
- **Parameters**:
  - [primaryCollection](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the primary collection.
  - [storageTokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the storage token.
- **Access**: Public.

15. **unassignStorageFromPrimary**
- **Description**: Unassigns a storage token from a primary token in a collection.
- **Parameters**:
  - [primaryCollection](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the primary collection.
  - [primaryTokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the primary token.
- **Access**: Only callable by the owner of the primary token.
16. **getAssignedStorage**
- **Description**: Retrieves the storage token assigned to a primary token in a collection.
- **Parameters**:
  - [primaryCollection](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L21) (address): The address of the primary collection.
  - [primaryTokenId](https://github.com/arrland/strategy-game-smart-contracts/blob/main/contracts/StorageManagement.sol#L20) (uint256): The ID of the primary token.
- **Returns**: The ID of the storage token assigned to the primary token.
- **Access**: Public.




