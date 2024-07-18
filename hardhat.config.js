require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require('dotenv').config();
require("hardhat-gas-reporter");


const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const POLYGON_RPC = process.env.POLYGON_RPC;
const POLYGON_AMAY_RPC = process.env.POLYGON_AMAY_RPC;

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
  gasReporter: {
    enabled: false,
    currency: 'USD',
    gasPrice: 35,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY, // Optional: to fetch real-time gas price
    //outputFile: 'gas-report.txt', // Optional: to save the report to a file    
    token: 'MATIC',
    network: 'POLYGON'
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