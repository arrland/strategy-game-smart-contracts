const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

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

describe("InhabitantStorage", function () {
    let InhabitantStorage, inhabitantStorage;
    let CentralAuthorizationRegistry, centralAuthorizationRegistry;
    let admin, user, pirateOwner;
    let resourceTypeManager, resourceManagement, IslandNft, islandNft, genesisIslandsAddress, simpleERC1155, genesisPiratesAddress;
    let SimpleERC1155;
    let islandStorage, storageManagement;
    let inhabitantNft, genesisInhabitantsAddress;
    let IslandStorage, InhabitantNft;
    let StorageManagement;
    let externalCaller;
    let InhabitantsAddress;
    let resourceFarming;

    beforeEach(async function () {
        [admin, user, pirateOwner, externalCaller] = await ethers.getSigners();

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        await centralAuthorizationRegistry.addAuthorizedContract(externalCaller.address);
        resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthorizationRegistry);
        resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthorizationRegistry);
        resourceFarming = await deployAndAuthorizeContract("ResourceFarming", centralAuthorizationRegistry);

        // Deploy the IslandNft contract
        IslandNft = await ethers.getContractFactory("SimpleERC721");
        islandNft = await IslandNft.deploy("Island", "ISL", "https://island.com/", admin.address);

        InhabitantNft = await ethers.getContractFactory("SimpleERC721");
        inhabitantNft = await InhabitantNft.deploy("Inhabitant", "INH", "https://inhabitant.com/", admin.address);

        const genesisIslandsAddress = await islandNft.getAddress();
        InhabitantsAddress = await inhabitantNft.getAddress();

        // Deploy the old and new IslandStorage contracts
        IslandStorage = await ethers.getContractFactory("IslandStorage");
        islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);

        await islandStorage.initializeIslands(1, { gasLimit: 30000000 }); 

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

        genesisPiratesAddress = await simpleERC1155.getAddress();

        const pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);

        InhabitantStorage = await ethers.getContractFactory("InhabitantStorage");
        inhabitantStorage = await InhabitantStorage.deploy(
            await centralAuthorizationRegistry.getAddress(),
            InhabitantsAddress,
            true,
            genesisIslandsAddress
        );

        await centralAuthorizationRegistry.addAuthorizedContract(await inhabitantStorage.getAddress());

        StorageManagement = await ethers.getContractFactory("StorageManagement");
        storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, InhabitantsAddress, await pirateStorage.getAddress(), await islandStorage.getAddress(), await inhabitantStorage.getAddress());

        await inhabitantNft.mint(pirateOwner.address);
        await inhabitantNft.mint(pirateOwner.address);
        await inhabitantNft.mint(externalCaller.address);

        await islandNft.mint(pirateOwner.address);
        await islandNft.mint(pirateOwner.address);
        await islandNft.mint(externalCaller.address);

    });

    it("should assign storage to primary correctly", async function () {
        const primaryTokenId = 1;
        const storageTokenId = 2;

        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, primaryTokenId, storageTokenId);

        const assignedStorage = await inhabitantStorage.primaryToStorage(InhabitantsAddress, primaryTokenId);
        expect(assignedStorage).to.equal(storageTokenId);
    });
    it("should allow user to assign NFT inhabitant to island, transfer to pirateOwner, and then pirateOwner to assign to another island", async function () {
        const islandA = 1;

        const inhabitantTokenId = 1;

        await islandNft.mint(user.address);

        const islandB = await islandNft.totalSupply();

        // User assigns NFT inhabitant to island A
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, inhabitantTokenId, islandA);

        // User transfers NFT inhabitant to pirateOwner
        await inhabitantNft.connect(pirateOwner).transferFrom(pirateOwner.address, user.address, inhabitantTokenId);

        // // PirateOwner assigns NFT inhabitant to island B
        await storageManagement.connect(user).assignStorageToPrimary(InhabitantsAddress, inhabitantTokenId, islandB);

        // Check that the NFT inhabitant is now assigned to island B
        const [requiredStorageContract, assignedIsland] = await storageManagement.getAssignedStorage(InhabitantsAddress, inhabitantTokenId);
        expect(assignedIsland).to.equal(islandB);
    });

    it("should not be able to assign the same storage twice", async function () {
        const island = 1;
        const inhabitantTokenId = 1;

        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, inhabitantTokenId, island);

        const [requiredStorageContract, assignedIsland] = await storageManagement.getAssignedStorage(InhabitantsAddress, inhabitantTokenId);
        expect(assignedIsland).to.equal(island);

        await expect(storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, inhabitantTokenId, island))
            .to.be.revertedWith("Storage is already assigned to a primary");

    });

    it("should allow assigning storage to a different island ID without reverting", async function () {
        const inhabitantTokenId = 1;
        const islandA = 1;
        const islandB = 2;

        await inhabitantNft.mint(pirateOwner.address);
        // Assign storage to island A
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, inhabitantTokenId, islandA);

        // Assign storage to island B
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, inhabitantTokenId, islandB);

        // Check that the storage is now assigned to island B
        const [requiredStorageContract, assignedIsland] = await storageManagement.getAssignedStorage(InhabitantsAddress, inhabitantTokenId);
        expect(assignedIsland).to.equal(islandB);
    });

    it("should unassign storage from primary correctly", async function () {
        const primaryCollection = InhabitantsAddress; // Replace with actual address
        const primaryTokenId = 1;
        const storageTokenId = 2;

        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(primaryCollection, primaryTokenId, storageTokenId);
        await inhabitantStorage.connect(externalCaller).unassignStorageFromPrimary(primaryCollection, primaryTokenId);

        const assignedStorage = await inhabitantStorage.primaryToStorage(primaryCollection, primaryTokenId);
        expect(assignedStorage).to.equal(0);
    });

    it("should get storage capacity correctly", async function () {
        const tokenId = 1;
        const capacity = await inhabitantStorage.getStorageCapacity(tokenId);
        expect(capacity).to.equal(ethers.parseEther("50")); // Default capacity
    });

    it("should dump resource correctly", async function () {

        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, 1, 1);

        const assignedStorage = await inhabitantStorage.primaryToStorage(InhabitantsAddress, 1);
        expect(assignedStorage).to.equal(1);
        const tokenId = 1;
        const owner = pirateOwner.address;
        const resource = "wood";
        const amount = ethers.parseEther("1");

        // Add the resource to the storage first
        await inhabitantStorage.connect(externalCaller).addResource(tokenId, owner, resource, amount);

        // Dump the resource
        await inhabitantStorage.connect(externalCaller).dumpResource(tokenId, owner, resource, amount);

        // Check the balance after dumping
        const balanceAfterDump = await inhabitantStorage.getResourceBalance(tokenId, resource);
        expect(balanceAfterDump).to.equal(0);
    });

    it("should add resource correctly", async function () {
        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, 1, 1);

        const tokenId = 1;
        const user = pirateOwner.address;
        const resource = "wood";
        const amount = ethers.parseEther("1");

        await inhabitantStorage.connect(externalCaller).addResource(tokenId, user, resource, amount);
        // Add assertions to check the state after adding the resource
        const balanceAfterAdd = await inhabitantStorage.getResourceBalance(tokenId, resource);
        expect(balanceAfterAdd).to.equal(amount);
    });

    it("should transfer resource correctly", async function () {
        const fromTokenId = 1;
        const toTokenId = 3;
        const fromOwner = pirateOwner.address;
        const toOwner = externalCaller.address;
        const resource = "wood";
        const amount = ethers.parseEther("1");

        // Assign storage to primary for both tokens
        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, fromTokenId, 1);
        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, toTokenId, 3);

        // Add the resource to the from storage first
        await inhabitantStorage.connect(externalCaller).addResource(fromTokenId, fromOwner, resource, amount);

        // Transfer the resource
        await inhabitantStorage.connect(externalCaller).transferResource(fromTokenId, fromOwner, toTokenId, toOwner, await islandStorage.getAddress(), resource, amount);

        // Check the balance after transferring
        const balanceAfterTransferFrom = await inhabitantStorage.getResourceBalance(fromTokenId, resource);
        const balanceAfterTransferTo = await inhabitantStorage.getResourceBalance(toTokenId, resource);
        const balanceAfterTransferToIsland = await islandStorage.getResourceBalance(toTokenId, resource);

        expect(balanceAfterTransferFrom).to.equal(0);
        expect(balanceAfterTransferTo).to.equal(amount);
        expect(balanceAfterTransferToIsland).to.equal(amount);
    });

    it("should get total resources in storage correctly", async function () {
        const tokenId = 1;
        const user = pirateOwner.address;
        const resource = "wood";
        const amount = ethers.parseEther("1");

        // Assign storage to primary for the token
        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, tokenId, 1);

        // Add the resource to the storage first
        await inhabitantStorage.connect(externalCaller).addResource(tokenId, user, resource, amount);

        // Get the total resources in storage
        const totalResources = await inhabitantStorage.getTotalResourcesInStorage(tokenId);

        expect(totalResources).to.equal(amount);
    });

    it("should get resource balance correctly", async function () {
        const tokenId = 1;
        const resource = "wood";
        const amount = ethers.parseEther("1");

        // Assign storage to primary for the token
        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, tokenId, 1);

        // Add the resource to the storage first
        await inhabitantStorage.connect(externalCaller).addResource(tokenId, pirateOwner.address, resource, amount);

        // Get the resource balance
        const balance = await inhabitantStorage.getResourceBalance(tokenId, resource);

        expect(balance).to.equal(amount);
    });

    it("should update storage capacity correctly", async function () {
        const tokenId = 1;
        const newCapacity = ethers.parseEther("2");

        // Assign storage to primary for the token
        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, tokenId, 1);

        // Update the storage capacity
        await inhabitantStorage.connect(externalCaller).updateStorageCapacity(tokenId, newCapacity);

        // Get the updated storage capacity
        const updatedCapacity = await inhabitantStorage.getStorageCapacity(tokenId);

        expect(updatedCapacity).to.equal(newCapacity);
    });

    it("should only allow the owner of the storage NFT to unassignStorageFromPrimary", async function () {
        const tokenId = 1;        
        const unauthorizedUser = externalCaller.address;

        // Assign storage to primary for the token
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, tokenId, 1);

        // Attempt to unassign storage from primary with an unauthorized user
        await expect(storageManagement.connect(user).unassignStorageFromPrimary(InhabitantsAddress, tokenId))
            .to.be.revertedWith("Caller does not own the required storage NFT or primary token");

        // Unassign storage from primary with the authorized user
        await storageManagement.connect(pirateOwner).unassignStorageFromPrimary(InhabitantsAddress, tokenId);

        // Check if storage is unassigned
        const [requiredStorageContract, assignedIsland] = await storageManagement.getAssignedStorage(InhabitantsAddress, tokenId);
        expect(requiredStorageContract).to.equal(InhabitantsAddress);
        expect(assignedIsland).to.equal(tokenId);
    });
    it("should allow Inhabitant owner who does not own Island to call unassignStorageFromPrimary", async function () {
        const tokenId = 1;
        
        // Assign storage to primary for the token
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, tokenId, 1);

        await islandNft.connect(pirateOwner).transferFrom(pirateOwner.address, user.address, 1);

        // Unassign storage from primary with the Inhabitant owner who does not own the Island
        await storageManagement.connect(pirateOwner).unassignStorageFromPrimary(InhabitantsAddress, tokenId);

        // Check if storage is unassigned
        const [requiredStorageContract, assignedIsland] = await storageManagement.getAssignedStorage(InhabitantsAddress, tokenId);
        expect(requiredStorageContract).to.equal(InhabitantsAddress);
        expect(assignedIsland).to.equal(tokenId);
    });

    it("should get all resource balances correctly", async function () {
        const tokenId = 1;
        const resources = ["wood", "fish", "planks"];
        const amounts = [ethers.parseEther("1"), ethers.parseEther("2"), ethers.parseEther("3")];

        // Assign storage to primary for the token
        await inhabitantStorage.connect(externalCaller).assignStorageToPrimary(InhabitantsAddress, tokenId, 1);

        // Add resources to the storage
        for (let i = 0; i < resources.length; i++) {
            await inhabitantStorage.connect(externalCaller).addResource(tokenId, pirateOwner.address, resources[i], amounts[i]);
        }

        // Get all resource balances
        for (let i = 0; i < resources.length; i++) {
            const balance = await inhabitantStorage.getResourceBalance(tokenId, resources[i]);
            expect(balance).to.equal(amounts[i]);
        }
    });
});