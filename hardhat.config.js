require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require("@openzeppelin/hardhat-upgrades");
require('dotenv').config();
require("hardhat-gas-reporter");
require("@secrez/cryptoenv").parse();
const { ethers } = require("ethers");

const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const POLYGON_RPC = process.env.POLYGON_RPC;
const POLYGON_AMAY_RPC = process.env.POLYGON_AMAY_RPC;

module.exports = {
  networks: {
    hardhat: {
      chainId: 1337,
      gas: 30000000,
      blockGasLimit: 30000000,
      allowUnlimitedContractSize: true,      
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    polygon: {
      url: POLYGON_RPC,
      accounts: process.env.PRIVATE_KEY_POLYGON ? [process.env.PRIVATE_KEY_POLYGON] : [],
      chainId: 137,
      maxFeePerGas: 100_000_000_000,  // 100 Gwei
      maxPriorityFeePerGas: 25_000_000_000, // 25 Gwei
      // Fallback for legacy transactions
      gasPrice: 100_000_000_000, // 100 Gwei
      timeout: 9200000      
    },
    amoy: {
      url: POLYGON_AMAY_RPC,
      accounts: process.env.PRIVATE_KEY_AMAY ? [process.env.PRIVATE_KEY_AMAY] : [],
      chainId: 80002
    },
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
    gasPrice: 35,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: 'MATIC',
    network: 'POLYGON'
  },
  etherscan: {
    apiKey: POLYGONSCAN_API_KEY,
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ],
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