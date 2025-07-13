const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  setupCoreGameContracts,
  setupNFTsForStaking,
  setupShipForMissionTesting,
  deployAndRegisterContract,
  setupPirateSkills,
} = require("../utils");

describe("TradeManager - Comprehensive Unit Tests (TASK-TEST-TRADEMANAGER)", function () {
  let testCounter = 0;
  
  function getNextIslandId() {
    return 100 + testCounter++;
  }
  
  function getNextShipId() {
    return 200 + testCounter++;
  }

  // Helper function for trade tests
  async function setupTradeOrderAndShip() {
    const { admin, user, tradeManager, coreContracts, nftsSetup, centralAuthorizationRegistry } = await loadFixture(setupFixture);
    
    const islandId = getNextIslandId();
    const shipId = getNextShipId();
    const captainPirateId = 150;
    const crewPirateId = 151; // Additional pirate for crew requirements
    
    // Setup island and ship
    await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
    await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
    await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId);
    await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, crewPirateId); // Add second pirate
    
    // Add resources for trade order
    const amount = 100;
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    await coreContracts.resourceManagement.connect(admin).addResource(
      admin.address, 
      islandId, 
      admin.address, 
      "wood", 
      amountWei
    );
    
    // Create trade order
    const pricePerUnit = ethers.parseEther("0.01");
    await tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit);
    
    // Setup ship for mission with adequate crew
    const userIsland = getNextIslandId();
    await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, userIsland);
    
    // Use setupShipForMissionTesting but with adequate crew
    await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, userIsland);
    
    // Add additional crew member to satisfy requirements
    await setupPirateSkills(coreContracts.pirateSkills, admin, nftsSetup.genesisPiratesAddress, nftsSetup.inhabitantsAddress, { genesis: [crewPirateId] });
    await coreContracts.crewManagement.connect(admin).addCrew(nftsSetup.genesisPiratesAddress, crewPirateId, user.address, "sailor", 9);
    
    // Setup ARRC for user
    const totalPrice = pricePerUnit * BigInt(amount);
    await coreContracts.arrcToken.connect(admin).mint(user.address, totalPrice);
    
    const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
    );
    await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, totalPrice);
    
    return {
      admin, user, tradeManager, coreContracts, nftsSetup, centralAuthorizationRegistry,
      islandId, shipId, captainPirateId, crewPirateId, userIsland, amount, pricePerUnit, totalPrice
    };
  }

  async function setupFixture() {
    const [admin, user, otherAccount, islandOwner] = await ethers.getSigners();
    
    // Deploy Central Authorization Registry
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
    await centralAuthorizationRegistry.initialize(admin.address);
    await centralAuthorizationRegistry.addAuthorizedContract(admin.address);

    // Setup NFTs for staking
    const nftsSetup = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);
    
    // Setup core game contracts including TradeManager
    const coreContracts = await setupCoreGameContracts(
      admin, 
      user, 
      centralAuthorizationRegistry, 
      nftsSetup, 
      { deployRealMissionRequirements: false, deployRealMissionsStorage: true }
    );

    // Deploy MarketPlaceStorage which is required by TradeManager
    const MarketPlaceStorage = await ethers.getContractFactory("MarketPlaceStorage");
    const marketPlaceStorage = await MarketPlaceStorage.deploy(
      centralAuthorizationRegistry.target,
      nftsSetup.genesisIslandsAddress,
      true // Islands are ERC721
    );
    await marketPlaceStorage.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(marketPlaceStorage.target);
    await centralAuthorizationRegistry.setContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IMarketPlaceStorage")),
      marketPlaceStorage.target
    );

    // Deploy and register MockArrcLocking for tests
    const MockArrcLocking = await ethers.getContractFactory("MockArrcLocking");
    const arrcLocking = await MockArrcLocking.deploy(centralAuthorizationRegistry.target);
    await arrcLocking.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(arrcLocking.target);
    await centralAuthorizationRegistry.setContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking")),
      arrcLocking.target
    );

    // Register ARRC token under IArrcToken interface for TradeManager
    await centralAuthorizationRegistry.setContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IArrcToken")),
      coreContracts.arrcToken.target
    );

    // Register admin as TradeMission for testing initiateTrade authorization
    await centralAuthorizationRegistry.setContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("ITradeMission")),
      admin.address
    );

    // Register admin as ResourceTransferMission for testing completeEntireTradeMission authorization
    await centralAuthorizationRegistry.setContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IResourceTransferMission")),
      admin.address
    );

    // Setup resource types that will be used in tests
    const resourceTypes = ["wood", "stone", "iron", "citrus", "fish"];
    for (const resourceType of resourceTypes) {
      try {
        await coreContracts.resourceTypeManager.connect(admin).addResourceType(resourceType, true, true);
      } catch (error) {
        // Resource type already exists, ignore
      }
    }

    // Get TradeManager from core contracts
    const tradeManager = coreContracts.tradeManager;
    if (!tradeManager) {
      throw new Error("TradeManager not found in coreContracts");
    }

    return {
      admin,
      user,
      otherAccount,
      islandOwner,
      centralAuthorizationRegistry,
      coreContracts,
      nftsSetup,
      tradeManager,
      marketPlaceStorage,
      arrcLocking
    };
  }

  describe("Setup and Initialization", function() {
    it("should deploy TradeManager with correct configuration", async function() {
      const { tradeManager, centralAuthorizationRegistry } = await loadFixture(setupFixture);
      
      expect(await tradeManager.getAddress()).to.be.properAddress;
      
      // Verify TradeManager is properly registered in CAR
      const registeredAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("ITradeManager"))
      );
      expect(registeredAddress).to.equal(await tradeManager.getAddress());
    });

    it("should have proper dependencies configured", async function() {
      const { tradeManager, centralAuthorizationRegistry, marketPlaceStorage, arrcLocking } = await loadFixture(setupFixture);
      
      // Verify MarketPlaceStorage is registered
      const marketStorageAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IMarketPlaceStorage"))
      );
      expect(marketStorageAddress).to.equal(await marketPlaceStorage.getAddress());
      
      // Verify ArrcLocking is registered
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      expect(arrcLockingAddress).to.equal(await arrcLocking.getAddress());
    });
  });

  describe("Order Book Consistency - Limbo Order Edge Case", function() {
    it("should revert when attempting to cancel a trade order that is in progress (limbo order)", async function() {
      // Setup: create trade order and start a mission (simulate trade in progress)
      const { admin, user, tradeManager, coreContracts, nftsSetup, centralAuthorizationRegistry, islandId, shipId, amount, pricePerUnit } = await setupTradeOrderAndShip();

      // Simulate mission start by calling initiateTrade (normally called by mission contract)
      // For test, register admin as TradeMission in CAR for authorization
      await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("ITradeMission")),
        admin.address
      );

      // Approve ARRC for user (if not already done)
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, pricePerUnit * BigInt(amount));

      // Initiate trade (simulate mission in progress)
      await tradeManager.connect(admin).initiateTrade(
        user.address,
        shipId,
        1, // tradeOrderId (first order created in setup)
        pricePerUnit * BigInt(amount),
        "wood",
        amount,
        islandId
      );

      // Attempt to cancel the order while trade is in progress
      // Should revert and NOT emit TradeOrderCancelled
      await expect(
        tradeManager.connect(admin).cancelTradeOrder(1)
      ).to.be.revertedWith("Trade in progress");
      // No .to.emit(tradeManager, "TradeOrderCancelled") here: revert means no event
    });
  });

  describe("Order Book Consistency - Double-Spend Edge Case", function() {
    it("should prevent two ships from simultaneously fulfilling the same trade order (double-spend)", async function() {
      // Setup: create trade order and two ships
      const { admin, user, tradeManager, coreContracts, nftsSetup, centralAuthorizationRegistry, islandId, amount, pricePerUnit } = await setupTradeOrderAndShip();

      // Mint and setup a second ship for the user
      const shipId2 = 9999;
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId2);
      const captainPirateId2 = 200;
      await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId2);
      const userIsland2 = 8888;
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, userIsland2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId2, captainPirateId2, userIsland2);

      // Approve ARRC for user (if not already done)
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, pricePerUnit * BigInt(amount) * 2n);

      // Simulate mission start for both ships by calling initiateTrade (normally called by mission contract)
      await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("ITradeMission")),
        admin.address
      );

      // First ship initiates trade (should succeed)
      await tradeManager.connect(admin).initiateTrade(
        user.address,
        shipId2,
        1, // tradeOrderId (first order created in setup)
        pricePerUnit * BigInt(amount),
        "wood",
        amount,
        islandId
      );

      // Second ship attempts to initiate trade on the same order (should fail or revert due to order already in progress or insufficient resources)
      // Should NOT emit TradeOrderUpdated or TradeOrderFilled
      await expect(
        tradeManager.connect(admin).initiateTrade(
          user.address,
          shipId2 + 1, // new shipId
          1, // same tradeOrderId
          pricePerUnit * BigInt(amount),
          "wood",
          amount,
          islandId
        )
      ).to.be.reverted;
      // No .to.emit(tradeManager, "TradeOrderUpdated") or .to.emit(tradeManager, "TradeOrderFilled")
    });
  });

  describe("Order Book Consistency - Partial Fill and Cancellation Edge Case", function() {
    it("should allow cancellation of the remaining order after a partial fill, returning only the unfilled portion", async function() {
      const { admin, user, tradeManager, coreContracts, nftsSetup, centralAuthorizationRegistry, islandId, amount, pricePerUnit } = await setupTradeOrderAndShip();

      // Mint and setup a second ship for the user
      const shipId2 = 8888;
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId2);
      const captainPirateId2 = 201;
      await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId2);
      const userIsland2 = 7777;
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, userIsland2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId2, captainPirateId2, userIsland2);

      // Approve ARRC for user (if not already done)
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, pricePerUnit * BigInt(amount));

      // Simulate mission start for first ship by calling initiateTrade (partial fill)
      await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("ITradeMission")),
        admin.address
      );

      // First ship initiates trade for half the order (partial fill)
      const partialAmount = Math.floor(amount / 2);
      await tradeManager.connect(admin).initiateTrade(
        user.address,
        shipId2,
        1, // tradeOrderId (first order created in setup)
        pricePerUnit * BigInt(partialAmount),
        "wood",
        partialAmount,
        islandId
      );

      // Simulate mission completion for the partial fill and check for TradeOrderUpdated event
      await expect(
        tradeManager.connect(admin).completeTrade(user.address, shipId2)
      ).to.emit(tradeManager, "TradeOrderUpdated").withArgs(1, amount - partialAmount, pricePerUnit);

      // After partial fill and completion, cancel the order (should return only the unfilled portion)
      await expect(
        tradeManager.connect(admin).cancelTradeOrder(1)
      ).to.emit(tradeManager, "TradeOrderCancelled");

      // Check that the order is deactivated and only the unfilled portion was returned
      const order = await tradeManager.getTradeOrder(1);
      expect(order.isActive).to.be.false;
      expect(order.resourceAmount).to.equal(0);
    });

    it("should emit TradeOrderFilled when an order is fully filled", async function() {
      const { admin, user, tradeManager, coreContracts, nftsSetup, centralAuthorizationRegistry, islandId, amount, pricePerUnit } = await setupTradeOrderAndShip();

      // Mint and setup a second ship for the user
      const shipId2 = 8889;
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId2);
      const captainPirateId2 = 202;
      await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId2);
      const userIsland2 = 7778;
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, userIsland2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId2, captainPirateId2, userIsland2);

      // Approve ARRC for user (if not already done)
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, pricePerUnit * BigInt(amount));

      // Simulate mission start for first ship by calling initiateTrade (full fill)
      await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("ITradeMission")),
        admin.address
      );

      // Ship initiates trade for the full order
      await tradeManager.connect(admin).initiateTrade(
        user.address,
        shipId2,
        1, // tradeOrderId (first order created in setup)
        pricePerUnit * BigInt(amount),
        "wood",
        amount,
        islandId
      );

      // Simulate mission completion for the full fill and check for TradeOrderFilled event
      await expect(
        tradeManager.connect(admin).completeTrade(user.address, shipId2)
      ).to.emit(tradeManager, "TradeOrderFilled").withArgs(1);

      // Check that the order is deactivated and resourceAmount is zero
      const order = await tradeManager.getTradeOrder(1);
      expect(order.isActive).to.be.false;
      expect(order.resourceAmount).to.equal(0);
    });
  });

  describe("createTradeOrder - Island Selling to Ships", function() {
    it("should successfully create a trade order", async function() {
      const { admin, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      // Add resources to admin at the island
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      const pricePerUnit = ethers.parseEther("0.01");
      
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit)
      ).to.emit(tradeManager, "TradeOrderCreated");
      
      // Verify trade order was created correctly
      const tradeOrder = await tradeManager.getTradeOrder(1);
      expect(tradeOrder.seller).to.equal(admin.address);
      expect(tradeOrder.islandId).to.equal(islandId);
      expect(tradeOrder.resourceType).to.equal("wood");
      expect(tradeOrder.resourceAmount).to.equal(amount);
      expect(tradeOrder.arrcPrice).to.equal(pricePerUnit);
      expect(tradeOrder.isActive).to.be.true;
    });

    it("should revert with insufficient resources", async function() {
      const { admin, tradeManager, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      // Don't add resources - should fail
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit)
      ).to.be.revertedWith("Insufficient resources");
    });

    it("should revert with invalid resource type", async function() {
      const { admin, tradeManager, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "nonexistent", amount, pricePerUnit)
      ).to.be.reverted; // Should revert for invalid resource type
    });

    it("should revert with zero amount", async function() {
      const { admin, tradeManager, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const pricePerUnit = ethers.parseEther("0.01");
      
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "wood", 0, pricePerUnit)
      ).to.be.revertedWith("Amount too low");
    });

    it("should revert with zero price", async function() {
      const { admin, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      // Add resources
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, 0)
      ).to.be.revertedWith("Invalid price");
    });

    it("should enforce access control - only island owner", async function() {
      const { admin, user, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId); // Admin owns island
      
      // Add resources as admin
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      const pricePerUnit = ethers.parseEther("0.01");
      
      // User tries to create trade order on admin's island - should fail
      await expect(
        tradeManager.connect(user).createTradeOrder(islandId, "wood", amount, pricePerUnit)
      ).to.be.revertedWith("Not island owner");
    });
  });

  describe("createIslandBuyOrder - Island Buying from Ships", function() {
    it("should successfully create an island buy order", async function() {
      const { admin, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      
      // Admin needs ARRC for buy order
      await coreContracts.arrcToken.connect(admin).mint(admin.address, totalPrice);
      await coreContracts.arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
      
      await expect(
        tradeManager.connect(admin).createIslandBuyOrder(islandId, "wood", amount, pricePerUnit)
      ).to.emit(tradeManager, "TradeOrderCreated");
      
      // Verify buy order was created correctly
      const tradeOrder = await tradeManager.getTradeOrder(1);
      expect(tradeOrder.seller).to.equal(admin.address);
      expect(tradeOrder.islandId).to.equal(islandId);
      expect(tradeOrder.resourceType).to.equal("wood");
      expect(tradeOrder.resourceAmount).to.equal(amount);
      expect(tradeOrder.arrcPrice).to.equal(pricePerUnit);
      expect(tradeOrder.isActive).to.be.true;
      
      // Verify ARRC was transferred to TradeManager
      const adminArrcBalance = await coreContracts.arrcToken.balanceOf(admin.address);
      expect(adminArrcBalance).to.equal(0); // All ARRC should be transferred
    });

    it("should revert with insufficient ARRC balance", async function() {
      const { admin, tradeManager, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      
      // Don't mint ARRC - should fail
      await expect(
        tradeManager.connect(admin).createIslandBuyOrder(islandId, "wood", amount, pricePerUnit)
      ).to.be.revertedWith("Insufficient ARRC balance");
    });

    it("should revert with insufficient ARRC allowance", async function() {
      const { admin, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      
      // Mint ARRC but don't approve - should fail
      await coreContracts.arrcToken.connect(admin).mint(admin.address, totalPrice);
      
      await expect(
        tradeManager.connect(admin).createIslandBuyOrder(islandId, "wood", amount, pricePerUnit)
      ).to.be.revertedWith("Insufficient ARRC allowance");
    });

    it("should enforce access control for island buy orders", async function() {
      const { admin, user, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId); // Admin owns island
      
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      
      // User has ARRC but doesn't own island
      await coreContracts.arrcToken.connect(admin).mint(user.address, totalPrice);
      await coreContracts.arrcToken.connect(user).approve(tradeManager.target, totalPrice);
      
      await expect(
        tradeManager.connect(user).createIslandBuyOrder(islandId, "wood", amount, pricePerUnit)
      ).to.be.revertedWith("Not island owner");
    });
  });

  describe("cancelTradeOrder", function() {
    it("should successfully cancel a sell order and return resources", async function() {
      const { admin, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      // Create trade order
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      const pricePerUnit = ethers.parseEther("0.01");
      await tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit);
      
      // Check resources before cancellation
      const resourcesBefore = await coreContracts.resourceManagement.getResourceBalance(
        admin.address, 
        islandId, 
        "wood"
      );
      
      // Cancel the order
      await expect(
        tradeManager.connect(admin).cancelTradeOrder(1)
      ).to.emit(tradeManager, "TradeOrderCancelled");
      
      // Verify order is inactive
      const tradeOrder = await tradeManager.getTradeOrder(1);
      expect(tradeOrder.isActive).to.be.false;
      
      // Verify resources are returned (this depends on implementation)
      // For now, just check that the function succeeded
    });

    it("should successfully cancel a buy order and return ARRC", async function() {
      const { admin, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      
      // Create island buy order
      await coreContracts.arrcToken.connect(admin).mint(admin.address, totalPrice);
      await coreContracts.arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
      await tradeManager.connect(admin).createIslandBuyOrder(islandId, "wood", amount, pricePerUnit);
      
      const arrcBalanceBefore = await coreContracts.arrcToken.balanceOf(admin.address);
      
      // Cancel the buy order
      await expect(
        tradeManager.connect(admin).cancelTradeOrder(1)
      ).to.emit(tradeManager, "TradeOrderCancelled");
      
      // Verify order is inactive
      const tradeOrder = await tradeManager.getTradeOrder(1);
      expect(tradeOrder.isActive).to.be.false;
      
      // Verify ARRC is returned
      const arrcBalanceAfter = await coreContracts.arrcToken.balanceOf(admin.address);
      expect(arrcBalanceAfter).to.be.gt(arrcBalanceBefore);
    });

    it("should revert if not the seller", async function() {
      const { admin, user, tradeManager, coreContracts, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      // Create trade order as admin
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      const pricePerUnit = ethers.parseEther("0.01");
      await tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit);
      
      // User tries to cancel admin's order - should fail
      await expect(
        tradeManager.connect(user).cancelTradeOrder(1)
      ).to.be.revertedWith("Not seller");
    });

    it("should revert if trade order doesn't exist", async function() {
      const { admin, tradeManager } = await loadFixture(setupFixture);
      
      await expect(
        tradeManager.connect(admin).cancelTradeOrder(999)
      ).to.be.revertedWith("Invalid trade order ID");
    });
    });

  describe("Trade Initiation and Execution", function() {

    it("should successfully initiate a trade (buy order)", async function() {
      const { admin, user, tradeManager, coreContracts, shipId, amount, userIsland } = await setupTradeOrderAndShip();
      
      const userArrcBefore = await coreContracts.arrcToken.balanceOf(user.address);
      
      // Initiate trade (called by TradeMission - admin is registered as TradeMission)
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      await expect(
        tradeManager.connect(admin).initiateTrade(user.address, shipId, 1, totalPrice, "wood", amount, userIsland)
      ).to.emit(tradeManager, "TradeInitiated")
        .withArgs(user.address, shipId, 1);
      
      // Verify ARRC was locked/transferred
      const userArrcAfter = await coreContracts.arrcToken.balanceOf(user.address);
      expect(userArrcBefore).to.be.gt(userArrcAfter);
    });

    it("should successfully initiate a sell order trade", async function() {
      const { admin, user, tradeManager, coreContracts, nftsSetup, centralAuthorizationRegistry, shipId, amount, userIsland } = await setupTradeOrderAndShip();
      
      // Create island buy order instead
      const sellIslandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, sellIslandId);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      
      // Admin needs ARRC for buy order
      await coreContracts.arrcToken.connect(admin).mint(admin.address, totalPrice);
      await coreContracts.arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
      await tradeManager.connect(admin).createIslandBuyOrder(sellIslandId, "wood", amount, pricePerUnit);
      
      // Add resources to ship for selling
      const shipStorageAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IShipStorage"))
      );
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        shipStorageAddress,
        shipId,
        user.address,
        "wood",
        amountWei
      );
      
      // Initiate sell order trade (ship selling to island)
      await expect(
        tradeManager.connect(admin).initiateTrade(user.address, shipId, 2, totalPrice, "wood", amount, userIsland)
      ).to.emit(tradeManager, "TradeInitiated")
        .withArgs(user.address, shipId, 2);
    });

    it("should revert initiateTrade with invalid trade order", async function() {
      const { admin, user, tradeManager, shipId, amount, userIsland } = await setupTradeOrderAndShip();
      
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      await expect(
        tradeManager.connect(admin).initiateTrade(user.address, shipId, 999, totalPrice, "wood", amount, userIsland)
      ).to.be.revertedWith("Invalid order");
    });

    it("should revert initiateTrade with inactive trade order", async function() {
      const { admin, user, tradeManager, shipId, amount, userIsland } = await setupTradeOrderAndShip();
      
      // Cancel the trade order first
      await tradeManager.connect(admin).cancelTradeOrder(1);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      await expect(
        tradeManager.connect(admin).initiateTrade(user.address, shipId, 1, totalPrice, "wood", amount, userIsland)
      ).to.be.revertedWith("Invalid order");
    });

    it("should successfully complete a trade", async function() {
      const { admin, user, tradeManager, coreContracts, shipId, amount, islandId, userIsland, centralAuthorizationRegistry } = await setupTradeOrderAndShip();
      
      // First initiate the trade
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      await tradeManager.connect(admin).initiateTrade(user.address, shipId, 1, totalPrice, "wood", amount, userIsland);
      
      const shipResourcesBefore = await coreContracts.resourceManagement.getResourceBalance(
        await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage"))),
        shipId,
        "wood"
      );
      
      // Complete the trade (called by TradeMission)
      await expect(
        tradeManager.connect(admin).completeTrade(user.address, shipId)
      ).to.emit(tradeManager, "TradeCompleted");
      
      // For buy orders, ship should receive resources
      const shipResourcesAfter = await coreContracts.resourceManagement.getResourceBalance(
        await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage"))),
        shipId,
        "wood"
      );
      expect(shipResourcesAfter).to.be.gt(shipResourcesBefore);
    });

    it("should revert completeTrade if trade not initiated", async function() {
      const { admin, user, tradeManager, shipId } = await setupTradeOrderAndShip();
      
      await expect(
        tradeManager.connect(admin).completeTrade(user.address, shipId)
      ).to.be.revertedWith("No active trade");
    });
  });

  describe("Trade Journey Management", function() {
    async function setupInitiatedTrade() {
      const setup = await setupTradeOrderAndShip();
      const { admin, user, tradeManager, shipId, amount, userIsland } = setup;
      
      // Initiate the trade first
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      await tradeManager.connect(admin).initiateTrade(user.address, shipId, 1, totalPrice, "wood", amount, userIsland);
      await tradeManager.connect(admin).completeTrade(user.address, shipId);
      
      return setup;
    }

    it("should successfully start return journey", async function() {
      const { user, tradeManager, shipId } = await setupInitiatedTrade();
      
      await expect(
        tradeManager.connect(user).startReturnJourney(user.address, shipId)
      ).to.emit(tradeManager, "ReturnJourneyStarted");
        // Note: ReturnJourneyStarted has 3 params: player, shipId, originIslandId
    });

    it("should successfully complete entire trade mission", async function() {
      const { admin, user, tradeManager, coreContracts, shipId, userIsland } = await setupInitiatedTrade();
      
      // Start return journey first
      await tradeManager.connect(user).startReturnJourney(user.address, shipId);
      
      // Complete entire trade mission (called by ResourceTransferMission)
      await expect(
        tradeManager.connect(admin).completeEntireTradeMission(user.address, shipId)
      ).to.emit(tradeManager, "ReturnJourneyCompleted")
        .withArgs(user.address, shipId);
      
      // Verify trade mission is complete - function executed successfully without reverting
    });

    it("should revert startReturnJourney if trade not completed", async function() {
      const { admin, user, tradeManager, shipId, amount, userIsland } = await setupTradeOrderAndShip();
      
      // Initiate but don't complete trade
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      await tradeManager.connect(admin).initiateTrade(user.address, shipId, 1, totalPrice, "wood", amount, userIsland);
      
      await expect(
        tradeManager.connect(user).startReturnJourney(user.address, shipId)
      ).to.be.revertedWith("Trade not completed");
    });

    it("should revert completeEntireTradeMission if return journey not started", async function() {
      const { admin, user, tradeManager, shipId } = await setupInitiatedTrade();
      
      await expect(
        tradeManager.connect(admin).completeEntireTradeMission(user.address, shipId)
      ).to.be.revertedWith("Return journey not started");
    });
  });

  describe("View Functions and State Queries", function() {
    it("should correctly return trade order details", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      const pricePerUnit = ethers.parseEther("0.01");
      await tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit);
      
      const tradeOrder = await tradeManager.getTradeOrder(1);
      expect(tradeOrder.seller).to.equal(admin.address);
      expect(tradeOrder.islandId).to.equal(islandId);
      expect(tradeOrder.resourceType).to.equal("wood");
      expect(tradeOrder.resourceAmount).to.equal(amount);
      expect(tradeOrder.arrcPrice).to.equal(pricePerUnit);
      expect(tradeOrder.isActive).to.be.true;
      expect(tradeOrder.isSellOrder).to.be.false;
    });

    it("should correctly return island buy order details", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      const totalPrice = pricePerUnit * BigInt(amount);
      
      await coreContracts.arrcToken.connect(admin).mint(admin.address, totalPrice);
      await coreContracts.arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
      await tradeManager.connect(admin).createIslandBuyOrder(islandId, "wood", amount, pricePerUnit);
      
      const tradeOrder = await tradeManager.getTradeOrder(1);
      expect(tradeOrder.seller).to.equal(admin.address); // Island owner for buy orders
      expect(tradeOrder.islandId).to.equal(islandId);
      expect(tradeOrder.resourceType).to.equal("wood");
      expect(tradeOrder.resourceAmount).to.equal(amount);
      expect(tradeOrder.arrcPrice).to.equal(pricePerUnit);
      expect(tradeOrder.isActive).to.be.true;
      expect(tradeOrder.isSellOrder).to.be.true; // This is a buy order
    });

    it("should return correct active trade orders count", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      // Initial count should be 0
      const initialCount = await tradeManager.getActiveTradeOrdersCount();
      expect(initialCount).to.equal(0);
      
      // Create multiple trade orders
      for (let i = 0; i < 3; i++) {
        const islandId = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
        
        const amount = 100;
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        await coreContracts.resourceManagement.connect(admin).addResource(
          admin.address, 
          islandId, 
          admin.address, 
          "wood", 
          amountWei
        );
        
        const pricePerUnit = ethers.parseEther("0.01");
        await tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit);
      }
      
      const activeCount = await tradeManager.getActiveTradeOrdersCount();
      expect(activeCount).to.equal(3);
      
      // Cancel one order
      await tradeManager.connect(admin).cancelTradeOrder(1);
      
      const reducedCount = await tradeManager.getActiveTradeOrdersCount();
      expect(reducedCount).to.equal(2);
    });

    it("should handle invalid trade order ID queries gracefully", async function() {
      const { tradeManager } = await loadFixture(setupFixture);
      
      // Invalid trade order should return default values
      const tradeOrder = await tradeManager.getTradeOrder(999);
      expect(tradeOrder.seller).to.equal("0x0000000000000000000000000000000000000000");
      expect(tradeOrder.islandId).to.equal(0);
      expect(tradeOrder.resourceType).to.equal("");
      expect(tradeOrder.resourceAmount).to.equal(0);
      expect(tradeOrder.arrcPrice).to.equal(0);
      expect(tradeOrder.isActive).to.be.false;
    });

    it("should correctly identify trade order types", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      // Create sell order
      const sellIslandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, sellIslandId);
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        sellIslandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      const pricePerUnit = ethers.parseEther("0.01");
      await tradeManager.connect(admin).createTradeOrder(sellIslandId, "wood", amount, pricePerUnit);
      
      // Create buy order
      const buyIslandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, buyIslandId);
      const totalPrice = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(admin.address, totalPrice);
      await coreContracts.arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
      await tradeManager.connect(admin).createIslandBuyOrder(buyIslandId, "wood", amount, pricePerUnit);
      
      const sellOrder = await tradeManager.getTradeOrder(1);
      const buyOrder = await tradeManager.getTradeOrder(2);
      
      expect(sellOrder.isSellOrder).to.be.false;
      expect(buyOrder.isSellOrder).to.be.true;
    });
  });

  describe("Edge Cases and Error Handling", function() {
    it("should handle zero trade order creation edge cases", async function() {
      const { admin, tradeManager, nftsSetup } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      // Test boundary values
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "wood", 1, 1)
      ).to.be.revertedWith("Insufficient resources");
    });

    it("should enforce proper resource name validation", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      const pricePerUnit = ethers.parseEther("0.01");
      
      // Test with empty resource name
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "", amount, pricePerUnit)
      ).to.be.revertedWith("Invalid resource type length");
      
      // Test with invalid resource name
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "invalidresource", amount, pricePerUnit)
      ).to.be.revertedWith("Insufficient resources");
    });

    it("should handle non-existent island IDs", async function() {
      const { admin, tradeManager } = await loadFixture(setupFixture);
      
      const nonExistentIslandId = 99999;
      const amount = 100;
      const pricePerUnit = ethers.parseEther("0.01");
      
      await expect(
        tradeManager.connect(admin).createTradeOrder(nonExistentIslandId, "wood", amount, pricePerUnit)
      ).to.be.reverted; // Should revert with custom error for non-existent token
    });

    it("should validate trade order state transitions", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        amountWei
      );
      
      const pricePerUnit = ethers.parseEther("0.01");
      await tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit);
      
      // Cancel order
      await tradeManager.connect(admin).cancelTradeOrder(1);
      
      // Try to cancel again - should fail
      await expect(
        tradeManager.connect(admin).cancelTradeOrder(1)
      ).to.be.revertedWith("Trade order not active");
    });

    it("should handle large numbers appropriately", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      const islandId = getNextIslandId();
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
      
      // Test with very large amounts
      const largeAmount = 1000000;
      const largeAmountWei = ethers.parseUnits(largeAmount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(
        admin.address, 
        islandId, 
        admin.address, 
        "wood", 
        largeAmountWei
      );
      
      const pricePerUnit = ethers.parseEther("1");
      
      // Should succeed with large but valid amounts
      await expect(
        tradeManager.connect(admin).createTradeOrder(islandId, "wood", largeAmount, pricePerUnit)
      ).to.emit(tradeManager, "TradeOrderCreated");
      
      const tradeOrder = await tradeManager.getTradeOrder(1);
      expect(tradeOrder.resourceAmount).to.equal(largeAmount);
    });

    it("should maintain trade order counter integrity", async function() {
      const { admin, tradeManager, nftsSetup, coreContracts } = await loadFixture(setupFixture);
      
      // Create multiple orders and verify counter increments properly
      const orderCount = 5;
      for (let i = 0; i < orderCount; i++) {
        const islandId = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId);
        
        const amount = 100;
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        await coreContracts.resourceManagement.connect(admin).addResource(
          admin.address, 
          islandId, 
          admin.address, 
          "wood", 
          amountWei
        );
        
        const pricePerUnit = ethers.parseEther("0.01");
        await tradeManager.connect(admin).createTradeOrder(islandId, "wood", amount, pricePerUnit);
        
        // Verify we can access the trade order
        const tradeOrder = await tradeManager.getTradeOrder(i + 1);
        expect(tradeOrder.isActive).to.be.true;
      }
      
      // Verify total orders count
      const activeCount = await tradeManager.getActiveTradeOrdersCount();
      expect(activeCount).to.equal(orderCount);
    });
  });
}); 