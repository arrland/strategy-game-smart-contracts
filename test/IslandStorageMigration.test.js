const { expect } = require("chai");
const { ethers } = require("hardhat");

async function deployAndAuthorizeContract(contractName, centralAuthorizationRegistry, ...args) {
    const ContractFactory = await ethers.getContractFactory(contractName);
    const contractInstance = await ContractFactory.deploy(await centralAuthorizationRegistry.getAddress(), ...args);
    const contractAddress = await contractInstance.getAddress();

    try {
        const interfaceId = await contractInstance.INTERFACE_ID(); // Correct property access
        await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
    } catch (error) {
        console.log("Contract already authorized");
    }
    await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

    return contractInstance;
}

describe("IslandStorageMigration", function () {
    let IslandStorageMigration, islandStorageMigration;
    let OldIslandStorage, oldIslandStorage;
    let NewIslandStorage, newIslandStorage;
    let StorageManagement, storageManagement;
    let IslandNft, islandNft;
    let admin, owner1, owner2, externalCaller;
    let genesisPiratesAddress, SimpleERC1155, simpleERC1155, resourceManagement, resourceTypeManager, islandManagement

    beforeEach(async function () {
        [admin, owner1, owner2, externalCaller] = await ethers.getSigners();

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

        genesisPiratesAddress = await simpleERC1155.getAddress();

        // Deploy the central authorization registry
        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        await centralAuthorizationRegistry.addAuthorizedContract(externalCaller.address);
        resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthorizationRegistry);
        resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthorizationRegistry);

        const pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false);

        // Deploy the IslandNft contract
        IslandNft = await ethers.getContractFactory("SimpleERC721");
        islandNft = await IslandNft.deploy("Island", "ISL", "https://island.com/", admin.address);

        const genesisIslandsAddress = await islandNft.getAddress();

        islandManagement = await deployAndAuthorizeContract("IslandManagement", centralAuthorizationRegistry, genesisIslandsAddress);

        // Deploy the old and new IslandStorage contracts
        OldIslandStorage = await ethers.getContractFactory("IslandStorage");
        oldIslandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);

        await oldIslandStorage.initializeIslands(1, { gasLimit: 30000000 });   

        NewIslandStorage = await ethers.getContractFactory("IslandStorage");
        newIslandStorage = await NewIslandStorage.deploy(await centralAuthorizationRegistry.getAddress(), genesisIslandsAddress, true);

        await newIslandStorage.initializeIslands(1, { gasLimit: 30000000 });   

        // Deploy the StorageManagement contract
        StorageManagement = await ethers.getContractFactory("StorageManagement");
        storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, await pirateStorage.getAddress(), await oldIslandStorage.getAddress());

        // Mint some NFTs to owner1
        await islandNft.mint(owner1.address);
        await islandNft.mint(owner1.address);

        // Deploy the IslandStorageMigration contract
        IslandStorageMigration = await ethers.getContractFactory("IslandStorageMigration");
        islandStorageMigration = await IslandStorageMigration.deploy(
            await centralAuthorizationRegistry.getAddress(),
            await oldIslandStorage.getAddress(),
            await newIslandStorage.getAddress(),
            await islandNft.getAddress(),            
            await islandManagement.getAddress()
        );

        await centralAuthorizationRegistry.grantRole(await centralAuthorizationRegistry.ADMIN_ROLE(), await islandStorageMigration.getAddress());

        await centralAuthorizationRegistry.addAuthorizedContract(await islandStorageMigration.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await newIslandStorage.getAddress());

        // Add resources to the old storage
        await resourceManagement.connect(externalCaller).addResource(await oldIslandStorage.getAddress(), 1, owner1.address, "wood", ethers.parseEther("1"));
        await resourceManagement.connect(externalCaller).addResource(await oldIslandStorage.getAddress(), 2, owner1.address, "fish", ethers.parseEther("10"));        
    });

    it("should migrate token resources from old storage to new storage", async function () {
        // Migrate resources for owner1
        await islandStorageMigration.connect(admin).migrateOwnerTokens(owner1.address);

        // Check balances in the new storage
        const newWoodBalance = await newIslandStorage.getResourceBalance(1, "wood");
        const newFishBalance = await newIslandStorage.getResourceBalance(2, "fish");

        expect(newWoodBalance).to.equal(ethers.parseEther("1"));
        expect(newFishBalance).to.equal(ethers.parseEther("10"));

        // Check balances in the old storage
        const oldWoodBalance = await oldIslandStorage.getResourceBalance(1, "wood");
        const oldFishBalance = await oldIslandStorage.getResourceBalance(2, "fish");

        expect(oldWoodBalance).to.equal(0);
        expect(oldFishBalance).to.equal(0);
    });

    it("should emit MigrationCompleted event", async function () {
        await expect(islandStorageMigration.connect(admin).migrateOwnerTokens(owner1.address))
            .to.emit(islandStorageMigration, "MigrationCompleted")
            .withArgs(owner1.address, 1)
            .and.to.emit(islandStorageMigration, "MigrationCompleted")
            .withArgs(owner1.address, 2);
    });

    it("should migrate all owners", async function () {
        // Add another owner and mint NFTs
        await islandNft.mint(owner2.address);
        await resourceManagement.connect(externalCaller).addResource(await oldIslandStorage.getAddress(), 3, owner2.address, "fish", ethers.parseEther("30"));

        // Migrate all owners
        await islandStorageMigration.connect(admin).migrateAllOwners([owner1.address, owner2.address]);

        // Check balances in the new storage
        const newFishBalance = await newIslandStorage.getResourceBalance(3, "fish");
        expect(newFishBalance).to.equal(ethers.parseEther("30"));

        // Check balances in the old storage
        const oldFishBalance = await oldIslandStorage.getResourceBalance(3, "fish");
        expect(oldFishBalance).to.equal(0);
    });
});