const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  setupCoreGameContracts,
  setupShipForMissionTesting,
  extractMissionIdFromReceipt,
  setupMissionInfrastructure,
  setupNFTsForStaking,
  deployBaseInfrastructure,
  deployAndRegisterContract,
  setupShipMetadata,
  setupPirateSkills,
} = require("../utils");

describe("MissionsManager Integration Tests (TASK-TEST-MISSIONS.4)", function () {
  let testCounter = 0;
  
  function getNextShipId() {
    return 100 + testCounter++;
  }
  
  function getNextIslandId() {
    return 200 + testCounter++;
  }

  async function setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, requiredAmount = ethers.parseEther("100")) {
    // Mint ARRC tokens to user if they don't have enough
    const userBalance = await coreContracts.arrcToken.balanceOf(user.address);
    if (userBalance < requiredAmount) {
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredAmount);
    }
    
    // Get ArrcLocking contract address and approve it for ARRC transfers
    const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
    );
    await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredAmount);
    
    // Also approve TradeManager for ARRC transfers
    const tradeManagerAddress = await centralAuthorizationRegistry.getContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("ITradeManager"))
    );
    await coreContracts.arrcToken.connect(user).approve(tradeManagerAddress, requiredAmount);
  }

  async function setupFixture() {
    const [admin, user, otherAccount] = await ethers.getSigners();
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
    await centralAuthorizationRegistry.initialize(admin.address);
    await centralAuthorizationRegistry.addAuthorizedContract(admin.address);

    const nftsSetup = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);
    
    // Deploy core game contracts with real mission storage
    const coreContracts = await setupCoreGameContracts(admin, user, centralAuthorizationRegistry, nftsSetup, {
      deployRealMissionRequirements: false, 
      deployRealMissionsStorage: true
    });

    // Deploy MarketPlaceStorage for TradeManager
    const MarketPlaceStorage = await ethers.getContractFactory("MarketPlaceStorage");
    const marketPlaceStorage = await MarketPlaceStorage.deploy(
        centralAuthorizationRegistry.target,
        nftsSetup.genesisIslandsAddress,
        true
    );
    await marketPlaceStorage.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(marketPlaceStorage.target);
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IMarketPlaceStorage")),
        marketPlaceStorage.target
    );

    const { missionsManager, missionRequirements, tradeManager } = coreContracts;

    // Setup ResourceTransferMission infrastructure
    const { missionContract: resourceTransferMission, missionStorage: resourceTransferStorage, missionType: resourceTransferType, missionRegistration, missionFactory } = 
      await setupMissionInfrastructure(
        admin,
        centralAuthorizationRegistry,
        coreContracts,
        "ResourceTransferMission",
        "ResourceTransfer",
        "ResourceTransferMissionStorage"
      );

    // Setup TradeMission infrastructure - reuse the same MissionFactory and MissionRegistration
    const TradeMissionFactory = await ethers.getContractFactory("TradeMission");
    const tradeMission = await TradeMissionFactory.deploy(centralAuthorizationRegistry.target);
    await tradeMission.waitForDeployment();
    
    // Deploy TradeMissionStorage
    const TradeMissionStorageFactory = await ethers.getContractFactory("TradeMissionStorage");
    const tradeMissionStorage = await TradeMissionStorageFactory.deploy(centralAuthorizationRegistry.target);
    await tradeMissionStorage.waitForDeployment();
    
    // Register TradeMission in the same MissionFactory and MissionsStorage
    const tradeType = await missionRegistration.getMissionTypeByName("Trade");
    await missionFactory.connect(admin).registerMissionContract(tradeType, tradeMission.target);
    await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(tradeMission.target);
    
    // Register TradeMission storage
    await coreContracts.missionsStorage.connect(admin).registerMissionType(tradeType, "Trade");
    await coreContracts.missionsStorage.connect(admin).registerSpecializedStorage(tradeType, tradeMissionStorage.target);

    // Register missions for TradeManager integration
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("ITradeMission")),
        tradeMission.target
    );
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IResourceTransferMission")),
        resourceTransferMission.target
    );

    // Deploy and register MockArrcLocking
    const MockArrcLocking = await ethers.getContractFactory("MockArrcLocking");
    const arrcLocking = await MockArrcLocking.deploy(centralAuthorizationRegistry.target);
    await arrcLocking.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(arrcLocking.target);
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking")),
        arrcLocking.target
    );

    // Register ARRC token for TradeManager
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcToken")),
        coreContracts.arrcToken.target
    );

    // Deploy and register MissionResourceHandler
    const missionResourceHandler = await deployAndRegisterContract(
        "MissionResourceHandler",
        centralAuthorizationRegistry,
        "IMissionResourceHandler" 
    );
    
    // Setup resource requirements
    const { resourceSpendManagement, resourceTypeManager } = coreContracts;
    
    const allResourceTypes = ["citrus", "fish", "wood", "stone", "iron", "gold", "silver", "coal", "rum"];
    
    for (const resourceName of allResourceTypes) {
        try {
            await resourceTypeManager.connect(admin).addResourceType(resourceName, true, true);
        } catch (error) {
            // Resource type already exists, ignore
        }
        
        try {
            await resourceSpendManagement.connect(admin).setResourceRequirements(
                resourceName,
                [],
                []
            );
        } catch (error) {
            console.log(`Failed to set requirements for ${resourceName}:`, error.message);
        }
    }

    // Setup test pirate and ship
    const captainPirateId = 500;
    await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId);
    
    return {
      admin,
      user,
      otherAccount,
      centralAuthorizationRegistry,
      coreContracts,
      nftsSetup,
      captainPirateId,
      missionsManager,
      missionRequirements,
      tradeManager,
      resourceTransferMission,
      tradeMission,
      resourceTransferStorage,
      tradeMissionStorage,
      resourceTransferType,
      tradeType,
      arrcLocking,
      marketPlaceStorage
    };
  }

  describe("ResourceTransferMission Integration", function () {
    it("should start ResourceTransferMission successfully via MissionsManager", async function () {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, resourceTransferType } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const originIsland = getNextIslandId();
      const destIsland = getNextIslandId();
      
      // Setup ship and islands
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, destIsland);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
      
      // Add resources to origin island
      const resourceType = "wood";
      const amount = 100;
      await coreContracts.islandStorage.connect(admin).addResource(originIsland, user.address, resourceType, amount);
      
      // Set island validity
      await missionRequirements.setIslandValidity(destIsland, resourceTransferType, true);
      
      // Encode mission data
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
        [originIsland, destIsland, resourceType, amount, false, "citrus", "fish"]
      );
      
      // Start mission via MissionsManager
      const tx = await missionsManager.connect(user).startMission(shipId, resourceTransferType, encodedMissionData);
      const receipt = await tx.wait();
      
      // Extract mission ID
      const missionId = extractMissionIdFromReceipt(receipt, await missionsManager.getAddress());
      
      // Verify MissionStarted event from MissionsManager
      await expect(tx)
        .to.emit(missionsManager, "MissionStarted")
        .withArgs(missionId, shipId, resourceTransferType);
      
      // Verify underlying ResourceTransferMission was called and mission is active
      const missionInfo = await missionsManager.missions(missionId);
      expect(missionInfo.isActive).to.be.true;
      expect(missionInfo.shipId).to.equal(shipId);
      expect(missionInfo.missionType).to.equal(resourceTransferType);
      expect(missionInfo.isCompleted).to.be.false;
      
      // Verify ship is locked to this mission
      expect(await missionsManager.shipToActiveMission(shipId)).to.equal(missionId);
    });

    it("should complete ResourceTransferMission successfully via MissionsManager", async function () {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, resourceTransferType } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const originIsland = getNextIslandId();
      const destIsland = getNextIslandId();
      
      // Setup and start mission
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, destIsland);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
      
      const resourceType = "wood";
      const amount = 100;
      await coreContracts.islandStorage.connect(admin).addResource(originIsland, user.address, resourceType, amount);
      await missionRequirements.setIslandValidity(destIsland, resourceTransferType, true);
      
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
        [originIsland, destIsland, resourceType, amount, false, "citrus", "fish"]
      );
      
      const startTx = await missionsManager.connect(user).startMission(shipId, resourceTransferType, encodedMissionData);
      const startReceipt = await startTx.wait();
      const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
      
      // Get mission details to find end time
      const missionDetailsBytes = await missionsManager.getMissionDetails(missionId);
      const missionDetails = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint8", "bool"],
        missionDetailsBytes
      );
      const endTime = missionDetails[6]; // endTime is 7th element (index 6)
      
      // Advance time to mission completion
      await time.increaseTo(Number(endTime));
      
      // Complete mission via MissionsManager
      const destResourcesBefore = await coreContracts.islandStorage.getResourceBalance(destIsland, resourceType);
      
      const completeTx = await missionsManager.connect(user).completeMission(shipId);
      
      // Verify MissionCompleted event from MissionsManager
      await expect(completeTx)
        .to.emit(missionsManager, "MissionCompleted")
        .withArgs(missionId, shipId, resourceTransferType);
      
      // Verify mission is completed and ship is freed
      const missionInfo = await missionsManager.missions(missionId);
      expect(missionInfo.isCompleted).to.be.true;
      expect(await missionsManager.shipToActiveMission(shipId)).to.equal(0);
      
      // Verify resources were transferred
      const destResourcesAfter = await coreContracts.islandStorage.getResourceBalance(destIsland, resourceType);
      expect(destResourcesAfter).to.be.gt(destResourcesBefore);
    });

    it("should handle MissionsManager error conditions for ResourceTransferMission", async function () {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, resourceTransferType } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const originIsland = getNextIslandId();
      const destIsland = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, destIsland);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
      
      const resourceType = "wood";
      const amount = 100;
      await coreContracts.islandStorage.connect(admin).addResource(originIsland, user.address, resourceType, amount);
      await missionRequirements.setIslandValidity(destIsland, resourceTransferType, true);
      
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
        [originIsland, destIsland, resourceType, amount, false, "citrus", "fish"]
      );
      
      // Start first mission
      await missionsManager.connect(user).startMission(shipId, resourceTransferType, encodedMissionData);
      
      // Try to start second mission with same ship - should fail
      await expect(
        missionsManager.connect(user).startMission(shipId, resourceTransferType, encodedMissionData)
      ).to.be.revertedWithCustomError(missionsManager, "ShipAlreadyOnMission");
      
      // Try to complete mission before time elapsed - should fail
      await expect(
        missionsManager.connect(user).completeMission(shipId)
      ).to.be.revertedWith("Mission not yet complete");
    });
  });

  describe("TradeMission Integration", function () {
    it("should start TradeMission successfully via MissionsManager", async function () {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, tradeManager, tradeType } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const originIsland = getNextIslandId();
      const destIsland = getNextIslandId();
      
      // Setup ship and islands
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
      
      // Setup trade order
      const resourceType = "wood";
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(destIsland, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(destIsland, tradeType, true);
      
      // Encode trade mission data
      const tradeOrderId = 1;
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [originIsland, destIsland, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      // Start trade mission via MissionsManager
      const tx = await missionsManager.connect(user).startMission(shipId, tradeType, encodedMissionData);
      const receipt = await tx.wait();
      
      // Extract mission ID
      const missionId = extractMissionIdFromReceipt(receipt, await missionsManager.getAddress());
      
      // Verify MissionStarted event from MissionsManager
      await expect(tx)
        .to.emit(missionsManager, "MissionStarted")
        .withArgs(missionId, shipId, tradeType);
      
      // Verify underlying TradeMission effects
      const missionInfo = await missionsManager.missions(missionId);
      expect(missionInfo.isActive).to.be.true;
      expect(missionInfo.shipId).to.equal(shipId);
      expect(missionInfo.missionType).to.equal(tradeType);
      expect(await missionsManager.shipToActiveMission(shipId)).to.equal(missionId);
    });

    it("should advance TradeMission successfully via MissionsManager", async function () {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, tradeManager, tradeType, tradeMissionStorage } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const originIsland = getNextIslandId();
      const destIsland = getNextIslandId();
      
      // Setup and start trade mission
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
      
      const resourceType = "wood";
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(destIsland, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(destIsland, tradeType, true);
      
      const tradeOrderId = 1;
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [originIsland, destIsland, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      const startTx = await missionsManager.connect(user).startMission(shipId, tradeType, encodedMissionData);
      const startReceipt = await startTx.wait();
      const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
      
      // Get mission details and advance to outbound completion
      const missionDetails = await tradeMissionStorage.getMissionDetails(missionId);
      const endTime = missionDetails.endTime;
      
      await time.increaseTo(Number(endTime));
      
      // Complete outbound journey via MissionsManager
      const advanceTx = await missionsManager.connect(user).completeMission(shipId);
      
      // Verify mission advanced to returning state
      const missionDetailsAfter = await tradeMissionStorage.getMissionDetails(missionId);
      expect(missionDetailsAfter.journeyState).to.equal(3); // Returning state
      
      // Mission should still be active for return journey
      const missionInfo = await missionsManager.missions(missionId);
      expect(missionInfo.isActive).to.be.true;
      expect(missionInfo.isCompleted).to.be.false;
    });
  });

  describe("getMissionDetails Integration", function () {
    it("should correctly delegate getMissionDetails to ResourceTransferMission", async function () {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, resourceTransferType } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const originIsland = getNextIslandId();
      const destIsland = getNextIslandId();
      
      // Setup and start resource transfer mission
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, destIsland);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
      
      const resourceType = "wood";
      const amount = 100;
      await coreContracts.islandStorage.connect(admin).addResource(originIsland, user.address, resourceType, amount);
      await missionRequirements.setIslandValidity(destIsland, resourceTransferType, true);
      
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
        [originIsland, destIsland, resourceType, amount, false, "citrus", "fish"]
      );
      
      const startTx = await missionsManager.connect(user).startMission(shipId, resourceTransferType, encodedMissionData);
      const startReceipt = await startTx.wait();
      const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
      
      // Get mission details via MissionsManager and decode properly
      const missionDetailsBytes = await missionsManager.getMissionDetails(missionId);
      const missionDetails = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint8", "bool"],
        missionDetailsBytes
      );
      
      // Verify details are correctly returned
      expect(missionDetails[0]).to.equal(shipId); // shipId
      expect(missionDetails[1]).to.equal(originIsland); // originIslandId
      expect(missionDetails[2]).to.equal(destIsland); // destinationIslandId
      // endTime and other details should be properly set
      expect(missionDetails[6]).to.be.gt(0); // endTime should be set
    });

    it("should correctly delegate getMissionDetails to TradeMission", async function () {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, tradeManager, tradeType } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const originIsland = getNextIslandId();
      const destIsland = getNextIslandId();
      
      // Setup and start trade mission
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
      
      const resourceType = "wood";
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(destIsland, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(destIsland, tradeType, true);
      
      const tradeOrderId = 1;
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [originIsland, destIsland, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      const startTx = await missionsManager.connect(user).startMission(shipId, tradeType, encodedMissionData);
      const startReceipt = await startTx.wait();
      const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
      
      // Get mission details via MissionsManager and decode properly
      const missionDetailsBytes = await missionsManager.getMissionDetails(missionId);
      const missionDetails = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "uint256", "bool", "bool", "uint256"],
        missionDetailsBytes
      );
      
      // Verify trade mission details are correctly returned (using base format)
      expect(missionDetails[0]).to.equal(shipId); // shipId
      expect(missionDetails[1]).to.equal(tradeType); // missionType  
      expect(missionDetails[4]).to.equal(true); // isActive
    });
  });

  describe("Complex End-to-End User Journey Integration Test", function () {
    it("should handle complex multi-user trade mission chain", async function () {
      const { admin, user, otherAccount, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, tradeManager, tradeType } = await loadFixture(setupFixture);
      
      // Setup Users and Resources
      const userShipId = getNextShipId();
      const userOriginIsland = getNextIslandId();
      const userAIsland = getNextIslandId();  // User A sells wood
      const userBIsland = getNextIslandId();  // User B buys wood
      
      // User A (admin) owns island with wood to sell
      // User B (otherAccount) wants to buy wood
      // User C (user) is the ship captain doing trades
      
      // Setup User C's ship
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, userShipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, userOriginIsland);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, userAIsland);  // User A
      await nftsSetup.islandNft.connect(admin).mintSpecific(otherAccount.address, userBIsland);  // User B
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, userShipId, captainPirateId, userOriginIsland);
      
      // User A sets up wood for sale
      const woodAmount = 200;
      const woodAmountWei = ethers.parseUnits(woodAmount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, userAIsland, admin.address, "wood", woodAmountWei);
      
      const woodPrice = ethers.parseEther("0.01");
      const woodTotalPrice = woodPrice * BigInt(woodAmount);
      
      // User C gets ARRC for buying wood
      await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, woodTotalPrice);
      
      // User A creates sell order for wood
      await tradeManager.connect(admin).createTradeOrder(userAIsland, "wood", woodAmount, woodPrice);
      await missionRequirements.setIslandValidity(userAIsland, tradeType, true);
      
      // PHASE 1: User C buys wood from User A
      console.log("=== PHASE 1: User C trades with User A ===");
      
      const tradeOrderId1 = 1;
      const encodedMissionData1 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [userOriginIsland, userAIsland, "wood", woodAmount, tradeOrderId1, "citrus", "fish"]
      );
      
      // Start first trade mission
      const startTx1 = await missionsManager.connect(user).startMission(userShipId, tradeType, encodedMissionData1);
      const startReceipt1 = await startTx1.wait();
      const missionId1 = extractMissionIdFromReceipt(startReceipt1, await missionsManager.getAddress());
      
      // Verify User C's ship is locked
      expect(await missionsManager.shipToActiveMission(userShipId)).to.equal(missionId1);
      
      // Complete outbound journey (User C arrives at User A's island)
      const missionDetails1Bytes = await missionsManager.getMissionDetails(missionId1);
      const missionDetails1 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "uint256", "bool", "bool", "uint256"],
        missionDetails1Bytes
      );
      const endTime1 = missionDetails1[3]; // endTime
      await time.increaseTo(Number(endTime1));
      
      await missionsManager.connect(user).completeMission(userShipId);
      
      // Complete return journey (User C returns with wood)
      const missionDetails1AfterBytes = await missionsManager.getMissionDetails(missionId1);
      const missionDetails1After = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "uint256", "bool", "bool", "uint256"],
        missionDetails1AfterBytes
      );
      const returnEndTime1 = missionDetails1After[3];
      await time.increaseTo(Number(returnEndTime1));
      
      const userWoodBefore = await coreContracts.islandStorage.getResourceBalance(userOriginIsland, "wood");
      await missionsManager.connect(user).completeMission(userShipId);
      
      // Verify User C now has wood on their origin island
      const userWoodAfter = await coreContracts.islandStorage.getResourceBalance(userOriginIsland, "wood");
      expect(userWoodAfter).to.be.gt(userWoodBefore);
      
      // Verify ship is freed
      expect(await missionsManager.shipToActiveMission(userShipId)).to.equal(0);
      
      console.log("=== PHASE 1 COMPLETED: User C successfully acquired wood ===");
      
      // PHASE 2: User B creates buy order, User C sells wood to User B
      console.log("=== PHASE 2: User C sells wood to User B ===");
      
      // User B needs ARRC to buy wood from ships
      const buyOrderPrice = ethers.parseEther("0.02"); // Higher price for User B's buy order
      const buyOrderAmount = 100; // User B wants 100 wood
      const buyOrderTotalPrice = buyOrderPrice * BigInt(buyOrderAmount);
      
      await coreContracts.arrcToken.connect(admin).mint(otherAccount.address, buyOrderTotalPrice);
      await coreContracts.arrcToken.connect(otherAccount).approve(tradeManager.target, buyOrderTotalPrice);
      
      // User B creates island buy order
      await tradeManager.connect(otherAccount).createIslandBuyOrder(userBIsland, "wood", buyOrderAmount, buyOrderPrice);
      await missionRequirements.setIslandValidity(userBIsland, tradeType, true);
      
      // User C prepares to sell wood (add wood to ship storage for sell order)
      const shipStorageAddress = await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage")));
      const sellWoodAmount = ethers.parseUnits(buyOrderAmount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, userShipId, user.address, "wood", sellWoodAmount);
      
      // Add food and RUM for second mission
      const foodAmount = ethers.parseUnits("50", 18);
      const rumAmount = ethers.parseUnits("10", 18);
      await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, userShipId, user.address, "citrus", foodAmount);
      await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, userShipId, user.address, "fish", foodAmount);
      await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, userShipId, user.address, "rum", rumAmount);
      
      const tradeOrderId2 = 2;
      const encodedMissionData2 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [userOriginIsland, userBIsland, "wood", buyOrderAmount, tradeOrderId2, "citrus", "fish"]
      );
      
      // Start second trade mission (selling to User B)
      const userArrcBefore = await coreContracts.arrcToken.balanceOf(user.address);
      
      const startTx2 = await missionsManager.connect(user).startMission(userShipId, tradeType, encodedMissionData2);
      const startReceipt2 = await startTx2.wait();
      const missionId2 = extractMissionIdFromReceipt(startReceipt2, await missionsManager.getAddress());
      
      // Complete outbound journey (User C arrives at User B's island)
      const missionDetails2Bytes = await missionsManager.getMissionDetails(missionId2);
      const missionDetails2 = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "uint256", "bool", "bool", "uint256"],
        missionDetails2Bytes
      );
      const endTime2 = missionDetails2[3];
      await time.increaseTo(Number(endTime2));
      
      await missionsManager.connect(user).completeMission(userShipId);
      
      // Complete return journey (User C returns with ARRC payment)
      const missionDetails2AfterBytes = await missionsManager.getMissionDetails(missionId2);
      const missionDetails2After = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "uint256", "bool", "bool", "uint256"],
        missionDetails2AfterBytes
      );
      const returnEndTime2 = missionDetails2After[3];
      await time.increaseTo(Number(returnEndTime2));
      
      await missionsManager.connect(user).completeMission(userShipId);
      
      // Verify User C received ARRC payment
      const userArrcAfter = await coreContracts.arrcToken.balanceOf(user.address);
      expect(userArrcAfter).to.be.gt(userArrcBefore);
      
      // Verify ship is freed again
      expect(await missionsManager.shipToActiveMission(userShipId)).to.equal(0);
      
      console.log("=== PHASE 2 COMPLETED: User C successfully sold wood for ARRC ===");
      
      // Verify state changes throughout the journey
      const finalMission1 = await missionsManager.missions(missionId1);
      const finalMission2 = await missionsManager.missions(missionId2);
      
      expect(finalMission1.isCompleted).to.be.true;
      expect(finalMission2.isCompleted).to.be.true;
      expect(finalMission1.shipId).to.equal(userShipId);
      expect(finalMission2.shipId).to.equal(userShipId);
      
      console.log("=== COMPLEX END-TO-END JOURNEY COMPLETED SUCCESSFULLY ===");
    });
  });
}); 