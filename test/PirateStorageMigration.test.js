const { expect } = require("chai");
const { ethers } = require("hardhat");

const { deployAndAuthorizeContract } = require('./utils');

describe("PirateStorageMigration", function () {
    let PirateStorageMigration;
    let BaseStorage;
    let migration;
    let oldStorage;
    let newStorage;
    let owner;
    let admin;
    let user;
    let centralAuthorizationRegistry;
    let genesisPiratesAddress;
    let genesisIslandsAddress;
    let SimpleERC1155;
    let SimpleERC721;
    let simpleERC1155;
    let islandNft;
    let pirateStorage;
    let resourceTypeManager;
    let resourceManagement;
    let rumToken;
    let maticFeeRecipient;
    let islandStorage;
    let inhabitantStorage;

    // Test data
    const tokenId = 1;
    const resourceAmount = ethers.parseEther("100");
    const resourceType = "wood";

    beforeEach(async function () {
        // Get signers
        [admin, owner, user, maticFeeRecipient] = await ethers.getSigners();

        // Deploy mock Central Authorization Registry
        const CentralAuthRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);
        resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthorizationRegistry);        
        resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthorizationRegistry);
        

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

        genesisPiratesAddress = await simpleERC1155.getAddress();

        const DummyERC20Burnable = await ethers.getContractFactory("DummyERC20Burnable");
        rumToken = await DummyERC20Burnable.deploy("RUM Token", "RUM");

        SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        islandNft = await SimpleERC721.deploy("Island", "ISL", "https://island.com/", admin.address);

        await islandNft.mint(user.address);
        await islandNft.mint(user.address);
        await islandNft.mint(user.address);

        await simpleERC1155.connect(admin).mint(user.address, 1);
        await simpleERC1155.connect(admin).mint(user.address, 2);
        await simpleERC1155.connect(admin).mint(user.address, 3);

        genesisIslandsAddress = await islandNft.getAddress();

        const InhabitantNFT = await ethers.getContractFactory("SimpleERC721");
        const inhabitantNFT = await InhabitantNFT.deploy("Inhabitant", "INH", "https://inhabitant.com/", admin.address);
        const InhabitantsAddress = await inhabitantNFT.getAddress();

        const feeManagement = await deployAndAuthorizeContract("FeeManagement", centralAuthorizationRegistry, await rumToken.getAddress(), maticFeeRecipient.address);
  
        const pirateManagement = await deployAndAuthorizeContract("PirateManagement", centralAuthorizationRegistry);
        
        

        oldStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);
        
        newStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);

        islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);
        
        inhabitantStorage = await deployAndAuthorizeContract("InhabitantStorage", centralAuthorizationRegistry, InhabitantsAddress, true, genesisIslandsAddress);
                
        await islandStorage.initializeIslands(1, { gasLimit: 30000000 });        
        await islandStorage.initializeIslands(13, { gasLimit: 30000000 });
       
        await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
        // Deploy PirateStorageMigration
        migration = await deployAndAuthorizeContract(
            "PirateStorageMigration", 
            centralAuthorizationRegistry,        
            oldStorage.getAddress(), // old storage
            newStorage.getAddress(), // new storage   
        );

        await resourceManagement.addResource(await oldStorage.getAddress(), tokenId, user.address, resourceType, resourceAmount);

        console.log("resourceAmount", resourceAmount);
    });

    describe("Deployment", function () {
        it("Should set the correct old and new storage addresses", async function () {
            const oldStorageAddress = await oldStorage.getAddress();
            const newStorageAddress = await newStorage.getAddress();
            console.log("oldStorageAddress", oldStorageAddress);
            console.log("newStorageAddress", newStorageAddress);
            
            expect(await migration.oldPirateStorage()).to.equal(oldStorageAddress);
            expect(await migration.newPirateStorage()).to.equal(newStorageAddress);
        });

        it("Should initialize with migration not completed", async function () {
            expect(await migration.migrationCompleted()).to.be.false;
        });
    });

    describe("Migration", function () {
        it("Should migrate resources for a single token", async function () {
            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId]
            }];

            await migration.connect(admin).migrateAllOwners(ownerTokens);

            // Check if resources were migrated correctly
            const newBalance = await newStorage.getResourceBalance(tokenId, resourceType);
            expect(newBalance).to.equal(resourceAmount);
        });

        it("Should migrate resources for multiple tokens", async function () {
            const tokenId2 = 2;
            await oldStorage.addResource(tokenId2, user.address, resourceType, resourceAmount);

            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId, tokenId2]
            }];

            await migration.connect(admin).migrateAllOwners(ownerTokens);

            // Check balances in new storage
            const newBalance1 = await newStorage.getResourceBalance(tokenId, resourceType);
            const newBalance2 = await newStorage.getResourceBalance(tokenId2, resourceType);
            expect(newBalance1).to.equal(resourceAmount);
            expect(newBalance2).to.equal(resourceAmount);
        });

        it("Should track migrated owners", async function () {
            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId]
            }];

            await migration.connect(admin).migrateAllOwners(ownerTokens);

            const migratedOwners = await migration.getMigratedOwners();
            expect(migratedOwners).to.include(user.address);
        });

        it("Should emit MigrationCompleted event", async function () {
            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId]
            }];

            await expect(migration.connect(admin).migrateAllOwners(ownerTokens))
                .to.emit(migration, "MigrationCompleted")
                .withArgs(user.address, tokenId);
        });
    });

    describe("Access Control", function () {
        it("Should only allow admin to migrate", async function () {
            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId]
            }];

            await expect(
                migration.connect(user).migrateAllOwners(ownerTokens)
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("Should prevent migration after completion", async function () {
            await migration.connect(admin).updateStorageManagement();

            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId]
            }];

            await expect(
                migration.connect(admin).migrateAllOwners(ownerTokens)
            ).to.be.revertedWith("Migration has already been completed");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle tokens with no resources", async function () {
            const emptyTokenId = 999;
            const ownerTokens = [{
                owner: user.address,
                tokenIds: [emptyTokenId]
            }];

            await migration.connect(admin).migrateAllOwners(ownerTokens);
            const newBalance = await newStorage.getResourceBalance(emptyTokenId, resourceType);
            expect(newBalance).to.equal(0);
        });

        it("Should handle multiple resource types", async function () {
            const resourceType2 = "fish";
            await resourceManagement.addResource(await oldStorage.getAddress(), tokenId, user.address, resourceType2, resourceAmount);

            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId]
            }];

            await migration.connect(admin).migrateAllOwners(ownerTokens);

            const newBalance1 = await newStorage.getResourceBalance(tokenId, resourceType);
            const newBalance2 = await newStorage.getResourceBalance(tokenId, resourceType2);
            expect(newBalance1).to.equal(resourceAmount);
            expect(newBalance2).to.equal(resourceAmount);
        });

        it("Should handle duplicate migrations gracefully", async function () {
            const ownerTokens = [{
                owner: user.address,
                tokenIds: [tokenId]
            }];

            // First migration
            await migration.connect(admin).migrateAllOwners(ownerTokens);
            const firstBalance = await newStorage.getResourceBalance(tokenId, resourceType);

            // Attempt second migration
            await migration.connect(admin).migrateAllOwners(ownerTokens);
            const secondBalance = await newStorage.getResourceBalance(tokenId, resourceType);

            // Balances should be the same
            expect(secondBalance).to.equal(firstBalance);
        });
    });

    describe("Storage Management Update", function () {
        it("Should only allow admin to update storage management", async function () {
            await expect(
                migration.connect(user).updateStorageManagement()
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("Should set migration completed flag", async function () {
            await migration.connect(admin).updateStorageManagement();
            expect(await migration.migrationCompleted()).to.be.true;
        });

        it("Should prevent multiple storage management updates", async function () {
            await migration.connect(admin).updateStorageManagement();
            await expect(
                migration.connect(admin).updateStorageManagement()
            ).to.be.revertedWith("Migration has already been completed");
        });
    });
});