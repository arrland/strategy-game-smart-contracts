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
  // Reset counter for each test to ensure isolation
  let testCounter;
  
  beforeEach(() => {
    testCounter = 0;
  });
  
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
    
    // Also approve FeeManagement for ARRC burning (needed for ship staking)
    const feeManagementAddress = await centralAuthorizationRegistry.getContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IFeeManagement"))
    );
    await coreContracts.arrcToken.connect(user).approve(feeManagementAddress, requiredAmount);
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
      
      // Setup resources
      const resourceType = "wood";
      const amount = 100;
      await coreContracts.islandStorage.connect(admin).addResource(originIsland, user.address, resourceType, amount);
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
      
      // Get end time from MissionsManager instead of calling getMissionDetails on the mission contract directly
      const missionInfo = await missionsManager.missions(missionId);
      const endTime = missionInfo.endTime;
      
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
      const missionInfoAfter = await missionsManager.missions(missionId);
      expect(missionInfoAfter.isCompleted).to.be.true;
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
      
      // Get mission end time from MissionsManager instead of specialized storage
      const missionInfo = await missionsManager.missions(missionId);
      const endTime = missionInfo.endTime;
      
      await time.increaseTo(Number(endTime));
      
      // Advance mission - should move to returning phase for trade missions
      const advanceTx = await missionsManager.connect(user).completeMission(shipId);
      
      // Verify mission is still active but in returning phase (for trade missions)
      const missionInfoAfter = await missionsManager.missions(missionId);
      expect(missionInfoAfter.isActive).to.be.true; // Should still be active during return journey
      expect(await missionsManager.shipToActiveMission(shipId)).to.equal(missionId);
    });
  });

  describe("getMissionDetails Integration", function () {
    it("should correctly delegate getMissionDetails to ResourceTransferMission", async function () {
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
      
      // Get mission details via MissionsManager - this should work
      const missionDetailsBytes = await missionsManager.getMissionDetails(missionId);
      
      // Verify we can decode the returned data
      const missionDetails = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint8", "bool"],
        missionDetailsBytes
      );
      
      // Verify the details are correct
      expect(missionDetails[0]).to.equal(shipId); // shipId
      expect(missionDetails[1]).to.equal(originIsland); // originIslandId  
      expect(missionDetails[2]).to.equal(destIsland); // targetIslandId
      expect(missionDetails[3]).to.equal(resourceType); // resourceType
      expect(missionDetails[4]).to.equal(amount); // amount
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
      
      // Get mission details via MissionsManager - this should work now with proper mission tracking
      const missionDetailsBytes = await missionsManager.getMissionDetails(missionId);
      
      // Verify we can decode the returned data (TradeMission returns different structure)
      const missionDetails = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint256", "uint8", "bool", "bool"],
        missionDetailsBytes
      );
      
      // Verify the details are correct
      expect(missionDetails[0]).to.equal(shipId); // shipId
      expect(missionDetails[1]).to.equal(originIsland); // originIslandId
      expect(missionDetails[2]).to.equal(destIsland); // targetIslandId  
      expect(missionDetails[3]).to.equal(tradeOrderId); // tradeOrderId
      expect(missionDetails[4]).to.equal(resourceType); // resourceType
      expect(missionDetails[5]).to.equal(amount); // amount
    });
  });

  describe("Complex End-to-End User Journey Integration Test", function () {
    it("should handle complex multi-user trade mission chain", async function () {
      const { admin, user, otherAccount, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, missionRequirements, tradeManager, tradeType } = await loadFixture(setupFixture);
      
      // Setup multiple users and their resources
      const userA = user;
      const userB = otherAccount;
      const userC = admin; // Admin acts as third user
      
      const shipIdC = getNextShipId();
      const islandIdA = getNextIslandId();
      const islandIdB = getNextIslandId();
      const islandIdC = getNextIslandId();
      
      // Setup entities for each user
      await nftsSetup.shipNFT.connect(admin).safeMint(userC.address, shipIdC);
      await nftsSetup.islandNft.connect(admin).mintSpecific(userA.address, islandIdA);
      await nftsSetup.islandNft.connect(admin).mintSpecific(userB.address, islandIdB);
      await nftsSetup.islandNft.connect(admin).mintSpecific(userC.address, islandIdC);
      
      // Mint additional pirate for userC
      const captainPirateIdC = captainPirateId + 1;
      await nftsSetup.genesisPiratesNFT.connect(admin).mint(userC.address, captainPirateIdC);
      
      // Setup ARRC for userC's ship staking fees
      await setupArrcAllowances(userC, admin, coreContracts, centralAuthorizationRegistry, ethers.parseEther("1000"));
      
      await setupShipForMissionTesting(userC, admin, coreContracts, nftsSetup, shipIdC, captainPirateIdC, islandIdC);
      
      // Setup resources and trade orders
      const resourceType = "wood";
      const amount = 100;
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      
      // UserA has wood to sell
      await coreContracts.resourceManagement.connect(admin).addResource(userA.address, islandIdA, userA.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      
      // Setup ARRC for userC to buy wood
      await setupArrcAllowances(userC, admin, coreContracts, centralAuthorizationRegistry, requiredARRC);
      
      // UserA creates trade order (selling wood)
      await tradeManager.connect(userA).createTradeOrder(islandIdA, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandIdA, tradeType, true);
      
      console.log("=== PHASE 1: User C trades with User A ===");
      
      // Phase 1: UserC's ship goes to UserA's island to buy wood
      const tradeOrderId = 1;
      const encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandIdC, islandIdA, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      const tradeTx = await missionsManager.connect(userC).startMission(shipIdC, tradeType, encodedMissionData);
      const tradeReceipt = await tradeTx.wait();
      const missionId = extractMissionIdFromReceipt(tradeReceipt, await missionsManager.getAddress());
      
      // Verify mission can be queried
      const missionDetailsBytes = await missionsManager.getMissionDetails(missionId);
      
      // Verify the trade mission was set up correctly
      const missionDetails = ethers.AbiCoder.defaultAbiCoder().decode(
        ["uint256", "uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint256", "uint8", "bool", "bool"],
        missionDetailsBytes
      );
      
      expect(missionDetails[0]).to.equal(shipIdC); // shipId
      expect(missionDetails[1]).to.equal(islandIdC); // originIslandId
      expect(missionDetails[2]).to.equal(islandIdA); // targetIslandId
      expect(missionDetails[4]).to.equal(resourceType); // resourceType
      expect(missionDetails[5]).to.equal(amount); // amount
    });
  });
}); 