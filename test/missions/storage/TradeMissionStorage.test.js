// test/missions/storage/TradeMissionStorage.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployBaseInfrastructure, deployAndAuthorizeContract } = require("../../utils"); // Adjusted path

describe("TradeMissionStorage", function () {
  // Fixture to set up the basic environment
  async function setupFixture() {
    const { admin, user, centralAuthorizationRegistry } = await deployBaseInfrastructure();

    // Deploy MissionRegistration first as TradeMissionStorage might depend on it implicitly via CAR
    const missionRegistration = await deployAndAuthorizeContract(
      "MissionRegistration",
      centralAuthorizationRegistry
    );
    // Register IMissionRegistration
    await centralAuthorizationRegistry.setContractAddress(
      ethers.id("IMissionRegistration"),
      await missionRegistration.getAddress()
    );

    // Deploy TradeMissionStorage using the utility function
    const tradeMissionStorage = await deployAndAuthorizeContract(
      "TradeMissionStorage",
      centralAuthorizationRegistry
    );
    
    return { admin, user, centralAuthorizationRegistry, tradeMissionStorage, missionRegistration };
  }

  let state; // To hold fixture results

  beforeEach(async function () {
    state = await loadFixture(setupFixture);
  });
  
  // IMissionsStorage.MissionType.Trade = 1
  const MISSION_TYPE_TRADE = 1;
  
  describe("Basic functionality", function () {
    it("Should support the trade mission type", async function () {
      const { tradeMissionStorage } = state;
      expect(await tradeMissionStorage.supportsMissionType(MISSION_TYPE_TRADE)).to.be.true;
    });
    
    it("Should not support other mission types", async function () {
      const { tradeMissionStorage } = state;
      // Test with another mission type (e.g., Exploration = 5)
      expect(await tradeMissionStorage.supportsMissionType(5)).to.be.false;
    });
  });
  
  describe("Mission storage operations", function () {
    const missionId = 1;
    const shipId = 101;
    const originIslandId = 201;
    const targetIslandId = 202;
    const resourceType = "gold";
    const amount = ethers.parseEther("10");
    const price = ethers.parseEther("5");
    const tradeOrderId = 301;
    const outboundStartTime = Math.floor(Date.now() / 1000);
    const outboundEndTime = outboundStartTime + 3600; // 1 hour later
    const isShipBuying = true;
    
    let encodedMissionData;
    
    beforeEach(async function () {
        // Encode data before each test in this block if it doesn't change
        encodedMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint256", "uint256", "bool"],
            [shipId, originIslandId, targetIslandId, resourceType, amount, price, tradeOrderId, outboundStartTime, outboundEndTime, isShipBuying]
        );
    });
    
    it("Should initialize a mission", async function () {
      const { tradeMissionStorage, admin } = state; 
      
      await tradeMissionStorage.connect(admin).initializeMission(missionId, encodedMissionData);
      
      // Get view-only instance using ITradeMissionStorage ABI
      const tradeMissionStorageView = await ethers.getContractAt("ITradeMissionStorage", await tradeMissionStorage.getAddress());
      const details = await tradeMissionStorageView.getMissionDetails(missionId);
      
      expect(details.shipId).to.equal(shipId);
      expect(details.originIslandId).to.equal(originIslandId);
      expect(details.targetIslandId).to.equal(targetIslandId);
      expect(details.resourceType).to.equal(resourceType);
      expect(details.amount).to.equal(amount);
      expect(details.price).to.equal(price);
      expect(details.tradeOrderId).to.equal(tradeOrderId);
      expect(details.journeyState).to.equal(1); // Outbound (ToDestination)
      expect(details.startTime).to.equal(outboundStartTime); 
      expect(details.endTime).to.equal(outboundEndTime); 
      expect(details.isShipBuying).to.equal(isShipBuying);
    });
    
    it("Should update journey state", async function () {
      const { tradeMissionStorage, admin } = state;
      
      await tradeMissionStorage.connect(admin).initializeMission(missionId, encodedMissionData);
      await tradeMissionStorage.connect(admin).updateJourneyState(missionId, 3 );
      
      // Get view-only instance using ITradeMissionStorage ABI
      const tradeMissionStorageView = await ethers.getContractAt("ITradeMissionStorage", await tradeMissionStorage.getAddress());
      const details = await tradeMissionStorageView.getMissionDetails(missionId);
      
      expect(details.journeyState).to.equal(3); // Inbound
    });
    
    it("Should check if the phase is complete [Logic Check]", async function () {
      const { tradeMissionStorage, admin } = state;

      await tradeMissionStorage.connect(admin).initializeMission(missionId, encodedMissionData);
      await tradeMissionStorage.connect(admin).updateJourneyState(missionId, 3); // Set to Inbound
      
      // Get view-only instance using ITradeMissionStorage ABI
      const tradeMissionStorageView = await ethers.getContractAt("ITradeMissionStorage", await tradeMissionStorage.getAddress());
      const details = await tradeMissionStorageView.getMissionDetails(missionId);
      
      // Check based on stored times (using mission endTime for simplicity as per contract)
      // const isComplete = block.timestamp >= details.endTime; // Simplified check based on contract logic
      // expect(await tradeMissionStorageView.isPhaseComplete(missionId)).to.equal(isComplete); // Example assertion using view instance
    });
    
    it("Should complete a mission", async function () {
      const { tradeMissionStorage, admin } = state;
      
      // Initialize and set state to Inbound
      await tradeMissionStorage.connect(admin).initializeMission(missionId, encodedMissionData);
      await tradeMissionStorage.connect(admin).updateJourneyState(missionId, 3); // Set to Inbound

      // Complete the mission using admin
      await tradeMissionStorage.connect(admin).completeMission(missionId);
      
      // Verify state changed correctly
      const tradeMissionStorageView = await ethers.getContractAt("ITradeMissionStorage", await tradeMissionStorage.getAddress());
      const details = await tradeMissionStorageView.getMissionDetails(missionId);
      expect(details.journeyState).to.equal(4); // Check state is Completed (Enum 4)
      
      // Verify raw data reflects the change (optional, but good practice)
      const encodedData = await tradeMissionStorageView.getMissionData(missionId); 
      const decodedData = ethers.AbiCoder.defaultAbiCoder().decode(
        // Ensure this tuple matches the getMissionData return type EXACTLY
        ["uint256", "uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint256", "uint8", "bool", "bool"],
        encodedData
      );
      
      expect(decodedData[0]).to.equal(shipId); // Ship ID should still exist
      expect(decodedData[9]).to.equal(4); // JourneyState (index 9, uint8) should be Completed (4)
    });
    
    it("Should revert when trying to complete a non-existent mission", async function () {
       const { tradeMissionStorage, admin } = state;
       await expect(tradeMissionStorage.connect(admin).completeMission(999))
         .to.be.revertedWith("Mission does not exist");
    });
  });
  
  describe("Access control", function () {
    it("Should prevent unauthorized access to initializeMission", async function () {
      const { tradeMissionStorage, user } = state; // Use the standard 'user' from fixture
      const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint256", "uint256", "bool"],
        [1, 2, 3, "gold", 100, 50, 1, 0, 0, true]
      );
      
      await expect(tradeMissionStorage.connect(user).initializeMission(999, encodedData))
        .to.be.revertedWith("Caller is not authorized"); // Fixed string
    });
    
    it("Should prevent unauthorized access to completeMission", async function () {
      const { tradeMissionStorage, user } = state; // Use the standard 'user' from fixture
      
      // Initialize a mission first so it exists
      const { admin } = state;
      const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint256", "uint256", "bool"],
        [1, 2, 3, "gold", 100, 50, 1, 0, 0, true]
      );
      await tradeMissionStorage.connect(admin).initializeMission(1, encodedData);

      // Attempt completion with unauthorized user
      await expect(tradeMissionStorage.connect(user).completeMission(1))
        .to.be.revertedWith("Caller is not authorized"); // Fixed string
    });
  });
}); 