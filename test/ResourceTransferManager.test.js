const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
    deployBaseInfrastructure,
    setupNFTsForStaking,
    setupCoreGameContracts,
    deployAndAuthorizeContract,
    deployAndRegisterContract,
    createTestConfig
} = require("./utils");

// Test configuration
const ResourceTransferManagerTestConfig = createTestConfig({
    islandIds: {
        ISLAND_1: 1,
        ISLAND_2: 2,
        ISLAND_3: 3
    },
    pirateIds: {
        PIRATE_1: 1,
        PIRATE_2: 2,
        PIRATE_3: 3
    },
    shipIds: {
        SHIP_1: 1,
        SHIP_2: 2
    },
    resources: {
        WOOD: "wood",
        STONE: "stone",
        FOOD: "food"
    },
    amounts: {
        SMALL: ethers.parseUnits("10", 18),
        MEDIUM: ethers.parseUnits("50", 18),
        LARGE: ethers.parseUnits("100", 18)
    },
    fees: {
        DEFAULT_TRANSFER_FEE: ethers.parseUnits("0.1", 18), // 0.1 ARRC
        NEW_TRANSFER_FEE: ethers.parseUnits("0.2", 18) // 0.2 ARRC
    }
});

describe("ResourceTransferManager", function () {
    let state = {};

    async function setupFixture() {
        const base = await deployBaseInfrastructure();
        const nfts = await setupNFTsForStaking(base.admin, base.user, base.centralAuthorizationRegistry);
        
        // Deploy core game contracts
        const coreContractsPack = await setupCoreGameContracts(
            base.admin,
            base.user,
            base.centralAuthorizationRegistry,
            nfts,
            { deployRealMissionsStorage: false }
        );

        

        // Deploy ResourceTransferManager contract
        const resourceTransferManager = await deployAndRegisterContract(
            "ResourceTransferManager",
            base.centralAuthorizationRegistry,
            "IResourceTransferManagerV2"
        );

        // Deploy ResourceFarming contract
        const resourceFarming = await deployAndRegisterContract(
            "ResourceFarming",
            base.centralAuthorizationRegistry,
            "IResourceFarming"
        );

        // Deploy ResourceFarmingRules contract
        const resourceFarmingRules = await deployAndRegisterContract(
            "ResourceFarmingRules",
            base.centralAuthorizationRegistry,
            "IResourceFarmingRules"
        );

        // Deploy StorageUpgrade contract
        const storageUpgrade = await deployAndRegisterContract(
            "StorageUpgrade",
            base.centralAuthorizationRegistry,
            "IStorageUpgrade",
            nfts.genesisPiratesAddress,
            nfts.genesisIslandsAddress,
            nfts.inhabitantsAddress
        );

        // Deploy PirateManagement contract
        const pirateManagement = await deployAndRegisterContract(
            "PirateManagement",
            base.centralAuthorizationRegistry,
            "IPirateManagement"
        );

        // Deploy UpgradeConstructionTime contract
        const upgradeConstructionTime = await deployAndRegisterContract(
            "UpgradeConstructionTime",
            base.centralAuthorizationRegistry,
            "IUpgradeConstructionTime"
        );

        // Deploy ActivityStats contract (required by ResourceFarming)
        const activityStats = await deployAndRegisterContract(
            "ActivityStats",
            base.centralAuthorizationRegistry,
            "IActivityStats",
            0, // _initialActivityPeriod
            0, // _initialLastActivityBlock (0 = use current block)
            0  // _blocks28Days (0 = use default calculation)
        );

        // Setup additional test data
        await _setupTestData(base, nfts, coreContractsPack, resourceTransferManager);

        // Setup pirate skills for testing
        await _setupPirateSkills(base, nfts, { ...coreContractsPack, pirateManagement });

        // CAR setup is now complete with ActivityStats deployed

        return {
            ...base,
            ...nfts,
            ...coreContractsPack,
            resourceTransferManager,
            resourceFarming,
            resourceFarmingRules,
            storageUpgrade,
            pirateManagement,
            upgradeConstructionTime,
            activityStats,
            config: ResourceTransferManagerTestConfig
        };

    
        
    }

    async function _setupTestData(base, nfts, coreContractsPack, resourceTransferManager) {
        // Set ship NFT contract
        await resourceTransferManager.connect(base.admin).setShipNftContract(await nfts.shipNFT.getAddress());

        // Mint islands and ships
        await nfts.islandNft.connect(base.admin).mintSpecific(base.user.address, ResourceTransferManagerTestConfig.islandIds.ISLAND_1);
        await nfts.islandNft.connect(base.admin).mintSpecific(base.user.address, ResourceTransferManagerTestConfig.islandIds.ISLAND_2);
        await nfts.islandNft.connect(base.admin).mintSpecific(base.otherAccount.address, ResourceTransferManagerTestConfig.islandIds.ISLAND_3);

        await nfts.shipNFT.connect(base.admin).safeMint(base.user.address, ResourceTransferManagerTestConfig.shipIds.SHIP_1);
        await nfts.shipNFT.connect(base.admin).safeMint(base.otherAccount.address, ResourceTransferManagerTestConfig.shipIds.SHIP_2);

        // Add resources to islands for transfer testing
        await coreContractsPack.storageManagement.connect(base.admin).addResource(
            await nfts.islandNft.getAddress(),
            ResourceTransferManagerTestConfig.islandIds.ISLAND_1,
            base.user.address,
            ResourceTransferManagerTestConfig.resources.WOOD,
            ResourceTransferManagerTestConfig.amounts.LARGE
        );
        await coreContractsPack.storageManagement.connect(base.admin).addResource(
            await nfts.islandNft.getAddress(),
            ResourceTransferManagerTestConfig.islandIds.ISLAND_2,
            base.user.address,
            ResourceTransferManagerTestConfig.resources.STONE,
            ResourceTransferManagerTestConfig.amounts.LARGE
        );

        // Give users ARRC tokens for fees
        await coreContractsPack.arrcToken.connect(base.admin).mint(base.user.address, ethers.parseUnits("10", 18));
        await coreContractsPack.arrcToken.connect(base.admin).mint(base.otherAccount.address, ethers.parseUnits("10", 18));

        // Approve fee management to spend ARRC
        await coreContractsPack.arrcToken.connect(base.user).approve(
            await coreContractsPack.feeManagement.getAddress(),
            ethers.parseUnits("10", 18)
        );
        await coreContractsPack.arrcToken.connect(base.otherAccount).approve(
            await coreContractsPack.feeManagement.getAddress(),
            ethers.parseUnits("10", 18)
        );
    }

    async function _setupPirateSkills(base, nfts, coreContractsPack) {
        const fs = require('fs');
        const path = require('path');
        
        // Helper function to update pirate skills (copied from ResourceFarming test)
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
        
        // Register pirate NFT contracts
        await base.centralAuthorizationRegistry.connect(base.admin).registerPirateNftContract(nfts.genesisPiratesAddress);
        
        // Setup pirate skills from JSON file
        try {
            await updatePirateSkillsFromJSON(
                path.join(__dirname, '../scripts/pirate_skils_test.json'), 
                coreContractsPack.pirateManagement, 
                base.admin, 
                nfts.genesisPiratesAddress
            );
        } catch (error) {
            console.log("Could not load pirate skills from JSON file, using mock setup");
        }
    }

    beforeEach(async function () {
        state = await loadFixture(setupFixture);
    });

    describe("Fee Management", function () {
        it("should set initial transfer fee correctly", async function () {
            const { resourceTransferManager, config } = state;
            
            const fee = await resourceTransferManager.getResourceTransferFee();
            expect(fee).to.equal(config.fees.DEFAULT_TRANSFER_FEE);
        });

        it("should allow admin to update transfer fee", async function () {
            const { resourceTransferManager, admin, config } = state;
            
            await expect(
                resourceTransferManager.connect(admin).setResourceTransferFee(config.fees.NEW_TRANSFER_FEE)
            ).to.emit(resourceTransferManager, "ResourceTransferFeeUpdated")
             .withArgs(config.fees.NEW_TRANSFER_FEE);

            const fee = await resourceTransferManager.getResourceTransferFee();
            expect(fee).to.equal(config.fees.NEW_TRANSFER_FEE);
        });

        it("should not allow non-admin to update transfer fee", async function () {
            const { resourceTransferManager, user, config } = state;
            
            await expect(
                resourceTransferManager.connect(user).setResourceTransferFee(config.fees.NEW_TRANSFER_FEE)
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("should allow admin to set fee exemptions", async function () {
            const { resourceTransferManager, admin, user } = state;
            
            await expect(
                resourceTransferManager.connect(admin).setFeeExemption(user.address, true)
            ).to.emit(resourceTransferManager, "FeeExemptionUpdated")
             .withArgs(user.address, true);

            const isExempt = await resourceTransferManager.isFeeExempt(user.address);
            expect(isExempt).to.be.true;
        });

        it("should allow admin to set batch fee exemptions", async function () {
            const { resourceTransferManager, admin, user, otherAccount } = state;
            
            const users = [user.address, otherAccount.address];
            
            await resourceTransferManager.connect(admin).setBatchFeeExemption(users, true);

            const isUserExempt = await resourceTransferManager.isFeeExempt(user.address);
            const isOtherExempt = await resourceTransferManager.isFeeExempt(otherAccount.address);
            
            expect(isUserExempt).to.be.true;
            expect(isOtherExempt).to.be.true;
        });

        it("should reject batch fee exemption with zero address", async function () {
            const { resourceTransferManager, admin } = state;
            
            const users = [ethers.ZeroAddress];
            
            await expect(
                resourceTransferManager.connect(admin).setBatchFeeExemption(users, true)
            ).to.be.revertedWith("Invalid user address");
        });
    });

    describe("Ship NFT Management", function () {
        it("should allow admin to set ship NFT contract", async function () {
            const { resourceTransferManager, admin, shipNFT } = state;
            
            const newShipAddress = await shipNFT.getAddress();
            
            await expect(
                resourceTransferManager.connect(admin).setShipNftContract(newShipAddress)
            ).to.emit(resourceTransferManager, "ShipNftContractUpdated")
             .withArgs(newShipAddress);

            const currentShipContract = await resourceTransferManager.shipNftContract();
            expect(currentShipContract).to.equal(newShipAddress);
        });

        it("should not allow non-admin to set ship NFT contract", async function () {
            const { resourceTransferManager, user, shipNFT } = state;
            
            await expect(
                resourceTransferManager.connect(user).setShipNftContract(await shipNFT.getAddress())
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("should reject zero address for ship NFT contract", async function () {
            const { resourceTransferManager, admin } = state;
            
            await expect(
                resourceTransferManager.connect(admin).setShipNftContract(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid ship NFT contract address");
        });
    });

    describe("Resource Transfer", function () {
        it("should transfer resources between islands with fee", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            const initialArrcBalance = await state.arrcToken.balanceOf(user.address);
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                await islandNft.getAddress(),
                sourceIslandId,
                await islandNft.getAddress(),
                destIslandId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );

            // Check fee was paid
            const finalArrcBalance = await state.arrcToken.balanceOf(user.address);
            expect(initialArrcBalance - finalArrcBalance).to.equal(config.fees.DEFAULT_TRANSFER_FEE);
        });

        it("should transfer resources without fee for exempt users", async function () {
            const { resourceTransferManager, admin, user, otherAccount, islandNft, config } = state;
            
            // Make user fee exempt
            await resourceTransferManager.connect(admin).setFeeExemption(user.address, true);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            const initialArrcBalance = await state.arrcToken.balanceOf(user.address);
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                await islandNft.getAddress(),
                sourceIslandId,
                await islandNft.getAddress(),
                destIslandId,
                resource,
                amount,
                0 // No fee paid
             );

            // Check no fee was paid
            const finalArrcBalance = await state.arrcToken.balanceOf(user.address);
            expect(finalArrcBalance).to.equal(initialArrcBalance);
        });

        it("should transfer resources between different islands", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_2; // User owns this and it has stone
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.STONE;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                await islandNft.getAddress(),
                sourceIslandId,
                await islandNft.getAddress(),
                destIslandId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });

        it("should fail if user doesn't own a ship", async function () {
            const { resourceTransferManager, admin, user, otherAccount, islandNft, shipNFT, config } = state;
            
            // Transfer ship away from user
            await shipNFT.connect(user).transferFrom(user.address, admin.address, config.shipIds.SHIP_1);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("User must own a ship NFT to use this function");
        });

        it("should fail if user doesn't own source NFT", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_3; // Owned by otherAccount
            const destIslandId = config.islandIds.ISLAND_2;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    user.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("User does not own the pirate token");
        });

        it("should fail if destination owner doesn't own destination NFT", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3; // Owned by otherAccount
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    user.address, // Wrong owner
                    resource,
                    amount
                )
            ).to.be.revertedWith("Destination owner does not own the pirate token");
        });

        it("should fail if not enough resources in source", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = ethers.parseUnits("1000", 18); // More than available
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("Not enough resources in source storage");
        });

        it("should fail if user has insufficient ARRC for fee", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, arrcToken, admin } = state;
            
            // Transfer away all user's ARRC tokens
            const userBalance = await arrcToken.balanceOf(user.address);
            await arrcToken.connect(user).transfer(admin.address, userBalance);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("ERC20InsufficientBalance");
        });
    });

    describe("Pause Functionality", function () {
        it("should allow admin to pause the contract", async function () {
            const { resourceTransferManager, admin } = state;
            
            await resourceTransferManager.connect(admin).pause();
            
            const isPaused = await resourceTransferManager.paused();
            expect(isPaused).to.be.true;
        });

        it("should allow admin to unpause the contract", async function () {
            const { resourceTransferManager, admin } = state;
            
            await resourceTransferManager.connect(admin).pause();
            await resourceTransferManager.connect(admin).unpause();
            
            const isPaused = await resourceTransferManager.paused();
            expect(isPaused).to.be.false;
        });

        it("should not allow non-admin to pause the contract", async function () {
            const { resourceTransferManager, user } = state;
            
            await expect(
                resourceTransferManager.connect(user).pause()
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("should not allow non-admin to unpause the contract", async function () {
            const { resourceTransferManager, admin, user } = state;
            
            await resourceTransferManager.connect(admin).pause();
            
            await expect(
                resourceTransferManager.connect(user).unpause()
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("should prevent transfers when paused", async function () {
            const { resourceTransferManager, admin, user, otherAccount, islandNft, config } = state;
            
            // Pause the contract
            await resourceTransferManager.connect(admin).pause();
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWithCustomError(resourceTransferManager, "EnforcedPause");
        });

        it("should allow transfers when unpaused after being paused", async function () {
            const { resourceTransferManager, admin, user, otherAccount, islandNft, config } = state;
            
            // Pause then unpause the contract
            await resourceTransferManager.connect(admin).pause();
            await resourceTransferManager.connect(admin).unpause();
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs");
        });
    });

    describe("Edge Cases", function () {
        it("should handle zero transfer fee correctly", async function () {
            const { resourceTransferManager, admin, user, otherAccount, islandNft, config } = state;
            
            // Set fee to zero
            await resourceTransferManager.connect(admin).setResourceTransferFee(0);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            const initialArrcBalance = await state.arrcToken.balanceOf(user.address);
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                await islandNft.getAddress(),
                sourceIslandId,
                await islandNft.getAddress(),
                destIslandId,
                resource,
                amount,
                0 // No fee paid
             );

            // Check no fee was paid
            const finalArrcBalance = await state.arrcToken.balanceOf(user.address);
            expect(finalArrcBalance).to.equal(initialArrcBalance);
        });

        it("should fail when trying to transfer resources to unrelated NFT contract", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin } = state;
            
            // Deploy a mock ERC721 contract that is not part of our game system
            const MockERC721 = await ethers.getContractFactory("ShipNFT");
            const unrelatedNFT = await MockERC721.deploy(admin.address, admin.address, admin.address);
            await unrelatedNFT.waitForDeployment();
            
            // Mint an NFT to otherAccount in the unrelated contract
            await unrelatedNFT.connect(admin).safeMint(otherAccount.address, 1);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const unrelatedTokenId = 1;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await unrelatedNFT.getAddress(),
                    unrelatedTokenId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.reverted;
        });

        it("should fail when trying to transfer resources from unrelated NFT contract", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin } = state;
            
            // Deploy a mock ERC721 contract that is not part of our game system
            const MockERC721 = await ethers.getContractFactory("ShipNFT");
            const unrelatedNFT = await MockERC721.deploy(admin.address, admin.address, admin.address);
            await unrelatedNFT.waitForDeployment();
            
            // Mint an NFT to user in the unrelated contract
            await unrelatedNFT.connect(admin).safeMint(user.address, 1);
            
            const unrelatedTokenId = 1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await unrelatedNFT.getAddress(),
                    unrelatedTokenId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.reverted;
        });
    });

    describe("Resource Transfer with Pirate NFTs", function () {
        it("should transfer resources from ERC1155 pirate NFT (not staked)", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT, storageManagement } = state;
            
            // Mint pirate NFT but don't stake it (ERC1155 ownership is sufficient)
            await genesisPiratesNFT.connect(admin).mint(user.address, config.pirateIds.PIRATE_1);
            
            // Add some resources to the pirate storage
            await storageManagement.connect(admin).addResource(
                await genesisPiratesNFT.getAddress(),
                config.pirateIds.PIRATE_1,
                user.address,
                config.resources.WOOD,
                config.amounts.MEDIUM
            );
            
            const sourceCollectionContract = await genesisPiratesNFT.getAddress();
            const sourceTokenId = config.pirateIds.PIRATE_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    sourceCollectionContract,
                    sourceTokenId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                sourceCollectionContract,
                sourceTokenId,
                await islandNft.getAddress(),
                destIslandId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });

        it("should transfer resources to ERC1155 pirate NFT (not staked)", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT } = state;
            
            // Mint pirate NFT but don't stake it (ERC1155 ownership is sufficient)
            await genesisPiratesNFT.connect(admin).mint(otherAccount.address, config.pirateIds.PIRATE_2);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destCollectionContract = await genesisPiratesNFT.getAddress();
            const destTokenId = config.pirateIds.PIRATE_2;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    destCollectionContract,
                    destTokenId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                await islandNft.getAddress(),
                sourceIslandId,
                destCollectionContract,
                destTokenId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });

        it("should fail when user doesn't own the ERC1155 pirate NFT", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT, storageManagement } = state;
            
            // Use a different token ID that hasn't been minted to anyone
            const uniqueTokenId = 999;
            
            // Mint pirate NFT to otherAccount, not user
            await genesisPiratesNFT.connect(admin).mint(otherAccount.address, uniqueTokenId);
            
            // Verify the user does NOT own the pirate NFT
            const userBalance = await genesisPiratesNFT.balanceOf(user.address, uniqueTokenId);
            expect(userBalance).to.equal(0);
            
            // Verify the otherAccount DOES own the pirate NFT
            const otherAccountBalance = await genesisPiratesNFT.balanceOf(otherAccount.address, uniqueTokenId);
            expect(otherAccountBalance).to.equal(1);
            
            // Add some resources to the pirate storage, owned by otherAccount
            await storageManagement.connect(admin).addResource(
                await genesisPiratesNFT.getAddress(),
                uniqueTokenId,
                otherAccount.address,
                config.resources.WOOD,
                config.amounts.MEDIUM
            );
            
            const sourceCollectionContract = await genesisPiratesNFT.getAddress();
            const sourceTokenId = uniqueTokenId;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    sourceCollectionContract,
                    sourceTokenId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("User does not own the pirate token");
        });

        it("should fail when destination owner doesn't own the ERC1155 pirate NFT", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT } = state;
            
            // Mint pirate NFT to user, not otherAccount
            await genesisPiratesNFT.connect(admin).mint(user.address, config.pirateIds.PIRATE_2);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destCollectionContract = await genesisPiratesNFT.getAddress();
            const destTokenId = config.pirateIds.PIRATE_2;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    destCollectionContract,
                    destTokenId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("Destination owner does not own the pirate token");
        });
    });

    describe("Resource Transfer with Staked Pirates", function () {
        // Helper function to setup staking infrastructure
        async function setupStakingInfrastructure() {
            const { admin, user, centralAuthorizationRegistry, genesisPiratesNFT, arrcToken } = state;
            
            const MockERC20 = await ethers.getContractFactory("DummyERC20Burnable");
            const rumToken = await MockERC20.deploy("RUM Token", "RUM");
            await rumToken.waitForDeployment();
            
            // Setup RUM token approvals
            await rumToken.connect(admin).mint(user.address, ethers.parseUnits("1000000", 18));
            await rumToken.connect(user).approve(await state.feeManagement.getAddress(), ethers.parseUnits("1000000", 18));
            
            // Setup NFT approvals for staking
            await genesisPiratesNFT.connect(user).setApprovalForAll(await state.resourceFarming.getAddress(), true);
            await genesisPiratesNFT.connect(user).setApprovalForAll(await state.storageUpgrade.getAddress(), true);
            
            return { rumToken };
        }
        
        // Helper function to stake pirate in ResourceFarming
        async function stakePirateInResourceFarming(user, pirateId, resource = "fish", days = 1) {
            const { resourceFarming, genesisPiratesNFT, storageManagement, admin, centralAuthorizationRegistry } = state;
            
            // Setup storage capacity for farming
            
            // First, set a high storage capacity for the pirate to avoid "Storage limit reached" error
            try {
                await storageManagement.connect(admin).updateStorageCapacity(
                    await genesisPiratesNFT.getAddress(),
                    pirateId,
                    ethers.parseUnits("10000", 18) // Set high storage capacity
                );
            } catch (error) {
                // If storage capacity set fails, continue (it might already be sufficient)
            }
            
            await resourceFarming.connect(user).farmResource(
                await genesisPiratesNFT.getAddress(),
                pirateId,
                resource,
                days,
                false, // Use MATIC, not RUM
                "",
                false,
                { value: ethers.parseEther("0.05") }
            );
        }
        
        // Helper function to stake pirate in StorageUpgrade
        async function stakePirateInStorageUpgrade(user, pirateId, useRum = false) {
            const { storageUpgrade, genesisPiratesNFT, storageManagement, admin, islandNft } = state;
            
            // Use a unique island ID for this user to avoid conflicts
            const testIslandId = user.address === state.user.address ? 10 : 11;
            
            // Mint island to user for this test
            await islandNft.connect(admin).mintSpecific(user.address, testIslandId);
            
            // Add required resources for storage upgrade (cotton is required in island storage, not pirate storage)
            await storageManagement.connect(admin).addResource(
                await islandNft.getAddress(),
                testIslandId,
                user.address,
                "cotton",
                ethers.parseUnits("1000", 18) // Add more cotton
            );
            
            // Also add wood which is required for level 1-5 upgrades
            await storageManagement.connect(admin).addResource(
                await islandNft.getAddress(),
                testIslandId,
                user.address,
                "wood",
                ethers.parseUnits("1000", 18) // Add more wood
            );
            
            // Add other resources that might be required
            await storageManagement.connect(admin).addResource(
                await islandNft.getAddress(),
                testIslandId,
                user.address,
                "planks",
                ethers.parseUnits("1000", 18) // Add planks
            );
            
            await storageManagement.connect(admin).addResource(
                await islandNft.getAddress(),
                testIslandId,
                user.address,
                "stone",
                ethers.parseUnits("1000", 18) // Add stone
            );
            
            await storageManagement.connect(admin).addResource(
                await islandNft.getAddress(),
                testIslandId,
                user.address,
                "fish",
                ethers.parseUnits("1000", 18) // Add fish (the food choice)
            );
            
            // Set high storage capacity for the pirate
            try {
                await storageManagement.connect(admin).updateStorageCapacity(
                    await genesisPiratesNFT.getAddress(),
                    pirateId,
                    ethers.parseUnits("10000", 18) // Set high storage capacity
                );
            } catch (error) {
                // If storage capacity set fails, continue
            }
            
            // Assign storage to pirate first
            await storageManagement.connect(user).assignStorageToPrimary(
                await genesisPiratesNFT.getAddress(),
                pirateId,
                testIslandId // Use our test island
            );
            
            if (useRum) {
                await storageUpgrade.connect(user).startUpgradeStorage(
                    pirateId,
                    await genesisPiratesNFT.getAddress(),
                    true,
                    "fish"
                );
            } else {
                await storageUpgrade.connect(user).startUpgradeStorage(
                    pirateId,
                    await genesisPiratesNFT.getAddress(),
                    false,
                    "fish",
                    { value: ethers.parseEther("1.0") } // Increase MATIC amount
                );
            }
        }
        
        it("should transfer resources from ResourceFarming staked pirate", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT, storageManagement } = state;
            
            // Setup staking infrastructure
            await setupStakingInfrastructure();
            
            // Mint pirate NFT to user
            await genesisPiratesNFT.connect(admin).mint(user.address, config.pirateIds.PIRATE_1);
            
            // Add resources to the pirate storage
            await storageManagement.connect(admin).addResource(
                await genesisPiratesNFT.getAddress(),
                config.pirateIds.PIRATE_1,
                user.address,
                config.resources.WOOD,
                config.amounts.MEDIUM
            );
            
            // Stake pirate in ResourceFarming
            await stakePirateInResourceFarming(user, config.pirateIds.PIRATE_1);
            
            // Verify pirate is staked
            const workingPirates = await state.resourceFarming.getWorkingPirates(
                user.address,
                await genesisPiratesNFT.getAddress()
            );
            expect(workingPirates.length).to.equal(1);
            expect(workingPirates[0]).to.equal(BigInt(config.pirateIds.PIRATE_1));
            
            // Verify pirate is actually staked (either transferred to contract or tracked as working)
            // ResourceFarming might return the NFT immediately, so check staking status instead
            const farmingInfo = await state.resourceFarming.farmingInfo(await genesisPiratesNFT.getAddress(), config.pirateIds.PIRATE_1);
            expect(farmingInfo.tokenId).to.not.equal(0); // Should have active farming
            
            // Transfer resources from staked pirate
            const sourceCollectionContract = await genesisPiratesNFT.getAddress();
            const sourceTokenId = config.pirateIds.PIRATE_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    sourceCollectionContract,
                    sourceTokenId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                sourceCollectionContract,
                sourceTokenId,
                await islandNft.getAddress(),
                destIslandId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });
        
        it("should transfer resources to ResourceFarming staked pirate", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT } = state;
            
            // Setup staking infrastructure
            await setupStakingInfrastructure();
            
            // Mint pirate NFT to otherAccount
            await genesisPiratesNFT.connect(admin).mint(otherAccount.address, config.pirateIds.PIRATE_2);
            
            // Setup approvals for otherAccount
            await genesisPiratesNFT.connect(otherAccount).setApprovalForAll(await state.resourceFarming.getAddress(), true);
            
            // Stake pirate in ResourceFarming
            await stakePirateInResourceFarming(otherAccount, config.pirateIds.PIRATE_2);
            
            // Verify pirate is staked
            const workingPirates = await state.resourceFarming.getWorkingPirates(
                otherAccount.address,
                await genesisPiratesNFT.getAddress()
            );
            expect(workingPirates.length).to.equal(1);
            expect(workingPirates[0]).to.equal(BigInt(config.pirateIds.PIRATE_2));
            
            // Transfer resources to staked pirate
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destCollectionContract = await genesisPiratesNFT.getAddress();
            const destTokenId = config.pirateIds.PIRATE_2;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    destCollectionContract,
                    destTokenId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                await islandNft.getAddress(),
                sourceIslandId,
                destCollectionContract,
                destTokenId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });
        
        it("should fail when user doesn't own the ResourceFarming staked pirate", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT, storageManagement } = state;
            
            // Setup staking infrastructure
            await setupStakingInfrastructure();
            
            // Use PIRATE_3 which should have skills setup
            const uniquePirateId = config.pirateIds.PIRATE_3;
            
            // First, ensure user doesn't own the pirate by burning if they do
            const initialUserBalance = await genesisPiratesNFT.balanceOf(user.address, uniquePirateId);
            if (initialUserBalance > 0) {
                await genesisPiratesNFT.connect(user).safeTransferFrom(
                    user.address,
                    admin.address,
                    uniquePirateId,
                    initialUserBalance,
                    "0x"
                );
            }
            
            // Mint pirate NFT to otherAccount (not user) - use PIRATE_3 to avoid conflict
            await genesisPiratesNFT.connect(admin).mint(otherAccount.address, uniquePirateId);
            
            // Setup approvals for otherAccount
            await genesisPiratesNFT.connect(otherAccount).setApprovalForAll(await state.resourceFarming.getAddress(), true);
            
            // Add resources to the pirate storage
            await storageManagement.connect(admin).addResource(
                await genesisPiratesNFT.getAddress(),
                uniquePirateId,
                otherAccount.address,
                config.resources.WOOD,
                config.amounts.MEDIUM
            );
            
            // Stake pirate in ResourceFarming by otherAccount
            await stakePirateInResourceFarming(otherAccount, uniquePirateId);
            
            // Verify pirate is staked by otherAccount
            const workingPirates = await state.resourceFarming.getWorkingPirates(
                otherAccount.address,
                await genesisPiratesNFT.getAddress()
            );
            expect(workingPirates.length).to.equal(1);
            
            // Verify user doesn't have the pirate staked
            const userWorkingPirates = await state.resourceFarming.getWorkingPirates(
                user.address,
                await genesisPiratesNFT.getAddress()
            );
            expect(userWorkingPirates.length).to.equal(0);
            
            // Verify ownership is correct for test
            const userBalance = await genesisPiratesNFT.balanceOf(user.address, uniquePirateId);
            const otherAccountBalance = await genesisPiratesNFT.balanceOf(otherAccount.address, uniquePirateId);
            expect(userBalance).to.equal(0); // User should not own the pirate
            expect(otherAccountBalance).to.equal(0); // OtherAccount should not own directly (it's staked)
            
            // Try to transfer resources from staked pirate (should fail)
            const sourceCollectionContract = await genesisPiratesNFT.getAddress();
            const sourceTokenId = uniquePirateId;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    sourceCollectionContract,
                    sourceTokenId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("User does not own the pirate token");
        });
        
        it("should transfer resources from StorageUpgrade staked pirate", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT, storageManagement } = state;
            
            // Setup staking infrastructure
            await setupStakingInfrastructure();
            
            // Mint pirate NFT to user
            await genesisPiratesNFT.connect(admin).mint(user.address, config.pirateIds.PIRATE_1);
            
            // Add resources to the pirate storage
            await storageManagement.connect(admin).addResource(
                await genesisPiratesNFT.getAddress(),
                config.pirateIds.PIRATE_1,
                user.address,
                config.resources.WOOD,
                config.amounts.MEDIUM
            );
            
            // Stake pirate in StorageUpgrade
            await stakePirateInStorageUpgrade(user, config.pirateIds.PIRATE_1);
            
            // Verify pirate is staked
            const stakingInfo = await state.storageUpgrade.stakingInfo(
                await genesisPiratesNFT.getAddress(),
                config.pirateIds.PIRATE_1
            );
            expect(stakingInfo.owner).to.equal(user.address);
            expect(stakingInfo.claimed).to.be.false;
            
            // Transfer resources from staked pirate
            const sourceCollectionContract = await genesisPiratesNFT.getAddress();
            const sourceTokenId = config.pirateIds.PIRATE_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    sourceCollectionContract,
                    sourceTokenId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                sourceCollectionContract,
                sourceTokenId,
                await islandNft.getAddress(),
                destIslandId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });
        
        it("should transfer resources to StorageUpgrade staked pirate", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT } = state;
            
            // Setup staking infrastructure
            await setupStakingInfrastructure();
            
            // Mint pirate NFT to otherAccount
            await genesisPiratesNFT.connect(admin).mint(otherAccount.address, config.pirateIds.PIRATE_2);
            
            // Setup approvals for otherAccount
            await genesisPiratesNFT.connect(otherAccount).setApprovalForAll(await state.storageUpgrade.getAddress(), true);
            
            // Stake pirate in StorageUpgrade
            await stakePirateInStorageUpgrade(otherAccount, config.pirateIds.PIRATE_2);
            
            // Verify pirate is staked
            const stakingInfo = await state.storageUpgrade.stakingInfo(
                await genesisPiratesNFT.getAddress(),
                config.pirateIds.PIRATE_2
            );
            expect(stakingInfo.owner).to.equal(otherAccount.address);
            expect(stakingInfo.claimed).to.be.false;
            
            // Transfer resources to staked pirate
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destCollectionContract = await genesisPiratesNFT.getAddress();
            const destTokenId = config.pirateIds.PIRATE_2;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    destCollectionContract,
                    destTokenId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                await islandNft.getAddress(),
                sourceIslandId,
                destCollectionContract,
                destTokenId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });
        
        it("should fail when user doesn't own the StorageUpgrade staked pirate", async function () {
            const { resourceTransferManager, user, otherAccount, islandNft, config, admin, genesisPiratesNFT, storageManagement } = state;
            
            // Setup staking infrastructure
            await setupStakingInfrastructure();
            
            // Use PIRATE_1 but ensure user doesn't own it
            const pirateId = config.pirateIds.PIRATE_1;
            
            // First, ensure user doesn't own the pirate by transferring if they do
            const initialUserBalance = await genesisPiratesNFT.balanceOf(user.address, pirateId);
            if (initialUserBalance > 0) {
                await genesisPiratesNFT.connect(user).safeTransferFrom(
                    user.address,
                    admin.address,
                    pirateId,
                    initialUserBalance,
                    "0x"
                );
            }
            
            // Mint pirate NFT to otherAccount (not user)
            await genesisPiratesNFT.connect(admin).mint(otherAccount.address, pirateId);
            
            // Setup approvals for otherAccount
            await genesisPiratesNFT.connect(otherAccount).setApprovalForAll(await state.storageUpgrade.getAddress(), true);
            
            // Add resources to the pirate storage
            await storageManagement.connect(admin).addResource(
                await genesisPiratesNFT.getAddress(),
                pirateId,
                otherAccount.address,
                config.resources.WOOD,
                config.amounts.MEDIUM
            );
            
            // Stake pirate in StorageUpgrade by otherAccount
            await stakePirateInStorageUpgrade(otherAccount, pirateId);
            
            // Verify pirate is staked by otherAccount
            const stakingInfo = await state.storageUpgrade.stakingInfo(
                await genesisPiratesNFT.getAddress(),
                pirateId
            );
            expect(stakingInfo.owner).to.equal(otherAccount.address);
            expect(stakingInfo.claimed).to.be.false;
            
            // Verify ownership is correct for test
            const userBalance = await genesisPiratesNFT.balanceOf(user.address, pirateId);
            const otherAccountBalance = await genesisPiratesNFT.balanceOf(otherAccount.address, pirateId);
            expect(userBalance).to.equal(0); // User should not own the pirate
            expect(otherAccountBalance).to.equal(0); // OtherAccount should not own directly (it's staked)
            
            // Try to transfer resources from staked pirate (should fail)
            const sourceCollectionContract = await genesisPiratesNFT.getAddress();
            const sourceTokenId = pirateId;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    sourceCollectionContract,
                    sourceTokenId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("User does not own the pirate token");
        });
        
        it("should transfer resources between different staking systems", async function () {
            const { resourceTransferManager, user, otherAccount, config, admin, genesisPiratesNFT, storageManagement } = state;
            
            // Setup staking infrastructure
            await setupStakingInfrastructure();
            
            // Mint pirate NFTs
            await genesisPiratesNFT.connect(admin).mint(user.address, config.pirateIds.PIRATE_1);
            await genesisPiratesNFT.connect(admin).mint(otherAccount.address, config.pirateIds.PIRATE_2);
            
            // Setup approvals for otherAccount
            await genesisPiratesNFT.connect(otherAccount).setApprovalForAll(await state.storageUpgrade.getAddress(), true);
            
            // Add resources to the first pirate storage
            await storageManagement.connect(admin).addResource(
                await genesisPiratesNFT.getAddress(),
                config.pirateIds.PIRATE_1,
                user.address,
                config.resources.WOOD,
                config.amounts.MEDIUM
            );
            
            // Stake first pirate in ResourceFarming
            await stakePirateInResourceFarming(user, config.pirateIds.PIRATE_1);
            
            // Stake second pirate in StorageUpgrade
            await stakePirateInStorageUpgrade(otherAccount, config.pirateIds.PIRATE_2);
            
            // Verify both pirates are staked
            const workingPirates = await state.resourceFarming.getWorkingPirates(
                user.address,
                await genesisPiratesNFT.getAddress()
            );
            expect(workingPirates.length).to.equal(1);
            
            const stakingInfo = await state.storageUpgrade.stakingInfo(
                await genesisPiratesNFT.getAddress(),
                config.pirateIds.PIRATE_2
            );
            expect(stakingInfo.owner).to.equal(otherAccount.address);
            
            // Transfer resources between staked pirates
            const sourceCollectionContract = await genesisPiratesNFT.getAddress();
            const sourceTokenId = config.pirateIds.PIRATE_1;
            const destCollectionContract = await genesisPiratesNFT.getAddress();
            const destTokenId = config.pirateIds.PIRATE_2;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                resourceTransferManager.connect(user).transferResourcesToDestination(
                    sourceCollectionContract,
                    sourceTokenId,
                    destCollectionContract,
                    destTokenId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(resourceTransferManager, "ResourceTransferredBetweenNFTs")
             .withArgs(
                user.address,
                sourceCollectionContract,
                sourceTokenId,
                destCollectionContract,
                destTokenId,
                resource,
                amount,
                config.fees.DEFAULT_TRANSFER_FEE
             );
        });
    });
});