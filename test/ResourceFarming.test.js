const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

describe("ResourceFarming", function () {
    let ResourceFarming, resourceFarming;
    let ResourceFarmingRules, resourceFarmingRules;
    let ResourceManagement, resourceManagement;
    let FeeManagement, feeManagement;
    let PirateManagement, pirateManagement;
    let StorageManagement, storageManagement;
    let ResourceSpendManagement, resourceSpendManagement;
    let ResourceTypeManager, resourceTypeManager, rumToken;
    let centralAuthorizationRegistry, simpleERC1155, SimpleERC1155;
    let IslandStorage, pirateStorage, PirateStorage;
    let genesisPiratesAddress, SimpleERC721, islandNft, islandStorage
    let admin, user, pirateOwner, contractAddress1, contractAddress2, externalCaller, maticFeeRecipient;
    let genesisIslandsAddress;

    async function deployAndAuthorizeContract(contractName, centralAuthorizationRegistry, ...args) {
        const ContractFactory = await ethers.getContractFactory(contractName);
        const contractInstance = await ContractFactory.deploy(await centralAuthorizationRegistry.getAddress(), ...args);
        const contractAddress = await contractInstance.getAddress();

        try {
            const interfaceId = await contractInstance.INTERFACE_ID(); // Correct property access
            await centralAuthorizationRegistry.setContractAddress(interfaceId, contractAddress);
        } catch (error) {
            console.error(error);
        }
        await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

        return contractInstance;
    }

    beforeEach(async function () {
        [admin, user, pirateOwner, contractAddress1, contractAddress2, externalCaller, maticFeeRecipient] = await ethers.getSigners();

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address);

        genesisPiratesAddress = await simpleERC1155.getAddress();

        SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        islandNft = await SimpleERC721.deploy("Island", "ISL", "https://island.com/", admin.address);

        genesisIslandsAddress = await islandNft.getAddress();

        await islandNft.mint(pirateOwner.address);

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize();

        resourceTypeManager = await deployAndAuthorizeContract("ResourceTypeManager", centralAuthorizationRegistry);
        resourceManagement = await deployAndAuthorizeContract("ResourceManagement", centralAuthorizationRegistry);
        
        const DummyERC20Burnable = await ethers.getContractFactory("DummyERC20Burnable");
        rumToken = await DummyERC20Burnable.deploy("RUM Token", "RUM");
        
        // Deploy the FeeManagement contract
        feeManagement = await deployAndAuthorizeContract("FeeManagement", centralAuthorizationRegistry, await rumToken.getAddress(), maticFeeRecipient.address);
  
        pirateManagement = await deployAndAuthorizeContract("PirateManagement", centralAuthorizationRegistry);
        

        pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, true);

        islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, false);
        

        await islandStorage.initializeIslands(1);
        
        storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, await pirateStorage.getAddress(), await islandStorage.getAddress());
        
        resourceSpendManagement = await deployAndAuthorizeContract("ResourceSpendManagement", centralAuthorizationRegistry);

        resourceFarmingRules = await deployAndAuthorizeContract("ResourceFarmingRules", centralAuthorizationRegistry);
        
        resourceFarming = await deployAndAuthorizeContract("ResourceFarming", centralAuthorizationRegistry);

 
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../scripts/pirate_skils_test.json'), "utf8"));

        console.log(data);
        for (const tokenSkillSet of data) {
            const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));
            const skills = tokenSkillSet.skills;

            const characterSkills = {
                strength: BigInt(skills.characterSkills.strength),
                stamina: BigInt(skills.characterSkills.stamina),
                swimming: BigInt(skills.characterSkills.swimming),
                melee: BigInt(skills.characterSkills.melee),
                shooting: BigInt(skills.characterSkills.shooting),
                cannons: BigInt(skills.characterSkills.cannons),
                agility: BigInt(skills.characterSkills.agility),
                engineering: BigInt(skills.characterSkills.engineering),
                wisdom: BigInt(skills.characterSkills.wisdom),
                luck: BigInt(skills.characterSkills.luck),
                health: BigInt(skills.characterSkills.health),
                speed: BigInt(skills.characterSkills.speed)
            };

            const toolsSkills = {
                harvest: BigInt(skills.toolsSkills.harvest),
                mining: BigInt(skills.toolsSkills.mining),
                quarrying: BigInt(skills.toolsSkills.quarrying),
                excavation: BigInt(skills.toolsSkills.excavation),
                husbandry: BigInt(skills.toolsSkills.husbandry),
                woodcutting: BigInt(skills.toolsSkills.woodcutting),
                slaughter: BigInt(skills.toolsSkills.slaughter),
                hunting: BigInt(skills.toolsSkills.hunting),
                cultivation: BigInt(skills.toolsSkills.cultivation)
            };

            const specialSkills = {
                fruitPicking: BigInt(skills.specialSkills.fruitPicking),
                fishing: BigInt(skills.specialSkills.fishing),
                building: BigInt(skills.specialSkills.building),
                crafting: BigInt(skills.specialSkills.crafting)
            };

            const pirateSkills = {
                characterSkills: characterSkills,
                toolsSkills: toolsSkills,
                specialSkills: specialSkills,
                added: true
            };

            await pirateManagement.connect(admin).batchUpdatePirateAttributes(
                await pirateManagement.getAddress(),
                [{ tokenIds: tokenIds, skills: pirateSkills }]
            );
        }

        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);

        await rumToken.mint(pirateOwner.address, ethers.parseEther("100"));

    });

    it("should stake a pirate with matic", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        const total = await storageManagement.getTotalResourcesInStorage(genesisPiratesAddress, 1);
        console.log("Total resources in storage:", total.toString());
        await resourceFarming.connect(pirateOwner).farmResource(
            await simpleERC1155.getAddress(),
            1,
            "fish",
            1, // 1 day later
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        const farmingInfo = await resourceFarming.farmingInfo(genesisPiratesAddress, 1);
        console.log("Farming Info:", farmingInfo);
        expect(farmingInfo.tokenId).to.equal(1);
    });

    it("should unstake a pirate", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        await resourceFarming.connect(pirateOwner).farmResource(
            await simpleERC1155.getAddress(),
            1,
            "fish",
            1, // 1 day later
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        await ethers.provider.send("evm_increaseTime", [86401]); // Increase time by 1 day
        await ethers.provider.send("evm_mine");

        await resourceFarming.connect(pirateOwner).claimResourcePirate(genesisPiratesAddress, 1, false);

        const farmingInfo = await resourceFarming.farmingInfo(genesisPiratesAddress, 1);
        expect(farmingInfo.tokenId).to.equal(0);
        const balance = await resourceManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
        expect(balance).to.equal(50);
    });

    // it("should calculate resource output", async function () {
    //     await pirateManagement.connect(admin).mintPirate(pirateOwner.address, 1);
    //     await pirateManagement.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

    //     await resourceFarming.connect(pirateOwner).farmResource(
    //         await pirateManagement.getAddress(),
    //         1,
    //         "wood",
    //         Math.floor(Date.now() / 1000) + 86400, // 1 day later
    //         false,
    //         "",
    //         false
    //     );

    //     const output = await resourceFarming.getCurrentProduction(await pirateManagement.getAddress(), 1);
    //     expect(output).to.be.a("bigint");
    // });

    // it("should claim resources", async function () {
    //     await pirateManagement.connect(admin).mintPirate(pirateOwner.address, 1);
    //     await pirateManagement.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

    //     await resourceFarming.connect(pirateOwner).farmResource(
    //         await pirateManagement.getAddress(),
    //         1,
    //         "wood",
    //         Math.floor(Date.now() / 1000) + 86400, // 1 day later
    //         false,
    //         "",
    //         false
    //     );

    //     await ethers.provider.send("evm_increaseTime", [86400]); // Increase time by 1 day
    //     await ethers.provider.send("evm_mine");

    //     await resourceFarming.connect(pirateOwner).claimResourcePirate(await pirateManagement.getAddress(), 1, false);

    //     const balance = await resourceManagement.getResourceBalance(await storageManagement.getStorageByCollection(await pirateManagement.getAddress()), 1, "wood");
    //     expect(balance).to.be.a("bigint");
    // });

    // it("should handle RUM usage", async function () {
    //     await pirateManagement.connect(admin).mintPirate(pirateOwner.address, 1);
    //     await pirateManagement.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

    //     await resourceFarming.connect(pirateOwner).farmResource(
    //         await pirateManagement.getAddress(),
    //         1,
    //         "wood",
    //         Math.floor(Date.now() / 1000) + 86400, // 1 day later
    //         true,
    //         "",
    //         false
    //     );

    //     const fee = await feeManagement.calculateMaticFee(1);
    //     expect(fee).to.be.a("bigint");
    // });

    // it("should handle resource burning", async function () {
    //     await pirateManagement.connect(admin).mintPirate(pirateOwner.address, 1);
    //     await pirateManagement.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

    //     await resourceManagement.connect(externalCaller).addResource(await storageManagement.getStorageByCollection(await pirateManagement.getAddress()), 1, pirateOwner.address, "wood", 10);
    //     await resourceSpendManagement.connect(admin).setResourceRequirements("planks", [{ resource: "wood", amount: 1, method: 0 }], []);

    //     await resourceFarming.connect(pirateOwner).farmResource(
    //         await pirateManagement.getAddress(),
    //         1,
    //         "planks",
    //         Math.floor(Date.now() / 1000) + 86400, // 1 day later
    //         true,
    //         "wood",
    //         false
    //     );

    //     const balance = await resourceManagement.getResourceBalance(await storageManagement.getStorageByCollection(await pirateManagement.getAddress()), 1, "wood");
    //     expect(balance).to.equal(0n);
    // });

    // it("should farm all resources", async function () {
    //     await pirateManagement.connect(admin).mintPirate(pirateOwner.address, 1);
    //     await pirateManagement.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

    //     await resourceFarming.connect(pirateOwner).farmResource(
    //         await pirateManagement.getAddress(),
    //         1,
    //         "wood",
    //         Math.floor(Date.now() / 1000) + 86400, // 1 day later
    //         false,
    //         "",
    //         false
    //     );

    //     await resourceFarming.connect(pirateOwner).farmResource(
    //         await pirateManagement.getAddress(),
    //         1,
    //         "planks",
    //         Math.floor(Date.now() / 1000) + 86400, // 1 day later
    //         false,
    //         "",
    //         true
    //     );

    //     const farmingInfo = await resourceFarming.farmingInfo(await pirateManagement.getAddress(), 1);
    //     expect(farmingInfo.resource).to.equal("planks");
    // });

    // it("should calculate resource output using rules", async function () {
    //     const pirateSkills = {
    //         characterSkills: {
    //             agility: 10,
    //             swimming: 5,
    //             luck: 3,
    //             stamina: 8,
    //             melee: 7,
    //             strength: 6
    //         },
    //         specialSkills: {
    //             fruitPicking: 2,
    //             fishing: 4
    //         },
    //         toolsSkills: {
    //             woodcutting: 3,
    //             harvest: 2,
    //             cultivation: 1,
    //             husbandry: 0
    //         }
    //     };

    //     const resource = "wood";
    //     const durationSeconds = 86400; // 1 day

    //     const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
    //     expect(output).to.be.a("bigint");
    // });
});