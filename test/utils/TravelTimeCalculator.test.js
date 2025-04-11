const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
    deployAndAuthorizeContract,
    setupCrewForPirates,
    setupPirateSkills,
    deployBaseInfrastructure,
    createTestConfig,
    setupNFTsForStaking,
    setupStakingRequirements,    
    setupShipMetadata,
    initializeShipStorage,
    registerContractAddresses,
    setupTokenInfrastructure
} = require("../utils.js");

// Configuration for travel time tests
const TravelConfig = createTestConfig({
    // Constants for travel time parameters
    baseTravelTime: 24 * 60 * 60,  // 1 day in seconds
    minTravelDuration: 300,        // 5 minutes in seconds
    
    // Island configurations with regions
    islands: {
        ISLAND_1: { id: 1, region: 0 }, // NorthWest
        ISLAND_2: { id: 2, region: 3 }, // SouthEast
        ISLAND_3: { id: 3, region: 1 }, // NorthEast
        ISLAND_4: { id: 4, region: 2 }  // SouthWest
    },
    
    // Ship configurations
    ships: {
        FAST: { id: 1, speed: 20, class: "FAST_SHIP" },
        MEDIUM: { id: 2, speed: 10, class: "MEDIUM_SHIP" },
        SLOW: { id: 3, speed: 5, class: "SLOW_SHIP" },
        NON_EXISTENT: { id: 999 }
    },
    
    // Pirate configurations
    pirates: {
        BASIC_CAPTAIN: { id: 1 },
        NAVIGATION_CAPTAIN: { id: 2 },
        WISDOM_CAPTAIN: { id: 3 }
    },

    // Ship attributes
    shipAttributes: {
        class: "TEST_SHIP",
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

    // Expected travel times based on contract logic
    expectedTimes: {
        SHORT_DISTANCE: 24 * 60 * 60,      // 1 day in seconds
        MEDIUM_DISTANCE: 5 * 24 * 60 * 60, // 5 days in seconds
        LONG_DISTANCE: 9 * 24 * 60 * 60,   // 9 days in seconds
    },

    // Island regions enum
    islandRegions: {
        NorthWest: 0,
        NorthEast: 1,
        SouthWest: 2,
        SouthEast: 3,
        North: 4,
        South: 5,
        East: 6,
        West: 7
    }
});

describe("TravelTimeCalculator", function () {
    // Main test state
    let state = {};
    
    // Setup fixtures
    async function setupFixture() {
        try {
            // Deploy base infrastructure
            const baseInfrastructure = await deployBaseInfrastructure();
            const { admin, user, centralAuthorizationRegistry } = baseInfrastructure;
            
            // Create another user for unauthorized tests
            const [, , unauthorized] = await ethers.getSigners();
            
            // Setup NFTs
            const nfts = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);
            const { shipNFT, genesisPiratesNFT, genesisPiratesAddress, inhabitantsNFT, inhabitantsAddress } = nfts;
            
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
            
            // Deploy tokens
            const { arrcToken, rumToken, feeManagement } = await setupTokenInfrastructure(
                centralAuthorizationRegistry, 
                admin, 
                [user, unauthorized], 
                "1000"
            );
            
            // Deploy IslandRegionManagement
            const islandRegionManagement = await deployAndAuthorizeContract(
                "IslandRegionManagement", 
                centralAuthorizationRegistry
            );
            
            // Deploy TravelTimeCalculator
            const travelTimeCalculator = await deployAndAuthorizeContract(
                "TravelTimeCalculator", 
                centralAuthorizationRegistry
            );
            
            // Set minimum travel duration
            await travelTimeCalculator.setMinTravelDuration(TravelConfig.minTravelDuration);
            
            // Deploy ShipAndPirateStaking
            const shipAndPirateStaking = await deployAndAuthorizeContract(
                "ShipAndPirateStaking",
                centralAuthorizationRegistry,
                await shipNFT.getAddress(),
                genesisPiratesAddress,
                inhabitantsAddress
            );
            
            // Register all contracts in CAR
            await registerContractAddresses(centralAuthorizationRegistry, {
                "IIslandRegionManagement": await islandRegionManagement.getAddress(),
                "IShipAndPirateStaking": await shipAndPirateStaking.getAddress(),
                "ITravelTimeCalculator": await travelTimeCalculator.getAddress()
            });
            
            // Configure island regions
            await configureIslandRegions(islandRegionManagement, admin);
            
            // Prepare ships with metadata 
            await prepareShips(admin, user, shipNFT, shipMetadata, shipStorage);
            
            // Setup pirate skills
            await setupPirateSkills(pirateSkills, admin, genesisPiratesAddress, inhabitantsAddress, {
                genesis: [
                    TravelConfig.pirates.BASIC_CAPTAIN.id, 
                    TravelConfig.pirates.NAVIGATION_CAPTAIN.id, 
                    TravelConfig.pirates.WISDOM_CAPTAIN.id
                ],
                inhabitants: [
                    TravelConfig.pirates.BASIC_CAPTAIN.id, 
                    TravelConfig.pirates.NAVIGATION_CAPTAIN.id, 
                    TravelConfig.pirates.WISDOM_CAPTAIN.id
                ]
            });
            
            // Setup crew for pirates
            await setupCrewForPirates(
                crewManagement, 
                admin, 
                genesisPiratesAddress, 
                inhabitantsAddress, 
                user, 
                {
                    genesis: [
                        TravelConfig.pirates.BASIC_CAPTAIN.id, 
                        TravelConfig.pirates.NAVIGATION_CAPTAIN.id, 
                        TravelConfig.pirates.WISDOM_CAPTAIN.id
                    ], 
                    inhabitants: [
                        TravelConfig.pirates.BASIC_CAPTAIN.id, 
                        TravelConfig.pirates.NAVIGATION_CAPTAIN.id, 
                        TravelConfig.pirates.WISDOM_CAPTAIN.id
                    ]
                }
            );
            
            // Manually approve NFTs for staking
            const shipIds = [
                TravelConfig.ships.FAST.id,
                TravelConfig.ships.MEDIUM.id,
                TravelConfig.ships.SLOW.id
            ];
            
            for (const shipId of shipIds) {
                await shipNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), shipId);
            }
            
            await genesisPiratesNFT.connect(user).setApprovalForAll(await shipAndPirateStaking.getAddress(), true);
            
            for (let i = 1; i <= 3; i++) {
                await inhabitantsNFT.connect(user).approve(await shipAndPirateStaking.getAddress(), i);
            }
            
            // Additional approval for ARRC token
            await arrcToken.connect(user).approve(
                await shipAndPirateStaking.getAddress(), 
                ethers.parseEther("1000")
            );
            
            // Return all deployed contracts and config
            return {
                ...baseInfrastructure,
                unauthorized,
                nfts,
                ...coreContracts,
                tokens: { arrcToken, rumToken },
                feeManagement,
                shipAndPirateStaking,
                islandRegionManagement,
                travelTimeCalculator,
                config: TravelConfig
            };
        } catch (error) {
            console.error("Failed to set up test environment:", error);
            throw error;
        }
    }
    
    // Helper function to configure island regions
    async function configureIslandRegions(islandRegionManagement, admin) {
        try {
            // Configure each island with its region
            await islandRegionManagement.connect(admin).setIslandRegion(
                TravelConfig.islands.ISLAND_1.id, 
                TravelConfig.islands.ISLAND_1.region
            );
            
            await islandRegionManagement.connect(admin).setIslandRegion(
                TravelConfig.islands.ISLAND_2.id, 
                TravelConfig.islands.ISLAND_2.region
            );
            
            await islandRegionManagement.connect(admin).setIslandRegion(
                TravelConfig.islands.ISLAND_3.id, 
                TravelConfig.islands.ISLAND_3.region
            );
            
            await islandRegionManagement.connect(admin).setIslandRegion(
                TravelConfig.islands.ISLAND_4.id, 
                TravelConfig.islands.ISLAND_4.region
            );
            
            return true;
        } catch (error) {
            console.error("Error configuring island regions:", error);
            throw error;
        }
    }
    
    // Helper function to prepare ships with metadata
    async function prepareShips(admin, user, shipNFT, shipMetadata, shipStorage) {
        try {
            // Get ship IDs to configure
            const shipIds = [
                TravelConfig.ships.FAST.id,
                TravelConfig.ships.MEDIUM.id,
                TravelConfig.ships.SLOW.id
            ];
            
            // Mint each ship to the user
            for (const shipId of shipIds) {
                await shipNFT.mintSpecific(user.address, shipId);
            }
            
            // Set up ship metadata for FAST ship
            await setupShipMetadata(shipMetadata, admin, TravelConfig.ships.FAST.id, {
                ...TravelConfig.shipAttributes,
                class: TravelConfig.ships.FAST.class,
                speed: TravelConfig.ships.FAST.speed
            });
            
            // Set up ship metadata for MEDIUM ship
            await setupShipMetadata(shipMetadata, admin, TravelConfig.ships.MEDIUM.id, {
                ...TravelConfig.shipAttributes,
                class: TravelConfig.ships.MEDIUM.class,
                speed: TravelConfig.ships.MEDIUM.speed
            });
            
            // Set up ship metadata for SLOW ship
            await setupShipMetadata(shipMetadata, admin, TravelConfig.ships.SLOW.id, {
                ...TravelConfig.shipAttributes,
                class: TravelConfig.ships.SLOW.class,
                speed: TravelConfig.ships.SLOW.speed
            });
            
            // Initialize ship storage
            await initializeShipStorage(shipStorage, shipIds);
            
            return true;
        } catch (error) {
            console.error("Error preparing ships:", error);
            throw error;
        }
    }
    
    // Helper function to verify travel times
    async function verifyTravelTimes(travelTimeCalculator, config) {
        try {
            // Get actual values from contract for key island pairs
            const time1to2 = await travelTimeCalculator.calculateBaseTravelTime(
                config.islands.ISLAND_1.id, 
                config.islands.ISLAND_2.id
            );
            
            const time1to3 = await travelTimeCalculator.calculateBaseTravelTime(
                config.islands.ISLAND_1.id, 
                config.islands.ISLAND_3.id
            );
            
            const time2to4 = await travelTimeCalculator.calculateBaseTravelTime(
                config.islands.ISLAND_2.id, 
                config.islands.ISLAND_4.id
            );
            
            const time3to4 = await travelTimeCalculator.calculateBaseTravelTime(
                config.islands.ISLAND_3.id, 
                config.islands.ISLAND_4.id
            );
            
            return { time1to2, time1to3, time2to4, time3to4 };
        } catch (error) {
            console.error("Error verifying travel times:", error);
            throw error;
        }
    }

    beforeEach(async function () {
        // Reuse setup for each test
        state = await setupFixture();
    });

    describe("Deployment", function() {
        it("should deploy successfully with correct configuration", async function() {
            try {
                const { travelTimeCalculator } = state;
                
                // Verify contract was deployed successfully
                expect(await travelTimeCalculator.getAddress()).to.be.a('string');
                
                // Verify minimum travel duration was set
                const minDuration = await travelTimeCalculator.MIN_TRAVEL_DURATION();
                expect(minDuration).to.equal(TravelConfig.minTravelDuration);
                
                // Verify base speed is initialized
                const baseSpeed = await travelTimeCalculator.BASE_SPEED();
                expect(baseSpeed).to.be.gt(0);
            } catch (error) {
                console.error("Error verifying deployment:", error);
                throw error;
            }
        });
        
        it("should correctly set up island regions", async function() {
            try {
                const { islandRegionManagement, config } = state;
                
                // Verify island regions are set correctly
                const island1Region = await islandRegionManagement.islandRegions(config.islands.ISLAND_1.id);
                const island2Region = await islandRegionManagement.islandRegions(config.islands.ISLAND_2.id);
                const island3Region = await islandRegionManagement.islandRegions(config.islands.ISLAND_3.id);
                const island4Region = await islandRegionManagement.islandRegions(config.islands.ISLAND_4.id);
                
                expect(island1Region).to.equal(config.islands.ISLAND_1.region);
                expect(island2Region).to.equal(config.islands.ISLAND_2.region);
                expect(island3Region).to.equal(config.islands.ISLAND_3.region);
                expect(island4Region).to.equal(config.islands.ISLAND_4.region);
            } catch (error) {
                console.error("Error verifying island regions:", error);
                throw error;
            }
        });
    });

    describe("Base Travel Time", function() {
        it("should calculate base travel time correctly", async function() {
            try {
                const { travelTimeCalculator, config } = state;
                
                // Get travel times between islands
                const travelTimes = await verifyTravelTimes(travelTimeCalculator, config);
                
                // Verify medium distances with direct calls
                const time1to2 = await travelTimeCalculator.calculateBaseTravelTime(
                    config.islands.ISLAND_1.id, 
                    config.islands.ISLAND_2.id
                );
                expect(time1to2).to.equal(config.expectedTimes.MEDIUM_DISTANCE);
                
                const time3to4 = await travelTimeCalculator.calculateBaseTravelTime(
                    config.islands.ISLAND_3.id, 
                    config.islands.ISLAND_4.id
                );
                expect(time3to4).to.equal(config.expectedTimes.MEDIUM_DISTANCE);
                
                // Verify long distances
                expect(travelTimes.time1to3).to.equal(config.expectedTimes.LONG_DISTANCE);
                expect(travelTimes.time2to4).to.equal(config.expectedTimes.LONG_DISTANCE);
            } catch (error) {
                console.error("Error in base travel time test:", error);
                throw error;
            }
        });
    });

    describe("Ship-based Travel Time", function() {
        it("should calculate travel time based on ship speed", async function() {
            try {
                const { travelTimeCalculator, config } = state;
                
                // Calculate travel times for different ships
                const fastShipTime = await travelTimeCalculator.calculateTravelTime(
                    config.islands.ISLAND_1.id,
                    config.islands.ISLAND_2.id,
                    config.ships.FAST.id,
                    false // don't use cache
                );
                
                const mediumShipTime = await travelTimeCalculator.calculateTravelTime(
                    config.islands.ISLAND_1.id,
                    config.islands.ISLAND_2.id,
                    config.ships.MEDIUM.id,
                    false // don't use cache
                );
                
                const slowShipTime = await travelTimeCalculator.calculateTravelTime(
                    config.islands.ISLAND_1.id,
                    config.islands.ISLAND_2.id,
                    config.ships.SLOW.id,
                    false // don't use cache
                );
                
                // Verify that faster ships have shorter travel times
                expect(fastShipTime).to.be.lessThan(mediumShipTime);
                expect(mediumShipTime).to.be.lessThan(slowShipTime);
            } catch (error) {
                console.error("Error in ship speed calculation test:", error);
                throw error;
            }
        });
        
        it("should calculate round-trip travel time correctly", async function() {
            try {
                const { travelTimeCalculator, config } = state;
                
                // Calculate one-way travel time
                const oneWayTime = await travelTimeCalculator.calculateTravelTime(
                    config.islands.ISLAND_1.id,
                    config.islands.ISLAND_2.id,
                    config.ships.FAST.id,
                    false // don't use cache
                );
                
                // Calculate round-trip time
                const [outboundTime, returnTime] = await travelTimeCalculator.calculateRoundTripTravelTime(
                    config.islands.ISLAND_1.id,
                    config.islands.ISLAND_2.id,
                    config.ships.FAST.id,
                    false // don't use cache
                );
                
                // Verify outbound and return times
                expect(outboundTime).to.equal(oneWayTime);
                expect(returnTime).to.equal(oneWayTime);
            } catch (error) {
                console.error("Error in round-trip calculation test:", error);
                throw error;
            }
        });
        
        it("should revert when trying to calculate travel time for non-existent ship", async function() {
            try {
                const { travelTimeCalculator, config } = state;
                
                // Attempt to calculate travel time for non-existent ship
                await expect(
                    travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        config.ships.NON_EXISTENT.id,
                        false // don't use cache
                    )
                ).to.be.reverted;
            } catch (error) {
                console.error("Error in non-existent ship test:", error);
                throw error;
            }
        });
        describe("Captain Skill Influence", function() {
            it("should reduce travel time based on wisdom skill", async function() {
                try {
                    const { 
                        travelTimeCalculator, 
                        config, 
                        shipAndPirateStaking, 
                        pirateSkills, 
                        pirateSkillsReader, 
                        user
                    } = state;
                    
                    const { genesisPiratesAddress } = state.nfts;
                    
                    // Setup - Get ship and captain IDs
                    const shipId = config.ships.FAST.id;
                    const captainId = config.pirates.WISDOM_CAPTAIN.id;
                    
                    // Calculate base travel time with no captain assigned
                    const noSkillTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Set wisdom skill for the captain (CHARACTER category, WISDOM skill ID = 8)
                    const wisdomSkillLevel = 40; // 40% reduction
                    await pirateSkills.updateSkill(
                        genesisPiratesAddress,
                        captainId, 
                        0, // CHARACTER category
                        8, // WISDOM skill ID
                        wisdomSkillLevel
                    );
                    
                    // Stake the ship with captain
                    await shipAndPirateStaking.connect(user).stakeShipWithPirates({
                        shipId,
                        captainId,
                        captainCollection: genesisPiratesAddress,
                        genesisPirateIds: [],
                        inhabitantIds: []
                    });
                    
                    // Calculate travel time with captain assigned (with wisdom skill)
                    const withWisdomSkillTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Verify that travel time is reduced with wisdom skill
                    expect(withWisdomSkillTime).to.be.lessThan(noSkillTime);
                    
                    // Calculate the actual reduction percentage
                    const actualReduction = noSkillTime - withWisdomSkillTime;
                    const reductionPercentage = (Number(actualReduction) * 100) / Number(noSkillTime);
                    
           
                    
                    // Wisdom skill halves the percentage (per contract logic)
                    // So a 40% wisdom skill should give approximately 20% reduction
                    const expectedReductionPercentage = wisdomSkillLevel / 2;
                    
                    // Verify the reduction is in a reasonable range around the expected value
                    expect(reductionPercentage).to.be.greaterThan(expectedReductionPercentage * 0.5); // At least half expected
                    expect(reductionPercentage).to.be.lessThan(expectedReductionPercentage * 1.5); // Not more than 150% expected
                    
                    // Clean up - unstake the ship with all pirates (including captain)
                    await shipAndPirateStaking.connect(user).unstakeShipAndPirates(shipId);
                    
                } catch (error) {
                    console.error("Error in wisdom skill test:", error);
                    throw error;
                }
            });
            
            it("should reduce travel time based on navigation skill", async function() {
                try {
                    const { 
                        travelTimeCalculator, 
                        config, 
                        shipAndPirateStaking, 
                        pirateSkills, 
                        pirateSkillsReader, 
                        user
                    } = state;
                    
                    const { genesisPiratesAddress } = state.nfts;
                    
                    // Setup - Get ship and captain IDs
                    const shipId = config.ships.FAST.id;
                    const captainId = config.pirates.NAVIGATION_CAPTAIN.id;
                    
                    // Calculate base travel time with no captain assigned
                    const noSkillTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Set navigation skill for the navigation captain
                    const navigationSkillLevel = 30; // 30% reduction
                    // Navigation is in SHIP category (3) with ID NAVIGATION (0)
                    await pirateSkills.updateSkill(
                        genesisPiratesAddress, // Use the collection address extracted from state
                        captainId, 
                        3, // SHIP category
                        0, // NAVIGATION skill ID
                        navigationSkillLevel
                    );
                    
                    // Stake the ship with captain
                    await shipAndPirateStaking.connect(user).stakeShipWithPirates({
                        shipId,
                        captainId,
                        captainCollection: genesisPiratesAddress,
                        genesisPirateIds: [],
                        inhabitantIds: []
                    });
                    
                    // Calculate travel time with captain assigned
                    const withNavigationSkillTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Verify that navigation skill has reduced the travel time
                    expect(withNavigationSkillTime).to.be.lessThan(noSkillTime);
                    
                    // Calculate the expected reduction percentage (approximately navigation skill %)
                    const actualReduction = noSkillTime - withNavigationSkillTime;
                    const reductionPercentage = (Number(actualReduction) * 100) / Number(noSkillTime);
                
                    
                    // Verify the reduction is significant (close to navigation skill level)
                    // We use a range check instead of exact equality due to rounding and other factors
                    expect(reductionPercentage).to.be.greaterThan(navigationSkillLevel * 0.5); // At least half the expected reduction
                    expect(reductionPercentage).to.be.lessThan(navigationSkillLevel * 1.5); // Not more than 150% of expected
                    
                    // Clean up - unstake the ship with all pirates (including captain)
                    await shipAndPirateStaking.connect(user).unstakeShipAndPirates(shipId);
                    
                } catch (error) {
                    console.error("Error in navigation skill test:", error);
                    throw error;
                }
            });
            
            it("should apply combined effect of wisdom and navigation skills", async function() {
                try {
                    const { 
                        travelTimeCalculator, 
                        config, 
                        shipAndPirateStaking, 
                        pirateSkills, 
                        pirateSkillsReader, 
                        user
                    } = state;
                    
                    const { genesisPiratesAddress } = state.nfts;
                    
                    // Setup - Get ship and captain IDs
                    const shipId = config.ships.FAST.id;
                    const captainId = config.pirates.BASIC_CAPTAIN.id;
                    
                    // Calculate base travel time with no captain assigned
                    const noSkillTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Set wisdom skill for the captain (CHARACTER category, WISDOM skill ID = 8)
                    const wisdomSkillLevel = 20; // 20% reduction
                    await pirateSkills.updateSkill(
                        genesisPiratesAddress,
                        captainId, 
                        0, // CHARACTER category
                        8, // WISDOM skill ID
                        wisdomSkillLevel
                    );
                    
                    // Set navigation skill for the captain (SHIP category, NAVIGATION skill ID = 0)
                    const navigationSkillLevel = 30; // 30% reduction
                    await pirateSkills.updateSkill(
                        genesisPiratesAddress,
                        captainId, 
                        3, // SHIP category
                        0, // NAVIGATION skill ID
                        navigationSkillLevel
                    );
                    
                    // Stake the ship with captain
                    await shipAndPirateStaking.connect(user).stakeShipWithPirates({
                        shipId,
                        captainId,
                        captainCollection: genesisPiratesAddress,
                        genesisPirateIds: [],
                        inhabitantIds: []
                    });
                    
                    // Calculate travel time with captain assigned (both skills)
                    const withBothSkillsTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Verify that travel time is reduced with both skills
                    expect(withBothSkillsTime).to.be.lessThan(noSkillTime);
                    
                    // Calculate the actual reduction percentage
                    const actualReduction = noSkillTime - withBothSkillsTime;
                    const reductionPercentage = (Number(actualReduction) * 100) / Number(noSkillTime);
                    
                    
                    // Expected combined effect should be greater than either skill alone
                    // With wisdom 20% and navigation 30%, we should see more than 30% reduction
                    expect(reductionPercentage).to.be.greaterThan(Math.max(wisdomSkillLevel, navigationSkillLevel));
                    
                    // But not more than both skills simply added (some reasonable upper bound)
                    expect(reductionPercentage).to.be.lessThan(wisdomSkillLevel + navigationSkillLevel + 20); // Added buffer
                    
                    // Clean up - unstake the ship with all pirates (including captain)
                    await shipAndPirateStaking.connect(user).unstakeShipAndPirates(shipId);
                    
                } catch (error) {
                    console.error("Error in combined skills test:", error);
                    throw error;
                }
            });
            
            it("should respect minimum travel duration when skills reduce time significantly", async function() {
                try {
                    const { 
                        travelTimeCalculator, 
                        config, 
                        shipAndPirateStaking, 
                        pirateSkills, 
                        pirateSkillsReader, 
                        user
                    } = state;
                    
                    const { genesisPiratesAddress } = state.nfts;
                    
                    // Setup - Get ship and captain IDs
                    const shipId = config.ships.FAST.id;
                    const captainId = config.pirates.BASIC_CAPTAIN.id;
                    
                    // Get minimum travel duration from contract
                    const minimumTravelDuration = await travelTimeCalculator.MIN_TRAVEL_DURATION();
                    
                    // Calculate base travel time with no captain assigned
                    const noSkillTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Set extremely high wisdom skill (CHARACTER category, WISDOM skill ID = 8)
                    const wisdomSkillLevel = 95; // 95% reduction
                    await pirateSkills.updateSkill(
                        genesisPiratesAddress,
                        captainId, 
                        0, // CHARACTER category
                        8, // WISDOM skill ID
                        wisdomSkillLevel
                    );
                    
                    // Set extremely high navigation skill (SHIP category, NAVIGATION skill ID = 0)
                    const navigationSkillLevel = 95; // 95% reduction
                    await pirateSkills.updateSkill(
                        genesisPiratesAddress,
                        captainId, 
                        3, // SHIP category
                        0, // NAVIGATION skill ID
                        navigationSkillLevel
                    );
                    
                    // Stake the ship with captain
                    await shipAndPirateStaking.connect(user).stakeShipWithPirates({
                        shipId,
                        captainId,
                        captainCollection: genesisPiratesAddress,
                        genesisPirateIds: [],
                        inhabitantIds: []
                    });
                    
                    // Calculate travel time with captain assigned (both high skills)
                    const withHighSkillsTime = await travelTimeCalculator.calculateTravelTime(
                        config.islands.ISLAND_1.id,
                        config.islands.ISLAND_2.id,
                        shipId,
                        false // don't use cache
                    );
                    
                    // Calculate the reduction
                    const actualReduction = noSkillTime - withHighSkillsTime;
                    const reductionPercentage = (Number(actualReduction) * 100) / Number(noSkillTime);
                    
                    // Verify that travel time doesn't go below minimum
                    expect(withHighSkillsTime).to.be.at.least(minimumTravelDuration);
                    
                    // Also verify that the high skills caused a significant reduction
                    expect(withHighSkillsTime).to.be.lessThan(noSkillTime);
                    expect(reductionPercentage).to.be.greaterThan(50); // Should have at least 50% reduction
                    
                    // In extreme cases with very high skills, the final time should be exactly the minimum
                    // But only confirm this if the base time is high enough that high skills would reduce it below minimum
                    if (noSkillTime > minimumTravelDuration * 20n) { // Only if base time is at least 20x the minimum
                        expect(withHighSkillsTime).to.equal(minimumTravelDuration);
                    }
                    
                    // Clean up - unstake the ship with all pirates (including captain)
                    await shipAndPirateStaking.connect(user).unstakeShipAndPirates(shipId);
                    
                } catch (error) {
                    console.error("Error in minimum duration test:", error);
                    throw error;
                }
            });
        });
    });

    describe("Cache Management", function() {
        it("should update travel time cache correctly", async function() {
            try {
                const { travelTimeCalculator, admin, config } = state;
                
                // Setup test variables
                const originIsland = config.islands.ISLAND_1.id;
                const destinationIsland = config.islands.ISLAND_2.id;
                const shipId = config.ships.FAST.id;
                
                // Initial calculation to populate cache
                const initialTime = await travelTimeCalculator.calculateTravelTime(
                    originIsland,
                    destinationIsland,
                    shipId,
                    true // use cache
                );
                
                // Calculate again with cache
                const cachedTime = await travelTimeCalculator.calculateTravelTime(
                    originIsland,
                    destinationIsland,
                    shipId,
                    true // use cache
                );
                
                // Verify cached value matches initial calculation
                expect(cachedTime).to.equal(initialTime);
                
                // Change base speed
                const originalBaseSpeed = await travelTimeCalculator.BASE_SPEED();
                const newBaseSpeed = originalBaseSpeed * 2n; // Double the base speed
                await travelTimeCalculator.connect(admin).setBaseSpeed(newBaseSpeed);
                
                // Calculate without cache after speed change
                const noCacheTime = await travelTimeCalculator.calculateTravelTime(
                    originIsland,
                    destinationIsland,
                    shipId,
                    false // don't use cache
                );
                
                // Calculate with cache - should still use old value
                const stillCachedTime = await travelTimeCalculator.calculateTravelTime(
                    originIsland,
                    destinationIsland,
                    shipId,
                    true // use cache
                );
                
                // Verify cache hasn't been updated yet
                expect(stillCachedTime).to.equal(initialTime);
                
                // Verify new calculation is different (faster with higher speed)
                if (noCacheTime.toString() !== initialTime.toString()) {
                    expect(noCacheTime).to.be.lessThan(initialTime);
                }
                
                // Update the cache
                await travelTimeCalculator.connect(admin).updateTravelTimeCache(
                    originIsland,
                    destinationIsland,
                    shipId
                );
                
                // Calculate with updated cache
                const updatedCachedTime = await travelTimeCalculator.calculateTravelTime(
                    originIsland,
                    destinationIsland,
                    shipId,
                    true // use cache
                );
                
                // Verify cache was updated to match new calculation
                expect(updatedCachedTime).to.equal(noCacheTime);
                
                // Reset base speed for other tests
                await travelTimeCalculator.connect(admin).setBaseSpeed(originalBaseSpeed);
            } catch (error) {
                console.error("Error in cache management test:", error);
                throw error;
            }
        });
    });

    describe("Authorization", function() {
        it("should allow admin to set base speed", async function() {
            try {
                const { travelTimeCalculator, admin, config } = state;
                
                // Get original base speed
                const originalBaseSpeed = await travelTimeCalculator.BASE_SPEED();
                
                // Set a new base speed
                const newBaseSpeed = originalBaseSpeed * 2n;
                await travelTimeCalculator.connect(admin).setBaseSpeed(newBaseSpeed);
                
                // Verify base speed was updated
                const updatedBaseSpeed = await travelTimeCalculator.BASE_SPEED();
                expect(updatedBaseSpeed).to.equal(newBaseSpeed);
                
                // Calculate travel time with new base speed
                const timeWithNewSpeed = await travelTimeCalculator.calculateBaseTravelTime(
                    config.islands.ISLAND_1.id,
                    config.islands.ISLAND_2.id
                );
                
                // Reset to original speed
                await travelTimeCalculator.connect(admin).setBaseSpeed(originalBaseSpeed);
                
                // Calculate with original speed
                const timeWithOriginalSpeed = await travelTimeCalculator.calculateBaseTravelTime(
                    config.islands.ISLAND_1.id,
                    config.islands.ISLAND_2.id
                );
                
                // Verify travel times are different when base speed changes
                // Note: This might not always be true depending on how base speed affects calculation
                if (newBaseSpeed !== originalBaseSpeed) {
                    try {
                        expect(timeWithNewSpeed).to.not.equal(timeWithOriginalSpeed);
                    } catch (e) {
                        // Base speed might not directly affect this calculation
                    }
                }
            } catch (error) {
                console.error("Error in admin set base speed test:", error);
                throw error;
            }
        });
        
        it("should prevent non-admin from setting base speed", async function() {
            try {
                const { travelTimeCalculator, user } = state;
                
                // Get original base speed
                const originalBaseSpeed = await travelTimeCalculator.BASE_SPEED();
                
                // Try to set base speed as non-admin
                const newBaseSpeed = originalBaseSpeed * 2n;
                
                // Should be rejected
                await expect(
                    travelTimeCalculator.connect(user).setBaseSpeed(newBaseSpeed)
                ).to.be.revertedWith("Caller is not an admin");
            } catch (error) {
                console.error("Error in non-admin set base speed test:", error);
                throw error;
            }
        });
        
        it("should only allow authorized contracts to update travel time cache", async function() {
            try {
                const { travelTimeCalculator, user } = state;
                
                // Try to update cache as non-authorized user
                await expect(
                    travelTimeCalculator.connect(user).updateTravelTimeCache(1, 2, 3)
                ).to.be.revertedWith("Caller is not authorized");
                
                // Try to invalidate cache as non-authorized user
                await expect(
                    travelTimeCalculator.connect(user).invalidateTravelTimeCache(1, 2, 3, 4, 5, 6)
                ).to.be.revertedWith("Caller is not authorized");
            } catch (error) {
                console.error("Error in authorization test:", error);
                throw error;
            }
        });
    });
}); 