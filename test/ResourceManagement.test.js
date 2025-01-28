const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ResourceManagement", function () {
    let ResourceManagement, resourceManagement;
    let ResourceTypeManager, resourceTypeManager;
    let centralAuthorizationRegistry;
    let admin, user, contractAddress1, contractAddress2, externalCaller;

    beforeEach(async function () {
        [admin, user, contractAddress1, contractAddress2, externalCaller] = await ethers.getSigners();

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        ResourceTypeManager = await ethers.getContractFactory("ResourceTypeManager");
        resourceTypeManager = await ResourceTypeManager.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await resourceTypeManager.INTERFACE_ID(), await resourceTypeManager.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await resourceTypeManager.getAddress());

        ResourceManagement = await ethers.getContractFactory("ResourceManagement");
        resourceManagement = await ResourceManagement.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await resourceManagement.INTERFACE_ID(), await resourceManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await resourceManagement.getAddress());        
        await centralAuthorizationRegistry.addAuthorizedContract(externalCaller.address);

        // Add initial resource types
        await resourceTypeManager.connect(admin).addResourceType("gold", true, true);
        await resourceTypeManager.connect(admin).addResourceType("silver", true, true);
    });

    it("should add a new resource", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "gold", 100);
        const balance = await resourceManagement.getResourceBalance(contractAddress1.address, 1, "gold");
        expect(balance).to.equal(100);
    });

    it("should transfer a resource", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "gold", 100);
        await resourceManagement.connect(externalCaller).transferResource(contractAddress1.address, 1, user.address, contractAddress2.address, 2, user.address, "gold", 50);
        const balance1 = await resourceManagement.getResourceBalance(contractAddress1.address, 1, "gold");
        const balance2 = await resourceManagement.getResourceBalance(contractAddress2.address, 2, "gold");
        expect(balance1).to.equal(50);
        expect(balance2).to.equal(50);
    });

    it("should burn a resource", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "gold", 100);
        await resourceManagement.connect(externalCaller).burnResource(contractAddress1.address, 1, user.address, "gold", 50);
        const balance = await resourceManagement.getResourceBalance(contractAddress1.address, 1, "gold");
        expect(balance).to.equal(50);
    });

    it("should return all resource balances", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "gold", 100);
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "silver", 200);
        const [resourceNames, resourceBalances] = await resourceManagement.getAllResourceBalances(contractAddress1.address, 1);
        expect(resourceNames).to.include.members(["gold", "silver"]);        
        expect(resourceBalances).to.deep.equal([
            0n, 0n, 0n, 0n, 0n, 0n,   0n,
            0n, 0n, 0n, 0n, 0n, 0n,   0n,
            0n, 0n, 0n, 0n, 0n, 0n,   0n,
            0n, 0n, 0n, 0n, 0n, 0n, 0n, 100n,
          200n
        ]);
    });

    it("should return total resources in storage", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "gold", 100);
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "silver", 200);
        const totalResources = await resourceManagement.getTotalResourcesInStorage(contractAddress1.address, 1);
        expect(totalResources).to.equal(300);
    });

    it("should revert if adding an invalid resource type", async function () {
        await expect(resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "invalidResource", 100)).to.be.revertedWith("Invalid resource name");
    });

    it("should revert if transferring more than available balance", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "gold", 100);
        await expect(resourceManagement.connect(externalCaller).transferResource(contractAddress1.address, 1, user.address, contractAddress2.address, 2, user.address, "gold", 150)).to.be.revertedWith("Insufficient resource balance");
    });

    it("should revert if burning more than available balance", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "gold", 100);
        await expect(resourceManagement.connect(externalCaller).burnResource(contractAddress1.address, 1, user.address, "gold", 150)).to.be.revertedWith("Insufficient resource balance");
    });
});