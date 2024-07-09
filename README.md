# strategy-game-smart-contracts

## Deploying Smart Contracts

To deploy the smart contracts on a testnet or mainnet, follow these steps:

### Prerequisites

1. **Install Dependencies**: Ensure you have all the necessary dependencies installed. Run the following command in the root directory of your project:
    ```bash
    yarn install
    ```

2. **Set Up Environment Variables**: Create a `.env` file in the root directory of your project and add your private key:
    ```plaintext
    PRIVATE_KEY=your_private_key_here
    ```

### Deploying to a Testnet (Mumbai Testnet)

1. **Compile Contracts**: Before deploying, compile the smart contracts using Hardhat:
    ```bash
    npx hardhat compile
    ```

2. **Deploy Contracts**: 
3. **Run Deployment Script**: Execute the deployment script using Hardhat:
    ```bash
    npx hardhat run scripts/deploy.js --network amoy
    ```

### Deploying to the Mainnet (Polygon Mainnet)

1. **Compile Contracts**: Before deploying, compile the smart contracts using Hardhat:
    ```bash
    npx hardhat compile
    ```

2. **Deploy Contracts**: Use the following script to deploy the contracts to the Polygon Mainnet:

3. **Run Deployment Script**: Execute the deployment script using Hardhat:
    ```bash
    npx hardhat run scripts/deploy.js --network polygon_mainnet
    ```

### Updating Pirate Attributes

To update pirate attributes using the provided script, follow these steps:

1. **Navigate to the Script Directory**: Ensure you are in the root directory of your project.

2. **Run the Update Script**: Execute the update script using Hardhat:
    ```bash
    npx hardhat run scripts/updatePirates.js --network amoy
    ```

Replace `<network_name>` with the appropriate network you are targeting (e.g., `amoy`, `polygon_mainnet`, etc.).

This script will read the pirate skills data from `pirate_skils.json` and batch update the pirate attributes on the specified network.

Make sure you have sufficient funds in your wallet to cover the gas fees for updating pirate attributes on the network.


Make sure you have sufficient funds in your wallet to cover the gas fees for deploying contracts on the mainnet.

## Additional Notes

- Ensure that your `.env` file is not exposed or committed to version control to keep your private key secure.
- You can customize the deployment script to include additional contracts or specific deployment logic as needed.


### Verifying Contracts

To verify the deployed contracts using the provided `verify_contracts.js` script, follow these steps:

1. **Navigate to the Script Directory**: Ensure you are in the root directory of your project.

2. **Run the Verification Script**: Execute the verification script using Hardhat:
    ```bash
    npx hardhat run scripts/verify_contracts.js --network <network_name>
    ```

Replace `<network_name>` with the appropriate network you are targeting (e.g., `amoy`, `polygon_mainnet`, etc.).

This script will read the contract addresses from the `.env` file and attempt to verify each contract on the specified network.

Make sure you have sufficient funds in your wallet to cover the gas fees for verifying contracts on the network.

### Example

To verify contracts on the Amoy testnet, run:



## Running Tests

To run the tests for the smart contracts, follow these steps:

1. **Install Dependencies**: Ensure you have all the necessary dependencies installed. Run the following command in the root directory of your project:
    ```bash
    yarn install
    ```

2. **Compile Contracts**: Before running the tests, compile the smart contracts using Hardhat:
    ```bash
    npx hardhat compile
    ```

3. **Run Tests**: Execute the tests using Hardhat. This will run all the test files located in the `test` directory:
    ```bash
    npx hardhat test
    ```

4. **View Test Results**: After running the tests, you will see the results in the terminal, including any passed or failed tests.

Make sure you have a local Ethereum node running if you are not using the Hardhat Network. You can start a local node using Hardhat with the following command:


