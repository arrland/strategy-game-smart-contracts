const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { 
    deployAndAuthorizeContract,
    setupCrewForPirates,
    setMissionActive,
    logContractAddresses,
    logCrewRequirements,
    stakeShipWithPirates,
    deployBaseInfrastructure,
    registerContractInterfaces,
    verifyContractState,
    createTestConfig,
    setupNFTsForStaking,
    setupStakingRequirements,
    prepareAssetsForStaking,
    setupPirateSkills,
    setupTokenInfrastructure,
    deployMockBuildingStorage
} = require("../utils");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers");

// Configuration for staking tests
const StakingConfig = createTestConfig({
    // Ship configuration
    ships: {
        MAIN_SHIP: { id: 1, name: "Main Test Ship" },
        SECONDARY_SHIP: { id: 2, name: "Secondary Test Ship" }
    },
    // Pirate configuration
    pirates: {
        CAPTAIN: { id: 1, collection: "genesis", type: "captain" },
        CREW_1: { id: 2, collection: "genesis", type: "crew" },
        CREW_2: { id: 3, collection: "genesis", type: "crew" }
    },
    // Ship attributes
    shipAttributes: {
        class: "Small",
        durability: 100,
        speed: 20,
        agility: 15,
        viewingRange: 10,
        cannonsCapacity: 10,
        armor: 50,
        ramming: 30,
        crewMin: 2,
        crewMax: 10,
        cargoBay: 1000,
        oars: false,
        shallowWaters: true,
        deepWaters: true,
        shipType: "Combat"
    },
    // Crew configuration
    crew: {
        crewType: "sailor",
        captainCrewCount: 3,
        regularCrewCount: 2
    }
});

