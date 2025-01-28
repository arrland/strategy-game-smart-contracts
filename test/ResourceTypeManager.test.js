const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ResourceTypeManager", function () {
    let ResourceTypeManager;
    let resourceTypeManager;
    let centralAuthorizationRegistry;
    let admin, user;

    beforeEach(async function () {
        [admin, user] = await ethers.getSigners();

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();        
        await centralAuthorizationRegistry.initialize(admin.address);

        ResourceTypeManager = await ethers.getContractFactory("ResourceTypeManager");
        resourceTypeManager = await ResourceTypeManager.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await resourceTypeManager.INTERFACE_ID(), await resourceTypeManager.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await resourceTypeManager.getAddress());
    });

    it("should add a new resource type", async function () {
        await resourceTypeManager.connect(admin).addResourceType("gold", true, true);
        const resourceTypes = await resourceTypeManager.getResourceTypes();
        expect(resourceTypes.length).to.equal(29); // Updated expected length
        expect(resourceTypes[28].name).to.equal("gold"); // Updated index
    });

    it("should update an existing resource type", async function () {
        await resourceTypeManager.connect(admin).updateResourceType("coconut", false, false);
        const resourceTypes = await resourceTypeManager.getResourceTypes();
        expect(resourceTypes[0].canBeCarriedBetweenStorages).to.equal(false);
        expect(resourceTypes[0].canBeTransferredToGlobalMarketplace).to.equal(false);
    });

    it("should remove an existing resource type", async function () {
        await resourceTypeManager.connect(admin).removeResourceType("coconut");
        const resourceTypes = await resourceTypeManager.getResourceTypes();
        expect(resourceTypes.length).to.equal(27);
        expect(resourceTypes.some(rt => rt.name === "coconut")).to.equal(false);
    });

    it("should validate an existing resource type", async function () {
        const isValid = await resourceTypeManager.isValidResourceType("coconut");
        expect(isValid).to.equal(true);
    });

    it("should invalidate a non-existing resource type", async function () {
        const isValid = await resourceTypeManager.isValidResourceType("gold");
        expect(isValid).to.equal(false);
    });

    it("should return all resource type names", async function () {
        const names = await resourceTypeManager.getResourceTypeNames();        
        expect(names.length).to.equal(28); // Updated expected length
        [
            'coconut', 'citrus',
            'fish',    'tobacco',
            'cotton',  'pig',
            'wood',    'sugarcane',
            'grain',   'planks',
            'meat',    'barrel-packed fish',
            'barrel-packed meat', 'crates',
            'barrels', 'bags',
            'bag-packed tobacco', 'bag-packed grain',
            'bag-packed cotton', 'bag-packed sugarcane',
            'wild game', 'coconut liquor',
            'crate-packed citrus', 'crate-packed coconuts'
        ].forEach(name => {
            expect(names).to.include(name);
        });
    });
});
