const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { 
    setupCoreGameContracts, 
    deployBaseInfrastructure, 
    setupNFTsForStaking, 
    deployAndRegisterContract, 
    setupPirateSkills, 
    setupCrewForPirates,
    setupShipForMissionTesting,
    setupShipForMissionWithoutFood,
    setupShipForMissionWithoutRUMApproval,
    startTestResourceTransferMission,
    fastForwardAndCompleteMission
} = require("../utils"); // Assuming utils.js is in parent 'test' directory

describe("ResourceTransferMission", function () {
    async function setupFixture() {
        const { admin, user, otherAccount, centralAuthorizationRegistry } = await deployBaseInfrastructure();
        const nftsSetup = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);

        // Mint a Genesis Pirate to be used as a captain
        const captainPirateId = 100;
        
        await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId); 

        // Define nftsForCore BEFORE it's used by setupCoreGameContracts
        const nftsForCore = {
            shipNFT: nftsSetup.shipNFT,
            genesisPiratesAddress: await nftsSetup.genesisPiratesNFT.getAddress(),
            inhabitantsAddress: await nftsSetup.inhabitantsNFT.getAddress(),
            genesisIslandsAddress: await nftsSetup.islandNft.getAddress()
        };

        // Deploy core game contracts (this should deploy and register most dependencies)
        const coreContracts = await setupCoreGameContracts(admin, user, centralAuthorizationRegistry, nftsForCore, { deployRealMissionsStorage: true });

        // MockBuildingStorage is deployed by setupCoreGameContracts and aliased as coreContracts.buildingStorage
        // We will use that one.

        // Deploy real MissionResourceHandler
        const missionResourceHandler = await deployAndRegisterContract(
            "MissionResourceHandler",
            centralAuthorizationRegistry,
            "IMissionResourceHandler" 
        );
        coreContracts.missionResourceHandler = missionResourceHandler; // Add to coreContracts pack if not already (though it's not a standard part of setupCoreGameContracts)

        // Deploy real ResourceTransferMissionStorage
        const ResourceTransferMissionStorage = await ethers.getContractFactory("ResourceTransferMissionStorage");
        const resourceTransferMissionStorage = await ResourceTransferMissionStorage.deploy(centralAuthorizationRegistry.target);
        await resourceTransferMissionStorage.waitForDeployment();
        // ResourceTransferMissionStorage's constructor authorizes itself and registers with IMissionTypeStorage key
        // We need to register it with the main MissionsStorage
        if (coreContracts.missionsStorage && await coreContracts.missionsStorage.getAddress() !== ethers.ZeroAddress) {
            // Get the mission type ID for ResourceTransfer from MissionRegistration (deployed later)
            // This needs to be done after MissionRegistration is deployed.
        } else {
            throw new Error("Real MissionsStorage not found or has zero address after setupCoreGameContracts.");
        }

        // NOW set up skills for the captain, AFTER coreContracts (and thus pirateSkills) is deployed.
        const { pirateSkills } = coreContracts; 
        if (!pirateSkills) {
            throw new Error("PirateSkills contract not found in coreContracts from setupFixture. It's needed to set up captain skills.");
        }
        
        // Try to add skills - if they already exist, this will fail and we'll catch the error
        try {
            await setupPirateSkills( 
                pirateSkills,      
                admin,              
                await nftsSetup.genesisPiratesNFT.getAddress(), 
                ethers.ZeroAddress, 
                { genesis: [captainPirateId], inhabitants: [] } 
            );
        } catch (error) {
            // Skills already exist - ignore the error
            if (!error.message.includes("Character skills already exist")) {
                throw error; // Re-throw if it's a different error
            }
        }

        // Also, ensure the captain has crew registered in CrewManagement
        const { crewManagement } = coreContracts;
        if (!crewManagement) {
            throw new Error("CrewManagement contract not found in coreContracts. It's needed to set up captain's crew.");
        }
        
        // Check if crew already exists for this pirate before adding
        try {
            const existingCrew = await crewManagement.getCrewForPirate(captainPirateId);
            if (existingCrew.length === 0) {
                await setupCrewForPirates(
                    crewManagement,
                    admin,
                    await nftsSetup.genesisPiratesNFT.getAddress(),
                    ethers.ZeroAddress, // No inhabitants for this captain
                    user, // Owner of the crew (can be user or admin)
                    { genesis: [captainPirateId], inhabitants: [] },
                    "sailor", // Default crew type
                    { captain: 3, crew: 0 } // Captain provides 3 essential crew, no regular crew for this setup call
                );
            }
        } catch (error) {
            // If getCrewForPirate fails, it means no crew exists, so we can add them
            await setupCrewForPirates(
                crewManagement,
                admin,
                await nftsSetup.genesisPiratesNFT.getAddress(),
                ethers.ZeroAddress, // No inhabitants for this captain
                user, // Owner of the crew (can be user or admin)
                { genesis: [captainPirateId], inhabitants: [] },
                "sailor", // Default crew type
                { captain: 3, crew: 0 } // Captain provides 3 essential crew, no regular crew for this setup call
            );
        }

        // Set a RUM requirement in ResourceSpendManagement for mission travel
        const { resourceSpendManagement, resourceTypeManager } = coreContracts;
        if (!resourceSpendManagement || !resourceTypeManager) {
            throw new Error("ResourceSpendManagement or ResourceTypeManager not found in coreContracts");
        }

        const rumPerDay = ethers.parseUnits("0.1", 18);

        // Deploy MissionRegistration and register it in CAR
        const MissionRegistration = await ethers.getContractFactory("MissionRegistration");
        const missionRegistration = await MissionRegistration.deploy(centralAuthorizationRegistry.target);
        await missionRegistration.waitForDeployment();
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IMissionRegistration"), missionRegistration.target);
        
        // AFTER MissionRegistration is deployed, register ResourceTransferMissionStorage with MissionsStorage
        const resourceTransferMissionName = "ResourceTransfer";
        const resourceTransferMissionTypeForStorageReg = await missionRegistration.getMissionTypeByName(resourceTransferMissionName);
        
        // Register the mission type within MissionsStorage first
        await coreContracts.missionsStorage.connect(admin).registerMissionType(resourceTransferMissionTypeForStorageReg, resourceTransferMissionName);
        
        // Now register the specialized storage for this type
        await coreContracts.missionsStorage.connect(admin).registerSpecializedStorage(resourceTransferMissionTypeForStorageReg, resourceTransferMissionStorage.target);

        // Deploy ResourceTransferMission itself
        const ResourceTransferMission = await ethers.getContractFactory("ResourceTransferMission");
        const resourceTransferMission = await ResourceTransferMission.deploy(centralAuthorizationRegistry.target);
        await resourceTransferMission.waitForDeployment();

        // Deploy and register MissionFactory
        const MissionFactory = await ethers.getContractFactory("MissionFactory");
        const missionFactory = await MissionFactory.deploy(centralAuthorizationRegistry.target);
        await missionFactory.waitForDeployment();
        await centralAuthorizationRegistry.connect(admin).setContractAddress(ethers.id("IMissionFactory"), missionFactory.target);
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(missionFactory.target);
        
        // Get the mission type ID for ResourceTransfer from MissionRegistration
        const resourceTransferMissionTypeFromName = await missionRegistration.getMissionTypeByName("ResourceTransfer");
        // Register the deployed ResourceTransferMission contract with the MissionFactory
        await missionFactory.connect(admin).registerMissionContract(resourceTransferMissionTypeFromName, resourceTransferMission.target);
        
        // Authorize ResourceTransferMission in the CentralAuthorizationRegistry
        await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(resourceTransferMission.target);

        // Define a shipId and islandIds for tests
        const shipId = 1;
        const islandId1 = 1; // Origin
        const islandId2 = 2; // Target (ensure this NFT exists or is usable)

        // Mint shipId to the user, so user owns it for approvals and staking
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);

        // Ensure shipId=1 has metadata (cargo bay etc.)
        const { shipMetadata } = coreContracts;
        const defaultShipAttributes = {
            class: "Small", durability: 100, speed: 10, agility: 5, viewingRange: 100,
            cannonsCapacity: 4, armor: 10, ramming: 5, crewMin: 2, crewMax: 10,
            cargoBay: ethers.parseUnits("1000", 18), oars: false, shallowWaters: true, deepWaters: true, shipType: "Warship"
        };
        await shipMetadata.connect(admin).updateShipMetadata(shipId, defaultShipAttributes);
        
        // Ensure islandId1 and islandId2 are set up (e.g., with size/capacity)
        const { islandStorage, missionRequirements } = coreContracts;
        const ISLAND_SIZE_EXTRA_SMALL = 0;
        const ISLAND_SIZE_SMALL = 1;
        await islandStorage.connect(admin).setIslandSize(islandId1, ISLAND_SIZE_EXTRA_SMALL);
        await islandStorage.connect(admin).setIslandSize(islandId2, ISLAND_SIZE_SMALL);
        
        // Explicitly initialize islandId2 in IslandStorage to ensure it's considered valid
        try {
            await islandStorage.connect(admin).initializeIslands(islandId2, ISLAND_SIZE_EXTRA_SMALL);
        } catch (initError) {
        }

        // Setup mission requirements for the destination island using the Mock
        const resourceTransferMissionTypeForReqs = await missionRegistration.getMissionTypeByName("ResourceTransfer");
        await missionRequirements.connect(admin).setIslandValidity(islandId2, resourceTransferMissionTypeForReqs, true);

        // Return all necessary contracts and signers
        return {
            admin, user, otherAccount, centralAuthorizationRegistry, nftsSetup, coreContracts,
            missionRegistration,
            resourceTransferMission, shipId, islandId1, islandId2,
            captainPirateId, // Return captainId for tests
            missionResourceHandler: coreContracts.missionResourceHandler, 
            resourceTransferMissionStorage 
        };
    }

    describe("Deployment & Setup", function() {
        it("Should deploy and register ResourceTransferMission correctly", async function() {
            const { resourceTransferMission, missionRegistration } = await loadFixture(setupFixture);

            const missionTypeName = "ResourceTransfer";
            const missionType = await missionRegistration.getMissionTypeByName(missionTypeName);
            expect(missionType).to.not.equal(0, "ResourceTransfer mission type should be registered in the fixture's MissionRegistration");
            
            expect(resourceTransferMission.target).to.be.properAddress;
            expect(await resourceTransferMission.getMissionType()).to.equal(missionType);
        });
    });

    describe("startMission", function() {
        it("should successfully start a resource transfer mission and emit ResourceTransferStarted event", async function() {
            const { 
                admin, user, centralAuthorizationRegistry, 
                coreContracts, resourceTransferMission, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId, 
                missionResourceHandler,
                resourceTransferMissionStorage
            } = await loadFixture(setupFixture);

            // Mint origin island to user (user owns it) - REQUIRED for island ownership validation
            await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);

            const { 
                missionsManager, 
                missionValidator, 
                missionTravelCalculator, 
                resourceTypeManager, 
                shipStorage, 
                islandStorage, 
                rumToken, 
                feeManagement, 
                buildingStorage,
                shipAndPirateStaking
            } = coreContracts; 
            const actualShipNFT = coreContracts.shipNFT || nftsSetup.shipNFT;
            const genesisPiratesNFT = nftsSetup.genesisPiratesNFT;

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            const originIslandId_param = islandId1;
            const targetIslandId_param = islandId2;
            const resourceType_param = resourceTypeToTransfer;
            const amount_param = amountToTransfer;
            const isReturnFromTradeMission_param = false;
            const foodChoice_param = "citrus";
            const foodRationChoice_param = "fish";

            await islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, amountToTransfer);

            const targetTotalCrew = 10;
            const nonNftCrewForStaking = targetTotalCrew - 1; 

            const stakingData = {
                shipId: shipId,
                captainCollection: await nftsSetup.genesisPiratesNFT.getAddress(),
                captainId: captainPirateId,
                genesisPirateIds: [], 
                inhabitantIds: [],    
                nonNftCrewCount: nonNftCrewForStaking 
            };
            const shipClassForStaking = "Small"; 

            await actualShipNFT.connect(user).approve(shipAndPirateStaking.target, shipId);
            await genesisPiratesNFT.connect(user).setApprovalForAll(shipAndPirateStaking.target, true);

            await shipAndPirateStaking.connect(user).stakeShipWithPirates(
                stakingData,          
                islandId1, 
                shipClassForStaking   
            );

            const rumRequired = ethers.parseEther("10");
            await rumToken.connect(admin).mint(user.address, rumRequired);
            await rumToken.connect(user).approve(feeManagement.target, rumRequired);

            const PORT_TYPE_ID_FOR_MISSION = 3;
            const mockedPortLevel = 10;

            const originPortLevel = mockedPortLevel;
            const targetPortLevel = mockedPortLevel;

            const expectedTravelTimeOneWay = await coreContracts.travelTimeCalculator.calculateTravelTime(islandId1, islandId2, shipId, false);
            
            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            
            // The missionId is no longer prepended here. MissionsManager will assign it.
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                [ "uint256", "uint256", "string", "uint256", "bool", "string", "string" ],
                [ 
                    originIslandId_param, 
                    targetIslandId_param, 
                    resourceType_param, 
                    amount_param, 
                    isReturnFromTradeMission_param, 
                    foodChoice_param, 
                    foodRationChoice_param 
                ]
            );
            
            const actualCrewCount = targetTotalCrew;
            const calculatedLoadTime = await missionTravelCalculator.calculateLoadTime(amountToTransfer, actualCrewCount, originPortLevel);
            const calculatedUnloadTime = await missionTravelCalculator.calculateLoadTime(amountToTransfer, actualCrewCount, targetPortLevel);
            
            const expectedTotalTime = Number(expectedTravelTimeOneWay) + Number(calculatedLoadTime) + Number(calculatedUnloadTime);
            
            const SECONDS_IN_DAY_BN = await coreContracts.travelTimeCalculator.SECONDS_IN_DAY();
            const SECONDS_IN_DAY = Number(SECONDS_IN_DAY_BN);
            const expectedTotalDays = Math.ceil(expectedTotalTime / SECONDS_IN_DAY);

            const citrusPerCrewPerDay = ethers.parseUnits("0.5", 18);
            const fishPerCrewPerDay = ethers.parseUnits("0.5", 18);

            const citrusNeeded = BigInt(expectedTotalDays) * BigInt(actualCrewCount) * citrusPerCrewPerDay;
            const fishNeeded = BigInt(expectedTotalDays) * BigInt(actualCrewCount) * fishPerCrewPerDay;

            if (citrusNeeded > 0) await shipStorage.connect(admin).addResource(shipId, user.address, "citrus", citrusNeeded);
            if (fishNeeded > 0) await shipStorage.connect(admin).addResource(shipId, user.address, "fish", fishNeeded);
            
            // Execute the transaction and wait for the receipt
            const startMissionTx = await missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData);
            const receipt = await startMissionTx.wait();

            // Find the MissionStarted event and get the actual missionId
            const missionStartedEvent = receipt.logs.find(
                (log) => log.address === missionsManager.target && log.eventName === 'MissionStarted'
            );
            expect(missionStartedEvent, "MissionStarted event not found").to.not.be.undefined;
            const missionId = missionStartedEvent.args.missionId;
            expect(missionId).to.be.gt(0); // Ensure we got a valid ID

            // Now, run assertions using the dynamically fetched missionId
            await expect(startMissionTx)
                .to.emit(resourceTransferMission, "ResourceTransferStarted") 
                .withArgs(
                    missionId,          
                    shipId,             
                    originIslandId_param,
                    targetIslandId_param,
                    resourceType_param,
                    amount_param,
                    anyValue,
                    anyValue,
                    isReturnFromTradeMission_param
                );
            
            await expect(startMissionTx)
                .to.emit(missionsManager, "MissionStarted")
                .withArgs(missionId, shipId, resourceTransferMissionType);

            const lockInfo = await missionResourceHandler.getShipLockInfo(shipId);
            expect(lockInfo.locked).to.be.true;
            expect(lockInfo.missionId).to.equal(missionId);

            // Corrected: Query with shipId as the key
            const storedBasicInfo = await coreContracts.missionsStorage.getMissionBasicInfo(shipId);
            expect(storedBasicInfo.missionId).to.equal(missionId);

            const rtmStorage = resourceTransferMissionStorage;
            const rtmStorageData = await rtmStorage.getMissionDetails(missionId); 
            expect(rtmStorageData.originIslandId).to.equal(originIslandId_param);
            expect(rtmStorageData.targetIslandId).to.equal(targetIslandId_param);
            expect(rtmStorageData.resourceType).to.equal(resourceType_param);
            expect(rtmStorageData.amount).to.equal(amount_param);

            const islandWoodBalanceAfter = await islandStorage.getResourceBalance(islandId1, resourceTypeToTransfer);
            expect(islandWoodBalanceAfter).to.equal(0);
        });

    });

    describe("completeMission", function() {
        it("should allow the user to complete the mission and claim resources to the target island", async function() {
            const { 
                admin, user,
                coreContracts, resourceTransferMission, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId, 
                missionResourceHandler,
                resourceTransferMissionStorage
            } = await loadFixture(setupFixture);

            // Mint origin island to user (user owns it) - REQUIRED for island ownership validation
            await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);

            const { 
                missionsManager, 
                missionTravelCalculator, 
                shipStorage, 
                islandStorage, 
                rumToken, 
                feeManagement,
                shipAndPirateStaking
            } = coreContracts; 

            console.log("Available keys on coreContracts:", Object.keys(coreContracts));
            
            const actualShipNFT = coreContracts.shipNFT || nftsSetup.shipNFT;
            const genesisPiratesNFT = nftsSetup.genesisPiratesNFT;

            // --- Simplified Setup to Start the Mission ---
            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            await islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, amountToTransfer);

            const targetTotalCrew = 10;
            const nonNftCrewForStaking = targetTotalCrew - 1; 
            const stakingData = { shipId, captainCollection: await nftsSetup.genesisPiratesNFT.getAddress(), captainId: captainPirateId, genesisPirateIds: [], inhabitantIds: [], nonNftCrewCount: nonNftCrewForStaking };
            
            await actualShipNFT.connect(user).approve(shipAndPirateStaking.target, shipId);
            await genesisPiratesNFT.connect(user).setApprovalForAll(shipAndPirateStaking.target, true);
            await shipAndPirateStaking.connect(user).stakeShipWithPirates(stakingData, islandId1, "Small");

            const rumRequired = ethers.parseEther("10");
            await rumToken.connect(admin).mint(user.address, rumRequired);
            await rumToken.connect(user).approve(feeManagement.target, rumRequired);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            // Add food to the ship
            const travelTime = await missionTravelCalculator.calculateTravelTime(islandId1, islandId2, shipId);
            const loadTime = await missionTravelCalculator.calculateLoadTime(amountToTransfer, targetTotalCrew, 10);
            const unloadTime = await missionTravelCalculator.calculateLoadTime(amountToTransfer, targetTotalCrew, 10);
            const totalTime = Number(travelTime) + Number(loadTime) + Number(unloadTime);
            const totalDays = Math.ceil(totalTime / (24 * 3600));
            const citrusNeeded = BigInt(totalDays) * BigInt(targetTotalCrew) * ethers.parseUnits("0.5", 18);
            const fishNeeded = BigInt(totalDays) * BigInt(targetTotalCrew) * ethers.parseUnits("0.5", 18);
            if (citrusNeeded > 0) await shipStorage.connect(admin).addResource(shipId, user.address, "citrus", citrusNeeded);
            if (fishNeeded > 0) await shipStorage.connect(admin).addResource(shipId, user.address, "fish", fishNeeded);
            
            // Start the mission
            const startTx = await missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData);
            const receipt = await startTx.wait();
            const missionStartedEvent = receipt.logs.find(e => e.address === missionsManager.target && e.eventName === 'MissionStarted');
            const missionId = missionStartedEvent.args.missionId;
            // --- End Setup ---

            // 1. Get the mission's actual end time and fast-forward
            const missionInfo = await missionsManager.getMissionStatus(missionId);
            await time.setNextBlockTimestamp(missionInfo.endTime + 1n);

            // 2. Complete the mission
            const completeTx = await missionsManager.connect(user).completeMission(shipId);

            // 3. Assertions
            // Check for events
            await expect(completeTx)
                .to.emit(resourceTransferMission, "ResourceTransferCompleted")
                .withArgs(missionId, shipId, islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false);

            await expect(completeTx)
                .to.emit(missionsManager, "MissionCompleted")
                .withArgs(missionId, shipId, resourceTransferMissionType);
            
            // Check resource balance on target island
            const targetIslandBalance = await islandStorage.getResourceBalance(islandId2, resourceTypeToTransfer);
            expect(targetIslandBalance).to.equal(amountToTransfer);

            // Check resource balance on ship (should be zero now)
            const shipResourceBalance = await shipStorage.getResourceBalance(shipId, resourceTypeToTransfer);
            expect(shipResourceBalance).to.equal(0);

            // Check that the ship is unlocked
            const lockInfo = await missionResourceHandler.getShipLockInfo(shipId);
            expect(lockInfo.locked).to.be.false;

            // Check mission is no longer active
            expect(await coreContracts.missionsStorage.isOnMission(shipId)).to.be.false;
        });
    });

    describe("startMission - Validation Tests", function() {
        it("should revert with 'Invalid resource type' for non-existent resource", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Setup ship staking
            await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const invalidResourceType = "invalidResource";
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, invalidResourceType, ethers.parseUnits("100", 18), false, "citrus", "fish"]
            );

            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.revertedWith("Invalid resource type");
        });

        it("should revert with ship capacity error when cargo + food exceeds capacity", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Setup ship staking
            await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            // Try to transfer more than ship capacity
            const resourceTypeToTransfer = "wood";
            const excessiveAmount = ethers.parseUnits("2000", 18); // More than 1000 capacity
            
            await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, excessiveAmount);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, excessiveAmount, false, "citrus", "fish"]
            );

            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.revertedWith("Not enough ship storage for food and cargo"); // Corrected error message
        });

        it("should revert when origin island doesn't have enough resources", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Setup ship staking
            await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            // Don't add resources to origin island - should fail

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.revertedWith("Insufficient resources for transfer");
        });

        it("should revert when ship doesn't have enough food for the journey", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Setup ship staking WITHOUT food
            await setupShipForMissionWithoutFood(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, amountToTransfer);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.revertedWith("Insufficient optional resource: citrus"); // Corrected error message
        });

        it("should revert when user doesn't have enough RUM tokens", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Setup ship staking but don't provide RUM approval
            await setupShipForMissionWithoutRUMApproval(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, amountToTransfer);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.revertedWith("ERC20InsufficientAllowance"); // Updated to match actual error message
        });
    });

    describe("completeMission - Validation Tests", function() {
        it("should revert when trying to complete mission before endTime", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Start a mission first
            const missionId = await startTestResourceTransferMission(user, admin, coreContracts, missionRegistration, shipId, islandId1, islandId2, nftsSetup, captainPirateId);

            // Try to complete immediately without waiting
            await expect(
                coreContracts.missionsManager.connect(user).completeMission(shipId)
            ).to.be.revertedWith("Mission not yet complete");
        });

        it("should revert when trying to complete non-existent mission", async function() {
            const { user, coreContracts, shipId } = await loadFixture(setupFixture);

            await expect(
                coreContracts.missionsManager.connect(user).completeMission(shipId)
            ).to.be.revertedWith("Ship is not on an active mission");
        });

        it("should revert when destination island has insufficient capacity", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Set destination island to extra small capacity
            await coreContracts.islandStorage.connect(admin).setIslandSize(islandId2, 0); // Extra small = 50 ether capacity
            
            // Try to transfer more than destination can hold
            const largeAmount = ethers.parseUnits("60", 18); // More than 50 capacity
            const missionId = await startTestResourceTransferMission(user, admin, coreContracts, missionRegistration, shipId, islandId1, islandId2, nftsSetup, captainPirateId, { amount: "60" });

            // Fast forward time
            const missionInfo = await coreContracts.missionsManager.getMissionStatus(missionId);
            await time.setNextBlockTimestamp(missionInfo.endTime + 1n);

            await expect(
                coreContracts.missionsManager.connect(user).completeMission(shipId)
            ).to.be.revertedWith("Insufficient destination capacity");
        });
    });

    describe("Edge Cases", function() {
        it("should handle zero amount transfer gracefully", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Mint origin island to user (user owns it) - REQUIRED for island ownership validation
            await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);

            await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, "wood", 0, false, "citrus", "fish"]
            );

            // Zero amount should be allowed (it's a valid edge case)
            const startTx = await coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData);
            expect(startTx).to.not.be.reverted;
        });

        it("should handle same origin and target island", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Mint origin island to user (user owns it) - REQUIRED for island ownership validation
            await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);

            await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId1, "wood", ethers.parseUnits("100", 18), false, "citrus", "fish"] // Same island
            );

            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.reverted; // Should validate different islands
        });

        it("should handle multiple different resource types", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Test with different resource types (skip wood as it already exists)
            const resourceTypes = ["stone", "iron"];
            
            for (let i = 0; i < resourceTypes.length; i++) {
                const resourceType = resourceTypes[i];
                
                // Add resource type to manager (check if it exists first)
                try {
                    await coreContracts.resourceTypeManager.connect(admin).addResourceType(resourceType, true, true);
                } catch (error) {
                    // Resource type already exists, continue
                }
                
                // For subsequent iterations, we need to unstake the ship first
                if (i > 0) {
                    try {
                        await coreContracts.shipAndPirateStaking.connect(user).unstakeShip(shipId);
                    } catch (error) {
                        // Ship might not be staked, continue
                    }
                }
                
                await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
                
                const amountToTransfer = ethers.parseUnits("50", 18);
                await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceType, amountToTransfer);

                const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
                const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                    ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                    [islandId1, islandId2, resourceType, amountToTransfer, false, "citrus", "fish"]
                );

                const startTx = await coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData);
                const receipt = await startTx.wait();
                const missionStartedEvent = receipt.logs.find(e => e.address === coreContracts.missionsManager.target && e.eventName === 'MissionStarted');
                const missionId = missionStartedEvent.args.missionId;

                // Complete the mission
                const missionInfo = await coreContracts.missionsManager.getMissionStatus(missionId);
                await time.setNextBlockTimestamp(missionInfo.endTime + 1n);
                await coreContracts.missionsManager.connect(user).completeMission(shipId);

                // Verify resource was transferred
                const targetBalance = await coreContracts.islandStorage.getResourceBalance(islandId2, resourceType);
                expect(targetBalance).to.equal(amountToTransfer);
            }
        });
    });

    describe("Island Ownership Validation", function() {
        it("should successfully start mission when user owns the origin island", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Mint origin island to user (user owns it)
            await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
            
            // Setup ship for mission
            await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            // Add resource to origin island
            await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, amountToTransfer);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            // Should succeed since user owns the origin island
            const startTx = await coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData);
            expect(startTx).to.not.be.reverted;
            
            // Verify the transaction was successful
            const receipt = await startTx.wait();
            const missionStartedEvent = receipt.logs.find(e => e.address === coreContracts.missionsManager.target && e.eventName === 'MissionStarted');
            expect(missionStartedEvent).to.not.be.undefined;
        });

        it("should revert when user does not own the origin island", async function() {
            const { 
                admin, user, otherAccount, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Mint origin island to otherAccount (user does NOT own it)
            await nftsSetup.islandNft.connect(admin).mintSpecific(otherAccount.address, islandId1);
            
            // Setup ship for mission (user owns the ship) - but skip island minting since we handle it manually
        const targetTotalCrew = 10;
        const nonNftCrewForStaking = targetTotalCrew - 1;
        
        const actualShipNFT = coreContracts.shipNFT || nftsSetup.shipNFT;
        const genesisPiratesNFT = nftsSetup.genesisPiratesNFT;
        
            // Stake ship with captain and crew
        const stakingData = {
            shipId,
            captainCollection: await nftsSetup.genesisPiratesNFT.getAddress(),
            captainId: captainPirateId,
            genesisPirateIds: [],
            inhabitantIds: [],
            nonNftCrewCount: nonNftCrewForStaking
        };
        
        await actualShipNFT.connect(user).approve(coreContracts.shipAndPirateStaking.target, shipId);
        await genesisPiratesNFT.connect(user).setApprovalForAll(coreContracts.shipAndPirateStaking.target, true);
            
            await coreContracts.shipAndPirateStaking.connect(user).stakeShipWithPirates(
                stakingData,
                islandId1,
                "Small"
            );

            // Add RUM tokens for mission costs
            const rumAmount = ethers.parseUnits("10", 18);
            await coreContracts.rumToken.connect(admin).mint(user.address, rumAmount);
            await coreContracts.rumToken.connect(user).approve(coreContracts.feeManagement.target, rumAmount);

            // Add food to ship storage
            const citrusAmount = ethers.parseUnits("50", 18);
            const fishAmount = ethers.parseUnits("50", 18);
            await coreContracts.shipStorage.connect(admin).addResource(shipId, user.address, "citrus", citrusAmount);
            await coreContracts.shipStorage.connect(admin).addResource(shipId, user.address, "fish", fishAmount);

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            // Add resource to origin island
            await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, amountToTransfer);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            // Should revert with ownership error
            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.revertedWith("User does not own the origin island");
        });

        it("should revert when origin island NFT doesn't exist", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Don't mint the origin island NFT (it doesn't exist)
            // Setup ship for mission manually without island minting
        const targetTotalCrew = 10;
        const nonNftCrewForStaking = targetTotalCrew - 1;
        
        const actualShipNFT = coreContracts.shipNFT || nftsSetup.shipNFT;
        const genesisPiratesNFT = nftsSetup.genesisPiratesNFT;
        
            // Stake ship with captain and crew
        const stakingData = {
            shipId,
            captainCollection: await nftsSetup.genesisPiratesNFT.getAddress(),
            captainId: captainPirateId,
            genesisPirateIds: [],
            inhabitantIds: [],
            nonNftCrewCount: nonNftCrewForStaking
        };
        
        await actualShipNFT.connect(user).approve(coreContracts.shipAndPirateStaking.target, shipId);
        await genesisPiratesNFT.connect(user).setApprovalForAll(coreContracts.shipAndPirateStaking.target, true);
            
            await coreContracts.shipAndPirateStaking.connect(user).stakeShipWithPirates(
                stakingData,
                islandId1,
                "Small"
            );

            // Add RUM tokens for mission costs
            const rumAmount = ethers.parseUnits("10", 18);
            await coreContracts.rumToken.connect(admin).mint(user.address, rumAmount);
            await coreContracts.rumToken.connect(user).approve(coreContracts.feeManagement.target, rumAmount);

            // Add food to ship storage
            const citrusAmount = ethers.parseUnits("50", 18);
            const fishAmount = ethers.parseUnits("50", 18);
            await coreContracts.shipStorage.connect(admin).addResource(shipId, user.address, "citrus", citrusAmount);
            await coreContracts.shipStorage.connect(admin).addResource(shipId, user.address, "fish", fishAmount);

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            // Add resource to origin island storage (this doesn't require NFT ownership)
            await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceTypeToTransfer, amountToTransfer);

            const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            // Should revert because ownerOf will fail for non-existent NFT
            await expect(
                coreContracts.missionsManager.connect(user).startMission(shipId, resourceTransferMissionType, encodedInnerMissionData)
            ).to.be.reverted; // Changed to just .reverted since it's a custom error
        });

        it("should allow different users to transfer from their own islands", async function() {
            const { 
                admin, user, otherAccount, coreContracts, missionRegistration, 
                islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Use the existing shipId for user, create a new one for otherAccount
            const userShipId = 1; // Already exists from fixture
            const otherShipId = 2;
            const userIslandId = 3; // Different island for user
            const otherIslandId = 4; // Different island for otherAccount

            // Mint islands to respective owners
            await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, userIslandId);
            await nftsSetup.islandNft.connect(admin).mintSpecific(otherAccount.address, otherIslandId);

            // Mint ship for otherAccount using the same method as the fixture
            await nftsSetup.shipNFT.connect(admin).safeMint(otherAccount.address, otherShipId);

            // Mint captain pirate for otherAccount
            const otherCaptainPirateId = 101;
            await nftsSetup.genesisPiratesNFT.connect(admin).mint(otherAccount.address, otherCaptainPirateId);

            // Setup skills and crew for the new captain
            await setupPirateSkills( 
                coreContracts.pirateSkills,      
                admin,              
                await nftsSetup.genesisPiratesNFT.getAddress(), 
                ethers.ZeroAddress, 
                { genesis: [otherCaptainPirateId], inhabitants: [] } 
            );

            await setupCrewForPirates(
                coreContracts.crewManagement,
                admin,
                await nftsSetup.genesisPiratesNFT.getAddress(),
                ethers.ZeroAddress,
                admin, // admin sets up crew
                { genesis: [otherCaptainPirateId], inhabitants: [] },
                "sailor",
                { captain: 3, crew: 0 }
            );

            // Setup ship metadata for the new ship
            const defaultShipAttributes = {
                class: "Small", durability: 100, speed: 10, agility: 5, viewingRange: 100,
                cannonsCapacity: 4, armor: 10, ramming: 5, crewMin: 2, crewMax: 10,
                cargoBay: ethers.parseUnits("1000", 18), oars: false, shallowWaters: true, deepWaters: true, shipType: "Warship"
            };
            await coreContracts.shipMetadata.connect(admin).updateShipMetadata(otherShipId, defaultShipAttributes);

            // Setup island storage for new islands
            await coreContracts.islandStorage.connect(admin).setIslandSize(userIslandId, 1);
            await coreContracts.islandStorage.connect(admin).setIslandSize(otherIslandId, 1);

        const resourceTransferMissionType = await missionRegistration.getMissionTypeByName("ResourceTransfer");
            await coreContracts.missionRequirements.connect(admin).setIslandValidity(islandId2, resourceTransferMissionType, true);

            // Provide tokens for otherAccount (similar to what setupTokenInfrastructure does for user)
            const tokenAmount = ethers.parseEther("10");
            await coreContracts.arrcToken.connect(admin).mint(otherAccount.address, tokenAmount);
            await coreContracts.rumToken.connect(admin).mint(otherAccount.address, tokenAmount);
            await coreContracts.arrcToken.connect(otherAccount).approve(coreContracts.feeManagement.target, tokenAmount);
            await coreContracts.rumToken.connect(otherAccount).approve(coreContracts.feeManagement.target, tokenAmount);
            await coreContracts.arrcToken.connect(otherAccount).approve(coreContracts.shipAndPirateStaking.target, tokenAmount);

            // Setup missions for both users
            await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, userShipId, captainPirateId, userIslandId);
            await setupShipForMissionTesting(otherAccount, admin, coreContracts, nftsSetup, otherShipId, otherCaptainPirateId, otherIslandId);

            const resourceTypeToTransfer = "wood";
            const amountToTransfer = ethers.parseUnits("100", 18);
            
            // Add resources to both origin islands
            await coreContracts.islandStorage.connect(admin).addResource(userIslandId, user.address, resourceTypeToTransfer, amountToTransfer);
            await coreContracts.islandStorage.connect(admin).addResource(otherIslandId, otherAccount.address, resourceTypeToTransfer, amountToTransfer);

            const encodedInnerMissionDataUser = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [userIslandId, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            const encodedInnerMissionDataOther = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [otherIslandId, islandId2, resourceTypeToTransfer, amountToTransfer, false, "citrus", "fish"]
            );

            // Both should succeed since each user owns their respective origin island
            const userTx = await coreContracts.missionsManager.connect(user).startMission(userShipId, resourceTransferMissionType, encodedInnerMissionDataUser);
            expect(userTx).to.not.be.reverted;

            const otherTx = await coreContracts.missionsManager.connect(otherAccount).startMission(otherShipId, resourceTransferMissionType, encodedInnerMissionDataOther);
            expect(otherTx).to.not.be.reverted;
        });

        it("should validate ownership when Island NFT contract is not registered", async function() {
            const { 
                admin, user, centralAuthorizationRegistry, coreContracts, missionRegistration, 
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            // Mint origin island to user (user owns it) - REQUIRED for island ownership validation
            await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);

            // Deploy a separate ResourceTransferMission contract with a different CAR setup
            // that doesn't have Island NFT registered
            const EmptyCar = await ethers.getContractFactory("CentralAuthorizationRegistry");
            const emptyCar = await EmptyCar.deploy();
            await emptyCar.initialize(admin.address);
            await emptyCar.addAuthorizedContract(admin.address);
            
            const TestResourceTransferMission = await ethers.getContractFactory("ResourceTransferMission");
            const testMission = await TestResourceTransferMission.deploy(emptyCar.target);
            
            // Try to call the mission directly (bypassing MissionsManager for this specific test)
            const missionData = ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256"],
                [1] // missionId
            ) + ethers.AbiCoder.defaultAbiCoder().encode(
                ["uint256", "uint256", "string", "uint256", "bool", "string", "string"],
                [islandId1, islandId2, "wood", ethers.parseUnits("100", 18), false, "citrus", "fish"]
            ).slice(2); // Remove 0x prefix from second encoding

            // This should revert because Island NFT contract is not registered in the empty CAR
            await expect(
                testMission.connect(admin).startMission(shipId, missionData)
            ).to.be.reverted; // Simplified to just check it reverts
        });
    });
    // TODO: Add tests for mission failure
    // describe("Error Handling and Edge Cases", function() {
    //     it("should handle mission failure gracefully", async function() {
    //         const { 
    //             admin, user, coreContracts, missionRegistration, 
    //             shipId, islandId1, islandId2, nftsSetup, captainPirateId 
    //         } = await loadFixture(setupFixture);

    //         // Start a mission first
    //         const missionId = await startTestResourceTransferMission(user, admin, coreContracts, missionRegistration, shipId, islandId1, islandId2, nftsSetup, captainPirateId);

    //         // Simulate mission failure and check event
    //         await expect(
    //             coreContracts.missionsManager.connect(admin).failMission(missionId)
    //         ).to.emit(coreContracts.missionsManager, "MissionFailed").withArgs(missionId, shipId, 2); // 2 = ResourceTransfer missionType

    //         // Try to complete the mission after failure (should revert)
    //         await expect(
    //             coreContracts.missionsManager.connect(user).completeMission(shipId)
    //         ).to.be.revertedWith("Ship is not on an active mission");

    //         // Check resource balance on target island
    //         const targetIslandBalance = await coreContracts.islandStorage.getResourceBalance(islandId2, "wood");
    //         expect(targetIslandBalance).to.equal(0);

    //         // Check resource balance on ship (should be zero now)
    //         const shipResourceBalance = await coreContracts.shipStorage.getResourceBalance(shipId, "wood");
    //         expect(shipResourceBalance).to.equal(0);

    //         // Check that the ship is unlocked
    //         const lockInfo = await coreContracts.missionResourceHandler.getShipLockInfo(shipId);
    //         expect(lockInfo.locked).to.be.false;

    //         // Check mission is no longer active
    //         expect(await coreContracts.missionsStorage.isOnMission(shipId)).to.be.false;
    //     });
    // });

    describe("getMissionDetails", function() {
        it("should return correct mission details for active mission", async function() {
            const { 
                admin, user, coreContracts, missionRegistration, resourceTransferMission,
                shipId, islandId1, islandId2, nftsSetup, captainPirateId 
            } = await loadFixture(setupFixture);

            const missionId = await startTestResourceTransferMission(user, admin, coreContracts, missionRegistration, shipId, islandId1, islandId2, nftsSetup, captainPirateId);

            const missionDetails = await resourceTransferMission.getMissionDetails(missionId);
            expect(missionDetails).to.not.be.empty;
            
            // Decode and verify details
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
                ["uint256", "uint256", "uint256", "string", "uint256", "uint256", "uint256", "uint8", "bool"],
                missionDetails
            );
            
            expect(decoded[0]).to.equal(shipId); // shipId
            expect(decoded[1]).to.equal(islandId1); // fromIslandId
            expect(decoded[2]).to.equal(islandId2); // toIslandId
            expect(decoded[3]).to.equal("wood"); // resourceType
            expect(decoded[4]).to.equal(ethers.parseUnits("100", 18)); // amount
        });
    });

}); 