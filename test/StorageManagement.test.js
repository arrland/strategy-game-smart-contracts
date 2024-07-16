const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StorageManagement", function () {
    let StorageManagement, storageManagement;
    let CentralAuthorizationRegistry, centralAuthorizationRegistry;
    let BaseStorage, pirateStorage, islandStorage;
    let owner, addr1, addr2, genesisPiratesAddress, genesisIslandsAddress;

    beforeEach(async function () {
        [owner, addr1, addr2, genesisPiratesAddress, genesisIslandsAddress] = await ethers.getSigners();

        // Deploy CentralAuthorizationRegistry
        CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(owner.address);
        await centralAuthorizationRegistry.grantRole(centralAuthorizationRegistry.ADMIN_ROLE(), owner.address);

        
        // Deploy BaseStorage contracts
        BaseStorage = await ethers.getContractFactory("PirateStorage");
        pirateStorage = await BaseStorage.deploy(
            await centralAuthorizationRegistry.getAddress(),
            await genesisPiratesAddress.getAddress(),
            true            
        );
        
        await centralAuthorizationRegistry.setContractAddress(await pirateStorage.INTERFACE_ID(), await pirateStorage.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await pirateStorage.getAddress());
        BaseStorage = await ethers.getContractFactory("IslandStorage");
        islandStorage = await BaseStorage.deploy(
            await centralAuthorizationRegistry.getAddress(),
            await genesisIslandsAddress.getAddress(),
            false,            
        );

        

        await centralAuthorizationRegistry.setContractAddress(await islandStorage.INTERFACE_ID(), await islandStorage.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await islandStorage.getAddress());

        await islandStorage.initializeIslands(1);
        
        // Deploy StorageManagement
        StorageManagement = await ethers.getContractFactory("StorageManagement");
        storageManagement = await StorageManagement.deploy(
            await centralAuthorizationRegistry.getAddress(),
            await genesisPiratesAddress.getAddress(),
            await genesisIslandsAddress.getAddress(),
            await pirateStorage.getAddress(),
            await islandStorage.getAddress()
        );

        await centralAuthorizationRegistry.setContractAddress(await storageManagement.INTERFACE_ID(), await storageManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await storageManagement.getAddress());

    });

    describe("Deployment", function () {
        it("Should deploy with initial storage contracts", async function () {
            expect(await storageManagement.storageContractCount()).to.equal(2);
            expect(await storageManagement.getStorageByCollection(await genesisPiratesAddress.getAddress())).to.equal(await pirateStorage.getAddress());
            expect(await storageManagement.getStorageByCollection(await genesisIslandsAddress.getAddress())).to.equal(await islandStorage.getAddress());
        });
    });

    describe("Storage Management", function () {
        it("Should add a new storage contract", async function () {
            const newStorage = await BaseStorage.deploy(
                await centralAuthorizationRegistry.getAddress(),
                await genesisPiratesAddress.getAddress(),
                true            
            );            
            await centralAuthorizationRegistry.addAuthorizedContract(await newStorage.getAddress());
            await storageManagement.addStorageContract(addr1.address,await newStorage.getAddress());
            expect(await storageManagement.storageContractCount()).to.equal(3);
            expect(await storageManagement.getStorageByCollection(addr1.address)).to.equal(await newStorage.getAddress());
        });

        it("Should remove a storage contract", async function () {
            expect(await storageManagement.getStorageByCollection(await genesisPiratesAddress.getAddress())).to.equal(await pirateStorage.getAddress());
            await storageManagement.removeStorageContract(await genesisPiratesAddress.getAddress());
            expect(await storageManagement.storageContractCount()).to.equal(1);
            const removed = await storageManagement.getStorageByCollection(await genesisPiratesAddress.getAddress())            
            expect(await storageManagement.getStorageByCollection(await genesisPiratesAddress.getAddress())).to.equal("0x0000000000000000000000000000000000000000");
        });

        it("Should update storage capacity", async function () {
            await centralAuthorizationRegistry.addAuthorizedContract(owner.address);
            await storageManagement.updateStorageCapacity(await genesisPiratesAddress.getAddress(), 1, 1000);
            expect(await pirateStorage.getStorageCapacity(1)).to.equal(1000);
        });

        it("Should get storage capacity", async function () {            
            expect(await storageManagement.getStorageCapacity(await genesisPiratesAddress.getAddress(), 1)).to.equal(50000000000000000000n);
        });

        // it("Should get total resources in storage", async function () {
            
        //     await pirateStorage.addResources(1, 500);
        //     expect(await storageManagement.getTotalResourcesInStorage(await genesisPiratesAddress.getAddress(), 1)).to.equal(500);
        // });

        // it("Should check storage limit", async function () {
        //     expect(await storageManagement.checkStorageLimit(genesisPiratesAddress.address, 1, 400)).to.be.true;
        //     expect(await storageManagement.checkStorageLimit(genesisPiratesAddress.address, 1, 600)).to.be.false;
        // });
    });

    describe("Authorization", function () {
        it("Should check if an entity is authorized", async function () {
            //await storageManagement.addStorageContract(genesisPiratesAddress, await pirateStorage.getAddress());
            expect(await storageManagement.getStorageByCollection(await genesisPiratesAddress.getAddress())).to.equal(await pirateStorage.getAddress());
            expect(await storageManagement.isStorageEntity(await pirateStorage.getAddress())).to.be.true;
            expect(await storageManagement.isStorageEntity(addr2.address)).to.be.false;
        });
    });

    describe("Get All Storage Contracts", function () {
        it("Should get all storage contracts", async function () {
            const AllStorageContracts = await storageManagement.getAllStorageContracts();
            
            const [collectionAddresses, storageAddresses] = await storageManagement.getAllStorageContracts();
            expect(collectionAddresses.length).to.equal(2);
            expect(storageAddresses.length).to.equal(2);
            expect(collectionAddresses[0]).to.equal(await genesisPiratesAddress.getAddress());
            expect(storageAddresses[0]).to.equal(await pirateStorage.getAddress());
            expect(collectionAddresses[1]).to.equal(await genesisIslandsAddress.getAddress());
            expect(storageAddresses[1]).to.equal(await islandStorage.getAddress());
        });
    });
});
