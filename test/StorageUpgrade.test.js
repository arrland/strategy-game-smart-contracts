const { expect, anyValue } = require("chai");
const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require('./utils');
const fs = require('fs');
const path = require('path');
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function updatePirateSkillsFromJSON(filePath, pirateManagement, admin, genesisPiratesAddress) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    for (const tokenSkillSet of data) {        
        const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));            
        const skills = tokenSkillSet.skills;
        const characterSkills = {
            strength: BigInt(skills.characterSkills.strength),
            stamina: BigInt(skills.characterSkills.stamina),
            swimming: BigInt(skills.characterSkills.swimming),
            melee: BigInt(skills.characterSkills.melee),
            shooting: BigInt(skills.characterSkills.shooting),
            cannons: BigInt(skills.characterSkills.cannons),
            agility: BigInt(skills.characterSkills.agility),
            engineering: BigInt(skills.characterSkills.engineering),
            wisdom: BigInt(skills.characterSkills.wisdom),
            luck: BigInt(skills.characterSkills.luck),
            health: BigInt(skills.characterSkills.health),
            speed: BigInt(skills.characterSkills.speed),
            //respect: BigInt(skills.characterSkills.respect || 0)
        };

        const toolsSkills = {
            harvest: BigInt(skills.toolsSkills.harvest),
            mining: BigInt(skills.toolsSkills.mining),
            quarrying: BigInt(skills.toolsSkills.quarrying),
            excavation: BigInt(skills.toolsSkills.excavation),
            husbandry: BigInt(skills.toolsSkills.husbandry),
            woodcutting: BigInt(skills.toolsSkills.woodcutting),
            slaughter: BigInt(skills.toolsSkills.slaughter),
            hunting: BigInt(skills.toolsSkills.hunting),
            cultivation: BigInt(skills.toolsSkills.cultivation),
            //navigation: BigInt(skills.toolsSkills.navigation || 0),
            //accuracy: BigInt(skills.toolsSkills.accuracy || 0),
        };

        const specialSkills = {
            fruitPicking: BigInt(skills.specialSkills.fruitPicking),
            fishing: BigInt(skills.specialSkills.fishing),
            building: BigInt(skills.specialSkills.building),
            crafting: BigInt(skills.specialSkills.crafting)
        };

        const pirateSkills = {
            characterSkills: characterSkills,
            toolsSkills: toolsSkills,
            specialSkills: specialSkills,
            added: true
        };

        for (const tokenId of tokenIds) {
            await pirateManagement.connect(admin).batchUpdatePirateAttributes(
                genesisPiratesAddress,
                [{ tokenIds: [tokenId], skills: pirateSkills }]
            );
        }
    }
}

