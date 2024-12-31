const { expect } = require("chai");
const { ethers } = require("hardhat");

const { deployAndAuthorizeContract } = require('./utils');

describe("IslandStorageMigrationV2", function () {
    let admin, user1, user2, externalCaller;
    let centralAuthRegistry;
    let oldIslandStorage, newIslandStorage;
    let simpleERC721;
    let resourceManagement;
    let islandStorageMigrationV2;

    beforeEach(async function () {
        [admin, user1, user2, externalCaller] = await ethers.getSigners();

        // Deploy CentralAuthorizationRegistry
        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthRegistry.initialize(admin.address);

        // Add authorized caller
        await centralAuthRegistry.addAuthorizedContract(externalCaller.address);

        // Deploy SimpleERC721 with name and symbol
        const SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        simpleERC721 = await SimpleERC721.deploy("TestNFT", "TNFT", "https://test.com/", admin.address);

        // Deploy ResourceManagement using helper
        resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthRegistry);
        await deployAndAuthorizeContract("ResourceTypeManager", centralAuthRegistry);

        // Deploy BaseStorage contracts (old and new)
        oldIslandStorage = await deployAndAuthorizeContract(
            "IslandStorage",
            centralAuthRegistry,
            await simpleERC721.getAddress(),
            false
        );
        await oldIslandStorage.waitForDeployment();

        newIslandStorage = await deployAndAuthorizeContract(
            "IslandStorage",
            centralAuthRegistry,
            await simpleERC721.getAddress(),
            true
        );

        // Deploy IslandStorageMigrationV2
        islandStorageMigrationV2 = await deployAndAuthorizeContract("IslandStorageMigrationV2", centralAuthRegistry, await oldIslandStorage.getAddress(), await newIslandStorage.getAddress(), await simpleERC721.getAddress());        
    });

    describe("Initialization", function () {
        it("should correctly initialize contract addresses", async function () {
            expect(await islandStorageMigrationV2.oldIslandStorage()).to.equal(await oldIslandStorage.getAddress());
            expect(await islandStorageMigrationV2.newIslandStorage()).to.equal(await newIslandStorage.getAddress());
            expect(await islandStorageMigrationV2.CollectionAddress()).to.equal(await simpleERC721.getAddress());
        });
    });

    describe("Migration", function () {
        beforeEach(async function () {
            // Mint NFTs to users using SimpleERC721
            await simpleERC721.connect(admin).mint(user1.address);  // ID 1
            await simpleERC721.connect(admin).mint(user1.address);  // ID 2
            await simpleERC721.connect(admin).mint(user2.address);  // ID 3

            // Add resources to old storage for user1's tokens
            await resourceManagement.connect(externalCaller).addResource(
                await oldIslandStorage.getAddress(),
                1,
                user1.address,
                "wood",
                ethers.parseEther("100")
            );
            await resourceManagement.connect(externalCaller).addResource(
                await oldIslandStorage.getAddress(),
                2,
                user1.address,
                "stone",
                ethers.parseEther("50")
            );

            // Add resources to old storage for user2's token
            await resourceManagement.connect(externalCaller).addResource(
                await oldIslandStorage.getAddress(),
                3,
                user2.address,
                "wood",
                ethers.parseEther("75")
            );
        });

        it("should correctly migrate resources for a single owner", async function () {
            await islandStorageMigrationV2.connect(admin).migrateOwnerTokens(user1.address);

            // Check resources in new storage for user1's tokens
            const [types1, balances1] = await newIslandStorage.getAllResourceBalances(1);
            expect(balances1[types1.indexOf("wood")]).to.equal(ethers.parseEther("100"));

            const [types2, balances2] = await newIslandStorage.getAllResourceBalances(2);
            expect(balances2[types2.indexOf("stone")]).to.equal(ethers.parseEther("50"));

            // Check if owner was added to migratedOwners
            const migratedOwners = await islandStorageMigrationV2.getMigratedOwners();
            expect(migratedOwners).to.include(user1.address);
        });

        it("should correctly migrate resources for multiple owners", async function () {
            await islandStorageMigrationV2.connect(admin).migrateAllOwners([user1.address, user2.address]);

            // Check resources in new storage for both users
            const [types1, balances1] = await newIslandStorage.getAllResourceBalances(1);
            expect(balances1[types1.indexOf("wood")]).to.equal(ethers.parseEther("100"));

            const [types3, balances3] = await newIslandStorage.getAllResourceBalances(3);
            expect(balances3[types3.indexOf("wood")]).to.equal(ethers.parseEther("75"));

            // Check if both owners were added to migratedOwners
            const migratedOwners = await islandStorageMigrationV2.getMigratedOwners();
            expect(migratedOwners).to.include(user1.address);
            expect(migratedOwners).to.include(user2.address);
        });

        it("should prevent migration after completion", async function () {
            await islandStorageMigrationV2.connect(admin).updateStorageManagement();
            await expect(
                islandStorageMigrationV2.connect(admin).migrateOwnerTokens(user1.address)
            ).to.be.revertedWith("Migration has already been completed");
        });

        it("should only allow admin to migrate", async function () {
            await expect(
                islandStorageMigrationV2.connect(user1).migrateOwnerTokens(user1.address)
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("should correctly get token IDs by owner", async function () {
            const user1Tokens = await islandStorageMigrationV2.getTokenIdsByOwner(user1.address);
            expect(user1Tokens.length).to.equal(2);
            expect(user1Tokens[0]).to.equal(1);
            expect(user1Tokens[1]).to.equal(2);

            const user2Tokens = await islandStorageMigrationV2.getTokenIdsByOwner(user2.address);
            expect(user2Tokens.length).to.equal(1);
            expect(user2Tokens[0]).to.equal(3);
        });
    });
}); 