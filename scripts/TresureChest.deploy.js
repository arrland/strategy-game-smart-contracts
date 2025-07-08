// scripts/deploy.js

const { ethers } = require("hardhat");

require('dotenv').config()




const arrc_abi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "rewards_address",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "safe_address",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Approval",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tokenCount",
          "type": "uint256"
        }
      ],
      "name": "TokensBurn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "Transfer",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        }
      ],
      "name": "allowance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "approve",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "balanceOf",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "holder",
          "type": "address"
        }
      ],
      "name": "burnSingle",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        {
          "internalType": "uint8",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "subtractedValue",
          "type": "uint256"
        }
      ],
      "name": "decreaseAllowance",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "holders",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "spender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "addedValue",
          "type": "uint256"
        }
      ],
      "name": "increaseAllowance",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "name",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bool",
          "name": "isBlock",
          "type": "bool"
        }
      ],
      "name": "setTransferBlock",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "symbol",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalNumberOfHolder",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalSupply",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "transferBlock",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "transferFrom",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "userExist",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(
        "Deploying the contracts with the account:",
        await deployer.getAddress()
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());
    console.log("Network:", network.name);
    const TreasureChest = await ethers.getContractFactory("TreasureChest");
    let pricesInWei;


    const prices = [9, 25, 49, 79, 123, 169, 229];
    if (network.name == "amoy") {
        pricesInWei = prices.map((price) => ethers.utils.parseEther((price / 1000).toString()));
    } else {
        pricesInWei = prices.map((price) => ethers.utils.parseEther(price.toString()));
    }

    console.log(pricesInWei);

    const baseURIpath = "https://arrland-media.s3-eu-central-1.amazonaws.com/meta/gems/"; // replace with your base URI

    const treasureChest = await TreasureChest.deploy(baseURIpath, { gasLimit: 9000000 });

    await treasureChest.deployed();
    console.log(`npx hardhat verify --network ${network.name} ${treasureChest.address} ${baseURIpath}`);




    await treasureChest.initializeLevelUpPrice(pricesInWei);

    await treasureChest.updateContractSettings(true, false, false);



    console.log("updatePublicMintingEnabled ");

    await treasureChest.mint([]);
    if (network.name == "mumbai") {
        await treasureChest.levelUp(1, 2, { value: web3.utils.toWei("0.009", "ether")})
    } else {
        await treasureChest.levelUp(1, 2, { value: web3.utils.toWei("9", "ether")})
    }

    console.log("levelUp ");

    //await treasureChest.updateContractSettings(false, false, false);

    //console.log("updatePublicMintingEnabled false");



    console.log("TreasureChest deployed to:", treasureChest.address);

    // const RandomARRC = await ethers.getContractFactory("RandomARRC");


    // let vrfCoordinator;
    // let subscriptionId;
    // let keyHash;
    // let callbackGasLimit;
    // const treasureChestAddress = treasureChest.address;
    // let arrcTokenAddress;
    // let arrcVALUE;
    // let privateKey;

    // if (network.name == "mumbai") {
    //     vrfCoordinator = "0x7a1bac17ccc5b313516c5e16fb24f7659aa5ebed";
    //     subscriptionId = 4974;
    //     keyHash = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
    //     callbackGasLimit = 100000;
    //     arrcTokenAddress = "0x46210CC9243764b69bFD53a81D1b4355EB347504";
    //     arrcVALUE = "1000";
    //     privateKey = devPK;
    // } else {
    //     vrfCoordinator = "0xae975071be8f8ee67addbc1a82488f1c24858067";
    //     subscriptionId = 800;
    //     keyHash = "0xcc294a196eeeb44da2888d17c0625cc88d70d9760a69d58d853ba6581a9ab0cd";
    //     callbackGasLimit = 2500000;
    //     arrcTokenAddress = "0x9fd7833ccE70F62323C0DAd31fDFB12a6a899d73";
    //     arrcVALUE = "10000";
    //     privateKey = prodPK;
    // }


    // const randomARRC = await RandomARRC.deploy(vrfCoordinator, subscriptionId, keyHash, callbackGasLimit, treasureChestAddress, arrcTokenAddress);

    // console.log("RandomARRC deployed to:", randomARRC.address);

    // await treasureChest.setRandomARRCAddress(randomARRC.address);


    // console.log(`npx hardhat verify --network ${network.name} ${randomARRC.address} ${vrfCoordinator} ${subscriptionId} ${keyHash} ${callbackGasLimit} ${treasureChestAddress} ${arrcTokenAddress}`);

    // console.log(`Send ARRC to ${randomARRC.address}`)

    // await treasureChest.updateContractSettings(false, false, true);

    // console.log("Open enabled")

    // console.log(`Set chainlink consumer as ${randomARRC.address}`)

    // const provider = ethers.provider;
    // const wallet = new ethers.Wallet(privateKey, provider);
    // const tokenContract = new ethers.Contract(arrcTokenAddress, arrc_abi, wallet);
    // const amount = ethers.utils.parseEther(arrcVALUE);

    // await tokenContract.transfer(randomARRC.address, amount);
    // console.log("ARRC transfered")


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
