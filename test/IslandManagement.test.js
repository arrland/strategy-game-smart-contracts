const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {
    deployBaseInfrastructure,
    setupNFTsForStaking,
    setupCoreGameContracts,
    deployAndAuthorizeContract,
    createTestConfig
} = require("./utils");

// Test configuration
const IslandManagementTestConfig = createTestConfig({
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

describe("IslandManagement", function () {
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

        // Deploy IslandManagement contract
        const islandManagement = await deployAndAuthorizeContract(
            "IslandManagement",
            base.centralAuthorizationRegistry,
            await nfts.islandNft.getAddress()
        );

        // Setup additional test data
        await _setupTestData(base, nfts, coreContractsPack, islandManagement);

        return {
            ...base,
            ...nfts,
            ...coreContractsPack,
            islandManagement,
            config: IslandManagementTestConfig
        };
    }

    async function _setupTestData(base, nfts, coreContractsPack, islandManagement) {
        // Set ship NFT contract
        await islandManagement.connect(base.admin).setShipNftContract(await nfts.shipNFT.getAddress());

        // Mint islands and ships
        await nfts.islandNft.connect(base.admin).mintSpecific(base.user.address, IslandManagementTestConfig.islandIds.ISLAND_1);
        await nfts.islandNft.connect(base.admin).mintSpecific(base.user.address, IslandManagementTestConfig.islandIds.ISLAND_2);
        await nfts.islandNft.connect(base.admin).mintSpecific(base.otherAccount.address, IslandManagementTestConfig.islandIds.ISLAND_3);

        await nfts.shipNFT.connect(base.admin).safeMint(base.user.address, IslandManagementTestConfig.shipIds.SHIP_1);
        await nfts.shipNFT.connect(base.admin).safeMint(base.otherAccount.address, IslandManagementTestConfig.shipIds.SHIP_2);

        // Register resource types (wood, stone, food are likely already registered from core setup)
        // But let's ensure they exist
        try {
            await coreContractsPack.resourceTypeManager.connect(base.admin).addResourceType("wood", true, true);
        } catch {} // Ignore if already exists
        try {
            await coreContractsPack.resourceTypeManager.connect(base.admin).addResourceType("stone", true, true);
        } catch {} // Ignore if already exists
        try {
            await coreContractsPack.resourceTypeManager.connect(base.admin).addResourceType("food", true, true);
        } catch {} // Ignore if already exists

        // Add resources to islands for transfer testing
        await coreContractsPack.storageManagement.connect(base.admin).addResource(
            await nfts.islandNft.getAddress(),
            IslandManagementTestConfig.islandIds.ISLAND_1,
            base.user.address,
            IslandManagementTestConfig.resources.WOOD,
            IslandManagementTestConfig.amounts.LARGE
        );
        await coreContractsPack.storageManagement.connect(base.admin).addResource(
            await nfts.islandNft.getAddress(),
            IslandManagementTestConfig.islandIds.ISLAND_2,
            base.user.address,
            IslandManagementTestConfig.resources.STONE,
            IslandManagementTestConfig.amounts.LARGE
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

    beforeEach(async function () {
        state = await loadFixture(setupFixture);
    });

    describe("Fee Management", function () {
        it("should set initial transfer fee correctly", async function () {
            const { islandManagement, config } = state;
            
            const fee = await islandManagement.getResourceTransferFee();
            expect(fee).to.equal(config.fees.DEFAULT_TRANSFER_FEE);
        });

        it("should allow admin to update transfer fee", async function () {
            const { islandManagement, admin, config } = state;
            
            await expect(
                islandManagement.connect(admin).setResourceTransferFee(config.fees.NEW_TRANSFER_FEE)
            ).to.emit(islandManagement, "ResourceTransferFeeUpdated")
             .withArgs(config.fees.NEW_TRANSFER_FEE);

            const fee = await islandManagement.getResourceTransferFee();
            expect(fee).to.equal(config.fees.NEW_TRANSFER_FEE);
        });

        it("should not allow non-admin to update transfer fee", async function () {
            const { islandManagement, user, config } = state;
            
            await expect(
                islandManagement.connect(user).setResourceTransferFee(config.fees.NEW_TRANSFER_FEE)
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("should allow admin to set fee exemptions", async function () {
            const { islandManagement, admin, user } = state;
            
            await expect(
                islandManagement.connect(admin).setFeeExemption(user.address, true)
            ).to.emit(islandManagement, "FeeExemptionUpdated")
             .withArgs(user.address, true);

            const isExempt = await islandManagement.isFeeExempt(user.address);
            expect(isExempt).to.be.true;
        });

        it("should allow admin to set batch fee exemptions", async function () {
            const { islandManagement, admin, user, otherAccount } = state;
            
            const users = [user.address, otherAccount.address];
            
            await islandManagement.connect(admin).setBatchFeeExemption(users, true);

            const isUserExempt = await islandManagement.isFeeExempt(user.address);
            const isOtherExempt = await islandManagement.isFeeExempt(otherAccount.address);
            
            expect(isUserExempt).to.be.true;
            expect(isOtherExempt).to.be.true;
        });

        it("should reject batch fee exemption with zero address", async function () {
            const { islandManagement, admin } = state;
            
            const users = [ethers.ZeroAddress];
            
            await expect(
                islandManagement.connect(admin).setBatchFeeExemption(users, true)
            ).to.be.revertedWith("Invalid user address");
        });
    });

    describe("Ship NFT Management", function () {
        it("should allow admin to set ship NFT contract", async function () {
            const { islandManagement, admin, shipNFT } = state;
            
            const newShipAddress = await shipNFT.getAddress();
            
            await expect(
                islandManagement.connect(admin).setShipNftContract(newShipAddress)
            ).to.emit(islandManagement, "ShipNftContractUpdated")
             .withArgs(newShipAddress);

            const currentShipContract = await islandManagement.shipNftContract();
            expect(currentShipContract).to.equal(newShipAddress);
        });

        it("should not allow non-admin to set ship NFT contract", async function () {
            const { islandManagement, user, shipNFT } = state;
            
            await expect(
                islandManagement.connect(user).setShipNftContract(await shipNFT.getAddress())
            ).to.be.revertedWith("Caller is not an admin");
        });

        it("should reject zero address for ship NFT contract", async function () {
            const { islandManagement, admin } = state;
            
            await expect(
                islandManagement.connect(admin).setShipNftContract(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid ship NFT contract address");
        });
    });

    describe("Resource Transfer", function () {
        it("should transfer resources between islands with fee", async function () {
            const { islandManagement, user, otherAccount, islandNft, config, feeManagement } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            const initialArrcBalance = await state.arrcToken.balanceOf(user.address);
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(islandManagement, "ResourceTransferredBetweenNFTs")
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
            const { islandManagement, admin, user, otherAccount, islandNft, config } = state;
            
            // Make user fee exempt
            await islandManagement.connect(admin).setFeeExemption(user.address, true);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            const initialArrcBalance = await state.arrcToken.balanceOf(user.address);
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(islandManagement, "ResourceTransferredBetweenNFTs")
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
            const { islandManagement, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_2; // User owns this and it has stone
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.STONE;
            const amount = config.amounts.SMALL;
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(islandManagement, "ResourceTransferredBetweenNFTs")
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
            const { islandManagement, admin, user, otherAccount, islandNft, shipNFT, config } = state;
            
            // Transfer ship away from user
            await shipNFT.connect(user).transferFrom(user.address, admin.address, config.shipIds.SHIP_1);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
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
            const { islandManagement, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_3; // Owned by otherAccount
            const destIslandId = config.islandIds.ISLAND_2;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    user.address,
                    resource,
                    amount
                )
            ).to.be.revertedWith("User does not own the source island");
        });

        it("should fail if destination owner doesn't own destination NFT", async function () {
            const { islandManagement, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3; // Owned by otherAccount
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    user.address, // Wrong owner
                    resource,
                    amount
                )
            ).to.be.revertedWith("Destination owner does not own the destination island");
        });

        it("should fail if not enough resources in source", async function () {
            const { islandManagement, user, otherAccount, islandNft, config } = state;
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = ethers.parseUnits("1000", 18); // More than available
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
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
            const { islandManagement, user, otherAccount, islandNft, config, arrcToken, admin } = state;
            
            // Transfer away all user's ARRC tokens
            const userBalance = await arrcToken.balanceOf(user.address);
            await arrcToken.connect(user).transfer(admin.address, userBalance);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
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

    describe("Edge Cases", function () {
        it("should handle zero transfer fee correctly", async function () {
            const { islandManagement, admin, user, otherAccount, islandNft, config } = state;
            
            // Set fee to zero
            await islandManagement.connect(admin).setResourceTransferFee(0);
            
            const sourceIslandId = config.islandIds.ISLAND_1;
            const destIslandId = config.islandIds.ISLAND_3;
            const resource = config.resources.WOOD;
            const amount = config.amounts.SMALL;
            
            const initialArrcBalance = await state.arrcToken.balanceOf(user.address);
            
            await expect(
                islandManagement.connect(user).transferResourcesToDestination(
                    await islandNft.getAddress(),
                    sourceIslandId,
                    await islandNft.getAddress(),
                    destIslandId,
                    otherAccount.address,
                    resource,
                    amount
                )
            ).to.emit(islandManagement, "ResourceTransferredBetweenNFTs")
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
    });
});