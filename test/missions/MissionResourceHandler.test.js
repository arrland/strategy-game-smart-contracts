const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { setupCoreGameContracts, deployBaseInfrastructure, setupNFTsForStaking } = require("../utils");

describe("MissionResourceHandler", function () {
    async function setupFixture() {
        const { admin, user, otherAccount, centralAuthorizationRegistry } = await deployBaseInfrastructure();
        const nftsSetup = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);

        const nftsForCore = {
            shipNFT: nftsSetup.shipNFT,
            genesisPiratesAddress: await nftsSetup.genesisPiratesNFT.getAddress(),
            inhabitantsAddress: await nftsSetup.inhabitantsNFT.getAddress(),
            genesisIslandsAddress: await nftsSetup.islandNft.getAddress()
        };

        const coreContracts = await setupCoreGameContracts(admin, user, centralAuthorizationRegistry, nftsForCore);
        
        const MissionResourceHandler = await ethers.getContractFactory("MissionResourceHandler");
        const missionResourceHandler = await MissionResourceHandler.deploy(await centralAuthorizationRegistry.getAddress());

        // Get shipMetadata instance from coreContracts to set up ship attributes
        const { shipMetadata } = coreContracts;

        const shipId = 1; // Example shipId
        // Define default ship attributes for shipId = 1
        const defaultShipAttributes = {
            class: "Small",
            durability: 100,
            speed: 10,
            agility: 5,
            viewingRange: 100,
            cannonsCapacity: 4,
            armor: 10,
            ramming: 5,
            crewMin: 2,
            crewMax: 10,
            cargoBay: 200, // Ensure this is > 0 and sufficient for tests
            oars: false,
            shallowWaters: true,
            deepWaters: true,
            shipType: "Warship"
        };
        // Authorize admin to call ShipMetadata (if not already done by deployBaseInfrastructure or setupCore)
        // Assuming admin is already authorized to call contracts it deploys or manages.
        // If ShipMetadata.updateShipMetadata has its own specific role, that would need to be granted to admin.
        // For now, assuming CAR.addAuthorizedContract(admin.address) covers it or it's an admin function directly.
        // await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(admin.address); // REMOVED: admin is already authorized by deployBaseInfrastructure
        await shipMetadata.connect(admin).updateShipMetadata(shipId, defaultShipAttributes);

        const islandId = 1; // Example islandId
        const resourceType = ethers.encodeBytes32String("WOOD");
        const amount = 100;

        return { 
            admin, 
            user, 
            otherAccount, 
            centralAuthorizationRegistry, 
            ...nftsSetup, 
            ...coreContracts, 
            missionResourceHandler, 
            owner: user,
            shipId, 
            islandId, 
            resourceType, 
            amount 
        };
    }

    describe("lockShipForMission", function () {
        it("should lock ship resources and emit ShipResourcesLocked event", async function () {
            const { missionResourceHandler, shipStorage, shipId, owner, centralAuthorizationRegistry, admin } = await loadFixture(setupFixture);

            const missionId = 123; // Example missionId
            const duration = 3600; // Example duration (1 hour in seconds)

            // Authorize owner (user) to call functions on MissionResourceHandler
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);

            // Authorize MissionResourceHandler to call ShipStorage (and other contracts if necessary)
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionResourceHandler.target);

            // Now, the call to lockShipForMission by owner should pass its own onlyAuthorized check.
            // And MissionResourceHandler should be able to call ShipStorage.lockResources successfully.
            // The test will now check for the ShipResourcesLocked event.
            await expect(missionResourceHandler.connect(owner).lockShipForMission(shipId, missionId, duration))
                .to.emit(missionResourceHandler, "ShipResourcesLocked")
                .withArgs(shipId, true, missionId); 
        });

        it("should revert if caller is not authorized to call MissionResourceHandler", async function() {
            const { missionResourceHandler, shipId, owner } = await loadFixture(setupFixture);
            const missionId = 456; // Different missionId for this test
            const duration = 1800; // Different duration

            // DO NOT authorize owner for this test case

            await expect(missionResourceHandler.connect(owner).lockShipForMission(shipId, missionId, duration))
                .to.be.revertedWith("Caller is not authorized");
        });
    });

    describe("unlockShipAfterMission", function () {
        it("should unlock ship resources and emit ShipResourcesLocked(false) event", async function() {
            const { missionResourceHandler, shipId, owner, centralAuthorizationRegistry, admin } = await loadFixture(setupFixture);

            // Authorize owner and MissionResourceHandler
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionResourceHandler.target);

            // First, lock the ship
            const missionId = 789;
            const duration = 3600; // 1 hour
            await missionResourceHandler.connect(owner).lockShipForMission(shipId, missionId, duration);
            
            // Advance time by the lock duration
            await time.increase(duration);

            // Now, unlock the ship
            await expect(missionResourceHandler.connect(owner).unlockShipAfterMission(shipId))
                .to.emit(missionResourceHandler, "ShipResourcesLocked")
                .withArgs(shipId, false, 0); // As per unlockShipAfterMission implementation
        });

        it("should revert if caller is not authorized to call MissionResourceHandler", async function() {
            const { missionResourceHandler, shipId, owner, otherAccount, centralAuthorizationRegistry, admin } = await loadFixture(setupFixture);

            // Authorize owner and MissionResourceHandler for the initial lock
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionResourceHandler.target);

            // Lock the ship
            const missionId = 101112;
            const duration = 7200;
            await missionResourceHandler.connect(owner).lockShipForMission(shipId, missionId, duration);
            await time.increase(duration); // Advance time

            // Attempt to unlock with otherAccount (unauthorized)
            await expect(missionResourceHandler.connect(otherAccount).unlockShipAfterMission(shipId))
                .to.be.revertedWith("Caller is not authorized");
        });
    });

    describe("getShipLockInfo", function() {
        it("should return correct lock information after locking", async function() {
            const { missionResourceHandler, shipId, owner, centralAuthorizationRegistry, admin, shipStorage } = await loadFixture(setupFixture);

            // Authorize relevant parties
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionResourceHandler.target);

            const missionIdToSet = 999;
            const durationToSet = 3600; // 1 hour

            const blockNumBefore = await ethers.provider.getBlockNumber();
            const blockBefore = await ethers.provider.getBlock(blockNumBefore);
            const timestampBefore = blockBefore.timestamp;

            await missionResourceHandler.connect(owner).lockShipForMission(shipId, missionIdToSet, durationToSet);

            const lockInfo = await missionResourceHandler.getShipLockInfo(shipId);
            
            // startTime should be close to timestampBefore or the block timestamp of the lock transaction
            // endTime = startTime + duration
            // For simplicity in this test, we directly check what ShipStorage.getLockInfo would return.
            // This assumes ShipStorage itself is tested for getLockInfo correctness.
            // MissionResourceHandler just acts as a passthrough.

            const expectedEndTime = lockInfo.startTime + BigInt(durationToSet);

            expect(lockInfo.locked).to.be.true;
            expect(lockInfo.missionId).to.equal(missionIdToSet);
            expect(lockInfo.endTime).to.equal(expectedEndTime);
            // attacker is not set by this lock mechanism, should be address(0)
            expect(lockInfo.attacker).to.equal(ethers.ZeroAddress);

            // We can also check that startTime is greater than or equal to timestampBefore
            expect(lockInfo.startTime).to.be.gte(timestampBefore);
        });

        it("should return correct lock information after unlocking", async function() {
            const { missionResourceHandler, shipId, owner, centralAuthorizationRegistry, admin } = await loadFixture(setupFixture);
            
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionResourceHandler.target);

            const missionIdToSet = 888;
            const durationToSet = 1800; // 30 minutes

            await missionResourceHandler.connect(owner).lockShipForMission(shipId, missionIdToSet, durationToSet);
            await time.increase(durationToSet); // Advance time
            await missionResourceHandler.connect(owner).unlockShipAfterMission(shipId);

            const lockInfo = await missionResourceHandler.getShipLockInfo(shipId);

            expect(lockInfo.locked).to.be.false;
            // After unlock, other fields might be reset or keep old values depending on ShipStorage.unlockResources impl.
            // BaseStorage.unlockResources resets them to 0/false/address(0).
            expect(lockInfo.startTime).to.equal(0);
            expect(lockInfo.endTime).to.equal(0);
            expect(lockInfo.missionId).to.equal(0);
            expect(lockInfo.attacker).to.equal(ethers.ZeroAddress);
        });
    });

    describe("transferResourceFromIslandToShip", function() {
        it("should transfer resources and emit ResourcesTransferred event", async function() {
            const { 
                missionResourceHandler, 
                islandId, // This will be fromIslandId
                shipId,   // This will be toShipId
                owner, 
                centralAuthorizationRegistry, 
                admin,
                islandStorage, // Real IslandStorage instance
                shipStorage,   // Real ShipStorage instance
                resourceTypeManager // For resource type string
            } = await loadFixture(setupFixture);

            // Authorize relevant parties
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionResourceHandler.target);

            const resourceTypeString = "WOOD"; // The function takes string
            const amountToTransfer = ethers.parseUnits("50", 0); // Transfer 50 units (assuming 0 decimals for WOOD)

            // Pre-condition: Ensure island has resources and ship has capacity.
            // This might require direct calls to IslandStorage and ShipStorage.
            // For simplicity, we assume setupCoreGameContracts or initial state is sufficient for a basic transfer.
            // Or, that underlying transferResourceBetweenStorages handles insufficient resources/capacity gracefully (which it should, by reverting).
            // Let's ensure the resource type is registered for this test to be robust.
            await resourceTypeManager.connect(admin).addResourceType(resourceTypeString, true, true);
            
            // Add resources to island 1 (islandId from setupFixture is 1)
            // Corrected call to addResource:
            await islandStorage.connect(admin).addResource(islandId, admin.address, resourceTypeString, amountToTransfer * BigInt(2)); 

            // Action: Call transferResourceFromIslandToShip
            await expect(missionResourceHandler.connect(owner).transferResourceFromIslandToShip(islandId, shipId, resourceTypeString, amountToTransfer))
                .to.emit(missionResourceHandler, "ResourcesTransferred")
                .withArgs(
                    islandStorage.target, // fromStorage (use .target for address in Ethers v6)
                    islandId,                         // fromId
                    shipStorage.target,   // toStorage (use .target for address in Ethers v6)
                    shipId,                           // toId
                    resourceTypeString,               // resourceType
                    amountToTransfer                  // amount
                );
            
            // Post-condition (verify balances) - this is the more robust check for "IBaseStorage.transferResourceBetweenStorages called"
            // Use getResourceBalance and resourceTypeString
            const islandBalanceAfter = await islandStorage.getResourceBalance(islandId, resourceTypeString);
            const shipBalanceAfter = await shipStorage.getResourceBalance(shipId, resourceTypeString);

            // Assuming island started with 2 * amountToTransfer and ship with 0 for this resource for simplicity
            expect(islandBalanceAfter).to.equal(amountToTransfer); 
            expect(shipBalanceAfter).to.equal(amountToTransfer);
        });

        it("should revert if caller is not authorized", async function() {
            const { 
                missionResourceHandler, 
                islandId, 
                shipId,   
                otherAccount, // Use unauthorized account
                resourceTypeManager,
                admin
            } = await loadFixture(setupFixture);

            const resourceTypeString = "WOOD";
            const amountToTransfer = ethers.parseUnits("50", 0);

            // Ensure resource type exists, though not strictly needed if auth fails first
            await resourceTypeManager.connect(admin).addResourceType(resourceTypeString, true, true);
            // No need to add resources to island or set ship metadata for this auth test

            // DO NOT authorize otherAccount for MissionResourceHandler
            await expect(missionResourceHandler.connect(otherAccount).transferResourceFromIslandToShip(islandId, shipId, resourceTypeString, amountToTransfer))
                .to.be.revertedWith("Caller is not authorized");
        });
    });

    describe("transferResourceFromShipToIsland", function() {
        it("should transfer resources and emit ResourcesTransferred event", async function() {
            const { 
                missionResourceHandler, 
                shipId,   // This will be fromShipId
                islandId, // This will be toIslandId
                owner, 
                centralAuthorizationRegistry, 
                admin,
                shipStorage,   // Real ShipStorage instance
                islandStorage, // Real IslandStorage instance
                resourceTypeManager
            } = await loadFixture(setupFixture);

            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);
            await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionResourceHandler.target);

            const resourceTypeString = "STONE"; // Using a different resource for clarity
            const amountToTransfer = ethers.parseUnits("30", 0);

            await resourceTypeManager.connect(admin).addResourceType(resourceTypeString, true, true);
            
            // Add resources to shipId (ensure ship has metadata for capacity via setupFixture)
            await shipStorage.connect(admin).addResource(shipId, admin.address, resourceTypeString, amountToTransfer * BigInt(2));

            // Ensure island has capacity (IslandStorage capacity is default or can be set if needed)
            // For now, assume default capacity is enough.

            await expect(missionResourceHandler.connect(owner).transferResourceFromShipToIsland(shipId, islandId, resourceTypeString, amountToTransfer))
                .to.emit(missionResourceHandler, "ResourcesTransferred")
                .withArgs(
                    shipStorage.target,   
                    shipId,                           
                    islandStorage.target, 
                    islandId,                         
                    resourceTypeString,               
                    amountToTransfer                  
                );
            
            const shipBalanceAfter = await shipStorage.getResourceBalance(shipId, resourceTypeString);
            const islandBalanceAfter = await islandStorage.getResourceBalance(islandId, resourceTypeString);

            expect(shipBalanceAfter).to.equal(amountToTransfer);
            expect(islandBalanceAfter).to.equal(amountToTransfer); // Assuming island started with 0 of this resource
        });

        it("should revert if caller is not authorized", async function() {
            const { 
                missionResourceHandler, 
                shipId, 
                islandId,   
                otherAccount,
                resourceTypeManager,
                admin
            } = await loadFixture(setupFixture);

            const resourceTypeString = "STONE";
            const amountToTransfer = ethers.parseUnits("30", 0);
            await resourceTypeManager.connect(admin).addResourceType(resourceTypeString, true, true);

            await expect(missionResourceHandler.connect(otherAccount).transferResourceFromShipToIsland(shipId, islandId, resourceTypeString, amountToTransfer))
                .to.be.revertedWith("Caller is not authorized");
        });
    });

    describe("hasIslandStorageCapacity", function() {
        const ISLAND_SIZE_EXTRA_SMALL = 0; // Enum value for IIslandStorage.IslandSize.ExtraSmall
        let defaultCapacityExtraSmall;

        beforeEach(async function() {
            // Get the default capacity for ExtraSmall island size once
            const { islandStorage } = await loadFixture(setupFixture);
            // Accessing defaultCapacities mapping directly. Ensure it's public or use a getter if available.
            // Assuming defaultCapacities is public as per IslandStorage.sol shown earlier.
            defaultCapacityExtraSmall = await islandStorage.defaultCapacities(ISLAND_SIZE_EXTRA_SMALL);
        });

        it("should return true if island (ExtraSmall) has ample capacity (empty)", async function() {
            const { missionResourceHandler, islandId, islandStorage, admin } = await loadFixture(setupFixture);
            await islandStorage.connect(admin).setIslandSize(islandId, ISLAND_SIZE_EXTRA_SMALL);
            const additionalAmount = ethers.parseUnits("100", 0);
            expect(await missionResourceHandler.hasIslandStorageCapacity(islandId, additionalAmount)).to.be.true;
        });

        it("should return true if island (ExtraSmall) has exactly its default capacity available (empty)", async function() {
            const { missionResourceHandler, islandId, islandStorage, admin } = await loadFixture(setupFixture);
            await islandStorage.connect(admin).setIslandSize(islandId, ISLAND_SIZE_EXTRA_SMALL);
            const additionalAmount = defaultCapacityExtraSmall; // Use the fetched default capacity
            expect(await missionResourceHandler.hasIslandStorageCapacity(islandId, additionalAmount)).to.be.true;
        });

        it("should return false if island (ExtraSmall) needs more than its default capacity (empty)", async function() {
            const { missionResourceHandler, islandId, islandStorage, admin } = await loadFixture(setupFixture);
            await islandStorage.connect(admin).setIslandSize(islandId, ISLAND_SIZE_EXTRA_SMALL);
            const additionalAmount = defaultCapacityExtraSmall + BigInt(1);
            expect(await missionResourceHandler.hasIslandStorageCapacity(islandId, additionalAmount)).to.be.false;
        });

        it("should return true if partially filled island (ExtraSmall) has enough capacity", async function() {
            const { missionResourceHandler, islandId, islandStorage, admin, resourceTypeManager } = await loadFixture(setupFixture);
            await islandStorage.connect(admin).setIslandSize(islandId, ISLAND_SIZE_EXTRA_SMALL);
            
            const resourceTypeString = "SAND";
            await resourceTypeManager.connect(admin).addResourceType(resourceTypeString, true, true);
            const usedAmount = ethers.parseUnits("1000", 0);
            await islandStorage.connect(admin).addResource(islandId, admin.address, resourceTypeString, usedAmount);
            
            const additionalAmount = ethers.parseUnits("100", 0);
            // Capacity = defaultCapacityExtraSmall. Used = 1000. Available = Capacity - 1000.
            // Check: Capacity >= Used + Additional  => defaultCapacityExtraSmall >= 1000 + 100
            expect(await missionResourceHandler.hasIslandStorageCapacity(islandId, additionalAmount)).to.be.true;
        });

        it("should return false if partially filled island (ExtraSmall) has insufficient capacity", async function() {
            const { missionResourceHandler, islandId, islandStorage, admin, resourceTypeManager } = await loadFixture(setupFixture);
            await islandStorage.connect(admin).setIslandSize(islandId, ISLAND_SIZE_EXTRA_SMALL);

            const resourceTypeString = "SAND";
            await resourceTypeManager.connect(admin).addResourceType(resourceTypeString, true, true);
            
            // Fill it almost to the brim, leaving less than 'additionalAmount' space
            const spaceToLeave = ethers.parseUnits("50", 0);
            const usedAmount = defaultCapacityExtraSmall - spaceToLeave;
            if (usedAmount > 0) { // Only add resources if it makes sense (usedAmount could be negative if spaceToLeave is too large for small capacities)
                 await islandStorage.connect(admin).addResource(islandId, admin.address, resourceTypeString, usedAmount);
            }

            const additionalAmount = ethers.parseUnits("100", 0); // Needs 100 space
            // We left 50 space. So, this should be false.
            // Check: Capacity >= Used + Additional => defaultCapacityExtraSmall >= (defaultCapacityExtraSmall - 50) + 100
            // => defaultCapacityExtraSmall >= defaultCapacityExtraSmall + 50  => 0 >= 50 (False)
            expect(await missionResourceHandler.hasIslandStorageCapacity(islandId, additionalAmount)).to.be.false;
        });
    });
}); 