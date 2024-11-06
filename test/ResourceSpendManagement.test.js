const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require("./utils");
describe("ResourceSpendManagement", function () {
    let ResourceSpendManagement, resourceSpendManagement;
    let ResourceTypeManager, resourceTypeManager;
    let ResourceManagement, resourceManagement;
    let centralAuthorizationRegistry;
    let admin, user, contractAddress1, contractAddress2, externalCaller;
    let SimpleERC1155, simpleERC1155;
    let genesisPiratesAddress;
    let SimpleERC721, islandNft;
    let genesisIslandsAddress;
    let pirateOwner;
    let pirateStorage;
    let islandStorage;
    let storageManagement;
    let resourceFarming;
    let inhabitantStorage;
    let InhabitantNFT, inhabitantNFT;
    let InhabitantsAddress;


    beforeEach(async function () {
        [admin, user, contractAddress1, contractAddress2, externalCaller, pirateOwner] = await ethers.getSigners();

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

        genesisPiratesAddress = await simpleERC1155.getAddress();

        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);

        SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        islandNft = await SimpleERC721.deploy("Island", "ISL", "https://island.com/", admin.address);

        genesisIslandsAddress = await islandNft.getAddress();

        await islandNft.mint(pirateOwner.address);
        await islandNft.mint(pirateOwner.address);

        InhabitantNFT = await ethers.getContractFactory("SimpleERC721");
        inhabitantNFT = await InhabitantNFT.deploy("Inhabitant", "INH", "https://inhabitant.com/", admin.address);
        InhabitantsAddress = await inhabitantNFT.getAddress();

        await inhabitantNFT.mint(pirateOwner.address);
        await inhabitantNFT.mint(pirateOwner.address);

        ResourceTypeManager = await ethers.getContractFactory("ResourceTypeManager");
        resourceTypeManager = await ResourceTypeManager.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await resourceTypeManager.INTERFACE_ID(), await resourceTypeManager.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await resourceTypeManager.getAddress());

        ResourceManagement = await ethers.getContractFactory("ResourceManagement");
        resourceManagement = await ResourceManagement.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await resourceManagement.INTERFACE_ID(), await resourceManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await resourceManagement.getAddress());        
        await centralAuthorizationRegistry.addAuthorizedContract(externalCaller.address);

        ResourceSpendManagement = await ethers.getContractFactory("ResourceSpendManagement");
        resourceSpendManagement = await ResourceSpendManagement.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await resourceSpendManagement.INTERFACE_ID(), await resourceSpendManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await resourceSpendManagement.getAddress());        

        pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false, genesisIslandsAddress);

        islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);

        inhabitantStorage = await deployAndAuthorizeContract("InhabitantStorage", centralAuthorizationRegistry, InhabitantsAddress, true, genesisIslandsAddress);
        
        resourceFarming = await deployAndAuthorizeContract("ResourceFarming", centralAuthorizationRegistry);

        await islandStorage.initializeIslands(1);        
        await islandStorage.initializeIslands(13);
        
        
        storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, InhabitantsAddress, await pirateStorage.getAddress(), await islandStorage.getAddress(), await inhabitantStorage.getAddress());

        await storageManagement.addStorageContract(genesisPiratesAddress, await pirateStorage.getAddress());
        await storageManagement.addStorageContract(genesisIslandsAddress, await islandStorage.getAddress());
        await storageManagement.addStorageContract(InhabitantsAddress, await inhabitantStorage.getAddress());
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, 1, 1);
    });

    it("should set resource requirements", async function () {
        const optionalResources = [
            { resource: "fish", amount: ethers.parseEther("1"), method: 0 },
            { resource: "coconut", amount: ethers.parseEther("2"), method: 0 }
        ];
        const mandatoryResources = [
            { resource: "wood", amount: ethers.parseEther("2"), method: 1 }
        ];

        await resourceSpendManagement.connect(admin).setResourceRequirements("planks", optionalResources, mandatoryResources);

        const requirements = await resourceSpendManagement.getResourceRequirements("planks");
        expect(requirements.optionalResources.length).to.equal(2);
        expect(requirements.mandatoryResources.length).to.equal(1);
    });

    it("should burn mandatory resources", async function () {        
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 1, user.address, "wood", ethers.parseEther("10"));
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 1, user.address, "fish", ethers.parseEther("10"));

        await resourceSpendManagement.connect(externalCaller).handleResourceBurning(
            await pirateStorage.getAddress(),
            1,
            user.address,
            "planks",
            1,
            ethers.parseEther("10"),
            ["fish"]
        );

        const balance = await resourceManagement.getResourceBalance(await pirateStorage.getAddress(), 1, "wood");        
        expect(balance).to.equal(ethers.parseEther("5"));
    });

    it("should burn mandatory resources for Inhabitant NFT", async function () {        
        await resourceManagement.connect(externalCaller).addResource(await islandStorage.getAddress(), 1, pirateOwner.address, "wood", ethers.parseEther("10"));
        await resourceManagement.connect(externalCaller).addResource(await islandStorage.getAddress(), 1, pirateOwner.address, "fish", ethers.parseEther("10"));

        await resourceSpendManagement.connect(externalCaller).handleResourceBurning(
            await inhabitantStorage.getAddress(),
            1,
            pirateOwner.address,
            "planks",
            1,
            ethers.parseEther("10"),
            ["fish"]
        );

        const balance = await resourceManagement.getResourceBalance(await islandStorage.getAddress(), 1, "wood");        
        expect(balance).to.equal(ethers.parseEther("5"));
    });

    it("should burn optional resources", async function () {
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 1, user.address, "fish", ethers.parseEther("1"));
        await resourceSpendManagement.connect(admin).setResourceRequirements("planks", [{ resource: "fish", amount: ethers.parseEther("1"), method: 0 }], []);

        await resourceSpendManagement.connect(externalCaller).handleResourceBurning(
            await pirateStorage.getAddress(),
            1,
            user.address,
            "planks",
            1,
            ethers.parseEther("10"),
            ["fish"]
        );

        const balance = await resourceManagement.getResourceBalance(await pirateStorage.getAddress(), 1, "fish");
        expect(balance).to.equal(0n);
    });

    it("should revert if insufficient mandatory resources", async function () {
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 1, user.address, "fish", ethers.parseEther("10"));
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 1, user.address, "wood", ethers.parseEther("1"));
    
        await expect(
            resourceSpendManagement.connect(externalCaller).handleResourceBurning(
                await pirateStorage.getAddress(),
                1,
                user.address,
                "planks",
                1,
                ethers.parseEther("10"),
                ["fish"]
            )
        ).to.be.revertedWith("Insufficient resource balance for wood");
    });

    it("should revert if no optional resources burned", async function () {
        await expect(
            resourceSpendManagement.connect(externalCaller).handleResourceBurning(
                await pirateStorage.getAddress(),
                1,
                user.address,
                "planks",
                ethers.parseEther("10"),
                0,
                []
            )
        ).to.be.revertedWith("At least one optional resource must be burned");
    });

    it("should return correct resource requirement amounts", async function () {
        await resourceSpendManagement.connect(admin).setResourceRequirements(
            "planks",
            [
                { resource: "fish", amount: ethers.parseEther("1"), method: 0 },
                { resource: "coconut", amount: ethers.parseEther("2"), method: 0 }
            ],
            [
                { resource: "wood", amount: ethers.parseEther("2"), method: 1 }
            ]
        );

        const daysCount = 5;
        const resourcesProduced = ethers.parseEther("10");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("planks", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(3);

        expect(requirementAmounts[0].resourceName).to.equal("fish");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("5"));
        expect(requirementAmounts[0].isMandatory).to.equal(false);

        expect(requirementAmounts[1].resourceName).to.equal("coconut");
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("10"));
        expect(requirementAmounts[1].isMandatory).to.equal(false);

        expect(requirementAmounts[2].resourceName).to.equal("wood");
        expect(requirementAmounts[2].amount).to.equal(ethers.parseEther("5"));
        expect(requirementAmounts[2].isMandatory).to.equal(true);
    });

    it("should return correct resource requirement amounts for bag-packed tobacco", async function () {


        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("bag-packed tobacco", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(7);

        expect(requirementAmounts[5].resourceName).to.equal("tobacco");
        expect(requirementAmounts[5].amount).to.equal(ethers.parseEther("100"));
        expect(requirementAmounts[5].isMandatory).to.equal(true);

        expect(requirementAmounts[6].resourceName).to.equal("bags");
        expect(requirementAmounts[6].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[6].isMandatory).to.equal(true);

    });
    it("should return correct resource requirement amounts for bag-packed grain", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("bag-packed grain", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(7);
        expect(requirementAmounts[5].resourceName).to.equal("grain");
        expect(requirementAmounts[5].amount).to.equal(ethers.parseEther("100"));
        expect(requirementAmounts[5].isMandatory).to.equal(true);

        expect(requirementAmounts[6].resourceName).to.equal("bags");
        expect(requirementAmounts[6].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[6].isMandatory).to.equal(true);
    });

    it("should return correct resource requirement amounts for bag-packed cotton", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("bag-packed cotton", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(7);

        expect(requirementAmounts[5].resourceName).to.equal("cotton");
        expect(requirementAmounts[5].amount).to.equal(ethers.parseEther("100"));
        expect(requirementAmounts[5].isMandatory).to.equal(true);

        expect(requirementAmounts[6].resourceName).to.equal("bags");
        expect(requirementAmounts[6].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[6].isMandatory).to.equal(true);

    });

    it("should return correct resource requirement amounts for bag-packed sugarcane", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("bag-packed sugarcane", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(7);

        expect(requirementAmounts[5].resourceName).to.equal("sugarcane");
        expect(requirementAmounts[5].amount).to.equal(ethers.parseEther("100"));
        expect(requirementAmounts[5].isMandatory).to.equal(true);

        expect(requirementAmounts[6].resourceName).to.equal("bags");
        expect(requirementAmounts[6].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[6].isMandatory).to.equal(true);   
    });
    it("should return correct resource requirement amounts for pig", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("pig", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(1);

        expect(requirementAmounts[0].resourceName).to.equal("bag-packed grain");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("0.01"));
        expect(requirementAmounts[0].isMandatory).to.equal(true);
    });

    it("should return correct resource requirement amounts for wild game", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("wild game", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(6);

        expect(requirementAmounts[5].resourceName).to.equal("bag-packed tobacco");        
        expect(requirementAmounts[5].amount).to.equal(ethers.parseEther("0.01"));
        expect(requirementAmounts[5].isMandatory).to.equal(true);
    });

    it("should return correct resource requirement amounts for coconut liquor", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("100");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("coconut liquor", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(7);

        expect(requirementAmounts[5].resourceName).to.equal("bag-packed sugarcane");
        expect(requirementAmounts[5].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[5].isMandatory).to.equal(true);

        expect(requirementAmounts[6].resourceName).to.equal("crate-packed coconuts");
        expect(requirementAmounts[6].amount).to.equal(ethers.parseEther("4"));
        expect(requirementAmounts[6].isMandatory).to.equal(true);
    });

    it("should return correct resource requirement amounts for meat with 50 resources produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("50");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("meat", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(2);

        expect(requirementAmounts[0].resourceName).to.equal("pig");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[0].isMandatory).to.equal(false);

        expect(requirementAmounts[1].resourceName).to.equal("wild game");
        
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[1].isMandatory).to.equal(false);
    });

    it("should return correct resource requirement amounts for meat with 1 resources produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("meat", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(2);

        expect(requirementAmounts[0].resourceName).to.equal("pig");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("0.02"));
        expect(requirementAmounts[0].isMandatory).to.equal(false);

        expect(requirementAmounts[1].resourceName).to.equal("wild game");
        
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("0.02"));
        expect(requirementAmounts[1].isMandatory).to.equal(false);
    });

    it("should return correct resource requirement amounts for barrel-packed fish with 100 resources produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("barrel-packed fish", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(3);

        expect(requirementAmounts[0].resourceName).to.equal("barrels");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[0].isMandatory).to.equal(true);

        expect(requirementAmounts[1].resourceName).to.equal("fish");
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("100"));
        expect(requirementAmounts[1].isMandatory).to.equal(true);

        expect(requirementAmounts[2].resourceName).to.equal("crate-packed citrus");
        expect(requirementAmounts[2].amount).to.equal(ethers.parseEther("0.1"));
        expect(requirementAmounts[2].isMandatory).to.equal(true);
    });
    it("should return correct resource requirement amounts for barrel-packed meat with 1 resources produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("barrel-packed meat", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(3);

        expect(requirementAmounts[0].resourceName).to.equal("barrels");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[0].isMandatory).to.equal(true);

        expect(requirementAmounts[1].resourceName).to.equal("meat");
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("100"));
        expect(requirementAmounts[1].isMandatory).to.equal(true);

        expect(requirementAmounts[2].resourceName).to.equal("crate-packed citrus");
        expect(requirementAmounts[2].amount).to.equal(ethers.parseEther("0.1"));    
        expect(requirementAmounts[2].isMandatory).to.equal(true);   
    }); 
    it("should return correct resource requirement amounts for crate-packed citrus with 1 produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("crate-packed citrus", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(2);

        expect(requirementAmounts[0].resourceName).to.equal("crates");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[0].isMandatory).to.equal(true);

        expect(requirementAmounts[1].resourceName).to.equal("citrus");
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("50"));
        expect(requirementAmounts[1].isMandatory).to.equal(true);
    }); 

    it("should return correct resource requirement amounts for crate-packed coconuts with 1 resources produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("crate-packed coconuts", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(2);

        expect(requirementAmounts[0].resourceName).to.equal("crates");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[0].isMandatory).to.equal(true);

        expect(requirementAmounts[1].resourceName).to.equal("coconut");
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("25"));
        expect(requirementAmounts[1].isMandatory).to.equal(true);
    }); 

    it("should return correct resource requirement amounts for barrel-packed fish with 0.1 resources produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("0.1");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("barrel-packed fish", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(3);

        expect(requirementAmounts[0].resourceName).to.equal("barrels");
        expect(requirementAmounts[0].amount).to.equal(ethers.parseEther("0.1"));
        expect(requirementAmounts[0].isMandatory).to.equal(true);

        expect(requirementAmounts[1].resourceName).to.equal("fish");
        expect(requirementAmounts[1].amount).to.equal(ethers.parseEther("10"));
        expect(requirementAmounts[1].isMandatory).to.equal(true);

        expect(requirementAmounts[2].resourceName).to.equal("crate-packed citrus");
        expect(requirementAmounts[2].amount).to.equal(ethers.parseEther("0.01"));
        expect(requirementAmounts[2].isMandatory).to.equal(true);
    });
    it("should return correct resource requirement amounts for planks with 1 resources produced", async function () {
        const daysCount = 1;
        const resourcesProduced = ethers.parseEther("2");

        const requirementAmounts = await resourceSpendManagement.getResourceRequirementAmounts("planks", daysCount, resourcesProduced);

        expect(requirementAmounts.length).to.equal(6);

        expect(requirementAmounts[5].resourceName).to.equal("wood");
        expect(requirementAmounts[5].amount).to.equal(ethers.parseEther("1"));
        expect(requirementAmounts[5].isMandatory).to.equal(true);

    });

    
    


    
});
