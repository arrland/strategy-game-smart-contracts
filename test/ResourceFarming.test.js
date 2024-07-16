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
            console.log("Contract already authorized");
        }
        await centralAuthorizationRegistry.addAuthorizedContract(contractAddress);

        return contractInstance;
    }

    beforeEach(async function () {
        [admin, user, pirateOwner, contractAddress1, contractAddress2, externalCaller, maticFeeRecipient] = await ethers.getSigners();

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

        genesisPiratesAddress = await simpleERC1155.getAddress();

        SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        islandNft = await SimpleERC721.deploy("Island", "ISL", "https://island.com/", admin.address);

        genesisIslandsAddress = await islandNft.getAddress();

        await islandNft.mint(pirateOwner.address);

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        await centralAuthorizationRegistry.addAuthorizedContract(externalCaller.address);

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

            for (const tokenId of tokenIds) {
                await pirateManagement.connect(admin).batchUpdatePirateAttributes(
                    genesisPiratesAddress,
                    [{ tokenIds: [tokenId], skills: pirateSkills }]
                );
            }
        }

        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);

        await rumToken.mint(pirateOwner.address, ethers.parseEther("10"));

    });

    it("should stake a pirate with matic", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
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
        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());        
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(1n);
        const farmingInfo = await resourceFarming.farmingInfo(genesisPiratesAddress, 1);        
        expect(farmingInfo.tokenId).to.equal(1);
    });

    it("should unstake a pirate", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
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

        expect(await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 1)).to.equal(1);
                
        await ethers.provider.send("evm_increaseTime", [86402]); // Increase time by 1 day
        await ethers.provider.send("evm_mine");

        const totalToClaim = await resourceFarming.getTotalToClaim(genesisPiratesAddress, 1);
        expect(totalToClaim).to.be.greaterThan(0);

        const restakeParams = {
            resource: "",
            days_count: 0,
            useRum: false,
            resourceToBurn: "",
            isSet: false
        };

        await expect(resourceFarming.connect(pirateOwner).claimResourcePirate(genesisPiratesAddress, 1, restakeParams))
            .to.emit(resourceManagement, 'ResourceAdded');

        const farmingInfo = await resourceFarming.farmingInfo(genesisPiratesAddress, 1);
        expect(farmingInfo.tokenId).to.equal(0);
        const balance = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
        expect(balance).to.equal(3000000000000000000n);
        const balanceOfContract = await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 1);
        expect(balanceOfContract).to.equal(0);
        const balanceOfPirateOwner = await simpleERC1155.balanceOf(pirateOwner.address, 1);
        expect(balanceOfPirateOwner).to.equal(1);

        
    });
    it("should not allow staking a pirate that is already staked", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
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

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                1, // 1 day later
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("Pirate is already staked");

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(1n);
    });
    it("should not allow staking a pirate that the user does not own", async function () {
        await simpleERC1155.connect(admin).mint(admin.address, 1); // Mint a pirate to the admin
        await simpleERC1155.connect(admin).setApprovalForAll(await resourceFarming.getAddress(), true);

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                1, // 1 day later
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("You do not own this pirate");

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(0);
    });

    it("should not allow claiming resources for a pirate that the user does not own", async function () {
        await simpleERC1155.connect(admin).mint(admin.address, 1); // Mint a pirate to the admin
        await simpleERC1155.connect(admin).setApprovalForAll(await resourceFarming.getAddress(), true);

        await resourceFarming.connect(admin).farmResource(
            await simpleERC1155.getAddress(),
            1,
            "fish",
            1, // 1 day later
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        await ethers.provider.send("evm_increaseTime", [86402]); // Increase time by 1 day
        await ethers.provider.send("evm_mine");

        const restakeParams = {
            resource: "",
            days_count: 0,
            useRum: false,
            resourceToBurn: "",
            isSet: false
        };

        await expect(
            resourceFarming.connect(user).claimResourcePirate(genesisPiratesAddress, 1, restakeParams)
        ).to.be.revertedWith("You do not own this pirate");
    });

    it("should revert when farming resources with invalid resource names", async function () {
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                1,
                "invalidResource",
                1, // 1 day later
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("Invalid resource name");

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(0);
    });
    it("should revert when farming resources for more than the maximum allowed days", async function () {
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        const maxDaysAllowed = 28n;

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                maxDaysAllowed + 1n, // Exceeding the maximum allowed days
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("Exceeds maximum allowed farming days");

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(0);
    });
    it("should revert when farming resources for less than the minimum allowed days", async function () {
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        const minDaysAllowed = 1n;

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                minDaysAllowed - 1n, // Less than the minimum allowed days
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("Minimum staking period is 1 day");

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(0);
    });
    it("should farm resources using RUM", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
    
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));
    
        const initialRumBalance = await rumToken.balanceOf(pirateOwner.address);
        expect(initialRumBalance).to.equal(ethers.parseEther("10"));

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                1, // 1 day
                true, // Using RUM
                "",
                false
            )
        ).to.emit(resourceFarming, 'ResourceFarmed')

        const finalRumBalance = await rumToken.balanceOf(pirateOwner.address);
        const rumSpent = initialRumBalance - finalRumBalance;

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(1n);

        const farmingInfo = await resourceFarming.farmingInfo(await simpleERC1155.getAddress(), 1);
        expect(farmingInfo.tokenId).to.equal(1);
        expect(farmingInfo.useRum).to.equal(true);
        expect(rumSpent).to.equal(ethers.parseEther("1")); // Assuming 1 RUM is spent per day
    });

    it("should farm resources without using RUM", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        const initialMaticFeeRecipientBalance = await ethers.provider.getBalance(maticFeeRecipient.address);

        await resourceFarming.connect(pirateOwner).farmResource(
            await simpleERC1155.getAddress(),
            1,
            "fish",
            1, // 1 day
            false, // Not using RUM
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        const finalMaticFeeRecipientBalance = await ethers.provider.getBalance(maticFeeRecipient.address);
        const maticFeeTransferred = finalMaticFeeRecipientBalance - initialMaticFeeRecipientBalance;

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(1n);

        const farmingInfo = await resourceFarming.farmingInfo(await simpleERC1155.getAddress(), 1);
        expect(farmingInfo.tokenId).to.equal(1);
        expect(farmingInfo.useRum).to.equal(false);
        expect(maticFeeTransferred).to.equal(ethers.parseEther("0.05"));
    });

    it("should validate the pirate collection address using validPirateCollection modifier", async function () {
        // Attempt to farm resources with an invalid pirate collection address
        const invalidPirateCollectionAddress = "0x0000000000000000000000000000000000000000";
        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                invalidPirateCollectionAddress,
                1,
                "fish",
                1, // 1 day
                true, // Using RUM
                "",
                false
            )
        ).to.be.revertedWith("Invalid collection address");
    });

    it("should correctly burn resources when required", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address,2);

        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        // Mint resources to the pirateOwner
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 2, pirateOwner.address, "wood", ethers.parseEther("2"));
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 2, pirateOwner.address, "fish", ethers.parseEther("10"));
        
        const initialWoodBalance = await resourceManagement.getResourceBalance(await pirateStorage.getAddress(), 2, "wood");
        const initialFishBalance = await resourceManagement.getResourceBalance(await pirateStorage.getAddress(), 2, "fish");
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));

        await resourceFarming.connect(pirateOwner).farmResource(
            await simpleERC1155.getAddress(),
            2,
            "planks",
            1, // 1 day
            true,
            "fish", // Optional resource to burn
            false
        );

        const finalWoodBalance = await resourceManagement.getResourceBalance(await pirateStorage.getAddress(), 2, "wood");
        const finalFishBalance = await resourceManagement.getResourceBalance(await pirateStorage.getAddress(), 2, "fish");
        expect(finalWoodBalance).to.equal(1750000000000000000n); // 2 wood required for planks
        expect(finalFishBalance).to.equal(initialFishBalance - ethers.parseEther("1")); // 1 fish burned as optional resource
    });
    it("should prevent farming if the storage limit is reached", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 2);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 2, pirateOwner.address, "wood", ethers.parseEther("30"));
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 2, pirateOwner.address, "fish", ethers.parseEther("29"));
  
        // Attempt to farm more fish, which should fail due to storage limit
        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                2,
                "fish",
                10,
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("Storage limit reached");

        const finalFishBalance = await resourceManagement.getResourceBalance(await pirateStorage.getAddress(), 2, "fish");
        expect(finalFishBalance).to.equal(ethers.parseEther("29")); // Ensure the balance has not changed
    });

    it("should allow restaking a pirate and handle the previous farming period correctly", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 2);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        const restakeParams = {
            resource: "",
            days_count: 0,
            useRum: false,
            resourceToBurn: "",
            isSet: true
        };

        // Initial staking
        await resourceFarming.connect(pirateOwner).farmResource(
            await simpleERC1155.getAddress(),
            2,
            "fish",
            1, // 1 day later
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        // Increase time by 1 day
        await ethers.provider.send("evm_increaseTime", [86402]);
        await ethers.provider.send("evm_mine");

        await expect(resourceFarming.connect(pirateOwner).claimResourcePirate(genesisPiratesAddress, 2, restakeParams, { value: ethers.parseEther("0.05") }))
            .to.emit(resourceManagement, 'ResourceAdded');

        
    });

    it("should allow restaking a pirate with new parameters", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 2);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));
        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 2, pirateOwner.address, "fish", ethers.parseEther("10"));
        // Initial staking
        await resourceFarming.connect(pirateOwner).farmResource(
            await simpleERC1155.getAddress(),
            2,
            "fish",
            1, // 1 day
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        // Increase time by 1 day
        await ethers.provider.send("evm_increaseTime", [86402]);
        await ethers.provider.send("evm_mine");

        // Restake with new parameters
        const restakeParams = {
            resource: "wood",
            days_count: 2,
            useRum: true,
            resourceToBurn: "fish",
            isSet: true
        };

        await expect(resourceFarming.connect(pirateOwner).claimResourcePirate(
            await simpleERC1155.getAddress(),
            2,
            restakeParams
        )).to.emit(resourceManagement, 'ResourceAdded');

        // Verify the new farming info
        const farmingInfo = await resourceFarming.getFarmingInfo(await simpleERC1155.getAddress(), 2);
        expect(farmingInfo.resource).to.equal("wood");
        expect(farmingInfo.days_count).to.equal(2);
        expect(farmingInfo.useRum).to.equal(true);
        expect(farmingInfo.resourceToBurn).to.equal("fish");
    });
    it("should simulate resource production correctly", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 2);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));
        

        // Simulate resource production for 3 days
        const daysCount = 3n;
        const resource = "fish";
        const simulatedOutput = await resourceFarming.simulateResourceProduction(
            await simpleERC1155.getAddress(),
            2,
            resource,
            daysCount
        );

        expect(simulatedOutput).to.equal(ethers.parseEther("10.5"));
    });
    it("should revert farming with zero days", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 2);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));

        // Attempt to simulate resource production with zero days
        const daysCount = 0n;
        const resource = "wood";

        await expect(
            resourceFarming.simulateResourceProduction(
                await simpleERC1155.getAddress(),
                2,
                resource,
                daysCount
            )
        ).to.be.revertedWith("Invalid days count");
    });

    it("should revert farming with zero days", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 2);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));

        // Attempt to farm resources with zero days
        const daysCount = 0n;
        const resource = "wood";

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                0, // 1 day later
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )       
        ).to.be.revertedWith("Minimum staking period is 1 day");
    });

    it("should revert farming with invalid resource name", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 3);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));

        const invalidResource = "invalidResource";

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                3,
                invalidResource,
                1, // 1 day
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("Invalid resource name");
    });

    it("should revert farming with invalid collection address", async function () {
        const invalidCollectionAddress = "0x0000000000000000000000000000000000000000";
        const resource = "fish";

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                invalidCollectionAddress,
                1,
                resource,
                1, // 1 day
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("Invalid collection address");
    });

    it("should revert farming with invalid token ID", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 4);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await rumToken.connect(pirateOwner).approve(await feeManagement.getAddress(), ethers.parseEther("10"));

        const invalidTokenId = 9999;
        const resource = "fish";

        await expect(
            resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                invalidTokenId,
                resource,
                1, // 1 day
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            )
        ).to.be.revertedWith("You do not own this pirate");
    });

});