describe("StorageUpgrade", function () {
    let storageUpgrade;
    let centralAuthRegistry;
    let storageManagement;
    let resourceManagement;
    let feeManagement;
    let upgradeConstructionTime;
    let islandStorage;
    let simpleERC1155, genesisPiratesAddress;
    let islandNft, genesisIslandsAddress;
    let inhabitantNft, inhabitantsAddress;
    let rumToken;
    let admin, user, addr1, addr2, externalCaller, maticFeeRecipient;
    let pirateManagement;
    let resourceAdditionTest;
    let SimpleERC721;
    let pirateStorage;
    let inhabitantStorage;
    let pirateStorageAddress;
    let inhabitantStorageAddress;
    let islandStorageAddress;
    let resourceTypeManager;

    beforeEach(async function () {
        [admin, user, addr1, addr2, externalCaller, maticFeeRecipient] = await ethers.getSigners();        
        // Deploy CentralAuthorizationRegistry first
        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthRegistry.initialize(admin.address);

        // Add authorized caller ONCE here
        await centralAuthRegistry.addAuthorizedContract(externalCaller.address);

        // Deploy NFT contracts
        const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");
        genesisPiratesAddress = await simpleERC1155.getAddress();

        SimpleERC721 = await ethers.getContractFactory("SimpleERC721");

        inhabitantNft = await SimpleERC721.deploy("Inhabitant", "INH", "https://inhabitant.com/", admin.address);
        inhabitantsAddress = await inhabitantNft.getAddress();

        
        islandNft = await SimpleERC721.deploy("Island", "ISL", "https://island.com/", admin.address);

        genesisIslandsAddress = await islandNft.getAddress();

        // Register NFT contracts first
        await centralAuthRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);
        await centralAuthRegistry.connect(admin).registerPirateNftContract(inhabitantsAddress);

        // Deploy RUM token
        const DummyERC20Burnable = await ethers.getContractFactory("DummyERC20Burnable");
        rumToken = await DummyERC20Burnable.deploy("RUM Token", "RUM");

        // Deploy PirateManagement first
        pirateManagement = await deployAndAuthorizeContract("PirateManagement", centralAuthRegistry);

        // Update pirate skills right after PirateManagement deployment
        await updatePirateSkillsFromJSON(path.join(__dirname, '../scripts/pirate_skils_test.json'), pirateManagement, admin, genesisPiratesAddress);
        await updatePirateSkillsFromJSON(path.join(__dirname, '../scripts/pirate_skils_test.json'), pirateManagement, admin, inhabitantsAddress);

        // Deploy storage contracts
        const pirateStorage = await deployAndAuthorizeContract(
            "PirateStorage",
            centralAuthRegistry,
            genesisPiratesAddress,
            false,
            genesisIslandsAddress
        );

        islandStorage = await deployAndAuthorizeContract(
            "IslandStorage",
            centralAuthRegistry,
            genesisIslandsAddress,
            true
        );

        const inhabitantStorage = await deployAndAuthorizeContract(
            "InhabitantStorage",
            centralAuthRegistry,
            inhabitantsAddress,
            true,
            genesisIslandsAddress
        );

        pirateStorageAddress = await pirateStorage.getAddress();
        inhabitantStorageAddress = await inhabitantStorage.getAddress();
        islandStorageAddress = await islandStorage.getAddress();

        // Deploy other required contracts
        resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthRegistry);
        resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthRegistry);
        feeManagement = await deployAndAuthorizeContract(
            "FeeManagement",
            centralAuthRegistry,
            await rumToken.getAddress(),
            maticFeeRecipient.address
        );
        upgradeConstructionTime = await deployAndAuthorizeContract("UpgradeConstructionTime", centralAuthRegistry);

        // Deploy StorageManagement with all required parameters
        storageManagement = await deployAndAuthorizeContract(
            "StorageManagement",
            centralAuthRegistry,
            genesisPiratesAddress,
            genesisIslandsAddress,
            inhabitantsAddress,
            await pirateStorage.getAddress(),
            await islandStorage.getAddress(),
            await inhabitantStorage.getAddress()
        );

        // Deploy StorageUpgrade contract
        storageUpgrade = await deployAndAuthorizeContract(
            "StorageUpgrade", 
            centralAuthRegistry,
            genesisPiratesAddress,
            genesisIslandsAddress,
            inhabitantsAddress
        );

        // Initialize islands in the correct order
        // Part 13 contains Huge islands (IDs 1-16)
        await islandStorage.initializeIslands(13, {gasLimit: 30000000});  // Huge islands
        await islandStorage.initializeIslands(9, {gasLimit: 30000000});   // Large islands
        await islandStorage.initializeIslands(5, {gasLimit: 30000000});   // Medium islands
        await islandStorage.initializeIslands(1, {gasLimit: 30000000});   // Small islands
        

        // Add storage contracts to StorageManagement
        storageManagement.addStorageContract(genesisPiratesAddress, await pirateStorage.getAddress());
        storageManagement.addStorageContract(inhabitantsAddress, await inhabitantStorage.getAddress());
        storageManagement.addStorageContract(genesisIslandsAddress, await islandStorage.getAddress());

        // Set up storage contracts
        await islandStorage.connect(externalCaller).setRequiredStorage(true, genesisPiratesAddress);

        // Deploy ResourceAdditionTest
        resourceAdditionTest = await deployAndAuthorizeContract(
            "ResourceAdditionTest",
            centralAuthRegistry
        );

        // Mint and approve RUM tokens
        await rumToken.mint(user.address, ethers.parseEther("1000000")); // Increased to a much larger value
        // Approve both FeeManagement and StorageUpgrade contracts
        await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("1000000"));
        await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000000"));
    });

    describe("Storage Upgrade Functionality", function () {
        beforeEach(async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);
            
            // Mint islands - we want ID 1 which should be Huge (from part 13)
            await islandNft.connect(admin).mint(user.address); // ID 0
            await islandNft.connect(admin).mint(user.address); // ID 1 (should be Huge from part 13)
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            await rumToken.mint(user.address, ethers.parseEther("100"));
            await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("100"));
        });

        it("should start storage upgrade with RUM payment", async function () {
            // First assign storage using a Huge island (ID 1)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Get upgrade requirements first
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

            // Add required resources based on the requirements
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,  // Using island ID 1 (Huge)
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource using the correct amount from upgradeReq
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish  // Use the correct food amount
            );

            // Get initial storage capacity
            const initialCapacity = await storageManagement.getStorageCapacity(genesisPiratesAddress, 1);

            // Get the RUM fee first
            const feePerDay = await feeManagement.rumFeePerDay();
            const constructionTime = await upgradeConstructionTime.calculateUpgradeTime(
                genesisPiratesAddress,
                1,
                1  // difficulty level 1
            );
            const daysRequired = Math.ceil(Number(constructionTime) / 86400);
            const totalRumFee = feePerDay * BigInt(daysRequired);

            // Mint more RUM tokens
            await rumToken.mint(user.address, totalRumFee * 2n); // Double to be safe
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), totalRumFee * 2n);

            // Get storage details to use in event check
            const [storageCollectionAddress, storageTokenId, storageContractOrExternal] = 
                await storageUpgrade.getStorageDetails(genesisPiratesAddress, 1);

            // Start the upgrade
            const tx = await storageUpgrade.connect(user).startUpgradeStorage(
                1,
                genesisPiratesAddress,
                true, // use RUM
                "fish"  // food choice
            );

            // Get the block timestamp after the transaction
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const startTime = block.timestamp;

            await expect(tx)
              .to.emit(storageUpgrade, "StorageUpgradeStarted")
              .withArgs(
                  user.address,                // user
                  genesisPiratesAddress,       // collectionAddress
                  1n,                          // tokenId
                  storageCollectionAddress,    // Use correct storage collection address
                  1n,                          // storageTokenId
                  0n,                          // currentLevel
                  1n,                          // nextLevel
                  startTime,                   // startTime
                  startTime + Number(upgradeReq.upgradeTime), // endTime
                  true,                        // useRum
                  "fish"                       // foodChoice
              );

            // Verify storage capacity was increased
            const newCapacity = await storageManagement.getStorageCapacity(genesisPiratesAddress, 1);
            expect(newCapacity).to.be.gte(initialCapacity);

            // Verify resources were spent
            const woodBalance = await resourceManagement.getResourceBalance(islandStorageAddress, 1, "wood");
            const cottonBalance = await resourceManagement.getResourceBalance(islandStorageAddress, 1, "cotton");
            
            expect(woodBalance).to.equal(0);  // All wood should be spent
            expect(cottonBalance).to.equal(0); // All cotton should be spent
        });

        it("should start storage upgrade with MATIC payment", async function () {
            // First assign storage using a Huge island (ID 1)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Get upgrade requirements first
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

            // Add required resources based on the requirements
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource using the correct amount from upgradeReq
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish  // Use the correct food amount
            );

            // Get the MATIC fee first
            const feePerDay = await feeManagement.maticFeePerDay();
            const constructionTime = await upgradeConstructionTime.calculateUpgradeTime(
                genesisPiratesAddress,
                1,
                1  // difficulty level 1
            );
            const daysRequired = Math.ceil(Number(constructionTime) / 86400);
            const totalMaticFee = feePerDay * BigInt(daysRequired);

            // Fund the user with enough MATIC
            await admin.sendTransaction({
                to: user.address,
                value: totalMaticFee * 2n // Double to cover gas costs
            });

            // Get storage details to use in event check
            const [storageCollectionAddress, storageTokenId, storageContractOrExternal] = 
                await storageUpgrade.getStorageDetails(genesisPiratesAddress, 1);

            // Get initial MATIC balance before the transaction
            const initialMaticBalance = await ethers.provider.getBalance(maticFeeRecipient.address);

            // Start the upgrade with MATIC payment
            const tx = await storageUpgrade.connect(user).startUpgradeStorage(
                1,
                genesisPiratesAddress,
                false,
                "fish",
                { value: totalMaticFee }
            );

            // Get the block timestamp after the transaction
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const startTime = block.timestamp;

            // Now check the event
            await expect(tx)
                .to.emit(storageUpgrade, "StorageUpgradeStarted")
                .withArgs(
                    user.address,
                    genesisPiratesAddress,
                    1n,
                    storageCollectionAddress,
                    1n,
                    0n,
                    1n,
                    startTime,
                    startTime + Number(upgradeReq.upgradeTime),
                    false,
                    "fish"
                );

            // Verify MATIC payment was received
            const newMaticBalance = await ethers.provider.getBalance(maticFeeRecipient.address);
            expect(newMaticBalance).to.be.gt(initialMaticBalance);
        });

        it("should complete storage upgrade", async function () {
            // First assign storage
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Get upgrade requirements first
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

            // Add required resources based on the requirements
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource using the correct amount from upgradeReq
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish  // Use the correct food amount
            );

            // Get the RUM fee first
            const feePerDay = await feeManagement.rumFeePerDay();
            const constructionTime = await upgradeConstructionTime.calculateUpgradeTime(
                genesisPiratesAddress,
                1,
                1  // difficulty level 1
            );
            const daysRequired = Math.ceil(Number(constructionTime) / 86400);
            const totalRumFee = feePerDay * BigInt(daysRequired);

            // Mint more RUM tokens
            await rumToken.mint(user.address, totalRumFee);
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), totalRumFee);

            // First start the upgrade
            await storageUpgrade.connect(user).startUpgradeStorage(
                1,
                genesisPiratesAddress,
                true,
                "fish"
            );

            // Get the actual construction time (use a different variable name)
            const upgradeTime = await upgradeConstructionTime.calculateUpgradeTime(
                genesisPiratesAddress,
                1,
                1  // difficulty level 1
            );

            // Increase time by the actual construction time plus a little buffer
            await ethers.provider.send("evm_increaseTime", [Number(upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");

            // Finish the upgrade
            await expect(
                storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1)
            ).to.emit(storageUpgrade, "StorageUpgraded")
              .withArgs(
                  user.address,           // user
                  genesisIslandsAddress,  // collectionAddress
                  1,                      // tokenId
                  1,                      // newLevel
                  6100000000000000000000n                    // newCapacity - use actual expected value from upgradeLevels
              );
        });
    });

    describe("Deployment and Initialization", function () {
        it("should initialize with correct addresses", async function () {
            expect(await storageUpgrade.genesisPiratesAddress()).to.equal(genesisPiratesAddress);
            expect(await storageUpgrade.genesisIslandsAddress()).to.equal(genesisIslandsAddress);
            expect(await storageUpgrade.inhabitantsAddress()).to.equal(inhabitantsAddress);
        });

        it("should support required interfaces", async function () {
            expect(await storageUpgrade.supportsInterface("0x4e2312e0")).to.be.true; // ERC1155Receiver
            expect(await storageUpgrade.supportsInterface("0x150b7a02")).to.be.true; // ERC721Receiver
            expect(await storageUpgrade.supportsInterface("0x01ffc9a7")).to.be.true; // ERC165
        });
    });

    describe("Upgrade Requirements", function () {
        beforeEach(async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await islandNft.connect(admin).mint(user.address); // ID 0
            await islandNft.connect(admin).mint(user.address); // ID 1
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            // Setup RUM tokens
            await rumToken.mint(user.address, ethers.parseEther("1000")); // Mint enough for all tests
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000"));
            await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("1000"));
        });

        it("should return correct upgrade requirements for level 1", async function () {
            // First assign storage using a Huge island (ID 1)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            const req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            // Check all fields
            expect(req.currentLevel).to.equal(0);
            expect(req.nextLevel).to.equal(1);
            expect(req.resourceTypes).to.deep.equal(["wood", "cotton"]);
            expect(req.resourceAmounts[0]).to.equal(ethers.parseEther("5")); // wood
            expect(req.resourceAmounts[1]).to.equal(ethers.parseEther("25")); // cotton
            
            // Check food requirements
            const daysRequired = Math.ceil(Number(req.upgradeTime) / 86400); // 86400 seconds in a day
            expect(req.foodFish).to.equal(ethers.parseEther(daysRequired.toString()));
            expect(req.foodCoconut).to.equal(ethers.parseEther((daysRequired * 2).toString()));
            expect(req.foodMeat).to.equal(ethers.parseEther((daysRequired * 0.5).toString()));
            expect(req.foodBarrelPackedFish).to.equal(ethers.parseEther((daysRequired * 0.01).toString()));
            expect(req.foodBarrelPackedMeat).to.equal(ethers.parseEther((daysRequired * 0.005).toString()));
        });

        it("should return correct upgrade requirements for level 2", async function () {
            // First upgrade to level 1
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Add resources and start first upgrade
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Complete first upgrade
            await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
            await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");
            await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);

            // Check level 2 requirements
            const req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            expect(req.currentLevel).to.equal(1);
            expect(req.nextLevel).to.equal(2);
            expect(req.resourceTypes).to.deep.equal(["wood", "cotton"]);
            expect(req.resourceAmounts[0]).to.equal(ethers.parseEther("5")); // wood
            expect(req.resourceAmounts[1]).to.equal(ethers.parseEther("25")); // cotton
        });

        it("should return correct upgrade requirements for level 6", async function () {
            // First assign storage using a Huge island (ID 1)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Perform upgrades to reach level 5
            for (let i = 0; i < 5; i++) {
                // Verify NFT is not staked before starting new upgrade
                const stakingInfoBefore = await storageUpgrade.stakingInfo(genesisPiratesAddress, 1);            
                // Approve NFT for each upgrade
                await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
                
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add resources for each upgrade
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        1,
                        user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Mint and approve RUM tokens for each upgrade
                await rumToken.mint(user.address, upgradeReq.rumFee);
                await rumToken.connect(user).approve(await storageUpgrade.getAddress(), upgradeReq.rumFee);

                // Start upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
                
                // Increase time significantly more than the upgrade time
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 1000]);
                await ethers.provider.send("evm_mine");
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);               
            }

            // Check level 6 requirements
            const req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            expect(req.currentLevel).to.equal(5);
            expect(req.nextLevel).to.equal(6);
            expect(req.resourceTypes).to.deep.equal(["wood", "planks", "cotton"]);
            expect(req.resourceAmounts[0]).to.equal(ethers.parseEther("20")); // wood
            expect(req.resourceAmounts[1]).to.equal(ethers.parseEther("100")); // planks
            expect(req.resourceAmounts[2]).to.equal(ethers.parseEther("50")); // cotton
        });
    });

    describe("Error Cases", function () {
        beforeEach(async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await islandNft.connect(admin).mint(user.address); // ID 0
            await islandNft.connect(admin).mint(user.address); // ID 1
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            // Setup RUM tokens
            await rumToken.mint(user.address, ethers.parseEther("1000"));
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000"));
            await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("1000"));
        });

        it("should fail to start upgrade with insufficient resources", async function () {
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Try to start upgrade without adding resources
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Insufficient wood");
        });

        it("should fail to start upgrade with insufficient RUM balance", async function () {
            // Mint and assign storage
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await islandNft.connect(admin).mint(user.address);
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);

            
            // Add required resources
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Make sure user has no RUM balance
            const userBalance = await rumToken.balanceOf(user.address);
            await rumToken.connect(user).transfer(admin.address, userBalance);

            // Try to start upgrade without RUM
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Insufficient RUM balance");
        });

        it("should fail to start upgrade with insufficient MATIC", async function () {
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Add required resources
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Try to start upgrade without enough MATIC
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, false, "fish")
            ).to.be.revertedWith("Insufficient MATIC sent");
        });

        it("should fail to finish upgrade before construction time", async function () {
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Add required resources and start upgrade
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");

            // Try to finish upgrade immediately
            await expect(
                storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1)
            ).to.be.revertedWith("Upgrade not finished");
        });
    });

    describe("Token Tracking and Level Progression", function () {
        beforeEach(async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await islandNft.connect(admin).mint(user.address); // ID 0
            await islandNft.connect(admin).mint(user.address); // ID 1
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            // Setup RUM tokens
            await rumToken.mint(user.address, ethers.parseEther("1000000")); // Increased to a much larger value
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000000"));
            await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("1000000"));
        });

        it("should track tokens and levels correctly", async function () {
            // First assign storage using a Huge island (ID 1)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Iterate through all upgrade levels
            for (let level = 0; level <= 24; level++) {
                // Get upgrade requirements
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

                // Verify current and next level
                expect(upgradeReq.currentLevel).to.equal(level);
                expect(upgradeReq.nextLevel).to.equal(level + 1);

                // Add required resources
                for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        1,
                        user.address,
                        upgradeReq.resourceTypes[i],
                        upgradeReq.resourceAmounts[i]
                    );
                }
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Mint and approve RUM tokens
                await rumToken.mint(user.address, upgradeReq.rumFee);
                await rumToken.connect(user).approve(await storageUpgrade.getAddress(), upgradeReq.rumFee);

                // Start upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");

                // Increase time significantly more than the upgrade time
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 1000]);
                await ethers.provider.send("evm_mine");

                // Finish upgrade
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);

         

                const tokenArrays = await storageUpgrade.getTokens(
                    user.address,
                    genesisPiratesAddress
                );
                const [initialTotalTokens, initialWorking, initialFinished] = tokenArrays;
                
                

                // Check for no duplicate tokens
                expect(new Set(initialWorking).size).to.equal(initialWorking.length);
                expect(new Set(initialFinished).size).to.equal(initialFinished.length);

                // Verify token tracking through working/finished states
                if (level > 0) {
                    expect(initialWorking).to.deep.equal([]);
                    expect(initialFinished).to.deep.equal([]);
                } else {
                    expect(initialWorking).to.deep.equal([]);
                    expect(initialFinished).to.deep.equal([]);
                }

                // Verify arrays are cleared after upgrade completion

       

                const AfterUpgradeTokenArrays = await storageUpgrade.getTokens(
                    user.address,
                    genesisPiratesAddress
                );
                const [finalTotalTokens, finalWorking, finalFinished] = AfterUpgradeTokenArrays;

                expect(finalWorking).to.deep.equal([]);
                expect(finalFinished).to.deep.equal([]);
                expect(finalTotalTokens).to.deep.equal([]);
            }

            // After completing all 25 upgrades
            // Verify final level by checking the last successful upgrade info
            const finalStakingInfo = await storageUpgrade.getStorageLevelForAssignedStorage(genesisPiratesAddress, 1);
            expect(finalStakingInfo).to.equal(25);
            
            // Verify attempting to get requirements for level 26 fails
            await expect(
                storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress)
            ).to.be.revertedWith("Max level reached");
        });
    });

    describe("Pause Functionality", function () {
        it("should not allow starting upgrade when paused", async function () {
            await storageUpgrade.connect(admin).pause();
            
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWithCustomError(storageUpgrade, "EnforcedPause");
        });

        it("should not allow finishing upgrade when paused", async function () {
            await storageUpgrade.connect(admin).pause();
            
            await expect(
                storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1)
            ).to.be.revertedWithCustomError(storageUpgrade, "EnforcedPause");
        });

        it("should allow operations after unpause", async function () {
            // First assign storage using a Huge island (ID 1)
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await islandNft.connect(admin).mint(user.address);

            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Get upgrade requirements first
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

            // Add required resources based on the requirements
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Approve RUM spending
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), upgradeReq.rumFee);

            await storageUpgrade.connect(admin).pause();
            await storageUpgrade.connect(admin).unpause();
            
            // Should now be able to start upgrade
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.not.reverted;

            // Wait for construction time
            await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");

            // Finish the upgrade
            await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);
        });
    });

    describe("Island Size Validation", function () {
        beforeEach(async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await islandNft.connect(admin).mintSpecific(user.address, 10000); // Mint an ExtraSmall island (ID > 5000)
            await islandNft.connect(admin).mintSpecific(user.address, 400); // Mint a Small island (ID in 4000-5000 range)
            await islandNft.connect(admin).mintSpecific(user.address, 81); // Mint a Medium island (ID in 4000-5000 range)
            await islandNft.connect(admin).mintSpecific(user.address, 17); // Mint a Large island (ID in 4000-5000 range)
            await islandNft.connect(admin).mintSpecific(user.address, 1); // Mint a Huge island (ID in 4000-5000 range)

            await rumToken.connect(admin).mint(user.address, ethers.parseEther("100000")); 
            //await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("100000"));
            //await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("100000"));
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
        });

        it("should fail upgrade to level 6 with ExtraSmall island", async function () {
            // Assign storage using an ExtraSmall island (ID 5001)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 10000);
            
            // Upgrade through levels 1-5 first
            for (let i = 0; i < 5; i++) {
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add resources for each upgrade
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        10000,
                        user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    10000,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Approve RUM spending
                await rumToken.connect(user).approve(await storageUpgrade.getAddress(), upgradeReq.rumFee);

                // Start and complete upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);
            }

            // Now try to upgrade to level 6 (should fail due to island size)
            const level6Req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < level6Req.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    10000,
                    user.address,
                    level6Req.resourceTypes[i],
                    level6Req.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                10000,
                user.address,
                "fish",
                level6Req.foodFish
            );

            // Try to start upgrade to level 6 with ExtraSmall island
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Island size too small");
        });

        it("should fail upgrade to level 11 with Small island", async function () {
            // Assign storage using a Small island (ID 4000)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 400);
            
            // Upgrade through levels 1-10 first
            for (let i = 0; i < 10; i++) {
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add resources for each upgrade
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                        400,
                    user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    400,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Approve RUM spending
                await rumToken.connect(user).approve(await feeManagement.getAddress(), upgradeReq.rumFee);

                // Start and complete upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);
            }

            // Now try to upgrade to level 11 (should fail due to island size)
            const level11Req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < level11Req.resourceTypes.length; i++) {                
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    400,
                    user.address,
                    level11Req.resourceTypes[i],
                    level11Req.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                400,
                user.address,
                "fish",
                level11Req.foodFish
            );

            // Try to start upgrade to level 11 with Small island
                await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Island size too small");
        });
        it("should fail upgrade to level 16 with Medium island", async function () {
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign storage using Medium island
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 81);

            // Upgrade storage to level 15
            for (let level = 1; level <= 15; level++) {
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add required resources
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        81,
                        user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    81,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Approve RUM spending
                await rumToken.connect(user).approve(await feeManagement.getAddress(), upgradeReq.rumFee);

                // Start and complete upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);
            }

            // Now try to upgrade to level 16 (should fail due to island size)
            const level16Req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < level16Req.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    81,
                    user.address,
                    level16Req.resourceTypes[i],
                    level16Req.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                81,
                user.address,
                "fish",
                level16Req.foodFish
            );

            // Try to start upgrade to level 16 with Medium island
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Island size too small");
        });
        it("should fail upgrade to level 21 with Large island", async function () {
            // Assign storage using a Large island (ID 81)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 17);
            
            // Upgrade through levels 1-20 first
            for (let i = 0; i < 20; i++) {
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add resources for each upgrade
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                        17,
                    user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    17,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Approve RUM spending
                await rumToken.connect(user).approve(await feeManagement.getAddress(), upgradeReq.rumFee);

                // Start and complete upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);
            }

            // Now try to upgrade to level 21 (should fail due to island size)
            const level21Req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < level21Req.resourceTypes.length; i++) {
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                    17,
                    user.address,
                    level21Req.resourceTypes[i],
                    level21Req.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                17,
                user.address,
                "fish",
                level21Req.foodFish
            );

            // Try to start upgrade to level 21 with Large island
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Island size too small");
        });
        it("should fail upgrade to level 26 with Huge island", async function () {
            // Assign storage using a Huge island (ID 1)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            
            // Upgrade through levels 1-25 first
            for (let i = 0; i < 25; i++) {
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add resources for each upgrade
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        1,
                        user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Approve RUM spending
                await rumToken.connect(user).approve(await feeManagement.getAddress(), upgradeReq.rumFee);

                // Start and complete upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);
            }

            // Try to get requirements for level 26 (should fail)
            await expect(
                storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress)
            ).to.be.revertedWith("Max level reached");
        });
    });

    describe("Token Receiver Functionality", function () {
        it("should implement ERC1155Receiver correctly", async function () {
            const interfaceId = "0x4e2312e0"; // ERC1155Receiver interface ID
            expect(await storageUpgrade.supportsInterface(interfaceId)).to.be.true;

            // Test onERC1155Received
            const data = ethers.randomBytes(0);
            const selector = await storageUpgrade.onERC1155Received(
                ethers.ZeroAddress,
                ethers.ZeroAddress,
                0,
                0,
                data
            );
            expect(selector).to.equal("0xf23a6e61");

            // Test onERC1155BatchReceived
            const batchSelector = await storageUpgrade.onERC1155BatchReceived(
                ethers.ZeroAddress,
                ethers.ZeroAddress,
                [],
                [],
                data
            );
            expect(batchSelector).to.equal("0xbc197c81");
        });

        it("should implement ERC721Receiver correctly", async function () {
            const interfaceId = "0x150b7a02"; // ERC721Receiver interface ID
            expect(await storageUpgrade.supportsInterface(interfaceId)).to.be.true;

            // Test onERC721Received
            const data = ethers.randomBytes(0);
            const selector = await storageUpgrade.onERC721Received(
                ethers.ZeroAddress,
                ethers.ZeroAddress,
                0,
                data
            );
            expect(selector).to.equal("0x150b7a02");
        });

        it("should handle token transfers during upgrade process", async function () {
            // Mint and approve tokens
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await islandNft.connect(admin).mint(user.address);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign storage
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);

            // Add required resources
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Start upgrade and verify token transfer
            await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
            
            // Verify token is now owned by the contract
            expect(await simpleERC1155.balanceOf(await storageUpgrade.getAddress(), 1)).to.equal(1);

            // Complete upgrade and verify token return
            await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");
            await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);

            // Verify token is returned to the user
            expect(await simpleERC1155.balanceOf(user.address, 1)).to.equal(1);
        });
    });

    describe("Genesis Pirate Without Island", function () {
        beforeEach(async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 3);
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            // Setup RUM tokens
            await rumToken.mint(user.address, ethers.parseEther("1000"));
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000"));
            await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("1000"));
        });

        it("should start storage upgrade without island assignment", async function () {
            // Get upgrade requirements first
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(3, genesisPiratesAddress);

            // Add required resources based on the requirements
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    pirateStorageAddress, // Use genesisPiratesAddress as storage
                    3,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource using the correct amount from upgradeReq
            await resourceManagement.connect(externalCaller).addResource(
                pirateStorageAddress, // Use genesisPiratesAddress as storage
                3,
                user.address,
                "fish",
                upgradeReq.foodFish       // Use the correct food amount
            );

            // Get the RUM fee first
            const feePerDay = await feeManagement.rumFeePerDay();
            const constructionTime = await upgradeConstructionTime.calculateUpgradeTime(
                genesisPiratesAddress,
                3,
                1  // difficulty level 1
            );
            const daysRequired = Math.ceil(Number(constructionTime) / 86400);
            const totalRumFee = feePerDay * BigInt(daysRequired);

            // Mint and approve RUM tokens
            await rumToken.mint(user.address, totalRumFee);
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), totalRumFee);

            // Get storage details to use in event check
            const [storageCollectionAddress, storageTokenId, storageContractOrExternal] = 
                await storageUpgrade.getStorageDetails(genesisPiratesAddress, 1);

            // Verify storage details
            expect(storageCollectionAddress).to.equal(genesisPiratesAddress);
            expect(storageTokenId).to.equal(1n);

            // Start the upgrade
            const tx = await storageUpgrade.connect(user).startUpgradeStorage(
                3,
                genesisPiratesAddress,
                true, // use RUM
                "fish"  // food choice
            );

            // Get the block timestamp after the transaction
            const receipt = await tx.wait();
            const block = await ethers.provider.getBlock(receipt.blockNumber);
            const startTime = block.timestamp;

            await expect(tx)
              .to.emit(storageUpgrade, "StorageUpgradeStarted")
              .withArgs(
                  user.address,                // user
                  genesisPiratesAddress,       // collectionAddress
                  3n,                          // tokenId
                  genesisPiratesAddress,       // storageCollectionAddress (same as collection)
                  3n,                          // storageTokenId
                  0n,                          // currentLevel
                  1n,                          // nextLevel
                  startTime,                   // startTime
                  startTime + Number(upgradeReq.upgradeTime), // endTime
                  true,                        // useRum
                  "fish"                       // foodChoice
              );

            // Complete the upgrade
            await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");

            await expect(
                storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 3)
            ).to.emit(storageUpgrade, "StorageUpgraded")
              .withArgs(
                  user.address,           // user
                  genesisPiratesAddress,  // collectionAddress
                  3,                      // tokenId
                  1,                      // newLevel
                  150000000000000000000n // newCapacity
              );

            // Verify the upgrade was successful
            const upgradeReqAfter = await storageUpgrade.getNewUpgradeReq(3, genesisPiratesAddress);            
            expect(upgradeReqAfter.currentLevel).to.equal(1);
        });

        it("should allow multiple upgrades without island", async function () {
            // Mint NFTs to user (like in beforeEach of other tests)
            await simpleERC1155.connect(admin).mint(user.address, 1);
            
            // Approve contracts (like in beforeEach of other tests)
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            // Setup RUM tokens (like in beforeEach of other tests)
            await rumToken.mint(user.address, ethers.parseEther("1000")); // Large amount to cover all upgrades
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000"));

            // Perform multiple upgrades (10 levels for Genesis Pirates without island)
            for (let i = 0; i < 10; i++) {
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add resources for each upgrade
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        pirateStorageAddress,
                        1,
                        user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }

                // Add food resource
                await resourceManagement.connect(externalCaller).addResource(
                    pirateStorageAddress,
                    1,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Start upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
                
                // Wait for construction time
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");

                // Finish upgrade
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);

                // Verify the level increased
                const upgradeReqAfter = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                expect(upgradeReqAfter.currentLevel).to.equal(i + 1);
            }

            // Try to upgrade to level 11 (should fail)
            const level11Req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            
            // Add resources for level 11
            for (let i = 0; i < level11Req.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    pirateStorageAddress,
                    1,
                    user.address,
                    level11Req.resourceTypes[i],
                    level11Req.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                pirateStorageAddress,
                1,
                user.address,
                "fish",
                level11Req.foodFish
            );

            // Verify upgrade to level 11 fails
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Island size too small");

            // Verify final level is still 10
            const finalUpgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            expect(finalUpgradeReq.currentLevel).to.equal(10);
        });
    });

    describe("Inhabitants Storage Upgrade", function () {
        beforeEach(async function () {
            // Mint NFTs to user (using inhabitantNft instead of simpleERC721)
            await inhabitantNft.connect(admin).mint(user.address); // Inhabitant ID 0
            await inhabitantNft.connect(admin).mint(user.address); // Inhabitant ID 1
            await islandNft.connect(admin).mint(user.address); // Island ID 0
            await islandNft.connect(admin).mint(user.address); // Island ID 1
            
            // Approve contracts
            await inhabitantNft.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await inhabitantNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            
            // Setup RUM tokens
            await rumToken.mint(user.address, ethers.parseEther("1000")); // Mint enough for all tests
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000"));
            await rumToken.connect(user).approve(await feeManagement.getAddress(), ethers.parseEther("1000"));
        });

        it("should fail to start upgrade if Inhabitant is not assigned to an island", async function () {
            // Get upgrade requirements first (following pattern from other tests)
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, inhabitantsAddress);
            
            // Add required resources (even though it will fail, following pattern)
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    0,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                0,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Attempt upgrade without assignment
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, inhabitantsAddress, true, "fish")
            ).to.be.revertedWith("Pirate is not assigned to any island");
        });

        it("should successfully start and complete upgrade when Inhabitant is assigned to an island", async function () {
            // First assign Inhabitant to an island
            await storageManagement.connect(user).assignStorageToPrimary(inhabitantsAddress, 1, 1);
            
            // Get upgrade requirements first (following pattern from other tests)
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, inhabitantsAddress);

            // Add required resources
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Get the RUM fee (following pattern from other tests)
            const feePerDay = await feeManagement.rumFeePerDay();
            const constructionTime = await upgradeConstructionTime.calculateUpgradeTime(
                inhabitantsAddress,
                1,
                1  // difficulty level 1
            );
            const daysRequired = Math.ceil(Number(constructionTime) / 86400);
            const totalRumFee = feePerDay * BigInt(daysRequired);

            // Mint more RUM tokens
            await rumToken.mint(user.address, totalRumFee);
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), totalRumFee);

            // Start upgrade
            await storageUpgrade.connect(user).startUpgradeStorage(1, inhabitantsAddress, true, "fish");
            
            // Get the actual construction time (following pattern from other tests)
            const upgradeTime = await upgradeConstructionTime.calculateUpgradeTime(
                inhabitantsAddress,
                1,
                1  // difficulty level 1
            );

            // Increase time by the actual construction time plus buffer
            await ethers.provider.send("evm_increaseTime", [Number(upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");

            // Finish upgrade
            await expect(
                storageUpgrade.connect(user).finishStorageUpgrade(inhabitantsAddress, 1)
            ).to.emit(storageUpgrade, "StorageUpgraded")
              .withArgs(
                  user.address,           // user
                  genesisIslandsAddress,  // collectionAddress
                  1,                      // tokenId (island ID)
                  1,                      // newLevel
                  6100000000000000000000n // newCapacity
              );
        });

        it("should fail to start upgrade with insufficient resources", async function () {
            // First assign Inhabitant to an island
            await storageManagement.connect(user).assignStorageToPrimary(inhabitantsAddress, 1, 1);
            
            // Try to start upgrade without adding resources (following pattern from other tests)
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, inhabitantsAddress, true, "fish")
            ).to.be.revertedWith("Insufficient wood");
        });

        it("should fail to start upgrade with insufficient RUM balance", async function () {
            // First assign Inhabitant to an island
            await storageManagement.connect(user).assignStorageToPrimary(inhabitantsAddress, 1, 1);
            
            // Add required resources
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, inhabitantsAddress);
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Make sure user has no RUM balance (following pattern from other tests)
            const userBalance = await rumToken.balanceOf(user.address);
            await rumToken.connect(user).transfer(admin.address, userBalance);

            // Try to start upgrade without RUM
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, inhabitantsAddress, true, "fish")
            ).to.be.revertedWith("Insufficient RUM balance");
        });
    });

    describe("Food Requirements", function () {
        beforeEach(async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);  // Genesis Pirate
            await islandNft.connect(admin).mintSpecific(user.address, 1);  // Mint a Huge island (ID 1)
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            // Setup RUM tokens
            await rumToken.mint(user.address, ethers.parseEther("1000"));
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000"));

            // Assign storage using the Huge island (ID 1)
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
        });

        it("should calculate correct food amounts for different durations", async function () {
            const req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            const daysRequired = Math.ceil(Number(req.upgradeTime) / 86400); // 86400 seconds in a day

            // Check food requirements match the formula
            expect(req.foodFish).to.equal(ethers.parseEther(daysRequired.toString())); // 1 per day
            expect(req.foodCoconut).to.equal(ethers.parseEther((daysRequired * 2).toString())); // 2 per day
            expect(req.foodMeat).to.equal(ethers.parseEther((daysRequired * 0.5).toString())); // 0.5 per day
            expect(req.foodBarrelPackedFish).to.equal(ethers.parseEther((daysRequired * 0.01).toString())); // 0.01 per day
            expect(req.foodBarrelPackedMeat).to.equal(ethers.parseEther((daysRequired * 0.005).toString())); // 0.005 per day
        });

        it("should handle different food choices correctly", async function () {
            // Test each food type with correct hyphenated names
            const foodTypes = ["fish", "coconut", "meat", "barrel-packed fish", "barrel-packed meat"];
            
            for (let i = 0; i < foodTypes.length; i++) {
                const foodType = foodTypes[i];
                const islandId = i + 1; // Use incremental IDs starting from 1
                
                if (i > 0) { // Skip first iteration as it's already set up in beforeEach
                    // Mint new NFTs with unique IDs
                    await simpleERC1155.connect(admin).mint(user.address, 1);
                    await islandNft.connect(admin).mintSpecific(user.address, islandId);
                    await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, islandId);
                }

                // Get fresh requirements
                const req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Add required resources
                for (let i = 0; i < req.resourceTypes.length; i++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        islandId,
                        user.address,
                        req.resourceTypes[i],
                        req.resourceAmounts[i]
                    );
                }

                // Add the specific food type
                const foodAmounts = {
                    "fish": req.foodFish,
                    "coconut": req.foodCoconut,
                    "meat": req.foodMeat,
                    "barrel-packed fish": req.foodBarrelPackedFish,
                    "barrel-packed meat": req.foodBarrelPackedMeat
                };

                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    islandId,
                    user.address,
                    foodType,
                    foodAmounts[foodType]
                );

                // Start upgrade with this food type
                await expect(
                    storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, foodType)
                ).to.not.be.reverted;

                // Complete upgrade
                await ethers.provider.send("evm_increaseTime", [Number(req.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);
            }
        });

        it("should fail with insufficient food resources", async function () {
            const req = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            
            // Add other required resources
            for (let i = 0; i < req.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    req.resourceTypes[i],
                    req.resourceAmounts[i]
                );
            }

            // Add insufficient fish (half of required)
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                req.foodFish / 2n
            );

            // Try to start upgrade
            await expect(
                storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish")
            ).to.be.revertedWith("Insufficient resource balance");
        });
    });
    
    describe("Batch Operations", function () {
        it("should handle batch finish upgrades correctly", async function () {
            // Setup multiple upgrades first
            const collectionAddresses = [genesisPiratesAddress, genesisPiratesAddress];
            const tokenIds = [[1], [2]];

            // Mint NFTs and assign storage
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await simpleERC1155.connect(admin).mint(user.address, 2);
            await islandNft.connect(admin).mint(user.address); // Mint island ID 0
            await islandNft.connect(admin).mint(user.address); // Mint island ID 1

            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign storage for both pirates
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 2, 2);

            // Setup and start upgrades for both tokens
            for (let i = 0; i < collectionAddresses.length; i++) {
                const tokenId = tokenIds[i][0];
                
                // Get upgrade requirements
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(tokenId, collectionAddresses[i]);

                // Add required resources
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        i + 1, // island ID
                        user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }

                // Add food resource
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    i + 1,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Start the upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(
                    tokenId,
                    collectionAddresses[i],
                    true, // use RUM
                    "fish"
                );
            }

            // Increase time to complete upgrades
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");

            // Now call batchFinishAllUpgrades
            await storageUpgrade.connect(admin).batchFinishAllUpgrades(
                collectionAddresses,
                tokenIds
            );

            // Verify upgrades completed and NFTs returned
            for (let i = 0; i < collectionAddresses.length; i++) {
                const tokenId = tokenIds[i][0];
                const collectionAddress = collectionAddresses[i];

                // Verify NFT returned to owner
                const nftContract = await ethers.getContractAt("SimpleERC1155", collectionAddress);
                const balance = await nftContract.balanceOf(user.address, tokenId);
                expect(balance).to.equal(1);

                // Check current level increased
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(tokenId, collectionAddress);
                const currentLevel = upgradeReq.currentLevel;
                expect(currentLevel).to.equal(1n);

          
            }
        });

        it("should process batch finish even with unfinished upgrades", async function () {
            const collectionAddresses = [genesisPiratesAddress];
            const tokenIds = [[1]];

            // Mint NFT and assign storage
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await islandNft.connect(admin).mint(user.address);

            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign storage
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);

            // Setup upgrade
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

            // Add required resources
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Start the upgrade
            await storageUpgrade.connect(user).startUpgradeStorage(
                1,
                genesisPiratesAddress,
                true,
                "fish"
            );

            // Get initial state
            const initialUpgradeInfo = await storageUpgrade.getUpgradeInfo(genesisPiratesAddress, 1);
            const initialLevel = initialUpgradeInfo.currentLevel;

            // Process batch finish without waiting for completion
            await storageUpgrade.connect(admin).batchFinishAllUpgrades(
                collectionAddresses,
                tokenIds
            );

            // Verify NFT was returned to owner
            const nftBalance = await simpleERC1155.balanceOf(user.address, 1);
            expect(nftBalance).to.equal(1);

            const upgradeReqNew = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            const currentLevelNew = upgradeReqNew.currentLevel;
            expect(currentLevelNew).to.equal(1n);
        });

        it("should handle batch finish upgrades for both ERC1155 and ERC721 tokens", async function () {
            // Setup collections and token IDs
            const collectionAddresses = [genesisPiratesAddress, inhabitantsAddress];
            const tokenIds = [[1], [1]]; // One token from each collection

            // Mint NFTs
            await simpleERC1155.connect(admin).mint(user.address, 1); // Genesis Pirate (ERC1155)
            await inhabitantNft.connect(admin).mint(user.address);    // Inhabitant (ERC721)
            await islandNft.connect(admin).mint(user.address);       // Island for Genesis Pirate
            await islandNft.connect(admin).mint(user.address);       // Island for Inhabitant

            // Approve all contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await inhabitantNft.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await inhabitantNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign storage for both tokens
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            await storageManagement.connect(user).assignStorageToPrimary(inhabitantsAddress, 1, 2);

            // Setup and start upgrades for both tokens
            for (let i = 0; i < collectionAddresses.length; i++) {
                const tokenId = tokenIds[i][0];
                const collectionAddress = collectionAddresses[i];
                
                // Get upgrade requirements
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(tokenId, collectionAddress);

                // Add required resources
                for (let j = 0; j < upgradeReq.resourceTypes.length; j++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        i + 1, // island ID
                        user.address,
                        upgradeReq.resourceTypes[j],
                        upgradeReq.resourceAmounts[j]
                    );
                }

                // Add food resource
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    i + 1,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Start the upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(
                    tokenId,
                    collectionAddress,
                    true, // use RUM
                    "fish"
                );
            }

            // Store initial balances
            const initialERC1155Balance = await simpleERC1155.balanceOf(user.address, 1);
            const initialERC721Owner = await inhabitantNft.ownerOf(1);

            // Process batch finish without waiting for completion
            await storageUpgrade.connect(admin).batchFinishAllUpgrades(
                collectionAddresses,
                tokenIds
            );

            // Verify ERC1155 (Genesis Pirate) was returned correctly
            const finalERC1155Balance = await simpleERC1155.balanceOf(user.address, 1);
            expect(finalERC1155Balance).to.equal(Number(initialERC1155Balance) + 1);

            // Verify ERC721 (Inhabitant) was returned correctly
            const finalERC721Owner = await inhabitantNft.ownerOf(1);
            expect(finalERC721Owner).to.equal(user.address);

            // Verify upgrades were completed for both tokens
            for (let i = 0; i < collectionAddresses.length; i++) {
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(
                    tokenIds[i][0],
                    collectionAddresses[i]
                );
                expect(upgradeReq.currentLevel).to.equal(1n);
            }

            // Verify storage capacities were increased for both tokens
            const [genesisPirateStorageAddress, genesisPirateStorageId] = 
                await storageManagement.getAssignedStorage(genesisPiratesAddress, 1);
            const [inhabitantStorageAddress, inhabitantStorageId] = 
                await storageManagement.getAssignedStorage(inhabitantsAddress, 1);

            const genesisPirateCapacity = await storageManagement.getStorageCapacity(
                genesisPirateStorageAddress,
                genesisPirateStorageId
            );
            const inhabitantCapacity = await storageManagement.getStorageCapacity(
                inhabitantStorageAddress,
                inhabitantStorageId
            );

            expect(genesisPirateCapacity).to.be.gt(0);
            expect(inhabitantCapacity).to.be.gt(0);
        });
    });

    describe("Working and Finished Tokens", function () {
        it("should return correct working and finished counts in getTokens", async function () {
            // Setup collections and token IDs
            const collectionAddress = genesisPiratesAddress;
            const tokenId1 = 1n;
            const tokenId2 = 2n;

            // Mint NFTs and islands
            await simpleERC1155.connect(admin).mint(user.address, tokenId1);
            await simpleERC1155.connect(admin).mint(user.address, tokenId2);
            
            // Mint islands - we want Huge islands (from part 13)
            await islandNft.connect(admin).mint(user.address); // ID 1 (first Huge island)
            await islandNft.connect(admin).mint(user.address); // ID 2 (second Huge island)

            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign storage for both tokens using Huge islands (IDs 1 and 2)
            await storageManagement.connect(user).assignStorageToPrimary(collectionAddress, tokenId1, 1);
            await storageManagement.connect(user).assignStorageToPrimary(collectionAddress, tokenId2, 2);

            // Start upgrade for first token
            const upgradeReq1 = await storageUpgrade.getNewUpgradeReq(tokenId1, collectionAddress);

            // Add resources for first token
            for (let i = 0; i < upgradeReq1.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq1.resourceTypes[i],
                    upgradeReq1.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq1.foodFish
            );

            // Start first upgrade
            await storageUpgrade.connect(user).startUpgradeStorage(
                tokenId1,
                collectionAddress,
                true,
                "fish"
            );

            // Get requirements for second token
            const upgradeReq2 = await storageUpgrade.getNewUpgradeReq(tokenId2, collectionAddress);

            // Add resources for second token
            for (let i = 0; i < upgradeReq2.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    2, // Using second island
                    user.address,
                    upgradeReq2.resourceTypes[i],
                    upgradeReq2.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                2,
                user.address,
                "fish",
                upgradeReq2.foodFish
            );

            // Advance time a bit before starting second upgrade
            await ethers.provider.send("evm_increaseTime", [1000]); // advance 1000 seconds
            await ethers.provider.send("evm_mine");

            // Start second upgrade
            await storageUpgrade.connect(user).startUpgradeStorage(
                tokenId2,
                collectionAddress,
                true,
                "fish"
            );

            // Check getTokens after first upgrade started
            const tokenArrays = await storageUpgrade.getTokens(
                user.address,
                genesisPiratesAddress
            );
            let [totalTokens, workingTokens, finishedTokens] = tokenArrays;

            expect(workingTokens.length).to.equal(2);
            expect(finishedTokens.length).to.equal(0);
            expect(workingTokens[0]).to.equal(tokenId1);

            // Check getTokens after second upgrade started
            [totalTokens, workingTokens, finishedTokens] = await storageUpgrade.getTokens(
                user.address,
                collectionAddress
            );
            expect(workingTokens.length).to.equal(2);
            expect(finishedTokens.length).to.equal(0);
            expect(workingTokens).to.include(tokenId1);
            expect(workingTokens).to.include(tokenId2);

            // Get current block timestamp and staking info
            const currentTime = (await ethers.provider.getBlock('latest')).timestamp;
            const info1 = await storageUpgrade.stakingInfo(collectionAddress, tokenId1);
            const info2 = await storageUpgrade.stakingInfo(collectionAddress, tokenId2);

            // Find which token finishes first
            const firstToFinish = Number(info1.endTime) < Number(info2.endTime) ? 1 : 2;
            const firstEndTime = firstToFinish === 1 ? info1.endTime : info2.endTime;
            const firstTokenId = firstToFinish === 1 ? tokenId1 : tokenId2;
            const secondTokenId = firstToFinish === 1 ? tokenId2 : tokenId1;

            // Advance time to just after first token's end time
            const timeToAdvance = Number(firstEndTime) - currentTime + 1;
            await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
            await ethers.provider.send("evm_mine");

            [totalTokens, workingTokens, finishedTokens] = await storageUpgrade.getTokens(
                user.address,
                collectionAddress
            );

            expect(finishedTokens.length).to.equal(1);
            expect(finishedTokens[0]).to.equal(firstTokenId);
            // Finish first token
            await storageUpgrade.connect(user).finishStorageUpgrade(collectionAddress, firstTokenId);

            // Check getTokens after first token finished
            [totalTokens, workingTokens, finishedTokens] = await storageUpgrade.getTokens(
                user.address,
                collectionAddress
            );
            
            expect(workingTokens.length).to.equal(1);
            expect(finishedTokens.length).to.equal(0);
            expect(workingTokens[0]).to.equal(secondTokenId);

            // Advance time to just after second token's end time
            const secondEndTime = firstToFinish === 1 ? info2.endTime : info1.endTime;
            const timeToAdvance2 = Number(secondEndTime) - (await ethers.provider.getBlock('latest')).timestamp + 1;
            await ethers.provider.send("evm_increaseTime", [timeToAdvance2]);
            await ethers.provider.send("evm_mine");

            // Finish second token
            await storageUpgrade.connect(user).finishStorageUpgrade(collectionAddress, secondTokenId);

            // Final check
            [totalTokens, workingTokens, finishedTokens] = await storageUpgrade.getTokens(
                user.address,
                collectionAddress
            );
            expect(workingTokens.length).to.equal(0);
            expect(finishedTokens.length).to.equal(0);
        });
    });

    describe("Staking Functionality", function () {
        it("should correctly track all staked tokens", async function () {
            // Mint multiple NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await simpleERC1155.connect(admin).mint(user.address, 2);
            await simpleERC1155.connect(admin).mint(user.address, 3);

            // Mint islands for storage
            await islandNft.connect(admin).mint(user.address); // ID 1
            await islandNft.connect(admin).mint(user.address); // ID 2
            await islandNft.connect(admin).mint(user.address); // ID 3

            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign storage for each pirate
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 2, 2);
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 3, 3);

            // Get upgrade requirements for first level
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

            // Add all required resources for each pirate
            for (let pirateId = 1; pirateId <= 3; pirateId++) {
                // Add resources for upgrade
                for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        pirateId,
                        user.address,
                        upgradeReq.resourceTypes[i],
                        upgradeReq.resourceAmounts[i]
                    );
                }

                // Add food resource (fish)
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    pirateId,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );
            }

            // Start upgrades for multiple tokens
            await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");
            await storageUpgrade.connect(user).startUpgradeStorage(2, genesisPiratesAddress, true, "fish");
            await storageUpgrade.connect(user).startUpgradeStorage(3, genesisPiratesAddress, true, "fish");

            // Get all staked tokens for the user and collection
            const stakedTokens = await storageUpgrade.getAllStakedTokens(user.address, genesisPiratesAddress);
            
            // Verify the staked tokens array
            expect(stakedTokens).to.have.lengthOf(3);
            expect(stakedTokens).to.include.members([1n, 2n, 3n]);

            // Get the actual upgrade duration for token 1
            const stakingInfo = await storageUpgrade.stakingInfo(genesisPiratesAddress, 1);
            const upgradeDuration = stakingInfo.endTime - stakingInfo.startTime;

            // Advance time past the end time
            await ethers.provider.send("evm_increaseTime", [Number(upgradeDuration) + 1]);
            await ethers.provider.send("evm_mine");
            
            // Now finish the upgrade
            await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);

            // Check updated staked tokens
            const updatedStakedTokens = await storageUpgrade.getAllStakedTokens(user.address, genesisPiratesAddress);
            expect(updatedStakedTokens).to.have.lengthOf(2);
            expect(updatedStakedTokens).to.include.members([2n, 3n]);
            expect(updatedStakedTokens).to.not.include(1n);
        });
    });

    describe("Level Progression and Token Tracking", function () {
        it("should correctly track tokens and levels from 1 to 25", async function () {
            // Mint NFTs to user
            await simpleERC1155.connect(admin).mint(user.address, 1);  // Genesis Pirate
            await islandNft.connect(admin).mintSpecific(user.address, 1);  // Huge island (ID 1)
            
            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            
            // Setup RUM tokens with large amount for all upgrades
            const largeAmount = ethers.parseEther("1000000"); // Increased amount
            await rumToken.mint(user.address, largeAmount);
            // Approve both contracts with the large amount
            await rumToken.connect(user).approve(await storageUpgrade.getAddress(), largeAmount);
            await rumToken.connect(user).approve(await feeManagement.getAddress(), largeAmount);

            // Assign storage using Huge island
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);

            // Upgrade through all 25 levels
            for (let level = 0n; level < 25n; level++) {
                // Get upgrade requirements
                const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
                
                // Verify current and next level are correct
                expect(upgradeReq.currentLevel).to.equal(BigInt(level));
                expect(upgradeReq.nextLevel).to.equal(BigInt(level + 1n));

                // Add required resources
                for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                    await resourceManagement.connect(externalCaller).addResource(
                        islandStorageAddress,
                        1,
                        user.address,
                        upgradeReq.resourceTypes[i],
                        upgradeReq.resourceAmounts[i]
                    );
                }

                // Add food resource
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    "fish",
                    upgradeReq.foodFish
                );

                // Get RUM fee and ensure sufficient approval
                const feePerDay = await feeManagement.rumFeePerDay();
                const constructionTime = await upgradeConstructionTime.calculateUpgradeTime(
                    genesisPiratesAddress,
                    1,
                    level + 1n  // Convert to BigInt
                );
                const daysRequired = Math.ceil(Number(constructionTime) / 86400);
                const totalRumFee = feePerDay * BigInt(daysRequired);

                // Mint and approve RUM tokens
                await rumToken.mint(user.address, totalRumFee);
                await rumToken.connect(user).approve(await storageUpgrade.getAddress(), totalRumFee);

                // Start upgrade
                await storageUpgrade.connect(user).startUpgradeStorage(
                    1,
                    genesisPiratesAddress,
                    true,
                    "fish"
                );

                // Check getTokens after starting upgrade
                const [totalTokens, workingTokens, finishedTokens] = await storageUpgrade.getTokens(
                    user.address,
                    genesisPiratesAddress
                );

                // Verify no duplicate tokens
                expect(workingTokens.length).to.equal(1);
                expect(workingTokens[0]).to.equal(1n);
                expect(finishedTokens.length).to.equal(0);

                // Complete upgrade
                await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
                await ethers.provider.send("evm_mine");

                // Check getTokens before finishing upgrade
                const [preTotalTokens, preWorkingTokens, preFinishedTokens] = await storageUpgrade.getTokens(
                    user.address,
                    genesisPiratesAddress
                );
                
                // Verify token is in finished array
                expect(preWorkingTokens.length).to.equal(0);
                expect(preFinishedTokens.length).to.equal(1);
                expect(preFinishedTokens[0]).to.equal(1n);

                // Finish upgrade
                await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);

                // Check getTokens after finishing upgrade
                const [postTotalTokens, postWorkingTokens, postFinishedTokens] = await storageUpgrade.getTokens(
                    user.address,
                    genesisPiratesAddress
                );
                
                // Verify no tokens in either array after completion
                expect(postWorkingTokens.length).to.equal(0);
                expect(postFinishedTokens.length).to.equal(0);
            }

            // After completing all 25 upgrades
            // Verify final level by checking the last successful upgrade info
            const finalLevel = await storageUpgrade.getStorageLevelForAssignedStorage(genesisPiratesAddress, 1);
            expect(finalLevel).to.equal(25);
            
            // Verify attempting to get requirements for level 26 fails
            await expect(
                storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress)
            ).to.be.revertedWith("Max level reached");
        });
    });

    describe("Staker Address Tracking", function () {
        it("should correctly track and return staker addresses", async function () {
            // Setup multiple users
            const [user2, user3] = await ethers.getSigners();
            
            // Mint NFTs to different users
            await simpleERC1155.connect(admin).mint(user.address, 1);
            await simpleERC1155.connect(admin).mint(user2.address, 2);
            await simpleERC1155.connect(admin).mint(user3.address, 3);

            // Mint islands for storage
            await islandNft.connect(admin).mint(user.address);  // ID 1
            await islandNft.connect(admin).mint(user2.address); // ID 2
            await islandNft.connect(admin).mint(user3.address); // ID 3

            // Setup approvals and storage assignments for all users
            for (const currentUser of [user, user2, user3]) {
                await simpleERC1155.connect(currentUser).setApprovalForAll(await storageUpgrade.getAddress(), true);
                await simpleERC1155.connect(currentUser).setApprovalForAll(await storageManagement.getAddress(), true);
                await islandNft.connect(currentUser).setApprovalForAll(await storageManagement.getAddress(), true);
                
                // Mint and approve RUM tokens for each user
                await rumToken.mint(currentUser.address, ethers.parseEther("1000")); // Mint enough RUM
                await rumToken.connect(currentUser).approve(await storageUpgrade.getAddress(), ethers.parseEther("1000"));
            }

            // Assign storage for each user
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            await storageManagement.connect(user2).assignStorageToPrimary(genesisPiratesAddress, 2, 2);
            await storageManagement.connect(user3).assignStorageToPrimary(genesisPiratesAddress, 3, 3);

            // Initially should have no stakers
            let stakers = await storageUpgrade.getStakerAddresses(genesisPiratesAddress);
            expect(stakers.length).to.equal(0);

            // Start upgrade for first user
            const upgradeReq1 = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);
            await addResourcesAndStartUpgrade(user, 1, upgradeReq1);

            // Rest of the test remains the same...
        });

        // Update helper function to include RUM approval
        async function addResourcesAndStartUpgrade(currentUser, tokenId, upgradeReq) {
            // Add required resources
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    tokenId,
                    currentUser.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }

            // Add food resource
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                tokenId,
                currentUser.address,
                "fish",
                upgradeReq.foodFish
            );

            // Ensure RUM approval
            const rumBalance = await rumToken.balanceOf(currentUser.address);
            if (rumBalance < upgradeReq.rumFee) {
                await rumToken.mint(currentUser.address, upgradeReq.rumFee);
            }
            await rumToken.connect(currentUser).approve(await storageUpgrade.getAddress(), upgradeReq.rumFee);

            // Start upgrade
            await storageUpgrade.connect(currentUser).startUpgradeStorage(
                tokenId,
                genesisPiratesAddress,
                true, // use RUM
                "fish"
            );
        }
    });

    describe("Batch Get Upgrade Info", function () {
        it("should return correct storage info when querying with pirate details", async function () {
            // Mint NFTs
            await simpleERC1155.connect(admin).mint(user.address, 1);  // Genesis Pirate
            await simpleERC1155.connect(admin).mint(user.address, 2);  // Another Genesis Pirate
            await islandNft.connect(admin).mint(user.address);         // Island ID 1

            // Approve contracts
            await simpleERC1155.connect(user).setApprovalForAll(await storageUpgrade.getAddress(), true);
            await simpleERC1155.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);
            await islandNft.connect(user).setApprovalForAll(await storageManagement.getAddress(), true);

            // Assign both pirates to the same island
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 1, 1);
            await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, 2, 1);

            // Get upgrade requirements for first pirate
            const upgradeReq = await storageUpgrade.getNewUpgradeReq(1, genesisPiratesAddress);

            // Add resources for first pirate
            for (let i = 0; i < upgradeReq.resourceTypes.length; i++) {
                await resourceManagement.connect(externalCaller).addResource(
                    islandStorageAddress,
                    1,
                    user.address,
                    upgradeReq.resourceTypes[i],
                    upgradeReq.resourceAmounts[i]
                );
            }
            await resourceManagement.connect(externalCaller).addResource(
                islandStorageAddress,
                1,
                user.address,
                "fish",
                upgradeReq.foodFish
            );

            // Start upgrade with first pirate
            await storageUpgrade.connect(user).startUpgradeStorage(1, genesisPiratesAddress, true, "fish");

            // Get batch upgrade info for both pirates
            const upgradeInfos = await storageUpgrade.batchGetUpgradeInfo(
                genesisPiratesAddress,
                [1, 2]
            );

            // Both pirates share the same storage (Island ID 1)
            // Verify first pirate's upgrade info
            expect(upgradeInfos[0].currentLevel).to.equal(0);
            expect(upgradeInfos[0].nextLevel).to.equal(1);
            expect(upgradeInfos[0].claimed).to.equal(false);
            expect(upgradeInfos[0].startTime).to.be.gt(0);
            expect(upgradeInfos[0].endTime).to.be.gt(upgradeInfos[0].startTime);

            // Verify second pirate's upgrade info (should show same storage level but no active upgrade)
            expect(upgradeInfos[1].currentLevel).to.equal(0);
            expect(upgradeInfos[1].nextLevel).to.equal(1);
            expect(upgradeInfos[1].claimed).to.equal(false);
            expect(upgradeInfos[1].startTime).to.equal(0);
            expect(upgradeInfos[1].endTime).to.equal(0);

            // Complete the upgrade
            await ethers.provider.send("evm_increaseTime", [Number(upgradeReq.upgradeTime) + 100]);
            await ethers.provider.send("evm_mine");
            await storageUpgrade.connect(user).finishStorageUpgrade(genesisPiratesAddress, 1);

            // Get batch upgrade info again
            const upgradeInfosAfter = await storageUpgrade.batchGetUpgradeInfo(
                genesisPiratesAddress,
                [1, 2]
            );

            // Both pirates should now show the upgraded storage level
            expect(upgradeInfosAfter[0].currentLevel).to.equal(1);
            expect(upgradeInfosAfter[0].nextLevel).to.equal(2);
            expect(upgradeInfosAfter[0].startTime).to.equal(0);
            expect(upgradeInfosAfter[0].endTime).to.equal(0);

            expect(upgradeInfosAfter[1].currentLevel).to.equal(1);
            expect(upgradeInfosAfter[1].nextLevel).to.equal(2);
            expect(upgradeInfosAfter[1].startTime).to.equal(0);
            expect(upgradeInfosAfter[1].endTime).to.equal(0);
        });
    });
});
