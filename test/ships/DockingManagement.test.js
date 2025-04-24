const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {
  deployBaseInfrastructure,
  deployAndAuthorizeContract,
  deployMockBuildingStorage,
  setupNFTsForStaking
} = require("../utils.js");

// Helper to deploy and register IslandStorage
async function deployAndSetupIslandStorage(car, admin, shipNFT) {
  const islandStorage = await deployAndAuthorizeContract(
    "IslandStorage",
    car,
    await shipNFT.getAddress(), // Requires NFT collection address
    true // isNft721 for ShipNFT
  );
  
  // Use the new setIslandSize function for specific test islands
  // Island 10: Small (2 slots) - Enum value 1
  await islandStorage.connect(admin).setIslandSize(10, 1); 
  // Island 20: Medium (3 slots) - Enum value 2
  await islandStorage.connect(admin).setIslandSize(20, 2); 
  // Island 30: Large (4 slots) - Enum value 3
  await islandStorage.connect(admin).setIslandSize(30, 3); 
  // Island 40: Huge (5 slots) - Enum value 4
  await islandStorage.connect(admin).setIslandSize(40, 4); 
  // Island 50: ExtraSmall (1 slot) - Enum value 0
  await islandStorage.connect(admin).setIslandSize(50, 0); 
  
  return islandStorage;
}

