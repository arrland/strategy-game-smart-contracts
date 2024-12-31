const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require("./utils");


describe("StorageManagement", function () {
    let StorageManagement, storageManagement;
    let CentralAuthorizationRegistry, centralAuthorizationRegistry;
    let BaseStorage, pirateStorage, islandStorage;
    let admin, addr1, addr2, pirateOwner, genesisPiratesAddress, genesisIslandsAddress;
    let SimpleERC1155, simpleERC1155;
    let SimpleERC721, islandNft;
    let rumToken;
    let feeManagement;
    let pirateManagement;
    let resourceTypeManager;
    let resourceManagement;
    let resourceSpendManagement;
    let resourceFarmingRules;
    let resourceFarming;
    let activityStats;
    let islandManagement;
    let externalCaller;
    let InhabitantNft;
    let inhabitantNft;
    let InhabitantsAddress;
    let inhabitantStorage;

    beforeEach(async function () {
        [admin, addr1, addr2, pirateOwner, externalCaller] = await ethers.getSigners();

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

        genesisPiratesAddress = await simpleERC1155.getAddress();

        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);

        SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        islandNft = await SimpleERC721.deploy("Island", "ISL", "https://island.com/", admin.address);

        genesisIslandsAddress = await islandNft.getAddress();

        InhabitantNft = await ethers.getContractFactory("SimpleERC721");
        inhabitantNft = await InhabitantNft.deploy("Inhabitant", "INH", "https://inhabitant.com/", admin.address);

        InhabitantsAddress = await inhabitantNft.getAddress();

        await islandNft.mint(pirateOwner.address);
        await islandNft.mint(pirateOwner.address);
        await islandNft.mint(pirateOwner.address);

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        await centralAuthorizationRegistry.addAuthorizedContract(externalCaller.address);

        resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthorizationRegistry);
        resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthorizationRegistry);
        
        const DummyERC20Burnable = await ethers.getContractFactory("DummyERC20Burnable");
        rumToken = await DummyERC20Burnable.deploy("RUM Token", "RUM");

        pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);

        islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);

        inhabitantStorage = await deployAndAuthorizeContract("InhabitantStorage", centralAuthorizationRegistry, InhabitantsAddress, true, genesisIslandsAddress);

        resourceFarming = await deployAndAuthorizeContract("ResourceFarming", centralAuthorizationRegistry);

        await islandStorage.initializeIslands(1);     
        await islandStorage.initializeIslands(2);        
        await islandStorage.initializeIslands(13);
        
        storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, InhabitantsAddress, await pirateStorage.getAddress(), await islandStorage.getAddress(), await inhabitantStorage.getAddress());
        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);
        //await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(InhabitantsAddress);
        

    });

    describe("Deployment", function () {
        it("Should deploy with initial storage contracts", async function () {
            expect(await storageManagement.storageContractCount()).to.equal(3);
            expect(await storageManagement.getStorageByCollection(genesisPiratesAddress)).to.equal(await pirateStorage.getAddress());
            expect(await storageManagement.getStorageByCollection(genesisIslandsAddress)).to.equal(await islandStorage.getAddress());
            expect(await storageManagement.getStorageByCollection(InhabitantsAddress)).to.equal(await inhabitantStorage.getAddress());
        });
    });

    describe("Storage Management", function () {
        it("Should add a new storage contract", async function () {
            const newStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, true, genesisIslandsAddress);
            await storageManagement.addStorageContract(addr1.address, await newStorage.getAddress());
            expect(await storageManagement.storageContractCount()).to.equal(4);
            expect(await storageManagement.getStorageByCollection(addr1.address)).to.equal(await newStorage.getAddress());
        });

        it("Should remove a storage contract", async function () {
            expect(await storageManagement.getStorageByCollection(genesisPiratesAddress)).to.equal(await pirateStorage.getAddress());
            await storageManagement.removeStorageContract(genesisPiratesAddress);
            expect(await storageManagement.storageContractCount()).to.equal(2);
            const removed = await storageManagement.getStorageByCollection(genesisPiratesAddress)            
            expect(await storageManagement.getStorageByCollection(genesisPiratesAddress)).to.equal("0x0000000000000000000000000000000000000000");
        });

        it("Should update storage capacity", async function () {
            await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
            await storageManagement.updateStorageCapacity(genesisPiratesAddress, 1, 1000);
            expect(await pirateStorage.getStorageCapacity(1)).to.equal(1000);
        });

        it("Should get storage capacity", async function () {            
            expect(await storageManagement.getStorageCapacity(genesisPiratesAddress, 1)).to.equal(50000000000000000000n);
        });

        it("Should get storage details", async function () {
            // Add resources to the pirate storage
            await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "wood", ethers.parseEther("25"));    
            await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "fish", ethers.parseEther("25"));
            
            // Get storage details
            const storageDetails = await storageManagement.getStorageDetails(genesisPiratesAddress, 1);

            // Verify storage details
            expect(storageDetails.totalResourcesInStorage).to.equal(ethers.parseEther("50"));
            expect(storageDetails.storageCapacity).to.equal(ethers.parseEther("50"));
            expect(storageDetails.resourceTypes.length).to.equal(27);
            expect(storageDetails.resourceTypes).to.include("wood");
            expect(storageDetails.resourceTypes).to.include("fish");
            expect(storageDetails.resourceBalances.length).to.equal(27);            
            expect(storageDetails.resourceBalances[2]).to.equal(ethers.parseEther("25"));
            expect(storageDetails.resourceBalances[6]).to.equal(ethers.parseEther("25"));
            
        });

        it("Should get resource balance", async function () {
            // Add resources to the pirate storage
            await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "wood", ethers.parseEther("25"));    
            await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "fish", ethers.parseEther("15"));

            // Get resource balance for wood
            const woodBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
            expect(woodBalance).to.equal(ethers.parseEther("25"));

            // Get resource balance for fish
            const fishBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
            expect(fishBalance).to.equal(ethers.parseEther("15"));

            // Get resource balance for a resource that does not exist
            const nonExistentResourceBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "gold");
            expect(nonExistentResourceBalance).to.equal(0);
        });

        it("Should not allow unauthorized entity to call addResource", async function () {
            // Attempt to add resources to the pirate storage by an unauthorized entity
            await expect(
                storageManagement.connect(addr2).addResource(genesisPiratesAddress, 1, pirateOwner.address, "wood", ethers.parseEther("25"))
            ).to.be.revertedWith("Caller is not authorized");

            // Verify that the resource balance has not changed
            const woodBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
            expect(woodBalance).to.equal(0);
        });

        it("Should not allow unauthorized entity to call storageManagement", async function () {
            // Attempt to call storageManagement functions by an unauthorized entity
            await expect(
                storageManagement.connect(addr2).updateStorageCapacity(genesisPiratesAddress, 1, 1000)
            ).to.be.revertedWith("Caller is not authorized");

            // address collectionAddress, uint256 tokenId, string memory resource, uint256 amount)
            await expect(
                storageManagement.connect(addr2).dumpResource(genesisPiratesAddress, 1, "wood", ethers.parseEther("25"))
            ).to.be.revertedWith("Caller does not own the NFT or it is not staked in ResourceFarming");

            await expect(
                storageManagement.connect(addr2).dumpResource(genesisIslandsAddress, 1, "wood", ethers.parseEther("25"))
            ).to.be.revertedWith("Caller does not own the 721 token");
        });

        it("Should allow pirate owner to call dumpResource and burn their resources", async function () {
            // Add resources to the pirate storage
            await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "wood", ethers.parseEther("25"));    
            await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "fish", ethers.parseEther("15"));

            // Verify initial resource balances
            let woodBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
            expect(woodBalance).to.equal(ethers.parseEther("25"));

            let fishBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
            expect(fishBalance).to.equal(ethers.parseEther("15"));

            // Pirate owner dumps wood resources
            await storageManagement.connect(pirateOwner).dumpResource(genesisPiratesAddress, 1, "wood", ethers.parseEther("10"));

            // Verify resource balances after dumping wood
            woodBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
            expect(woodBalance).to.equal(ethers.parseEther("15"));

            // Pirate owner dumps fish resources
            await storageManagement.connect(pirateOwner).dumpResource(genesisPiratesAddress, 1, "fish", ethers.parseEther("5"));

            // Verify resource balances after dumping fish
            fishBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
            expect(fishBalance).to.equal(ethers.parseEther("10"));
        });
        it("Should not allow direct call to dumpResource on pirateStorage contract", async function () {
            // Add resources to the pirate storage through storageManagement
            await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "wood", ethers.parseEther("25"));

            // Verify initial resource balance
            let woodBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
            expect(woodBalance).to.equal(ethers.parseEther("25"));

            // Attempt to call dumpResource directly on pirateStorage contract
            await expect(
                pirateStorage.connect(pirateOwner).dumpResource(1, pirateOwner.address, "wood", ethers.parseEther("10"))
            ).to.be.revertedWith("Caller is not authorized");

            // Verify resource balance remains unchanged
            woodBalance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
            expect(woodBalance).to.equal(ethers.parseEther("25"));
        });
        it("Should not allow direct call to dumpResource on islandStorage contract", async function () {
            // Add resources to the island storage through storageManagement
            await storageManagement.connect(externalCaller).addResource(genesisIslandsAddress, 1, pirateOwner.address, "wood", ethers.parseEther("30"));
    
            // Verify initial resource balance
            let stoneBalance = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "wood");
            expect(stoneBalance).to.equal(ethers.parseEther("30"));
    
            // Attempt to call dumpResource directly on islandStorage contract
            await expect(
                islandStorage.connect(pirateOwner).dumpResource(1, pirateOwner.address, "wood", ethers.parseEther("15"))
            ).to.be.revertedWith("Caller is not authorized");
    
            // Verify resource balance remains unchanged
            stoneBalance = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "wood");
            expect(stoneBalance).to.equal(ethers.parseEther("30"));
        });
    
        it("Should allow island owner to call dumpResource and burn their resources", async function () {
            // Add resources to the island storage
            await storageManagement.connect(externalCaller).addResource(genesisIslandsAddress, 1, pirateOwner.address, "wood", ethers.parseEther("30"));    
            await storageManagement.connect(externalCaller).addResource(genesisIslandsAddress, 1, pirateOwner.address, "fish", ethers.parseEther("20"));
    
            // Verify initial resource balances
            let stoneBalance = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "wood");
            expect(stoneBalance).to.equal(ethers.parseEther("30"));
    
            let waterBalance = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "fish");
            expect(waterBalance).to.equal(ethers.parseEther("20"));
    
            // Island owner dumps stone resources
            await storageManagement.connect(pirateOwner).dumpResource(genesisIslandsAddress, 1, "wood", ethers.parseEther("10"));
    
            // Verify resource balances after dumping stone
            stoneBalance = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "wood");
            expect(stoneBalance).to.equal(ethers.parseEther("20"));
    
            // Island owner dumps water resources
            await storageManagement.connect(pirateOwner).dumpResource(genesisIslandsAddress, 1, "fish", ethers.parseEther("5"));
    
            // Verify resource balances after dumping water
            waterBalance = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "fish");
            expect(waterBalance).to.equal(ethers.parseEther("15"));
        });

    });

    describe("Authorization", function () {
        it("Should check if an entity is authorized", async function () {
            //await storageManagement.addStorageContract(genesisPiratesAddress, await pirateStorage.getAddress());
            expect(await storageManagement.getStorageByCollection(genesisPiratesAddress)).to.equal(await pirateStorage.getAddress());
            expect(await storageManagement.isStorageEntity(await pirateStorage.getAddress())).to.be.true;
            expect(await storageManagement.isStorageEntity(addr2.address)).to.be.false;
        });
    });

    describe("Get All Storage Contracts", function () {
        it("Should get all storage contracts", async function () {
            const AllStorageContracts = await storageManagement.getAllStorageContracts();
            
            const [collectionAddresses, storageAddresses] = await storageManagement.getAllStorageContracts();
            expect(collectionAddresses.length).to.equal(3);
            expect(storageAddresses.length).to.equal(3);
            expect(collectionAddresses[0]).to.equal(genesisPiratesAddress);
            expect(storageAddresses[0]).to.equal(await pirateStorage.getAddress());
            expect(collectionAddresses[1]).to.equal(genesisIslandsAddress);
            expect(storageAddresses[1]).to.equal(await islandStorage.getAddress());
            expect(collectionAddresses[2]).to.equal(InhabitantsAddress);
            expect(storageAddresses[2]).to.equal(await inhabitantStorage.getAddress());
        });
    });
    
    describe("Assign Storage To Primary", function () {
        it("Should assign storage to primary token", async function () {
            // Assign storage to primary token using pirateStorage
            await pirateStorage.connect(externalCaller).setRequiredStorage(true, genesisIslandsAddress);

            const requiredStorageContract = await pirateStorage.getRequiredStorageContract();
            expect(requiredStorageContract).to.equal(genesisIslandsAddress);
            
            await storageManagement.connect(pirateOwner).assignStorageToPrimary(genesisPiratesAddress, 1, 2);

            // Verify the storage assignment
            const assignedStorageTokenId = await pirateStorage.getAssignedStorage(genesisPiratesAddress, 1);
            expect(assignedStorageTokenId).to.equal(2);
        });        
        it("Should fail if caller does not own the primary token", async function () {
            // Set required storage to true for pirateStorage
            await pirateStorage.connect(externalCaller).setRequiredStorage(true, genesisIslandsAddress);

            const requiredStorageContract = await pirateStorage.getRequiredStorageContract();
            expect(requiredStorageContract).to.equal(genesisIslandsAddress);

            // Try to assign storage to primary token with an unauthorized caller
            await expect(
                storageManagement.connect(addr2).assignStorageToPrimary(genesisPiratesAddress, 1, 2)
            ).to.be.revertedWith("Caller does not own the 1155 token");
        });
        it("Should fail if storage does not require other NFT for storage", async function () {
            // Set required storage to false for pirateStorage
            await pirateStorage.connect(externalCaller).setRequiredStorage(false, genesisIslandsAddress);

            const requiredStorage = await pirateStorage.requiresOtherNFTForStorage();
            expect(requiredStorage).to.be.false;

            // Try to assign storage to primary token when storage does not require other NFT for storage
            await expect(
                storageManagement.connect(pirateOwner).assignStorageToPrimary(genesisPiratesAddress, 1, 2)
            ).to.be.revertedWith("Storage does not require other NFT for storage");
        });

    it("Should unassign storage from primary token", async function () {
        // Assign storage to primary token using pirateStorage
        await pirateStorage.connect(externalCaller).setRequiredStorage(true, genesisIslandsAddress);
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(genesisPiratesAddress, 1, 2);

        // Verify the storage assignment
        let assignedStorageTokenId = await pirateStorage.getAssignedStorage(genesisPiratesAddress, 1);
        expect(assignedStorageTokenId).to.equal(2);

        // Unassign storage from primary token
        await storageManagement.connect(pirateOwner).unassignStorageFromPrimary(genesisPiratesAddress, 1);

        // Verify the storage unassignment
        assignedStorageTokenId = await pirateStorage.getAssignedStorage(genesisPiratesAddress, 1);
        expect(assignedStorageTokenId).to.equal(0);
    });

    it("Should fail to unassign storage if caller does not own the primary token", async function () {
        // Assign storage to primary token using pirateStorage
        await pirateStorage.connect(externalCaller).setRequiredStorage(true, genesisIslandsAddress);
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(genesisPiratesAddress, 1, 2);

        // Verify the storage assignment
        let assignedStorageTokenId = await pirateStorage.getAssignedStorage(genesisPiratesAddress, 1);
        expect(assignedStorageTokenId).to.equal(2);

        // Try to unassign storage from primary token with an unauthorized caller
        await expect(
            storageManagement.connect(addr2).unassignStorageFromPrimary(genesisPiratesAddress, 1)
        ).to.be.revertedWith("Caller does not own the required storage NFT or primary token");
    });

    it("Should fail to unassign storage if storage does not require other NFT for storage", async function () {
        // Set required storage to false for pirateStorage
        await pirateStorage.connect(externalCaller).setRequiredStorage(false, genesisIslandsAddress);

        const requiredStorage = await pirateStorage.requiresOtherNFTForStorage();
        expect(requiredStorage).to.be.false;

        // Try to unassign storage from primary token when storage does not require other NFT for storage
        await expect(
            storageManagement.connect(pirateOwner).unassignStorageFromPrimary(genesisPiratesAddress, 1)
        ).to.be.revertedWith("Storage does not require other NFT for storage");
    });

    it("Should get collection address by storage contract", async function () {
        const collectionAddress = await storageManagement.getCollectionAddressByStorageContract(await pirateStorage.getAddress());
        expect(collectionAddress).to.equal(genesisPiratesAddress);
    });


  
    });
});
