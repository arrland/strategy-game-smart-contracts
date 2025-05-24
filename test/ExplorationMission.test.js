// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// describe("ExplorationMission", function () {
//   let centralAuthRegistry;
//   let missionsStorage;
//   let missionFactory;
//   let explorationMissionStorage;
//   let explorationMission;
//   let shipStorage;
//   let islandStorage;
//   let owner;
//   let player;
  
//   const MISSION_TYPE_EXPLORATION = 5;
//   const shipId = 1;
//   const islandId = 100;
//   const targetIslandId = 200;

//   before(async function () {
//     [owner, player] = await ethers.getSigners();
    
//     // Deploy central authorization registry
//     const CentralAuthRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
//     centralAuthRegistry = await CentralAuthRegistry.deploy();
//     await centralAuthRegistry.deployed();
    
//     // Deploy mock contracts
//     const MockShipStorage = await ethers.getContractFactory("MockShipStorage");
//     shipStorage = await MockShipStorage.deploy();
//     await shipStorage.deployed();
    
//     const MockIslandStorage = await ethers.getContractFactory("MockIslandStorage");
//     islandStorage = await MockIslandStorage.deploy();
//     await islandStorage.deployed();
    
//     const MockMissionValidator = await ethers.getContractFactory("MockMissionValidator");
//     const missionValidator = await MockMissionValidator.deploy();
//     await missionValidator.deployed();

//     const MockMissionTravelCalculator = await ethers.getContractFactory("MockMissionTravelCalculator");
//     const missionTravelCalculator = await MockMissionTravelCalculator.deploy();
//     await missionTravelCalculator.deployed();

//     const MockMissionResourceHandler = await ethers.getContractFactory("MockMissionResourceHandler");
//     const missionResourceHandler = await MockMissionResourceHandler.deploy();
//     await missionResourceHandler.deployed();

//     // Register contracts in the registry
//     await centralAuthRegistry.registerContract(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IShipStorage")), shipStorage.address);
//     await centralAuthRegistry.registerContract(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IIslandStorage")), islandStorage.address);
//     await centralAuthRegistry.registerContract(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IMissionValidator")), missionValidator.address);
//     await centralAuthRegistry.registerContract(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IMissionTravelCalculator")), missionTravelCalculator.address);
//     await centralAuthRegistry.registerContract(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IMissionResourceHandler")), missionResourceHandler.address);
    
//     // Deploy missions storage
//     const MissionsStorage = await ethers.getContractFactory("MissionsStorage");
//     missionsStorage = await MissionsStorage.deploy(centralAuthRegistry.address);
//     await missionsStorage.deployed();
    
//     // Deploy mission factory
//     const MissionFactory = await ethers.getContractFactory("MissionFactory");
//     missionFactory = await MissionFactory.deploy(centralAuthRegistry.address);
//     await missionFactory.deployed();
    
//     // Register MissionsStorage in the registry
//     await centralAuthRegistry.registerContract(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IMissionsStorage")), missionsStorage.address);
    
//     // Register MissionFactory in the registry
//     await centralAuthRegistry.registerContract(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("IMissionFactory")), missionFactory.address);
    
//     // Deploy specialized storage for exploration
//     const ExplorationMissionStorage = await ethers.getContractFactory("ExplorationMissionStorage");
//     explorationMissionStorage = await ExplorationMissionStorage.deploy(centralAuthRegistry.address);
//     await explorationMissionStorage.deployed();
    
//     // Register specialized storage in missions storage
//     await missionsStorage.registerSpecializedStorage(MISSION_TYPE_EXPLORATION, explorationMissionStorage.address);
    
//     // Deploy exploration mission
//     const ExplorationMission = await ethers.getContractFactory("ExplorationMission");
//     explorationMission = await ExplorationMission.deploy(centralAuthRegistry.address);
//     await explorationMission.deployed();
    
//     // Register exploration mission in mission factory
//     await missionFactory.registerMissionContract(MISSION_TYPE_EXPLORATION, explorationMission.address);
    
//     // Setup mock data
//     await missionValidator.setIsLocked(shipId, false);
//     await missionValidator.setShipLevel(shipId, 5);
//     await missionValidator.setShipHomeIsland(shipId, islandId);
    
//     // Travel time will be 3600 seconds (1 hour)
//     await missionTravelCalculator.setTravelTime(islandId, targetIslandId, shipId, 3600);
//   });

//   describe("Exploration Mission Lifecycle", function () {
//     it("Should start an exploration mission", async function () {
//       // Encode mission data (targetIslandId)
//       const missionData = ethers.utils.defaultAbiCoder.encode(["uint256"], [targetIslandId]);
      
//       // Start the mission
//       const tx = await explorationMission.startMission(shipId, missionData);
//       const receipt = await tx.wait();
      
//       // Get events
//       const events = receipt.events.filter(e => e.event === "ExplorationStarted");
//       expect(events.length).to.equal(1);
      
//       // Check mission was started in storage
//       expect(await missionsStorage.isOnMission(shipId)).to.equal(true);
//       expect(await missionsStorage.getMissionType(shipId)).to.equal(MISSION_TYPE_EXPLORATION);
//     });
    
//     it("Should complete an exploration mission", async function () {
//       // Time travel to complete the mission (13 hours later - exploration takes 12h + 1h travel)
//       await ethers.provider.send("evm_increaseTime", [13 * 60 * 60]);
//       await ethers.provider.send("evm_mine");
      
//       // Complete the mission
//       const tx = await explorationMission.completeMission(shipId);
//       const receipt = await tx.wait();
      
//       // Get events
//       const events = receipt.events.filter(e => e.event === "ExplorationCompleted");
//       expect(events.length).to.equal(1);
      
//       // Check mission was completed in storage
//       expect(await missionsStorage.isOnMission(shipId)).to.equal(false);
//     });
    
//     it("Should register discovery in storage", async function () {
//       // Get the exploration storage
//       const discoveryType = await explorationMissionStorage.getDiscoveryType(shipId);
      
//       // The discovery type should be between 0 and 3
//       expect(discoveryType).to.be.gte(0);
//       expect(discoveryType).to.be.lte(3);
//     });
//   });
// }); 