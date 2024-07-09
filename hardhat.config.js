require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require('dotenv').config();


const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const POLYGON_RPC = process.env.POLYGON_RPC;
const POLYGON_AMAY_RPC = process.env.POLYGON_AMAY_RPC;

console.log("PRIVATE_KEY:", PRIVATE_KEY);

module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
      gas: 30000000
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: 30000000
    },
    // Configuration for the Polygon Mainnet
    polygon_mainnet: {
      url: POLYGON_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 137,
    },
    // Configuration for the Mumbai Testnet
    amoy: {
      url: POLYGON_AMAY_RPC,
      accounts: [PRIVATE_KEY],
      chainId: 80002,
    },
  },
  etherscan: {    
    apiKey: POLYGONSCAN_API_KEY
  },
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: {
        enabled: true,
        details: {
          yulDetails: {
            optimizerSteps: "u",
          },
        },
        runs: 200,
      },
      viaIR: true,
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
};