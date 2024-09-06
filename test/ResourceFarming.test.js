const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function updatePirateSkillsFromJSON(filePath, pirateManagement, admin, genesisPiratesAddress) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

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
}

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
    let IslandStorage, pirateStorage, PirateStorage, activityStats;
    let genesisPiratesAddress, SimpleERC721, islandNft, islandStorage, islandManagement;
    let admin, user, pirateOwner, contractAddress1, contractAddress2, externalCaller, maticFeeRecipient;
    let genesisIslandsAddress;
    let inhabitantStorage, inhabitantNFT, InhabitantsAddress, InhabitantNFT;

    const { deployAndAuthorizeContract } = require('./utils');

    beforeEach(async function () {
        [admin, user, pirateOwner, contractAddress1, contractAddress2, externalCaller, maticFeeRecipient] = await ethers.getSigners();

        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");

        genesisPiratesAddress = await simpleERC1155.getAddress();

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
        await inhabitantNFT.mint(pirateOwner.address);

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
        

        pirateStorage = await deployAndAuthorizeContract("PirateStorage", centralAuthorizationRegistry, genesisPiratesAddress, false);

        islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, genesisIslandsAddress, true);
        
        inhabitantStorage = await deployAndAuthorizeContract("InhabitantStorage", centralAuthorizationRegistry, InhabitantsAddress, true, genesisIslandsAddress);
                
        await islandStorage.initializeIslands(1, { gasLimit: 30000000 });        
        await islandStorage.initializeIslands(13, { gasLimit: 30000000 });
        
        
        storageManagement = await deployAndAuthorizeContract("StorageManagement", centralAuthorizationRegistry, genesisPiratesAddress, genesisIslandsAddress, await pirateStorage.getAddress(), await islandStorage.getAddress());
        
        resourceSpendManagement = await deployAndAuthorizeContract("ResourceSpendManagement", centralAuthorizationRegistry);

        resourceFarmingRules = await deployAndAuthorizeContract("ResourceFarmingRules", centralAuthorizationRegistry);
        
        resourceFarming = await deployAndAuthorizeContract("ResourceFarming", centralAuthorizationRegistry);

        activityStats = await deployAndAuthorizeContract("ActivityStats", centralAuthorizationRegistry, 1, 0, 5);

        islandManagement = await deployAndAuthorizeContract("IslandManagement", centralAuthorizationRegistry, genesisIslandsAddress);
 
        await updatePirateSkillsFromJSON(path.join(__dirname, '../scripts/pirate_skils_test.json'), pirateManagement, admin, genesisPiratesAddress);
        await updatePirateSkillsFromJSON(path.join(__dirname, '../scripts/pirate_skils_test.json'), pirateManagement, admin, InhabitantsAddress);

        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);
        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(InhabitantsAddress);

        await rumToken.mint(pirateOwner.address, ethers.parseEther("10"));

        storageManagement.addStorageContract(InhabitantsAddress, await inhabitantStorage.getAddress());

        

    });

    it("should allow farming resources for an Inhabitant", async function () {
        // Mint an Inhabitant NFT
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, 1, 1);
        await inhabitantNFT.connect(admin).mint(pirateOwner.address);

        // Approve the ResourceFarming contract to transfer the Inhabitant NFT
        await inhabitantNFT.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        // Farm resources for the Inhabitant
        await resourceFarming.connect(pirateOwner).farmResource(
            await inhabitantNFT.getAddress(),
            1,
            "fish",
            1, // 1 day later
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        // Check if the Inhabitant is staked
        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await inhabitantNFT.getAddress());
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(1n);

        // Increase time by 1 day
        await ethers.provider.send("evm_increaseTime", [86402]);
        await ethers.provider.send("evm_mine");

        // Unstake the Inhabitant
        const restakeParams = {
            resource: "",
            days_count: 0,
            useRum: false,
            resourceToBurn: "",
            isSet: false
        };

        await expect(resourceFarming.connect(pirateOwner).claimResourcePirate(await inhabitantNFT.getAddress(), 1, restakeParams))
            .to.emit(resourceManagement, 'ResourceAdded');

        // Check if the Inhabitant is unstaked
        const ownerOfToken = await inhabitantNFT.ownerOf(1);
        expect(ownerOfToken).to.equal(pirateOwner.address);
    });

    it("should transfer resources to the capital island for an Inhabitant NFT", async function () {
        // Mint an Inhabitant NFT to the pirateOwner
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, 1, 1);
        await inhabitantNFT.connect(admin).mint(pirateOwner.address);

        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(2);

        // Add resources to the Inhabitant NFT storage
        await storageManagement.connect(externalCaller).addResource(InhabitantsAddress, 1, pirateOwner.address, "wood", ethers.parseEther("10"));

        // Transfer resources to the capital island
        await expect(
            islandManagement.connect(pirateOwner).transferResourceToCapital(
                await inhabitantNFT.getAddress(),
                1,
                "wood",
                ethers.parseEther("5")
            )
        ).to.emit(islandManagement, "ResourceTransferredToCapital");

        // Check Inhabitant NFT storage balance after transfer
        const inhabitantStorageBalanceAfter = await storageManagement.getResourceBalance(InhabitantsAddress, 1, "wood");
        expect(inhabitantStorageBalanceAfter).to.equal(ethers.parseEther("5"));

        // Check island storage balance after transfer
        const islandStorageBalanceAfter = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "wood");
        expect(islandStorageBalanceAfter).to.equal(ethers.parseEther("5"));
    });

    it("should get assigned pirates for user islands", async function () {
        // Mint an Inhabitant NFT to the pirateOwner
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(InhabitantsAddress, 1, 1);
        await inhabitantNFT.connect(admin).mint(pirateOwner.address);

        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(2);

        // Add resources to the Inhabitant NFT storage
        await storageManagement.connect(externalCaller).addResource(InhabitantsAddress, 1, pirateOwner.address, "wood", ethers.parseEther("10"));

        // Get assigned pirates for user islands
        const assignedPirates = await storageManagement.getAllAssignedToStorage(pirateOwner.address, InhabitantsAddress, genesisIslandsAddress);        
        expect(assignedPirates.length).to.equal(2);
        expect(assignedPirates[0].storageTokenId).to.equal(1);
        expect(assignedPirates[0].primaryTokens.length).to.equal(1);
        expect(assignedPirates[0].primaryTokens[0]).to.equal(1);
        expect(assignedPirates[1].storageTokenId).to.equal(2);
        expect(assignedPirates[1].primaryTokens.length).to.equal(0);
        
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
    it("should claim resources from multiple pirates at once", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 2);
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

        expect(await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 1)).to.equal(1);
        expect(await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 2)).to.equal(1);

        await ethers.provider.send("evm_increaseTime", [86402]); // Increase time by 1 day
        await ethers.provider.send("evm_mine");

        const totalToClaim1 = await resourceFarming.getTotalToClaim(genesisPiratesAddress, 1);
        const totalToClaim2 = await resourceFarming.getTotalToClaim(genesisPiratesAddress, 2);
        expect(totalToClaim1).to.be.greaterThan(0);
        expect(totalToClaim2).to.be.greaterThan(0);

        await expect(resourceFarming.connect(pirateOwner).claimAllResources(genesisPiratesAddress))
            .to.emit(resourceManagement, 'ResourceAdded')
            .and.to.emit(resourceManagement, 'ResourceAdded');

        const farmingInfo1 = await resourceFarming.farmingInfo(genesisPiratesAddress, 1);
        const farmingInfo2 = await resourceFarming.farmingInfo(genesisPiratesAddress, 2);
        expect(farmingInfo1.tokenId).to.equal(0);
        expect(farmingInfo2.tokenId).to.equal(0);

        const balance1 = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "fish");
        const balance2 = await storageManagement.getResourceBalance(genesisPiratesAddress, 2, "fish");
        expect(balance1).to.equal(3000000000000000000n);
        expect(balance2).to.equal(3500000000000000000n);

        const balanceOfContract1 = await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 1);
        const balanceOfContract2 = await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 2);
        expect(balanceOfContract1).to.equal(0);
        expect(balanceOfContract2).to.equal(0);

        const balanceOfPirateOwner1 = await simpleERC1155.balanceOf(pirateOwner.address, 1);
        const balanceOfPirateOwner2 = await simpleERC1155.balanceOf(pirateOwner.address, 2);
        expect(balanceOfPirateOwner1).to.equal(1);
        expect(balanceOfPirateOwner2).to.equal(1);
    });
    it("should allow the owner to cancel farming and return the pirate NFT", async function () {
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

        await resourceFarming.connect(pirateOwner).cancelFarming(await simpleERC1155.getAddress(), 1);

        const farmingInfo = await resourceFarming.farmingInfo(await simpleERC1155.getAddress(), 1);
        expect(farmingInfo.tokenId).to.equal(0);

        const balanceOfContract = await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 1);
        expect(balanceOfContract).to.equal(0);

        const balanceOfPirateOwner = await simpleERC1155.balanceOf(pirateOwner.address, 1);
        expect(balanceOfPirateOwner).to.equal(1);

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(0);
    });

    it("should not allow non-owner to cancel farming", async function () {
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
            resourceFarming.connect(admin).cancelFarming(await simpleERC1155.getAddress(), 1)
        ).to.be.revertedWith("You do not own this pirate");

        const farmingInfo = await resourceFarming.farmingInfo(await simpleERC1155.getAddress(), 1);
        expect(farmingInfo.tokenId).to.equal(1);

        const balanceOfContract = await simpleERC1155.balanceOf(await resourceFarming.getAddress(), 1);
        expect(balanceOfContract).to.equal(1);

        const balanceOfPirateOwner = await simpleERC1155.balanceOf(pirateOwner.address, 1);
        expect(balanceOfPirateOwner).to.equal(0);
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
    it("should allow dumping resources even if the pirate is working", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await storageManagement.connect(externalCaller).addResource(await simpleERC1155.getAddress(), 1, pirateOwner.address, "fish", ethers.parseEther("1"));
        // Start farming resources
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

        // Dump resources while the pirate is still working
        await expect(
            storageManagement.connect(pirateOwner).dumpResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                ethers.parseEther("1")
            )
        ).to.emit(storageManagement, 'ResourceDumped');

        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await simpleERC1155.getAddress());
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(1n);

        const farmingInfo = await resourceFarming.farmingInfo(await simpleERC1155.getAddress(), 1);
        expect(farmingInfo.tokenId).to.equal(1);

        const balance = await storageManagement.getResourceBalance(await simpleERC1155.getAddress(), 1, "fish");
        expect(balance).to.equal(0n);
    });
    it("should not allow dumping resources if the user does not own the pirate", async function () {
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await storageManagement.connect(externalCaller).addResource(await simpleERC1155.getAddress(), 1, pirateOwner.address, "fish", ethers.parseEther("1"));
        
        // Attempt to dump resources by a user who does not own the pirate
        await expect(
            storageManagement.connect(externalCaller).dumpResource(
                await simpleERC1155.getAddress(),
                1,
                "fish",
                ethers.parseEther("1")
            )
        ).to.be.revertedWith("Caller does not own the 1155 token or it is not staked in ResourceFarming");

        const balance = await storageManagement.getResourceBalance(await simpleERC1155.getAddress(), 1, "fish");
        expect(balance).to.equal(ethers.parseEther("1"));
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
    it("should transfer resources to the capital island", async function () {
        // Mint a pirate NFT to the pirateOwner
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(1);
        
        await storageManagement.connect(externalCaller).addResource(genesisPiratesAddress, 1, pirateOwner.address, "wood", ethers.parseEther("50"));    

        await expect(
            islandManagement.connect(pirateOwner).transferResourceToCapital(
                await simpleERC1155.getAddress(),
                1,
                "wood",
                ethers.parseEther("5")
            )
        ).to.emit(islandManagement, "ResourceTransferredToCapital")
  

        // Check pirate storage balance after transfer
        const pirateStorageBalanceAfter = await storageManagement.getResourceBalance(genesisPiratesAddress, 1, "wood");
        expect(pirateStorageBalanceAfter).to.equal(ethers.parseEther("45"));

        // Check island storage balance after transfer
        const islandStorageBalanceAfter = await storageManagement.getResourceBalance(genesisIslandsAddress, 1, "wood");
        expect(islandStorageBalanceAfter).to.equal(ethers.parseEther("5"));
        
    });

    it("should revert transfer resources to the capital island if no capital island is set", async function () {
        // Mint a pirate NFT to the pirateOwner
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 6);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        // Attempt to transfer resources to the capital island without setting a capital island
        const resource = "wood";
        const amount = 100;

        await expect(
            islandManagement.connect(pirateOwner).transferResourceToCapital(
                await simpleERC1155.getAddress(),
                6,
                resource,
                amount
            )
        ).to.be.revertedWith("No capital island set for user");
    });

    it("should revert transfer resources to the capital island if user does not own the pirate token", async function () {
        // Mint a pirate NFT to the pirateOwner
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 7);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(1);

        // Attempt to transfer resources to the capital island with a pirate token not owned by the user
        const resource = "wood";
        const amount = 100;

        await expect(
            islandManagement.connect(user).transferResourceToCapital(
                await simpleERC1155.getAddress(),
                7,
                resource,
                amount
            )
        ).to.be.revertedWith("No capital island set for user");
    });
    it("should revert transfer resources to the capital island if pirate is working staked", async function () {
        // Mint a pirate NFT to the pirateOwner
        await simpleERC1155.connect(admin).mint(pirateOwner.address, 1);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(1);

        await resourceManagement.connect(externalCaller).addResource(await pirateStorage.getAddress(), 1, pirateOwner.address, "wood", ethers.parseEther("2"));

        // Stake the pirate NFT
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

        // Attempt to transfer resources to the capital island while the pirate is working staked
        const resource = "wood";
        const amount = ethers.parseEther("1");

        await islandManagement.connect(pirateOwner).transferResourceToCapital(
            await simpleERC1155.getAddress(),
            1,
            resource,
            amount
        );
    
    });
    it("should set and get the capital island correctly", async function () {
        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(1);

        // Get the capital island for the pirateOwner
        const capitalIsland = await islandManagement.connect(pirateOwner).getCapitalIsland(pirateOwner.address);
        expect(capitalIsland).to.equal(1);
    });

    it("should replace the previous capital island when setting a new one", async function () {
        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(1);

        // Set a new capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(2);

        // Get the capital island for the pirateOwner
        const capitalIsland = await islandManagement.connect(pirateOwner).getCapitalIsland(pirateOwner.address);
        expect(capitalIsland).to.equal(2);
    });

    it("should get all users with capital islands", async function () {
        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(1);

        // Get all users with capital islands
        const usersWithCapitalIslands = await islandManagement.getUsersWithCapitalIslands();
        expect(usersWithCapitalIslands).to.include(pirateOwner.address);
    });

    it("should get all capital islands", async function () {
        // Set the capital island for the pirateOwner
        await islandManagement.connect(pirateOwner).setCapitalIsland(1);

        // Get all capital islands
        const allCapitalIslands = await islandManagement.getAllCapitalIslands();
        expect(allCapitalIslands).to.deep.equal([1n]);
    });
    it("should enable and disable add activity", async function () {
        // Enable add activity
        await activityStats.connect(admin).setAddActivityEnabled(true);
        let status = await activityStats.addActivityEnabled();
        expect(status).to.be.true;

        // Disable add activity
        await activityStats.connect(admin).setAddActivityEnabled(false);
        status = await activityStats.addActivityEnabled();
        expect(status).to.be.false;
    });

    it("should add activity for a user", async function () {
        // Enable add activity
        await activityStats.connect(admin).setAddActivityEnabled(true);

        // Add activity for the pirateOwner
        await activityStats.connect(externalCaller).addActivity(pirateOwner.address);

        // Check if the user is in the current activity period
        const currentActivityPeriod = await activityStats.currentActivityPeriod();
        const isParticipant = await activityStats.participantInPeriod(pirateOwner.address, currentActivityPeriod);
        expect(isParticipant).to.be.true;

        // Check the activity count for the user
        const activityCount = await activityStats.userActivityCounts(currentActivityPeriod, pirateOwner.address);
        expect(activityCount).to.equal(1);
    });

    it("should reset activity period after 28 days", async function () {
        // Enable add activity
        await activityStats.connect(admin).setAddActivityEnabled(true);

        const currentActivityPeriodBefore = await activityStats.currentActivityPeriod();
        expect(currentActivityPeriodBefore).to.equal(1);
        // Add activity for the pirateOwner
        await activityStats.connect(externalCaller).addActivity(pirateOwner.address);

        const blocksToMint = 3;

        for (let i = 0; i < blocksToMint; i++) {
            await ethers.provider.send("evm_mine");
        }

        // Add activity again to trigger period reset
        await activityStats.connect(externalCaller).addActivity(pirateOwner.address);

        // Check if the activity period has been reset
        const currentActivityPeriod = await activityStats.currentActivityPeriod();
        expect(currentActivityPeriod).to.equal(2);
    });

    it("should get users from the previous activity period", async function () {
        // Enable add activity
        await activityStats.connect(admin).setAddActivityEnabled(true);

        // Add activity for the pirateOwner
        await activityStats.connect(externalCaller).addActivity(pirateOwner.address);

        const blocksToMint = 6;

        for (let i = 0; i < blocksToMint; i++) {
            await ethers.provider.send("evm_mine");
        }

        const currentActivityPeriod = await activityStats.currentActivityPeriod();

        expect(currentActivityPeriod).to.equal(2);

        // Add activity again to trigger period reset
        await activityStats.connect(externalCaller).addActivity(pirateOwner.address);

        // Get users from the previous activity period
        const usersFromPrevPeriod = await activityStats.getUsersFromPrevPeriod();
        expect(usersFromPrevPeriod).to.include(pirateOwner.address);
    });

    it("should check if a user is in the previous activity period", async function () {
        // Enable add activity
        await activityStats.connect(admin).setAddActivityEnabled(true);

        // Add activity for the pirateOwner
        await activityStats.connect(externalCaller).addActivity(pirateOwner.address);

        const blocksToMint = 6;

        for (let i = 0; i < blocksToMint; i++) {
            await ethers.provider.send("evm_mine");
        }

        // Add activity again to trigger period reset
        await activityStats.connect(externalCaller).addActivity(pirateOwner.address);

        // Check if the user is in the previous activity period
        const isInPrevPeriod = await activityStats.isUserInPrevPeriod(pirateOwner.address);
        expect(isInPrevPeriod).to.be.true;
    });
    it("should stake and unstake an NFT 721", async function () {
        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisIslandsAddress);
  
        await updatePirateSkillsFromJSON(path.join(__dirname, '../scripts/pirate_skils_test.json'), pirateManagement, admin, genesisIslandsAddress);

        // Get the tokenId of the newly minted NFT
        const tokenId = 1n;

        // Approve the ResourceFarming contract to transfer the NFT
        await islandNft.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        // Stake the NFT
        await resourceFarming.connect(pirateOwner).farmResource(
            await islandNft.getAddress(),
            tokenId,
            "fish",
            1, // 1 day later
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        // Check if the NFT is staked
        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await islandNft.getAddress());
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(tokenId);

        // Increase time by 1 day
        await ethers.provider.send("evm_increaseTime", [86402]);
        await ethers.provider.send("evm_mine");

        // Unstake the NFT
        const restakeParams = {
            resource: "",
            days_count: 0,
            useRum: false,
            resourceToBurn: "",
            isSet: false
        };

        await expect(resourceFarming.connect(pirateOwner).claimResourcePirate(await islandNft.getAddress(), tokenId, restakeParams))
            .to.emit(resourceManagement, 'ResourceAdded');

        // Check if the NFT is unstaked
        const ownerOfToken = await islandNft.ownerOf(tokenId);
        expect(ownerOfToken).to.equal(pirateOwner.address);
    });

    it("should farm with requiredStorageContract NFT", async function () {
        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisIslandsAddress);
        await centralAuthorizationRegistry.connect(admin).registerPirateNftContract(genesisPiratesAddress);

        await updatePirateSkillsFromJSON(path.join(__dirname, '../scripts/pirate_skils_test.json'), pirateManagement, admin, genesisIslandsAddress);

        // Get the tokenId of the newly minted NFT
        const tokenId = 1n;
        const storageTokenId = 3n;

        // Approve the ResourceFarming contract to transfer the NFT
        await islandNft.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        await islandStorage.connect(externalCaller).setRequiredStorage(true, await simpleERC1155.getAddress());
        // Assign storage to primary NFT
        await simpleERC1155.connect(admin).mint(pirateOwner.address, storageTokenId);
        await storageManagement.connect(pirateOwner).assignStorageToPrimary(await islandNft.getAddress(), tokenId, storageTokenId);

        
        // Stake the NFT with required storage contract
        await resourceFarming.connect(pirateOwner).farmResource(
            await islandNft.getAddress(),
            tokenId,
            "fish",
            1, // 1 day later
            false,
            "",
            false,
            { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
        );

        // Check if the NFT is staked
        const workingPirates = await resourceFarming.getWorkingPirates(pirateOwner.address, await islandNft.getAddress());
        expect(workingPirates.length).to.equal(1);
        expect(workingPirates[0]).to.equal(tokenId);

        // Increase time by 1 day
        await ethers.provider.send("evm_increaseTime", [86402]);
        await ethers.provider.send("evm_mine");

        // Unstake the NFT
        const restakeParams = {
            resource: "",
            days_count: 0,
            useRum: false,
            resourceToBurn: "",
            isSet: false
        };

        await expect(resourceFarming.connect(pirateOwner).claimResourcePirate(await islandNft.getAddress(), tokenId, restakeParams))
            .to.emit(resourceManagement, 'ResourceAdded');

        // Check if the NFT is unstaked
        const ownerOfToken = await islandNft.ownerOf(tokenId);
        expect(ownerOfToken).to.equal(pirateOwner.address);
    });
    it("should return correct farming info details for batch of tokenIds", async function () {
        // Deploy the BatchFarmingInfo contract
        const BatchFarmingInfo = await ethers.getContractFactory("BatchFarmingInfo");
        const batchFarmingInfo = await BatchFarmingInfo.deploy(await resourceFarming.getAddress());

        // Mint multiple NFTs
        const tokenIds = [1n, 2n, 3n];
        for (const tokenId of tokenIds) {
            await simpleERC1155.connect(admin).mint(pirateOwner.address, tokenId);            
        }

        // Approve the ResourceFarming contract to transfer the NFTs
        await simpleERC1155.connect(pirateOwner).setApprovalForAll(await resourceFarming.getAddress(), true);

        // Stake the NFTs
        for (const tokenId of tokenIds) {
            await resourceFarming.connect(pirateOwner).farmResource(
                await simpleERC1155.getAddress(),
                tokenId,
                "fish",
                1, // 1 day later
                false,
                "",
                false,
                { value: ethers.parseEther("0.05") } // Adding Matic value to the transaction
            );
        }

        // Get farming info details for the batch of tokenIds
        const farmingInfoDetailsArray = await batchFarmingInfo.batchGetFarmingInfo(await simpleERC1155.getAddress(), tokenIds);
        // Check if the farming info details are correct
        expect(farmingInfoDetailsArray.length).to.equal(tokenIds.length);
    });
    


});