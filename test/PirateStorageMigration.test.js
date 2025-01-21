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
    let storageManagement;

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

        islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);
        
        inhabitantStorage = await deployAndAuthorizeContract("InhabitantStorage", centralAuthorizationRegistry, InhabitantsAddress, true, genesisIslandsAddress);

        storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, InhabitantsAddress, await oldStorage.getAddress(), await islandStorage.getAddress(), await inhabitantStorage.getAddress());
                
        await islandStorage.initializeIslands(1, { gasLimit: 30000000 });  
        await islandStorage.initializeIslands(2, { gasLimit: 30000000 });        
        await islandStorage.initializeIslands(13, { gasLimit: 30000000 });
       
        await centralAuthorizationRegistry.addAuthorizedContract(admin.address);

        await storageManagement.connect(user).assignStorageToPrimary(genesisPiratesAddress, tokenId, 1);

        newStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);newStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);


        // Deploy PirateStorageMigration
        migration = await deployAndAuthorizeContract(
            "PirateStorageMigration", 
            centralAuthorizationRegistry,        
            oldStorage.getAddress(), // old storage
            newStorage.getAddress(), // new storage   
        );

        await resourceManagement.addResource(await oldStorage.getAddress(), tokenId, user.address, resourceType, resourceAmount);

    });

    describe("Deployment", function () {
        it("Should set the correct old and new storage addresses", async function () {
            const oldStorageAddress = await oldStorage.getAddress();
            const newStorageAddress = await newStorage.getAddress();
            
            expect(await migration.oldStorage()).to.equal(oldStorageAddress);
            expect(await migration.newStorage()).to.equal(newStorageAddress);
        });

        it("Should initialize with migration not completed", async function () {
            expect(await migration.migrationCompleted()).to.be.false;
        });
    });

    describe("Migration", function () {
        it("Should migrate storage assignments correctly", async function () {
            const storageTokenId = 1;            

            await migration.connect(admin).migrateBatch([storageTokenId]);

            // Check progress
            const progress = await migration.getMigrationProgress(storageTokenId);
            expect(progress.completed).to.be.true;
            expect(progress.migratedAssignments).to.equal(progress.totalAssignments);
            expect(progress.remainingAssignments).to.equal(0);

            const isValid = await migration.verifyMigration(storageTokenId);
            expect(isValid).to.be.true;
        });

        it("Should migrate resources correctly", async function () {
            const oldBalance = await resourceManagement.getResourceBalance(await oldStorage.getAddress(), tokenId, resourceType);
            expect(oldBalance).to.equal(resourceAmount);

            await migration.connect(admin).migrateOwnerTokens(user.address, [tokenId]);

            const newBalance = await resourceManagement.getResourceBalance(await newStorage.getAddress(), tokenId, resourceType);
            expect(newBalance).to.equal(resourceAmount);
        });

        it("Should handle emergency assignment removal", async function () {
            const storageTokenId = 1;
            await newStorage.connect(admin).assignStorageToPrimary(genesisPiratesAddress, tokenId, storageTokenId);
            
            await migration.connect(admin).removeAssignment(tokenId);
            
            const isAssigned = await newStorage.isStorageAssignedToPrimary(genesisPiratesAddress, tokenId);
            expect(isAssigned).to.be.false;
        });

        it("Should prevent double migration", async function () {
            await migration.connect(admin).updateStorageManagement();
            
            await expect(
                migration.connect(admin).migrateOwnerTokens(user.address, [tokenId])
            ).to.be.revertedWith("Migration has already been completed");
        });

        it("Should track migration progress correctly", async function () {
            const storageTokenId = 1;
            
            // Check initial state
            let progress = await migration.getMigrationProgress(storageTokenId);
            expect(progress.completed).to.be.false;
            expect(progress.totalAssignments).to.equal(0);
            
            // Start migration
            await migration.connect(admin).migrateBatch([storageTokenId]);
            
            // Check progress after migration
            progress = await migration.getMigrationProgress(storageTokenId);
            expect(progress.totalAssignments).to.be.greaterThan(0);
            
            // Check in-progress tokens
            const inProgressTokens = await migration.getStorageTokensInProgress();
            if (progress.completed) {
                expect(inProgressTokens).to.not.include(storageTokenId);
            } else {
                expect(inProgressTokens).to.include(storageTokenId);
            }
        });

        it("Should verify migration correctly", async function () {
            const storageTokenId = 1;
            
            // Assign different configurations in old and new storage
            await oldStorage.connect(admin).assignStorageToPrimary(genesisPiratesAddress, tokenId, storageTokenId);
            await newStorage.connect(admin).assignStorageToPrimary(genesisPiratesAddress, tokenId + 1, storageTokenId);

            const isValid = await migration.verifyMigration(storageTokenId);
            expect(isValid).to.be.false;
        });
    });

    describe("Access Control", function () {
        it("Should only allow admin to migrate", async function () {
            await expect(
                migration.connect(user).migrateOwnerTokens(user.address, [tokenId])
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("Should only allow admin to update storage management", async function () {
            await expect(
                migration.connect(user).updateStorageManagement()
            ).to.be.revertedWith("Caller is not an admin");
        });
    });
});