### ResourceFarming Smart Contract Documentation

#### Overview
The [ResourceFarming](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L16) contract is designed to manage the staking and farming of resources using pirate NFTs. It allows users to stake their pirate NFTs, farm resources, and claim the resources after the farming period.

#### Prerequisites
- Ensure you have the contract address of the deployed [ResourceFarming](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L16) contract.
- Use ethers.js v6 for interacting with the contract.
- Ensure you have the ABI of the [ResourceFarming](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L16) contract.

#### Public Functions

1. **farmResource**
    - **Description**: Starts farming resources with a staked pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
      - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L24) (uint256): The ID of the pirate token.
      - [resource](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L26) (string): The name of the resource to farm.
      - [days_count](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L99) (uint256): The number of days to farm.
      - [useRum](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L28) (bool): Whether to use RUM for farming.
      - [resourceToBurn](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L101) (string): The resource to burn.
      - [isRestake](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L102) (bool): Whether this is a restake operation.
    - **Access**: Public.
    - **Link**: [farmResource](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L90)

2. **claimResourcePirate**
    - **Description**: Claims the resources farmed by a pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
      - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L24) (uint256): The ID of the pirate token.
      - [isRestake](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L102) (bool): Whether to restake the pirate after claiming.
    - **Access**: Public.
    - **Link**: [claimResourcePirate](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L165)

3. **claimAllResources**
    - **Description**: Claims all resources farmed by all pirates of a user.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
    - **Access**: Public.
    - **Link**: [claimAllResources](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L200)

4. **getCurrentProduction**
    - **Description**: Retrieves the current production of resources for a staked pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
      - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L24) (uint256): The ID of the pirate token.
    - **Access**: Public.
    - **Link**: [getCurrentProduction](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L215)

5. **getTotalToClaim**
    - **Description**: Retrieves the total amount of resources to claim for a staked pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
      - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L24) (uint256): The ID of the pirate token.
    - **Access**: Public.
    - **Link**: [getTotalToClaim](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L225)

6. **getWorkingPirates**
    - **Description**: Retrieves the list of working pirates for a user.
    - **Parameters**:
      - [owner](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L25) (address): The address of the user.
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
    - **Access**: Public.
    - **Link**: [getWorkingPirates](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L235)

7. **getPirates**
    - **Description**: Retrieves the list of all pirates (working and finished) for a user.
    - **Parameters**:
      - [owner](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L25) (address): The address of the user.
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
    - **Access**: Public.
    - **Link**: [getPirates](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L255)

8. **getFarmingInfo**
    - **Description**: Retrieves the farming information for a staked pirate.
    - **Parameters**:
      - [collectionAddress](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L23) (address): The address of the pirate collection.
      - [tokenId](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L24) (uint256): The ID of the pirate token.
    - **Access**: Public.
    - **Link**: [getFarmingInfo](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L265)

#### Internal Functions

1. **getResourceManagement**
   - **Description**: Retrieves the address of the `ResourceManagement` contract.
   - **Parameters**: None.
   - **Access**: Internal.
   - **Link**: [getResourceManagement](https://github.com/arrland/strategy-game-smart-contracts/tree/main/contracts/ResourceFarming.sol#L30)