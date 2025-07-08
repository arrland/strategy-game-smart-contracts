const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { 
    deployBaseInfrastructure, 
    deployAndAuthorizeContract, 
    setupNFTsForStaking, 
    setupPirateSkills,
    setupCrewForPirates,
    prepareAssetsForStaking,
    stakeShipWithPirates, // Use this helper for setup
    createTestConfig,
    setupTokenInfrastructure,
    setupCoreGameContracts, // Added for MissionsManager tests
    deployAndRegisterContract
} = require("../utils");

// Helper to deploy MockMission (now from compiled artifact)
async function deployMockMission(admin, centralAuthorizationRegistry) {    
    const MockMissionFactory = await ethers.getContractFactory("MockMission"); // Pass admin as signer for deployment
    const mockMission = await MockMissionFactory.connect(admin).deploy(await centralAuthorizationRegistry.getAddress()); // Connect admin as signer to deploy
    await mockMission.waitForDeployment();
    return mockMission;
}

describe("MissionsManager", function () {
    let state = {};
    let authorizedContract; // Add this to hold the MockCaller instance

    // Fixture to deploy everything needed
    async function setupFixture() {
        const config = createTestConfig({
            ships: { MAIN_SHIP: { id: 1, name: "Test Ship" } },
            pirates: { CAPTAIN: { id: 1, collection: "genesis", type: "captain" } },
            shipAttributes: {
                class: "Small",
                durability: 100,
                speed: 20,
                agility: 15,
                viewingRange: 10,
                cannonsCapacity: 10,
                armor: 50,
                ramming: 30,
                crewMin: 1,
                crewMax: 5,
                cargoBay: 1000,
                oars: false,
                shallowWaters: true,
                deepWaters: true,
                shipType: "Combat"
            },
            crew: { crewType: "sailor", captainCrewCount: 1 }
        });

        const base = await deployBaseInfrastructure();
        const { admin, user, otherAccount, centralAuthorizationRegistry } = base;

        // Deploy NFTs
        const nfts = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);

        // Deploy core game contracts using the new utility
        const coreContractsPack = await setupCoreGameContracts(admin, user, centralAuthorizationRegistry, nfts, {
            deployRealMissionsStorage: false // Ensure MockMissionsStorage is used if that was the intent
        });

        const {
            // Destructure necessary contracts from coreContractsPack
            arrcToken, rumToken, feeManagement,
            islandStorage, pirateStorage, inhabitantStorage, shipStorage, storageManagement,
            resourceTypeManager, resourceManagement, buildingStorage, resourceSpendManagement,
            crewTypeManager, crewManagement,
            pirateSkills, pirateSkillsReader,
            shipMetadata, dockingManagement, shipAndPirateStaking, // shipAndPirateStaking is coreContractsPack.staking
            cooldownManager, travelTimeCalculator, missionTravelCalculator, missionValidator,
            missionsStorage, // This will be MockMissionsStorage by default from setupCoreGameContracts
            missionRequirements 
        } = coreContractsPack;

        // Deploy MissionsManager itself (this is the contract under test)
        const missionsManager = await deployAndAuthorizeContract("MissionsManager", centralAuthorizationRegistry);

        // Deploy MockMission and MockCaller (specific to these tests)
        const mockMission = await deployMockMission(admin, centralAuthorizationRegistry);
        const MockCallerFactory = await ethers.getContractFactory("MockCaller");
        authorizedContract = await MockCallerFactory.connect(admin).deploy(await missionsManager.getAddress());
        await authorizedContract.waitForDeployment();
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(await authorizedContract.getAddress());

        // Deploy MissionRegistration and register it in CAR
        const missionRegistration = await deployAndAuthorizeContract(
            "MissionRegistration",
            centralAuthorizationRegistry
        );

        // Deploy the actual MissionFactory
        // The MissionFactory constructor should register itself with keccak256("IMissionFactory")
        const missionFactory = await deployAndAuthorizeContract(
            "MissionFactory",
            centralAuthorizationRegistry           
        );

        const missionFactoryAddress = await centralAuthorizationRegistry.connect(admin).getContractAddress(await missionFactory.INTERFACE_ID());
        
        
        // Register MockMission with the MissionFactory for a specific mission type
        const testMissionType = 1; // Assuming missionType 1 is used in tests
        await missionFactory.connect(admin).registerMissionContract(testMissionType, await mockMission.getAddress());

        // Prepare assets: Mint Ship, Pirate, setup skills, metadata, initialize storage
        // Using MAIN_SHIP.id and CAPTAIN.id from config
        await nfts.shipNFT.connect(admin).safeMint(user.address, config.ships.MAIN_SHIP.id);
        await nfts.genesisPiratesNFT.connect(admin).mint(user.address, config.pirates.CAPTAIN.id);
        
        // Approve the ShipAndPirateStaking contract to manage the ship NFT
        await nfts.shipNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), config.ships.MAIN_SHIP.id);

        // Approve the ShipAndPirateStaking contract to manage all Genesis Pirate NFTs for the user
        await nfts.genesisPiratesNFT.connect(user).setApprovalForAll(await shipAndPirateStaking.getAddress(), true);

        await setupPirateSkills(pirateSkills, admin, nfts.genesisPiratesAddress, nfts.inhabitantsAddress, {
            genesis: [config.pirates.CAPTAIN.id], 
            inhabitants: []
        });
        await shipMetadata.connect(admin).updateShipMetadata(config.ships.MAIN_SHIP.id, config.shipAttributes);
        await shipStorage.connect(admin).initializeStorage(config.ships.MAIN_SHIP.id);

        // Setup Crew For Pirates
        await setupCrewForPirates(
            crewManagement, admin, nfts.genesisPiratesAddress, nfts.inhabitantsAddress, user,
            { genesis: [config.pirates.CAPTAIN.id], inhabitants: [] },
            config.crew.crewType, 
            { captain: config.crew.captainCrewCount, crew: 0 }
        );

        // Stake the ship (required to start missions)
        await stakeShipWithPirates(
            shipAndPirateStaking,  // 1st argument: contract instance
            user,                  // 2nd argument: user (signer)
            config.ships.MAIN_SHIP.id, // shipId
            config.pirates.CAPTAIN.id, // captainId
            nfts.genesisPiratesAddress, // captainCollection (assuming captain is from genesis)
            [], // genesisPirateIds (excluding captain for this helper's structure)
            [], // inhabitantIds
            1, // homeIslandId (default or from config)
            config.shipAttributes.class // shipClass
        );

        return { 
            ...base, 
            ...nfts,
            // Spread all contracts from the core pack
            ...coreContractsPack,
            missionsManager, 
            mockMission,
            authorizedContract,
            config,
            missionFactory,
            missionRegistration
        };
    }

    beforeEach(async function () {
        state = await loadFixture(setupFixture);
        // Log the interface fragments for MissionsManager to check for the 'missions' getter
       
    });

    describe("Start Mission", function () {
        it("Should start a mission successfully if ship is not on cooldown", async function () {
            const { missionsManager, user, mockMission, cooldownManager, config, centralAuthorizationRegistry } = state;
            const shipId = config.ships.MAIN_SHIP.id;
            const missionType = 1;
            const missionData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [1, "0x"]);

            // Explicitly check cooldown is not active before starting
            const entityKey = ethers.keccak256(ethers.solidityPacked(["string", "uint256"], ["ship", shipId]));
            expect(await cooldownManager.isOnCooldown(entityKey)).to.be.false;

            // Start the mission and expect MissionStarted event
            const missionId = 1; // Expecting the first mission ID to be 1
            await expect(missionsManager.connect(user).startMission(shipId, missionType, missionData))
                .to.emit(missionsManager, "MissionStarted")
                .withArgs(missionId, shipId, missionType);
                
            // Verify mission details in storage (optional but good)
            const missionInfo = await missionsManager.missions(missionId);
            expect(missionInfo.isActive).to.be.true;
            expect(missionInfo.shipId).to.equal(shipId);
            expect(missionInfo.missionType).to.equal(missionType);
            expect(missionInfo.isCompleted).to.be.false;
            expect(await missionsManager.getActiveShipMission(shipId)).to.equal(missionId);
        });
        
        it("should fail to start mission if ship is already on another mission", async function () {
            const { missionsManager, cooldownManager, user, mockMission, mockMission2, config, centralAuthorizationRegistry, missionFactory } = state;
            const shipId = config.ships.MAIN_SHIP.id;
            const missionType1 = 1;
            const missionType2 = 2;
            const missionData1 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [1, "0x"]);
            const missionData2 = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [2, "0x"]);

            
   

            // Start the first mission
            await missionsManager.connect(user).startMission(shipId, missionType1, missionData1);

            // Try to start a second mission with the same ship
            await expect(
                missionsManager.connect(user).startMission(shipId, missionType2, missionData2)
            ).to.be.revertedWithCustomError(missionsManager, "ShipAlreadyOnMission")
             .withArgs(shipId, 1); // shipId and activeMissionId
        });

        it("should fail to start mission if ship is on cooldown", async function () {
            const { missionsManager, user, cooldownManager, authorizedContract, mockMission, config } = state;
            const shipId = config.ships.MAIN_SHIP.id;
            const missionType = 1;
            const missionData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "bytes"], [1, "0x"]); // Example mission data
            const cooldownDuration = 600; // 10 minutes
            const context = "testCooldown";

            // Set cooldown for the ship using the authorized contract
            const entityKey = ethers.keccak256(ethers.solidityPacked(["string", "uint256"], ["ship", shipId]));
            
            // Ensure authorizedContract is defined before calling
            if (!authorizedContract) throw new Error("authorizedContract is not defined in state");
            
            await authorizedContract.callSetCooldown(await cooldownManager.getAddress(), entityKey, cooldownDuration, context);
            
            // Verify cooldown is active immediately
            expect(await cooldownManager.isOnCooldown(entityKey)).to.be.true;
            
            // Get the expected cooldown end time for the assertion
            const cooldownEndTime = await cooldownManager.getCooldownEndTime(entityKey);
            
            // Attempt to start mission while ship is on cooldown
            await expect(
                missionsManager.connect(user).startMission(shipId, missionType, missionData)
            ).to.be.revertedWithCustomError(missionsManager, "ShipOnCooldown")
             .withArgs(shipId, cooldownEndTime); // shipId and cooldownEndTime
        });
        
        // Add more tests for edge cases, permissions, etc.
    });

    // Add describe blocks for completeMission, getMissionStatus etc. here...

}); 