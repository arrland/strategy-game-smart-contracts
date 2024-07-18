const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ResourceSpendManagement", function () {
    let ResourceSpendManagement, resourceSpendManagement;
    let ResourceTypeManager, resourceTypeManager;
    let ResourceManagement, resourceManagement;
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

        ResourceSpendManagement = await ethers.getContractFactory("ResourceSpendManagement");
        resourceSpendManagement = await ResourceSpendManagement.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await resourceSpendManagement.INTERFACE_ID(), await resourceSpendManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await resourceSpendManagement.getAddress());        

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
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "wood", ethers.parseEther("10"));
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "fish", ethers.parseEther("10"));

        await resourceSpendManagement.connect(externalCaller).handleResourceBurning(
            contractAddress1.address,
            1,
            user.address,
            "planks",
            1,
            ethers.parseEther("10"),
            ["fish"]
        );

        const balance = await resourceManagement.getResourceBalance(contractAddress1.address, 1, "wood");        
        expect(balance).to.equal(ethers.parseEther("5"));
    });

    it("should burn optional resources", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "fish", ethers.parseEther("1"));
        await resourceSpendManagement.connect(admin).setResourceRequirements("planks", [{ resource: "fish", amount: ethers.parseEther("1"), method: 0 }], []);

        await resourceSpendManagement.connect(externalCaller).handleResourceBurning(
            contractAddress1.address,
            1,
            user.address,
            "planks",
            1,
            ethers.parseEther("10"),
            ["fish"]
        );

        const balance = await resourceManagement.getResourceBalance(contractAddress1.address, 1, "fish");
        expect(balance).to.equal(0n);
    });

    it("should revert if insufficient mandatory resources", async function () {
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "fish", ethers.parseEther("10"));
        await resourceManagement.connect(externalCaller).addResource(contractAddress1.address, 1, user.address, "wood", ethers.parseEther("1"));
    
        await expect(
            resourceSpendManagement.connect(externalCaller).handleResourceBurning(
                contractAddress1.address,
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
                contractAddress1.address,
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
});