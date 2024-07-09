### ResourceFarming Smart Contract Documentation

#### Overview
The [ResourceFarming](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#16%2C10-16%2C10) contract is designed to manage the staking and farming of resources using pirate NFTs. It allows users to stake their pirate NFTs, farm resources, and claim the resources after the farming period.

#### Prerequisites
- Ensure you have the contract address of the deployed [ResourceFarming](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#16%2C10-16%2C10) contract.
- Use ethers.js v6 for interacting with the contract.
- Ensure you have the ABI of the [ResourceFarming](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#16%2C10-16%2C10) contract.

#### Public Functions

1. **farmResource**
    - **Description**: Starts farming resources with a staked pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#23%2C17-23%2C17) (address): The address of the pirate collection.
      - [tokenId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#24%2C17-24%2C17) (uint256): The ID of the pirate token.
      - [resource](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#26%2C94-26%2C94) (string): The name of the resource to farm.
      - [days_count](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#99%2C17-99%2C17) (uint256): The number of days to farm.
      - [useRum](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#28%2C14-28%2C14) (bool): Whether to use RUM for farming.
      - [resourceToBurn](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#101%2C23-101%2C23) (string): The resource to burn.
      - [isRestake](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#102%2C14-102%2C14) (bool): Whether this is a restake operation.
    - **Access**: Public.
    - **Link**: [farmResource](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#L90)

2. **claimResourcePirate**
    - **Description**: Claims the resources farmed by a pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#23%2C17-23%2C17) (address): The address of the pirate collection.
      - [tokenId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#24%2C17-24%2C17) (uint256): The ID of the pirate token.
      - [isRestake](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#102%2C14-102%2C14) (bool): Whether to restake the pirate after claiming.
    - **Access**: Public.
    - **Link**: [claimResourcePirate](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#L165)

3. **claimAllResources**
    - **Description**: Claims all resources farmed by all pirates of a user.
    - **Parameters**:
      - [collectionAddress](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#23%2C17-23%2C17) (address): The address of the pirate collection.
    - **Access**: Public.
    - **Link**: [claimAllResources](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#L200)

4. **getCurrentProduction**
    - **Description**: Retrieves the current production of resources for a staked pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#23%2C17-23%2C17) (address): The address of the pirate collection.
      - [tokenId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#24%2C17-24%2C17) (uint256): The ID of the pirate token.
    - **Access**: Public.
    - **Link**: [getCurrentProduction](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#L215)

5. **getTotalToClaim**
    - **Description**: Retrieves the total amount of resources to claim for a staked pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#23%2C17-23%2C17) (address): The address of the pirate collection.
      - [tokenId](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#24%2C17-24%2C17) (uint256): The ID of the pirate token.
    - **Access**: Public.
    - **Link**: [getTotalToClaim](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#L225)

6. **getWorkingPirates**
    - **Description**: Retrieves the list of working pirates for a user.
    - **Parameters**:
      - [owner](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/IslandManagement.sol#25%2C44-25%2C44) (address): The address of the user.
      - [collectionAddress](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#23%2C17-23%2C17) (address): The address of the pirate collection.
    - **Access**: Public.
    - **Link**: [getWorkingPirates](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#L235)

#### Internal Functions

1. **getResourceManagement**
   - **Description**: Retrieves the address of the `ResourceManagement` contract.
   - **Parameters**: None.
   - **Access**: Internal.
   - **Link**: [getResourceManagement](https://github.com/your-repo/strategy-game-smart-contracts/blob/main/contracts/ResourceFarming.sol#L30)