describe("ShipAndPirateStaking", function () {
    // Main test state
    let state = {};
    
    // Setup fixtures
    async function setupFixture() {
        // Deploy base infrastructure
        const baseInfrastructure = await deployBaseInfrastructure();
        const { admin, user, centralAuthorizationRegistry } = baseInfrastructure;
        
        // Deploy NFTs first as IslandStorage depends on ShipNFT
        const nfts = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);
        const { shipNFT, genesisPiratesNFT, genesisPiratesAddress, inhabitantsNFT, inhabitantsAddress } = nfts;
        
        // Deploy IslandStorage (dependency for MockBuildingStorage)
        const islandStorage = await deployAndAuthorizeContract(
            "IslandStorage",
            centralAuthorizationRegistry,
            await shipNFT.getAddress(), // Pass ShipNFT address
            true // isNft721 = true
        );
        // Initialize island sizes (if needed for tests, adjust as necessary)
        await islandStorage.connect(admin).setIslandSize(1, 1); // Example: Island 1 = Small
        
        // Deploy MockBuildingStorage directly with required args
        const MockBuildingStorageFactory = await ethers.getContractFactory("MockBuildingStorage");
        const buildingStorage = await MockBuildingStorageFactory.deploy(
            await centralAuthorizationRegistry.getAddress(),
            await islandStorage.getAddress() 
        );
        await buildingStorage.waitForDeployment();

        // Authorize and register MockBuildingStorage in CAR
        await centralAuthorizationRegistry.addAuthorizedContract(await buildingStorage.getAddress());
        const storageKey = ethers.keccak256(ethers.toUtf8Bytes("IBuildingStorage"));
        await centralAuthorizationRegistry.setContractAddress(storageKey, await buildingStorage.getAddress());
        
        // Registry check for IBuildingStorage
        const key = ethers.keccak256(ethers.toUtf8Bytes("IBuildingStorage"));
        const registered = await centralAuthorizationRegistry.getContractAddress(key);
        console.log("[TEST] Registered IBuildingStorage:", registered);
        console.log("[TEST] MockBuildingStorage deployed at:", buildingStorage.target || buildingStorage.address);
        
        // Create another user for unauthorized tests
        const [, , unauthorized] = await ethers.getSigners();
        
        // Setup core contracts
        const coreContracts = await setupStakingRequirements(admin, centralAuthorizationRegistry, nfts);
        const { 
            shipMetadata,
            shipStorage,
            crewTypeManager, 
            crewManagement,
            pirateSkills,
            pirateSkillsReader,
            missionsStorage 
        } = coreContracts;
        
        // Deploy DockingManagement and register
        const dockingManagement = await deployAndAuthorizeContract(
            "DockingManagement",
            centralAuthorizationRegistry
        );
        
        // Deploy ShipAndPirateStaking
        const shipAndPirateStaking = await deployAndAuthorizeContract(
            "ShipAndPirateStaking",
            centralAuthorizationRegistry,
            await shipNFT.getAddress(),
            genesisPiratesAddress,
            inhabitantsAddress
        );

                // Deploy tokens
        const { arrcToken, rumToken, feeManagement } = await setupTokenInfrastructure(
                    centralAuthorizationRegistry, 
                    admin, 
            [user, unauthorized], 
            "1000"
        );
        
        // Setup pirate skills
        await setupPirateSkills(pirateSkills, admin, genesisPiratesAddress, inhabitantsAddress, {
            genesis: [StakingConfig.pirates.CAPTAIN.id, StakingConfig.pirates.CREW_1.id, StakingConfig.pirates.CREW_2.id],
            inhabitants: [1, 2, 3]
        });
        
        // Setup crew for pirates
        await setupCrewForPirates(
            crewManagement, 
            admin, 
            genesisPiratesAddress, 
            inhabitantsAddress, 
            user, 
            {
                genesis: [StakingConfig.pirates.CAPTAIN.id, StakingConfig.pirates.CREW_1.id, StakingConfig.pirates.CREW_2.id], 
                inhabitants: [1, 2, 3]
            }, 
            StakingConfig.crew.crewType, 
            {
                captain: StakingConfig.crew.captainCrewCount, 
                crew: StakingConfig.crew.regularCrewCount
            }
        );
        
        // Prepare ships, metadata and approvals
        await prepareAssetsForStaking(
            user, 
            admin, 
            { ...coreContracts, shipAndPirateStaking },
            nfts,
            StakingConfig
        );
        
        // Additional approval specifically for ShipAndPirateStaking
        await arrcToken.connect(user).approve(
            await shipAndPirateStaking.getAddress(), 
            ethers.parseEther("1000")
        );
        
        // Return all deployed contracts and config
        return {
            ...baseInfrastructure,
            unauthorized,
            nfts,
            islandStorage,
            ...coreContracts,
            dockingManagement,
            tokens: { arrcToken, rumToken },
            feeManagement,
            shipAndPirateStaking,
            config: StakingConfig
        };
    }

    beforeEach(async function () {
        state = await setupFixture();
        // Ensure FeeManagement address is available for tests needing it
        state.feeManagementAddress = await state.feeManagement.getAddress();
        // Pre-calculate expected fees for clarity in tests
        state.expectedStakeFeePerPirate = await state.feeManagement.stakePirateArrcFee(); 
        state.expectedRebaseFeePerPirate = ethers.parseUnits("0.1", 18); // 0.1 ARRC
    });

    describe("Deployment", function () {
        it("should deploy successfully with correct configuration", async function () {
            const { 
                shipAndPirateStaking, 
                nfts: { genesisPiratesAddress, inhabitantsAddress, shipNFT } 
            } = state;
            
            await verifyContractState(
                shipAndPirateStaking, 
                "genesisPiratesAddress", 
                genesisPiratesAddress,
                "Genesis pirates address should match"
            );
            
            await verifyContractState(
                shipAndPirateStaking, 
                "inhabitantsAddress", 
                inhabitantsAddress,
                "Inhabitants address should match"
            );
            
            await verifyContractState(
                shipAndPirateStaking, 
                "shipNft", 
                await shipNFT.getAddress(),
                "Ship NFT address should match"
            );
        });
    });

    describe("Ship Staking", function () {
        it("should stake a ship with a captain successfully", async function () {
            const { 
                shipAndPirateStaking, 
                user, 
                nfts: { shipNFT },
                dockingManagement,
                feeManagement,
                feeManagementAddress,
                expectedStakeFeePerPirate,
                config: { ships, pirates } 
            } = state;
            
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const { genesisPiratesAddress } = state.nfts;
            const homeIslandId = 1;
            const shipClass = "Small"; // Match config
            const totalPirates = 1; // Only captain
            const expectedFee = expectedStakeFeePerPirate * BigInt(totalPirates);

            const stakingData = {
                shipId: shipId,
                captainId: captainId,
                captainCollection: genesisPiratesAddress,
                genesisPirateIds: [],
                inhabitantIds: []
            };
            
            // Stake ship with captain using the helper, getting the promise
            const stakeTxPromise = stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                homeIslandId, // Pass homeIslandId
                shipClass, // Pass shipClass
                { returnTxPromise: true } // Get the promise back
            );

            // Now expect the ArrcBurned event from the promise
            await expect(stakeTxPromise)
                .to.emit(feeManagement, "ArrcBurned")
                .withArgs(user.address, expectedFee, "Staking");

            // Wait for the transaction to complete for subsequent checks
            const receipt = await (await stakeTxPromise).wait(); 

            // Check ShipDocked event via log parsing
            const iface = dockingManagement.interface;
            console.log("All logs:", receipt.logs);
            for (const log of receipt.logs) {
                try {
                    const parsed = iface.parseLog(log);
                    console.log("Parsed event:", parsed.name, parsed.args);
                } catch (e) {
                    // Not this contract's event
                }
            }
            const dockedEvent = receipt.logs
                .map(log => {
                    try { return iface.parseLog(log); } catch { return null; }
                })
                .find(e => e && e.name === "ShipDocked");
            expect(dockedEvent).to.not.be.undefined;
            expect(dockedEvent.args.shipId).to.equal(shipId);
            expect(dockedEvent.args.islandId).to.equal(1);
            expect(dockedEvent.args.owner).to.equal(user.address);
            expect(dockedEvent.args.slotsUsed).to.equal(1); // for "Small"
            
            // Verify ship is staked
            expect(await shipAndPirateStaking.isShipStaked(shipId)).to.be.true;
            expect(await shipAndPirateStaking.getShipOwner(shipId)).to.equal(user.address);
            
            // Verify NFT ownership transferred
            expect(await shipNFT.ownerOf(shipId)).to.equal(await shipAndPirateStaking.getAddress());
            
            // Verify ship data
            const shipInfo = await shipAndPirateStaking.getShipInfo(shipId);
            expect(shipInfo.owner).to.equal(user.address);
            expect(shipInfo.isStaked).to.be.true;
            expect(shipInfo.captainId).to.equal(captainId);
            
            // Verify user active ships
            const userShips = await shipAndPirateStaking.getUserActiveShips(user.address);
            expect(userShips.length).to.equal(1);
            expect(userShips[0]).to.equal(shipId);
        });
        
        it("should stake a ship with a captain and crew successfully", async function () {
            const { 
                shipAndPirateStaking, 
                user, 
                nfts: { shipNFT, genesisPiratesAddress },
                shipMetadata,
                crewManagement,
                crewTypeManager,
                dockingManagement,
                feeManagement,
                feeManagementAddress,
                expectedStakeFeePerPirate,
                config: { ships, pirates }
            } = state;

            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewIds = [pirates.CREW_1.id]; // One crew member
            const homeIslandId = 1;
            const shipClass = "Small"; // Match config
            const totalPirates = 1 + crewIds.length; // Captain + crew
            const expectedFee = expectedStakeFeePerPirate * BigInt(totalPirates);

            const stakingData = {
                shipId: shipId,
                captainId: captainId,
                captainCollection: genesisPiratesAddress,
                genesisPirateIds: crewIds,
                inhabitantIds: []
            };

            // Stake ship with captain and crew using the helper, getting the promise
            const stakeTxPromise = stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                crewIds,
                [],
                homeIslandId,
                shipClass,
                { returnTxPromise: true } // Get the promise back
            );

            // Now expect the ArrcBurned event from the promise
            await expect(stakeTxPromise)
                .to.emit(feeManagement, "ArrcBurned")
                .withArgs(user.address, expectedFee, "Staking");

            // Wait for the transaction to complete for subsequent checks
            await (await stakeTxPromise).wait();
            
            // Verify ship is staked
            expect(await shipAndPirateStaking.isShipStaked(shipId)).to.be.true;
            
            // Verify NFT ownership transferred
            expect(await shipNFT.ownerOf(shipId)).to.equal(await shipAndPirateStaking.getAddress());
            
            // Verify crew data
            const [captain, captainCollection, genesisCrew, inhabitantsCrew] = 
                await shipAndPirateStaking.getShipCrewDetails(shipId);
                
            expect(captain).to.equal(captainId);
            expect(captainCollection).to.equal(genesisPiratesAddress);
            expect(genesisCrew.length).to.equal(1);
            expect(genesisCrew[0]).to.equal(crewIds[0]);
            expect(inhabitantsCrew.length).to.equal(0);
            
            // Verify pirate assignments
            expect(await shipAndPirateStaking.getPirateShip(captainId)).to.equal(shipId);
            expect(await shipAndPirateStaking.getPirateShip(crewIds[0])).to.equal(shipId);
            expect(await shipAndPirateStaking.isPirateCaptain(captainId)).to.be.true;
            expect(await shipAndPirateStaking.isPirateCaptain(crewIds[0])).to.be.false;
        });
        
        it("should fail when staking a ship without being the owner", async function () {
            const { 
                shipAndPirateStaking, 
                unauthorized,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            
            // Try to stake ship as unauthorized user
            await expect(
                stakeShipWithPirates(
                    shipAndPirateStaking,
                    unauthorized,
                    shipId,
                    captainId,
                    genesisPiratesAddress,
                    [],
                    [],
                    1,
                    "Small"
                )
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "NotShipOwner");
        });
        
        it("should fail when staking a ship that's already staked", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            
            // First stake the ship
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                1,
                "Small"
            );
            
            // Try to stake the same ship again
            await expect(
                stakeShipWithPirates(
                    shipAndPirateStaking,
                    user,
                    shipId,
                    captainId,
                    genesisPiratesAddress,
                    [],
                    [],
                    1,
                    "Small"
                )
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "ShipAlreadyStaked");
        });
        
        it("should fail when trying to stake with insufficient crew", async function () {
            const { 
                shipAndPirateStaking, 
                user, 
                admin,
                crewManagement,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates, crew }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            
            // Remove crew from pirate
            await crewManagement.connect(admin).removeCrew(
                genesisPiratesAddress, 
                captainId, 
                user.address, 
                crew.crewType, 
                crew.captainCrewCount
            );
            
            // Try to stake with insufficient crew
            await expect(
                stakeShipWithPirates(
                    shipAndPirateStaking,
                    user,
                    shipId,
                    captainId,
                    genesisPiratesAddress,
                    [],
                    [],
                    1,
                    "Small"
                )
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "InsufficientEssentialCrew");
        });
    });

    describe("Pirate Staking", function () {
        it("should add a pirate to an already staked ship", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId = pirates.CREW_1.id;
            
            // First stake a ship with just the captain
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                1,
                "Small"
            );
            
            // Now add another pirate to the ship
            await shipAndPirateStaking.connect(user).stakePirate(shipId, crewId, genesisPiratesAddress);
            
            // Verify pirate is staked
            expect(await shipAndPirateStaking.getPirateShip(crewId)).to.equal(shipId);
            expect(await shipAndPirateStaking.getPirateCollection(crewId)).to.equal(genesisPiratesAddress);
            
            // Check crew details
            const [captain, captainCollection, genesisCrew, inhabitantsCrew] = 
                await shipAndPirateStaking.getShipCrewDetails(shipId);
                
            expect(genesisCrew.length).to.equal(1);
            expect(genesisCrew[0]).to.equal(crewId);
        });
        
        it("should fail when adding a pirate to a non-staked ship", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const crewId = pirates.CREW_1.id;
            
            // Try to add pirate to a non-staked ship
            await expect(
                shipAndPirateStaking.connect(user).stakePirate(shipId, crewId, genesisPiratesAddress)
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "ShipNotStaked");
        });
        
        it("should fail when adding a pirate without being the ship owner", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                unauthorized,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId = pirates.CREW_1.id;
            
            // First stake a ship with captain using utility function
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                1,
                "Small"
            );
            
            // Try to add pirate as unauthorized user
            await expect(
                shipAndPirateStaking.connect(unauthorized).stakePirate(shipId, crewId, genesisPiratesAddress)
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "NotShipOwner");
        });
        
        it("should fail when adding a captain that's already staked", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId1 = ships.MAIN_SHIP.id;
            const shipId2 = ships.SECONDARY_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId1 = pirates.CREW_1.id;
            const crewId2 = pirates.CREW_2.id;
            
            // First stake a ship with captain and crew
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId1,
                captainId,
                genesisPiratesAddress,
                [crewId1],
                [],
                1,
                "Small"
            );
            
            // Try to stake another ship with the same captain
            await expect(
                stakeShipWithPirates(
                    shipAndPirateStaking,
                    user,
                    shipId2,
                    captainId,
                    genesisPiratesAddress,
                    [crewId2],
                    [],
                    1,
                    "Small"
                )
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "PirateAlreadyStaked");
        });
        
        it("should fail when adding a pirate that's already staked", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId1 = ships.MAIN_SHIP.id;
            const shipId2 = ships.SECONDARY_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId1 = pirates.CREW_1.id;
            const crewId2 = pirates.CREW_2.id;
            
            // First stake a ship with captain and crew
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId1,
                captainId,
                genesisPiratesAddress,
                [crewId1],
                [],
                1,
                "Small"
            );
            
            // Try to stake another ship with a different captain but same crew
            await expect(
                stakeShipWithPirates(
                    shipAndPirateStaking,
                    user,
                    shipId2,
                    crewId2,
                    genesisPiratesAddress,
                    [crewId1], // Try to use already staked pirate
                    [],
                    1,
                    "Small"
                )
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "PirateAlreadyStaked");
        });

        it("should burn 0.5 ARRC when adding a pirate", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                feeManagement,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates },
                expectedStakeFeePerPirate // This should be 0.5 ARRC
            } = state;

            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewIdToAdd = pirates.CREW_1.id; // The pirate to add

            // First stake a ship with just the captain
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                1,
                "Small"
            );

            // Expect the ArrcBurned event when staking the additional pirate
            const stakePirateTx = shipAndPirateStaking.connect(user).stakePirate(shipId, crewIdToAdd, genesisPiratesAddress);

            await expect(stakePirateTx)
                .to.emit(feeManagement, "ArrcBurned")
                .withArgs(user.address, expectedStakeFeePerPirate, "StakingPirate"); // Verify 0.5 ARRC fee and action string
        });
    });

    describe("Unstaking", function () {
        it("should unstake a pirate successfully", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId = pirates.CREW_1.id;
            
            // First stake a ship with captain and crew
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [crewId],
                [],
                1,
                "Small"
            );
            
            // Unstake the pirate
            await shipAndPirateStaking.connect(user).unstakePirate(shipId, crewId);
            
            // Verify pirate is unstaked
            expect(await shipAndPirateStaking.getPirateShip(crewId)).to.equal(0);
            
            // Check crew details
            const [captain, captainCollection, genesisCrew, inhabitantsCrew] = 
                await shipAndPirateStaking.getShipCrewDetails(shipId);
                
            expect(genesisCrew.length).to.equal(0);
        });
        
        it("should fail when unstaking a captain", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            
            // First stake a ship with captain
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                1,
                "Small"
            );
            
            // Try to unstake the captain
            await expect(
                shipAndPirateStaking.connect(user).unstakePirate(shipId, captainId)
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "CannotRemoveCaptain");
        });
        
        it("should unstake a ship with all pirates successfully", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                nfts: { shipNFT, genesisPiratesAddress },
                dockingManagement,
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId = pirates.CREW_1.id;
            
            // First stake a ship with captain and crew
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [crewId],
                [],
                1,
                "Small"
            );
            
            // Unstake the whole ship and check ShipUndocked event via log parsing
            const tx = await shipAndPirateStaking.connect(user).unstakeShipAndPirates(shipId);
            const receipt = await tx.wait();
            const iface = dockingManagement.interface;
            const undockedEvent = receipt.logs
                .map(log => {
                    try { return iface.parseLog(log); } catch { return null; }
                })
                .find(e => e && e.name === "ShipUndocked");
            expect(undockedEvent).to.not.be.undefined;
            expect(undockedEvent.args.shipId).to.equal(shipId);
            expect(undockedEvent.args.islandId).to.equal(1);
            expect(undockedEvent.args.owner).to.equal(user.address);
            expect(undockedEvent.args.slotsFreed).to.equal(1); // for "Small"
            
            // Verify ship is unstaked
            expect(await shipAndPirateStaking.isShipStaked(shipId)).to.be.false;
            
            // Verify NFTs returned
            expect(await shipNFT.ownerOf(shipId)).to.equal(user.address);
            
            // Verify pirates are unstaked
            expect(await shipAndPirateStaking.getPirateShip(captainId)).to.equal(0);
            expect(await shipAndPirateStaking.getPirateShip(crewId)).to.equal(0);
            
            // Verify user active ships
            const userShips = await shipAndPirateStaking.getUserActiveShips(user.address);
            expect(userShips.length).to.equal(0);
        });
    });

    describe("Mission Constraints", function () {
        it("should prevent unstaking a ship on mission", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                missionsStorage,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            
            // First stake a ship with captain
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                1,
                "Small"
            );
            
            // Set ship as on mission
            await setMissionActive(missionsStorage, shipId, true);
            
            // Try to unstake the ship
            await expect(
                shipAndPirateStaking.connect(user).unstakeShipAndPirates(shipId)
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "ShipOnMission");
        });
        
        it("should prevent adding a pirate to a ship on mission", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                missionsStorage,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId = pirates.CREW_1.id;
            
            // First stake a ship with captain
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [],
                [],
                1,
                "Small"
            );
            
            // Set ship as on mission
            await setMissionActive(missionsStorage, shipId, true);
            
            // Try to add pirate to the ship
            await expect(
                shipAndPirateStaking.connect(user).stakePirate(shipId, crewId, genesisPiratesAddress)
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "ShipOnMission");
        });
        
        it("should prevent removing a pirate from a ship on mission", async function () {
            const { 
                shipAndPirateStaking, 
                user,
                missionsStorage,
                nfts: { genesisPiratesAddress },
                config: { ships, pirates }
            } = state;
            
            // Setup test variables
            const shipId = ships.MAIN_SHIP.id;
            const captainId = pirates.CAPTAIN.id;
            const crewId = pirates.CREW_1.id;
            
            // First stake a ship with captain and crew
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                genesisPiratesAddress,
                [crewId],
                [],
                1,
                "Small"
            );
            
            // Set ship as on mission
            await setMissionActive(missionsStorage, shipId, true);
            
            // Try to remove pirate from the ship
            await expect(
                shipAndPirateStaking.connect(user).unstakePirate(shipId, crewId)
            ).to.be.revertedWithCustomError(shipAndPirateStaking, "ShipOnMission");
        });
    });

    // Add new section or modify existing test for Rebasing
    describe("Ship Rebasing", function () {
        let state; // Define state variable accessible to all tests in this block

        beforeEach(async function () {
            state = await loadFixture(setupFixture); // Load fixture once before each test in this block
        });

        it("should rebase a ship to a new island successfully", async function () {
            // Use the state variable directly
            const { shipAndPirateStaking, shipNFT, dockingManagement, shipStorage, user, nfts } = state;
            const shipId = 1;
            const originalIslandId = 1;
            const targetIslandId = 2; // New island to rebase to
            const shipClass = "Small"; // Assuming ship 1 is small
            const captainCollection = nfts.genesisPiratesAddress; // Assuming captain is Genesis
            const captainId = 1; // Assuming captain ID is 1
            
            // Define expectedRebaseFeePerPirate directly in the test to avoid state issues
            const expectedRebaseFeePerPirate_test = ethers.parseUnits("0.1", 18); // 0.1 ARRC
            const numberOfPirates = 1n; // Only captain in this setup
            const expectedFee = expectedRebaseFeePerPirate_test * numberOfPirates; // Ensure BigInt calculation

            // Ensure the ship is initially docked using the helper
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                captainCollection,
                [],
                [],
                originalIslandId,
                shipClass
            );

            expect(await dockingManagement.getShipDockedIsland(shipId)).to.equal(originalIslandId);
            const expectedSlots = await dockingManagement.getSlotRequirementForShipClass(shipClass);

            // Ensure docking slots are available on the target island
            await state.islandStorage.connect(state.admin).setIslandSize(targetIslandId, 2); // Ensure target has slots

            // Perform the rebase operation
            const rebaseTx = shipAndPirateStaking.connect(user).rebaseShipHomeIsland(shipId, targetIslandId, shipClass);

            // Check for the ARRC fee burning event
            console.log("[TEST DEBUG] Expected Fee for Rebase:", expectedFee.toString()); // Log the expected fee
            await expect(rebaseTx)
                .to.emit(state.feeManagement, "ArrcBurned")
                .withArgs(user.address, expectedFee, "Rebasing"); // Use the calculated BigInt expectedFee directly

            // Check for the ShipRebased event from DockingManagement
            await expect(rebaseTx)
              .to.emit(dockingManagement, "ShipRebased"); // Event comes from DockingManagement

            // Verify the ship is now docked at the target island
            expect(await dockingManagement.getShipDockedIsland(shipId)).to.equal(targetIslandId);
        });

        it("should fail to rebase if target island has no slots", async function () {
            // Use the state variable directly
            const { shipAndPirateStaking, dockingManagement, islandStorage, admin, user, nfts } = state;
            const shipId = 1;
            const originalIslandId = 1;
            const targetIslandId = 2;
            const shipClass = "Medium"; // Changed from Small: Needs 2 slots
            const captainCollection = nfts.genesisPiratesAddress;
            const captainId = 1;

            // Stake the ship initially
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                captainCollection,
                [],
                [],
                originalIslandId,
                shipClass
            );

            // Configure the target island to ensure it *cannot* accommodate the ship.
            // We rely on the DockingManagement's logic (mocked or real) to determine this based on island/ship data.
            // Setting island size to 0 should ideally lead to canDock returning false.
            await islandStorage.connect(admin).setIslandSize(targetIslandId, 0); 

            // Verify the condition within the contract that should cause the revert
            
            const slotsRequired = await dockingManagement.getSlotRequirementForShipClass(shipClass);
            const canDockResult = await dockingManagement.canDock(targetIslandId, slotsRequired);
            console.log(`[TEST DEBUG] For targetIsland ${targetIslandId} (size 0) and shipClass ${shipClass} (slots ${slotsRequired}): canDock returned ${canDockResult}`);
            // This assertion helps confirm the mock setup is correct before testing the revert
            expect(canDockResult, "Mock setup error: canDock should return false for island with size 0 and Medium ship").to.be.false;
            

            // Attempt to rebase and expect specific revert reason due to lack of slots
            await expect(shipAndPirateStaking.connect(user).rebaseShipHomeIsland(shipId, targetIslandId, shipClass))
              .to.be.revertedWith("No docking slot available at new island"); // Reverted back to check string reason from ShipAndPirateStaking
        });

        it("should fail to rebase if ship is on mission", async function () {
            // Use the state variable directly
            const { shipAndPirateStaking, missionsStorage, user, nfts } = state;
            const shipId = 1;
            const originalIslandId = 1;
            const targetIslandId = 2;
            const shipClass = "Small"; // Keep as Small for this test
            const captainCollection = nfts.genesisPiratesAddress;
            const captainId = 1;

            // Stake the ship
            await stakeShipWithPirates(
                shipAndPirateStaking,
                user,
                shipId,
                captainId,
                captainCollection,
                [],
                [],
                originalIslandId,
                shipClass
            );

            // Set the ship as being on a mission using the helper
            await setMissionActive(missionsStorage, shipId, true);

            // Attempt to rebase
            await expect(shipAndPirateStaking.connect(user).rebaseShipHomeIsland(shipId, targetIslandId, shipClass))
              .to.be.revertedWithCustomError(shipAndPirateStaking, "ShipOnMission");
        });
    });

});