describe("DockingManagement", function () {
  let admin, user, car, docking, buildingStorage, islandStorage;

  async function setupFixture() {
    const base = await deployBaseInfrastructure();
    admin = base.admin;
    user = base.user;
    car = base.centralAuthorizationRegistry;

    // Deploy NFTs needed for IslandStorage
    const { shipNFT } = await setupNFTsForStaking(admin, user, car); 

    // Deploy and setup IslandStorage
    islandStorage = await deployAndSetupIslandStorage(car, admin, shipNFT);

    // Deploy MockBuildingStorage, passing IslandStorage address
    buildingStorage = await deployAndAuthorizeContract(
      "MockBuildingStorage", 
      car,
      await islandStorage.getAddress() 
    );

    // Deploy DockingManagement
    docking = await deployAndAuthorizeContract("DockingManagement", car);
    
    // Register mock building storage in CAR (important!)
    const key = ethers.keccak256(ethers.toUtf8Bytes("IBuildingStorage"));
    await car.setContractAddress(key, await buildingStorage.getAddress());

    return { admin, user, car, docking, buildingStorage, islandStorage };
  }

  beforeEach(async function () {
    ({ admin, user, car, docking, buildingStorage, islandStorage } = await setupFixture());
  });

  describe("getSlotRequirementForShipClass", function () {
    it("returns correct slot requirements for each class", async function () {
      expect(await docking.getSlotRequirementForShipClass("Sailboat")).to.equal(0);
      expect(await docking.getSlotRequirementForShipClass("Small")).to.equal(1);
      expect(await docking.getSlotRequirementForShipClass("Medium")).to.equal(2);
      expect(await docking.getSlotRequirementForShipClass("Large")).to.equal(3);
    });
  });

  describe("getAvailableSlots", function () {
    it("returns correct base slots from IslandStorage via MockBuildingStorage", async function () {
      expect(await docking.getAvailableSlots(50)).to.equal(1); // XS
      expect(await docking.getAvailableSlots(10)).to.equal(2); // Small
      expect(await docking.getAvailableSlots(20)).to.equal(3); // Medium
      expect(await docking.getAvailableSlots(30)).to.equal(4); // Large
      expect(await docking.getAvailableSlots(40)).to.equal(5); // Huge
    });
  });

  describe("dockShip", function () {
    it("docks a ship if enough slots (Small Island) and emits event", async function () {
      const islandId = 10; // Small island (2 slots)
      const tx = await docking.connect(admin).dockShip(1, islandId, user.address, "Small"); // Uses 1 slot (1 left)
      await expect(tx).to.emit(docking, "ShipDocked");
      expect(await docking.getAvailableSlots(islandId)).to.equal(1);
      
      // Expect the NEXT dock (Medium ship, needs 2 slots) to fail because only 1 is left
      await expect(docking.connect(admin).dockShip(2, islandId, user.address, "Medium")) 
             .to.be.revertedWith("Not enough slots");

      // Verify available slots remain unchanged after the failed attempt
      expect(await docking.getAvailableSlots(islandId)).to.equal(1); 
    });

    it("reverts if not enough slots (Medium Island)", async function () {
      const islandId = 20; // Medium island (3 slots)
      await docking.connect(admin).dockShip(101, islandId, user.address, "Medium"); // Uses 2 slots (1 left)
      await docking.connect(admin).dockShip(102, islandId, user.address, "Small"); // Uses 1 slot (0 left)
      // Try docking another small ship (needs 1 slot)
      await expect(
        docking.connect(admin).dockShip(103, islandId, user.address, "Small")
      ).to.be.revertedWith("Not enough slots");
    });
    it("reverts if already docked", async function () {
      await docking.connect(admin).dockShip(2, 1, user.address, "Small");
      await expect(
        docking.connect(admin).dockShip(2, 1, user.address, "Small")
      ).to.be.revertedWith("Already docked");
    });
    it("reverts if not called by authorized", async function () {
      await expect(
        docking.connect(user).dockShip(3, 1, user.address, "Small")
      ).to.be.reverted;
    });
  });

  describe("undockShip", function () {
    it("undocks a ship and correctly increases available slots", async function () {
      const islandId = 10; // Small (2 slots)
      await docking.connect(admin).dockShip(4, islandId, user.address, "Medium"); // Uses 2 slots (0 left)
      expect(await docking.getAvailableSlots(islandId)).to.equal(0);
      const tx = await docking.connect(admin).undockShip(4, islandId, user.address, "Medium"); // Frees 2 slots
      await expect(tx).to.emit(docking, "ShipUndocked");
      expect(await docking.getAvailableSlots(islandId)).to.equal(2); // Back to 2 available
    });
    it("reverts if not docked at this island", async function () {
      await expect(
        docking.connect(admin).undockShip(5, 3, user.address, "Small")
      ).to.be.revertedWith("Not docked at this island");
    });
    it("reverts if not called by authorized", async function () {
      await docking.connect(admin).dockShip(6, 4, user.address, "Small");
      await expect(
        docking.connect(user).undockShip(6, 4, user.address, "Small")
      ).to.be.reverted;
    });
  });

  describe("rebaseShip", function () {
    it("rebases a ship and updates slots on both islands", async function () {
      const oldIslandId = 10; // Small (2 slots)
      const newIslandId = 20; // Medium (3 slots)
      await docking.connect(admin).dockShip(7, oldIslandId, user.address, "Small"); // Use 1 slot on old (1 left)
      expect(await docking.getAvailableSlots(oldIslandId)).to.equal(1);
      expect(await docking.getAvailableSlots(newIslandId)).to.equal(3);

      const tx = await docking.connect(admin).rebaseShip(7, oldIslandId, newIslandId, user.address, "Small"); // Moves 1 slot
      await expect(tx).to.emit(docking, "ShipRebased");
      
      expect(await docking.getAvailableSlots(oldIslandId)).to.equal(2); // Back to 2 available
      expect(await docking.getAvailableSlots(newIslandId)).to.equal(2); // 3 total - 1 used = 2 left
      
      // State updated
      expect(await docking.getShipDockedIsland(7)).to.equal(newIslandId);
      expect((await docking.getDockedShips(oldIslandId)).map(Number)).to.not.include(7);
      expect((await docking.getDockedShips(newIslandId)).map(Number)).to.include(7);
    });

    it("reverts if not enough slots at new island (Large Island)", async function () {
      const oldIslandId = 10; // Small (2 slots)
      const newIslandId = 30; // Large (4 slots)
      await docking.connect(admin).dockShip(9, oldIslandId, user.address, "Small"); // Use 1 on old

      // Fill up new island
      await docking.connect(admin).dockShip(1001, newIslandId, user.address, "Medium"); // Use 2 (2 left)
      await docking.connect(admin).dockShip(1002, newIslandId, user.address, "Medium"); // Use 2 (0 left)
      
      // Try to rebase ship needing 1 slot
      await expect(
        docking.connect(admin).rebaseShip(9, oldIslandId, newIslandId, user.address, "Small")
      ).to.be.revertedWith("Not enough slots at new island");
    });
    it("reverts if not docked at old island", async function () {
      await expect(
        docking.connect(admin).rebaseShip(8, 10, 11, user.address, "Small")
      ).to.be.revertedWith("Not docked at old island");
    });
    it("reverts if not called by authorized", async function () {
      await docking.connect(admin).dockShip(10, 14, user.address, "Small");
      await expect(
        docking.connect(user).rebaseShip(10, 14, 15, user.address, "Small")
      ).to.be.reverted;
    });
  });

  describe("canDock", function () {
    it("returns true if enough slots (Medium Island)", async function () {
      const islandId = 20; // Medium (3 slots)
      expect(await docking.canDock(islandId, 1)).to.equal(true); // Small ship
      expect(await docking.canDock(islandId, 2)).to.equal(true); // Medium ship
      expect(await docking.canDock(islandId, 3)).to.equal(true); // Large ship (exactly fits)
    });
    it("returns false if not enough slots (Small Island)", async function () {
      const islandId = 10; // Small (2 slots)
      await docking.connect(admin).dockShip(2001, islandId, user.address, "Small"); // Use 1 (1 left)
      expect(await docking.canDock(islandId, 1)).to.equal(true); // Small fits
      expect(await docking.canDock(islandId, 2)).to.equal(false); // Medium doesn't fit
    });
  });

  describe("getDockedShips and getShipDockedIsland", function () {
    it("returns correct docked ships and docked island after operations", async function () {
      await docking.connect(admin).dockShip(21, 30, user.address, "Small");
      await docking.connect(admin).dockShip(22, 30, user.address, "Small");
      expect((await docking.getDockedShips(30)).map(Number)).to.include(21);
      expect((await docking.getDockedShips(30)).map(Number)).to.include(22);
      expect(await docking.getShipDockedIsland(21)).to.equal(30);
      expect(await docking.getShipDockedIsland(22)).to.equal(30);
      await docking.connect(admin).undockShip(21, 30, user.address, "Small");
      expect((await docking.getDockedShips(30)).map(Number)).to.not.include(21);
      expect(await docking.getShipDockedIsland(21)).to.equal(0);
    });
  });

  describe("Edge cases and slot exhaustion", function () {
    it("maintains slot count consistency after failed dock/undock (Huge Island)", async function () {
      const islandId = 40; // Huge (5 slots)
      // Fill up
      await docking.connect(admin).dockShip(3001, islandId, user.address, "Large"); // Use 3 (2 left)
      await docking.connect(admin).dockShip(3002, islandId, user.address, "Small"); // Use 1 (1 left)
      await docking.connect(admin).dockShip(3003, islandId, user.address, "Small"); // Use 1 (0 left)
      
      // Try to dock one more (should fail)
      await expect(
        docking.connect(admin).dockShip(4000, islandId, user.address, "Small")
      ).to.be.revertedWith("Not enough slots");
      
      // Undock one
      await docking.connect(admin).undockShip(3001, islandId, user.address, "Large"); // Frees 3 (3 left)
      expect(await docking.getAvailableSlots(islandId)).to.equal(3);
      
      // Now should succeed
      await docking.connect(admin).dockShip(4000, islandId, user.address, "Small"); // Uses 1 (2 left)
      expect((await docking.getDockedShips(islandId)).map(Number)).to.include(4000);
      expect(await docking.getAvailableSlots(islandId)).to.equal(2);
    });
    it("handles parallel docking and undocking without slot inconsistency", async function () {
      const islandId = 50; // XS island (1 slot)
      // Dock first ship (uses 1 slot, 0 left)
      await docking.connect(admin).dockShip(5000, islandId, user.address, "Small");
      expect(await docking.getAvailableSlots(islandId)).to.equal(0);

      // Expect second ship docking to fail (0 slots available)
      await expect( 
        docking.connect(admin).dockShip(5001, islandId, user.address, "Small")
      ).to.be.revertedWith("Not enough slots");

      // Undock first ship (frees 1 slot, 1 left)
      await docking.connect(admin).undockShip(5000, islandId, user.address, "Small");
      expect(await docking.getAvailableSlots(islandId)).to.equal(1);

      // Dock third ship (uses 1 slot, 0 left)
      await docking.connect(admin).dockShip(5002, islandId, user.address, "Small");
      expect(await docking.getAvailableSlots(islandId)).to.equal(0);
      
      // Final check: only ship 5002 should be docked
      expect((await docking.getDockedShips(islandId)).map(Number)).to.include(5002);
      expect((await docking.getDockedShips(islandId)).map(Number)).to.not.include(5000);
      expect((await docking.getDockedShips(islandId)).map(Number)).to.not.include(5001); // Ship 5001 never docked
    });
  });
}); 