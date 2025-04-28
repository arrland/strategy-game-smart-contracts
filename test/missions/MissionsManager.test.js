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
    setupTokenInfrastructure
} = require("../utils");

// Mock Mission Implementation
const MOCK_MISSION_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;
import "../../interfaces/IMission.sol";
contract MockMission is IMission {
    uint256 public fixedDuration = 600;
    mapping(uint256 => bytes) public missionDataStore;
    mapping(uint256 => bool) public completedMissions;
    function startMission(uint256 shipId, bytes calldata data) external override returns (uint256 duration) {
        (uint256 missionId, ) = abi.decode(data, (uint256, bytes));
        missionDataStore[missionId] = data;
        return fixedDuration;
    }
    function completeMission(uint256 missionId) external override { completedMissions[missionId] = true; }
    function getMissionDetails(uint256 missionId) external view override returns (bytes memory) { return missionDataStore[missionId]; }
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) { return interfaceId == type(IMission).interfaceId; }
}
`;

// Helper to compile and deploy MockMission
async function deployMockMission(admin) {
    // Deploy using standard factory now
    console.log(`[DEBUG] Deploying MockMission standardly`);
    const MockMissionFactory = await ethers.getContractFactory("MockMission", admin);
    const mockMission = await MockMissionFactory.deploy();
    await mockMission.waitForDeployment();
    const mockMissionAddress = await mockMission.getAddress();
    console.log(`[DEBUG] MockMission deployed standardly at: ${mockMissionAddress}`);
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
        const { admin, user, centralAuthorizationRegistry } = base;

        // Deploy NFTs and basic storage/metadata
        const nfts = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);
        const islandStorage = await deployAndAuthorizeContract("IslandStorage", centralAuthorizationRegistry, await nfts.shipNFT.getAddress(), true);
        await islandStorage.connect(admin).setIslandSize(1, 1); // Island 1 is Small
        await islandStorage.connect(admin).setIslandSize(3, 0); // Island 3 is ExtraSmall (used in ShipAndPirateStaking tests)

        // --- FIX: Deploy MockBuildingStorage DIRECTLY --- 
        const islandStorageAddress = await islandStorage.getAddress();
        const registryAddress = await centralAuthorizationRegistry.getAddress();
        console.log(`[DEBUG] Deploying MockBuildingStorage DIRECTLY with CAR: ${registryAddress} and IslandStorage: ${islandStorageAddress}`);
        
        const MockBuildingStorageFactory = await ethers.getContractFactory("MockBuildingStorage");
        const buildingStorage = await MockBuildingStorageFactory.deploy(
            registryAddress,       // _centralAuthorizationRegistry
            islandStorageAddress   // _islandStorageAddress
        );
        await buildingStorage.waitForDeployment();
        const buildingStorageAddress = await buildingStorage.getAddress();
        console.log(`[DEBUG] MockBuildingStorage deployed DIRECTLY at: ${buildingStorageAddress}`);
        
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(buildingStorageAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IBuildingStorage"), buildingStorageAddress);
        console.log(`[DEBUG] MockBuildingStorage DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy ShipMetadata DIRECTLY --- 
        const shipNFTAddress = await nfts.shipNFT.getAddress();
        console.log(`[DEBUG] Deploying ShipMetadata DIRECTLY with CAR: ${registryAddress}`);
        const ShipMetadataFactory = await ethers.getContractFactory("ShipMetadata");
        const shipMetadata = await ShipMetadataFactory.deploy(
            registryAddress    // _centralAuthorizationRegistry
        );
        await shipMetadata.waitForDeployment();
        const shipMetadataAddress = await shipMetadata.getAddress();
        console.log(`[DEBUG] ShipMetadata deployed DIRECTLY at: ${shipMetadataAddress}`);
        
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(shipMetadataAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IShipMetadata"), shipMetadataAddress);
        console.log(`[DEBUG] ShipMetadata DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy ShipStorage DIRECTLY --- 
        const shipNFTAddress_storage = await nfts.shipNFT.getAddress(); // Use different var name to avoid scope issues
        const isNFT721_storage = true;
        console.log(`[DEBUG] Deploying ShipStorage DIRECTLY with CAR: ${registryAddress}, NFT: ${shipNFTAddress_storage}, is721: ${isNFT721_storage}`);
        const ShipStorageFactory = await ethers.getContractFactory("ShipStorage");
        const shipStorage = await ShipStorageFactory.deploy(
            registryAddress,        // _centralAuthorizationRegistry
            shipNFTAddress_storage, // _nftCollectionAddress
            isNFT721_storage        // _isNft721
        );
        await shipStorage.waitForDeployment();
        const shipStorageAddress = await shipStorage.getAddress();
        console.log(`[DEBUG] ShipStorage deployed DIRECTLY at: ${shipStorageAddress}`);
        
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(shipStorageAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IShipStorage"), shipStorageAddress);
        console.log(`[DEBUG] ShipStorage DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy CrewTypeManager DIRECTLY ---
        const genesisPiratesAddress_crew = nfts.genesisPiratesAddress;
        const inhabitantsAddress_crew = nfts.inhabitantsAddress;
        console.log(`[DEBUG] Deploying CrewTypeManager DIRECTLY with CAR: ${registryAddress}, Genesis: ${genesisPiratesAddress_crew}, Inhabitants: ${inhabitantsAddress_crew}`);
        const CrewTypeManagerFactory = await ethers.getContractFactory("CrewTypeManager");
        const crewTypeManager = await CrewTypeManagerFactory.deploy(
            registryAddress,             // _centralAuthorizationRegistry
            genesisPiratesAddress_crew,  // _genesisPirateCollection
            inhabitantsAddress_crew      // _inhabitedPirateCollection
        );
        await crewTypeManager.waitForDeployment();
        const crewTypeManagerAddress = await crewTypeManager.getAddress();
        console.log(`[DEBUG] CrewTypeManager deployed DIRECTLY at: ${crewTypeManagerAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(crewTypeManagerAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("ICrewTypeManager"), crewTypeManagerAddress);
        console.log(`[DEBUG] CrewTypeManager DIRECTLY authorized and registered.`);
        // --- END FIX ---

        // --- FIX: Deploy CrewManagement DIRECTLY ---
        console.log(`[DEBUG] Deploying CrewManagement DIRECTLY with CAR: ${registryAddress}`);
        const CrewManagementFactory = await ethers.getContractFactory("CrewManagement");
        const crewManagement = await CrewManagementFactory.deploy(registryAddress);
        await crewManagement.waitForDeployment();
        const crewManagementAddress = await crewManagement.getAddress();
        console.log(`[DEBUG] CrewManagement deployed DIRECTLY at: ${crewManagementAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(crewManagementAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("ICrewManagement"), crewManagementAddress);
        console.log(`[DEBUG] CrewManagement DIRECTLY authorized and registered.`);
        // --- END FIX ---
        
        // --- FIX: Deploy PirateSkills DIRECTLY --- 
        console.log(`[DEBUG] Deploying PirateSkills DIRECTLY with CAR: ${registryAddress}`);
        const PirateSkillsFactory = await ethers.getContractFactory("PirateSkills");
        const pirateSkills = await PirateSkillsFactory.deploy(registryAddress);
        await pirateSkills.waitForDeployment();
        const pirateSkillsAddress = await pirateSkills.getAddress();
        console.log(`[DEBUG] PirateSkills deployed DIRECTLY at: ${pirateSkillsAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(pirateSkillsAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IPirateSkills"), pirateSkillsAddress);
        console.log(`[DEBUG] PirateSkills DIRECTLY authorized and registered.`);
        // --- END FIX ---

        // --- FIX: Deploy PirateSkillsReader DIRECTLY --- 
        console.log(`[DEBUG] Deploying PirateSkillsReader DIRECTLY with CAR: ${registryAddress}`);
        const PirateSkillsReaderFactory = await ethers.getContractFactory("PirateSkillsReader");
        const pirateSkillsReader = await PirateSkillsReaderFactory.deploy(registryAddress);
        await pirateSkillsReader.waitForDeployment();
        const pirateSkillsReaderAddress = await pirateSkillsReader.getAddress();
        console.log(`[DEBUG] PirateSkillsReader deployed DIRECTLY at: ${pirateSkillsReaderAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(pirateSkillsReaderAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IPirateSkillsReader"), pirateSkillsReaderAddress);
        console.log(`[DEBUG] PirateSkillsReader DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy MockMissionsStorage DIRECTLY --- 
        console.log(`[DEBUG] Deploying MockMissionsStorage DIRECTLY with CAR: ${registryAddress}`);
        const MockMissionsStorageFactory = await ethers.getContractFactory("MockMissionsStorage");
        const missionsStorage = await MockMissionsStorageFactory.deploy(registryAddress);
        await missionsStorage.waitForDeployment();
        const missionsStorageAddress = await missionsStorage.getAddress();
        console.log(`[DEBUG] MockMissionsStorage deployed DIRECTLY at: ${missionsStorageAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionsStorageAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IMissionsStorage"), missionsStorageAddress);
        console.log(`[DEBUG] MockMissionsStorage DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy DockingManagement DIRECTLY --- 
        console.log(`[DEBUG] Deploying DockingManagement DIRECTLY with CAR: ${registryAddress}`);
        const DockingManagementFactory = await ethers.getContractFactory("DockingManagement");
        const dockingManagement = await DockingManagementFactory.deploy(registryAddress);
        await dockingManagement.waitForDeployment();
        const dockingManagementAddress = await dockingManagement.getAddress();
        console.log(`[DEBUG] DockingManagement deployed DIRECTLY at: ${dockingManagementAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(dockingManagementAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IDockingManagement"), dockingManagementAddress);
        console.log(`[DEBUG] DockingManagement DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy CooldownManager DIRECTLY --- 
        console.log(`[DEBUG] Deploying CooldownManager DIRECTLY with CAR: ${registryAddress}`);
        const CooldownManagerFactory = await ethers.getContractFactory("CooldownManager");
        const cooldownManager = await CooldownManagerFactory.deploy(registryAddress);
        await cooldownManager.waitForDeployment();
        const cooldownManagerAddress = await cooldownManager.getAddress();
        console.log(`[DEBUG] CooldownManager deployed DIRECTLY at: ${cooldownManagerAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(cooldownManagerAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("ICooldownManager"), cooldownManagerAddress);
        console.log(`[DEBUG] CooldownManager DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy MissionTravelCalculator DIRECTLY --- 
        console.log(`[DEBUG] Deploying MissionTravelCalculator DIRECTLY with CAR: ${registryAddress}`);
        const MissionTravelCalculatorFactory = await ethers.getContractFactory("MissionTravelCalculator");
        const travelCalculator = await MissionTravelCalculatorFactory.deploy(registryAddress);
        await travelCalculator.waitForDeployment();
        const travelCalculatorAddress = await travelCalculator.getAddress();
        console.log(`[DEBUG] MissionTravelCalculator deployed DIRECTLY at: ${travelCalculatorAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(travelCalculatorAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IMissionTravelCalculator"), travelCalculatorAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("ITravelTimeCalculator"), travelCalculatorAddress); // Also register ITravelTimeCalculator
        console.log(`[DEBUG] MissionTravelCalculator DIRECTLY authorized and registered.`);
        // --- END FIX --- 
        
        // --- FIX: Deploy ShipAndPirateStaking DIRECTLY --- 
        const shipNFTAddress_staking = await nfts.shipNFT.getAddress();
        const genesisPiratesAddress_staking = nfts.genesisPiratesAddress;
        const inhabitantsAddress_staking = nfts.inhabitantsAddress;
        console.log(`[DEBUG] Deploying ShipAndPirateStaking DIRECTLY with CAR: ${registryAddress}, ShipNFT: ${shipNFTAddress_staking}, Genesis: ${genesisPiratesAddress_staking}, Inhabitants: ${inhabitantsAddress_staking}`);
        const ShipAndPirateStakingFactory = await ethers.getContractFactory("ShipAndPirateStaking");
        const shipAndPirateStaking = await ShipAndPirateStakingFactory.deploy(
            registryAddress,            // _centralAuthorizationRegistry
            shipNFTAddress_staking,     // _shipNft
            genesisPiratesAddress_staking, // _genesisPiratesAddress
            inhabitantsAddress_staking  // _inhabitantsAddress
        );
        await shipAndPirateStaking.waitForDeployment();
        const shipAndPirateStakingAddress = await shipAndPirateStaking.getAddress();
        console.log(`[DEBUG] ShipAndPirateStaking deployed DIRECTLY at: ${shipAndPirateStakingAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(shipAndPirateStakingAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IShipAndPirateStaking"), shipAndPirateStakingAddress);
        console.log(`[DEBUG] ShipAndPirateStaking DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // Deploy Mission Infrastructure
        // --- FIX: Deploy MissionRegistration --- 
        const missionRegistration = await deployAndAuthorizeContract("MissionRegistration", centralAuthorizationRegistry);
        console.log(`[DEBUG] MissionRegistration deployed at: ${await missionRegistration.getAddress()}`);
        // --- END FIX ---

        // --- FIX: Deploy MissionFactory DIRECTLY --- 
        const missionRegistryAddress_factory = await missionRegistration.getAddress(); // Get previously deployed registry address
        console.log(`[DEBUG] Deploying MissionFactory DIRECTLY with CAR: ${registryAddress}`);
        const MissionFactoryFactory = await ethers.getContractFactory("MissionFactory");
        const missionFactory = await MissionFactoryFactory.deploy(
            registryAddress             // _centralAuthorizationRegistry
        );
        await missionFactory.waitForDeployment();
        const missionFactoryAddress = await missionFactory.getAddress();
        console.log(`[DEBUG] MissionFactory deployed DIRECTLY at: ${missionFactoryAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionFactoryAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IMissionFactory"), missionFactoryAddress);
        console.log(`[DEBUG] MissionFactory DIRECTLY authorized and registered.`);
        // --- END FIX --- 

        // --- FIX: Deploy MockMission and Register with Factory ---
        const mockMission = await deployMockMission(admin);
        const mockMissionAddress = await mockMission.getAddress();
        await missionFactory.connect(admin).registerMissionContract(1, mockMissionAddress); // Register type 1 (Trade)
        console.log(`[DEBUG] Registered MockMission ${mockMissionAddress} for type 1 in MissionFactory`);
        // Add another mock mission for testing different types if needed
        const mockMission2 = await deployMockMission(admin);
        const mockMission2Address = await mockMission2.getAddress();
        await missionFactory.connect(admin).registerMissionContract(2, mockMission2Address); // Register type 2 (e.g., Patrol)
        console.log(`[DEBUG] Registered MockMission ${mockMission2Address} for type 2 in MissionFactory`);
        // --- END FIX ---

        // --- FIX: Deploy MissionsManager DIRECTLY --- 
        console.log(`[DEBUG] Deploying MissionsManager DIRECTLY with CAR: ${registryAddress}`);
        const MissionsManagerFactory = await ethers.getContractFactory("MissionsManager");
        const missionsManager = await MissionsManagerFactory.deploy(registryAddress);
        await missionsManager.waitForDeployment();
        const missionsManagerAddress = await missionsManager.getAddress();
        console.log(`[DEBUG] MissionsManager deployed DIRECTLY at: ${missionsManagerAddress}`);
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionsManagerAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IMissionsManager"), missionsManagerAddress);
        console.log(`[DEBUG] MissionsManager DIRECTLY authorized and registered.`);
        // --- END FIX --- 
        
        // --- Deploy Fee Management DIRECTLY (Needed by Staking) ---
        // Deploy tokens first (using existing helper is fine)
        const { arrcToken, rumToken } = await setupTokenInfrastructure(
            centralAuthorizationRegistry, 
            admin, 
            [user], // Only need user here 
            "1000"
        );
        const arrcTokenAddress = await arrcToken.getAddress();
        const rumTokenAddress = await rumToken.getAddress();
        const maticRecipient = admin.address; // Use admin as recipient for tests
        
        console.log(`[DEBUG] Deploying FeeManagement DIRECTLY with CAR: ${registryAddress}, RUM: ${rumTokenAddress}, ARRC: ${arrcTokenAddress}, Recipient: ${maticRecipient}`);
        const FeeManagementFactory = await ethers.getContractFactory("FeeManagement");
        const feeManagement = await FeeManagementFactory.deploy(
            registryAddress,    // _centralAuthorizationRegistry
            rumTokenAddress,    // _rumTokenAddress
            arrcTokenAddress,   // _arrcTokenAddress
            maticRecipient      // _maticFeeRecipientInput
        );
        await feeManagement.waitForDeployment();
        const feeManagementAddress = await feeManagement.getAddress();
        console.log(`[DEBUG] FeeManagement deployed DIRECTLY at: ${feeManagementAddress}`);
        
        // Manually authorize and register
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(feeManagementAddress);
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IFeeManagement"), feeManagementAddress);
        console.log(`[DEBUG] FeeManagement DIRECTLY authorized and registered.`);
        // --- END Fee Management --- 

        // --- FIX: Approve FeeManagement to spend user's ARRC ---
        const approveAmount = ethers.parseEther("1000"); // Approve a large amount
        await arrcToken.connect(user).approve(feeManagementAddress, approveAmount);
        console.log(`[DEBUG] User ${user.address} approved FeeManagement ${feeManagementAddress} for ${approveAmount.toString()} ARRC`);
        // --- END FIX --- 

        // --- FIX: Deploy MockCaller and authorize it --- 
        const MockCallerFactory = await ethers.getContractFactory("MockCaller");
        authorizedContract = await MockCallerFactory.deploy(await centralAuthorizationRegistry.getAddress());
        await authorizedContract.waitForDeployment();
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(await authorizedContract.getAddress());
        console.log(`[DEBUG] MockCaller deployed and authorized at: ${await authorizedContract.getAddress()}`);
        // --- END FIX ---

        // Setup Assets for Staking
        await setupPirateSkills(pirateSkills, admin, nfts.genesisPiratesAddress, nfts.inhabitantsAddress, { genesis: [config.pirates.CAPTAIN.id] });
        await setupCrewForPirates(
            crewManagement, 
            admin, 
            nfts.genesisPiratesAddress, 
            nfts.inhabitantsAddress, 
            user, 
            { genesis: [config.pirates.CAPTAIN.id], inhabitants: [] },
            config.crew.crewType, 
            { captain: 1 }
        );
        await prepareAssetsForStaking(user, admin, { shipMetadata, shipStorage, shipAndPirateStaking }, nfts, config);

        // --- FIX: Stake Ship in Fixture --- 
        const shipIdToStake = config.ships.MAIN_SHIP.id;
        const captainIdToStake = config.pirates.CAPTAIN.id;
        const shipClassToStake = config.shipAttributes.class;

        // Prepare assets (mint/approve NFTs) - ensure this happens before staking
        // We might need to adjust prepareAssetsForStaking or call parts manually if needed
        // Assume prepareAssetsForStaking is called elsewhere or utils handle it broadly
        // Let's call stakeShipWithPirates directly
        await stakeShipWithPirates(
            shipAndPirateStaking, // Ensure shipAndPirateStaking is defined
            user,                // Ensure user is defined
            shipIdToStake,
            captainIdToStake,
            nfts.genesisPiratesAddress, // Ensure nfts is defined
            [], // No crew for these tests
            [],
            1, // Home island ID
            shipClassToStake
        );
        console.log(`[DEBUG] Ship ${shipIdToStake} staked in setupFixture.`);
        // --- END FIX ---

        return { 
            ...base, 
            nfts, 
            shipAndPirateStaking, 
            cooldownManager, 
            missionsManager, 
            missionRegistration,
            authorizedContract, 
            mockMission,
            mockMission2,
            config,
            shipAndPirateStaking,
            user,
            nfts
        };
    }

    beforeEach(async function () {
        state = await loadFixture(setupFixture);
    });

    describe("Start Mission", function () {
        it("Should start a mission successfully if ship is not on cooldown", async function () {
            const { missionsManager, user, mockMission, cooldownManager, config } = state;
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
            const { missionsManager, user, mockMission, mockMission2, config } = state;
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
            ).to.be.revertedWith("Ship already on mission"); // Check reason string
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
            
            // Attempt to start mission while ship is on cooldown
            await expect(
                missionsManager.connect(user).startMission(shipId, missionType, missionData)
            // Expect the specific reason string used in MissionsManager.sol
            ).to.be.revertedWith("Ship is on cooldown"); 
        });
        
        // Add more tests for edge cases, permissions, etc.
    });

    // Add describe blocks for completeMission, getMissionStatus etc. here...

}); 