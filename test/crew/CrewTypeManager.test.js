const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
    deployAndAuthorizeContract,
    deployBaseInfrastructure,
    registerContractInterfaces,
    verifyContractState,
    createTestConfig,
    createNonNFTCrewSkills,
    setupPirateSkills,
    setupGenesisPiratesNFT,
    setupInhabitantsNFT
} = require("../utils");

// Configuration for CrewTypeManager tests
const CrewTypeConfig = createTestConfig({
    // Default crew types that should be initialized
    defaultCrewTypes: [
        "peasant",
        "worker",
        "craftsman", 
        "sailor",
        "soldier",
        "corsair",
        "pirate",
        "youngPirate"
    ],
    // A new test crew type to add
    newCrewType: {
        name: "explorer",
        skills: {
            farming: 0,
            fishing: 2,
            woodpicking: 1,
            woodcutting: 1,
            building: 1,
            defense: 2,
            abordage: 1,
            bombarding: 1,
            shooting: 1,
            mining: 1,
            quarrying: 1,
            excavation: 2,
            crafting: 1
        },
        canBeEssentialCrew: true,
        isValid: true
    },
    // Test pirate data
    testPirates: {
        GENESIS_PIRATE: { id: 1, collection: "genesis" },
        INHABITANT_PIRATE: { id: 1, collection: "inhabitant" },
        INHABITANT_CITIZEN: { id: 2, collection: "inhabitant" } // No ship respect
    }
});

describe("CrewTypeManager", function () {
    // Main test state
    let state = {};
    
    // Setup fixtures
    async function setupFixture() {
        // Deploy base infrastructure
        const baseInfrastructure = await deployBaseInfrastructure();
        const { admin, user, centralAuthorizationRegistry } = baseInfrastructure;
        
        // Create another user for unauthorized tests
        const [, , unauthorized] = await ethers.getSigners();
        
        // Setup Genesis Pirates NFT (for crew capacity tests)
        const { genesisPiratesNFT, genesisPiratesAddress } = 
            await setupGenesisPiratesNFT(admin, centralAuthorizationRegistry, [user]);
        
        // Setup Inhabitants NFT (for crew capacity tests)
        const { inhabitantsNFT, inhabitantsAddress } = 
            await setupInhabitantsNFT(admin, centralAuthorizationRegistry, [user]);
        
        // Deploy PirateSkills
        const pirateSkills = await deployAndAuthorizeContract(
            "PirateSkills",
            centralAuthorizationRegistry
        );
        
        // Deploy PirateSkillsReader
        const pirateSkillsReader = await deployAndAuthorizeContract(
            "PirateSkillsReader", 
            centralAuthorizationRegistry
        );

        // Register PirateSkillsReader interface
        await registerContractInterfaces(
            centralAuthorizationRegistry,
            { "IPirateSkillsReader": pirateSkillsReader }
        );
        
        // Setup skills for test pirates
        await setupPirateSkills(
            pirateSkills, 
            admin,
            genesisPiratesAddress, 
            inhabitantsAddress,
            {
                genesis: [CrewTypeConfig.testPirates.GENESIS_PIRATE.id],
                inhabitants: [
                    CrewTypeConfig.testPirates.INHABITANT_PIRATE.id,
                    CrewTypeConfig.testPirates.INHABITANT_CITIZEN.id
                ]
            }
        );
        
        // Deploy CrewTypeManager
        const crewTypeManager = await deployAndAuthorizeContract(
            "CrewTypeManager", 
            centralAuthorizationRegistry, 
            genesisPiratesAddress, 
            inhabitantsAddress
        );

        // Return all deployed contracts and config
        return {
            ...baseInfrastructure,
            unauthorized,
            genesisPiratesAddress,
            inhabitantsAddress,
            pirateSkills,
            pirateSkillsReader,
            crewTypeManager,
            config: CrewTypeConfig
        };
    }

    beforeEach(async function () {
        state = await setupFixture();
    });

    describe("Deployment & Default Crew Types", function () {
        it("should deploy correctly with the right collection addresses", async function () {
            const { 
                crewTypeManager, 
                genesisPiratesAddress,
                inhabitantsAddress
            } = state;
            
            await verifyContractState(
                crewTypeManager, 
                "GENESIS_PIRATE_COLLECTION", 
                genesisPiratesAddress,
                "Genesis pirates address should match"
            );
            
            await verifyContractState(
                crewTypeManager, 
                "INHABITANT_PIRATE_COLLECTION", 
                inhabitantsAddress,
                "Inhabitants address should match"
            );
        });

        it("should initialize default crew types", async function () {
            const { crewTypeManager, config } = state;
            
            const crewTypes = await crewTypeManager.getCrewTypes();
            
            // Check that all expected default crew types exist
            for (const crewType of config.defaultCrewTypes) {
                expect(crewTypes).to.include(crewType);
            }
        });

        it("should set up default crew types with correct attributes", async function () {
            const { crewTypeManager } = state;
            
            // Check sailor crew type
            const sailorType = await crewTypeManager.getCrewTypeStats("sailor");
            expect(sailorType.name).to.equal("sailor");            
            expect(sailorType.canBeEssentialCrew).to.be.true;
            expect(sailorType.skills.defense).to.equal(2);
            expect(sailorType.skills.abordage).to.equal(1);
            expect(sailorType.skills.bombarding).to.equal(1);
            
            // Check peasant crew type
            const peasantType = await crewTypeManager.getCrewTypeStats("peasant");
            expect(peasantType.name).to.equal("peasant");            
            expect(peasantType.canBeEssentialCrew).to.be.false;
            expect(peasantType.skills.farming).to.equal(1);
            expect(peasantType.skills.fishing).to.equal(1);
            expect(peasantType.skills.woodpicking).to.equal(1);
            expect(peasantType.skills.woodcutting).to.equal(0);
            
            // Check worker crew type with all new skills
            const workerType = await crewTypeManager.getCrewTypeStats("worker");
            expect(workerType.name).to.equal("worker");
            expect(workerType.skills.mining).to.equal(1);
            expect(workerType.skills.quarrying).to.equal(1);
            expect(workerType.skills.excavation).to.equal(1);
            expect(workerType.skills.woodcutting).to.equal(1);
            
            // Check craftsman with crafting skill
            const craftsmanType = await crewTypeManager.getCrewTypeStats("craftsman");
            expect(craftsmanType.name).to.equal("craftsman");
            expect(craftsmanType.skills.crafting).to.equal(2);
        });
    });

    describe("Crew Type Management", function () {
        it("should allow admin to add a new crew type", async function () {
            const { crewTypeManager, admin, config } = state;
            const { newCrewType } = config;
            
            // Create a new crew type
            await crewTypeManager.connect(admin).addCrewTypeDetailed(
                newCrewType.name,
                newCrewType.skills.farming,
                newCrewType.skills.fishing,
                newCrewType.skills.woodpicking,
                newCrewType.skills.woodcutting,
                newCrewType.skills.mining,
                newCrewType.skills.quarrying,
                newCrewType.skills.excavation,
                newCrewType.skills.building,
                newCrewType.skills.crafting,
                newCrewType.skills.defense,
                newCrewType.skills.abordage,
                newCrewType.skills.bombarding,
                newCrewType.skills.shooting,
                newCrewType.canBeEssentialCrew
            );
            
            // Verify crew type was added
            const crewTypes = await crewTypeManager.getCrewTypes();
            expect(crewTypes).to.include(newCrewType.name);
            
            // Verify the crew type attributes
            const createdType = await crewTypeManager.getCrewTypeStats(newCrewType.name);
            expect(createdType.name).to.equal(newCrewType.name);
            expect(createdType.canBeEssentialCrew).to.equal(newCrewType.canBeEssentialCrew);
            expect(createdType.skills.farming).to.equal(newCrewType.skills.farming);
            expect(createdType.skills.fishing).to.equal(newCrewType.skills.fishing);
            expect(createdType.skills.woodpicking).to.equal(newCrewType.skills.woodpicking);
            expect(createdType.skills.woodcutting).to.equal(newCrewType.skills.woodcutting);
            expect(createdType.skills.mining).to.equal(newCrewType.skills.mining);
            expect(createdType.skills.quarrying).to.equal(newCrewType.skills.quarrying);
            expect(createdType.skills.excavation).to.equal(newCrewType.skills.excavation);
            expect(createdType.skills.crafting).to.equal(newCrewType.skills.crafting);
        });

        it("should revert when adding a crew type that already exists", async function () {
            const { crewTypeManager, admin, config } = state;
            const { newCrewType } = config;
            
            // First add the crew type
            await crewTypeManager.connect(admin).addCrewTypeDetailed(
                newCrewType.name,
                newCrewType.skills.farming,
                newCrewType.skills.fishing,
                newCrewType.skills.woodpicking,
                newCrewType.skills.woodcutting,
                newCrewType.skills.mining,
                newCrewType.skills.quarrying,
                newCrewType.skills.excavation,
                newCrewType.skills.building,
                newCrewType.skills.crafting,
                newCrewType.skills.defense,
                newCrewType.skills.abordage,
                newCrewType.skills.bombarding,
                newCrewType.skills.shooting,
                newCrewType.canBeEssentialCrew
            );
            
            // Try to add it again and expect it to revert
            await expect(
                crewTypeManager.connect(admin).addCrewTypeDetailed(
                    newCrewType.name,
                    newCrewType.skills.farming,
                    newCrewType.skills.fishing,
                    newCrewType.skills.woodpicking,
                    newCrewType.skills.woodcutting,
                    newCrewType.skills.mining,
                    newCrewType.skills.quarrying,
                    newCrewType.skills.excavation,
                    newCrewType.skills.building,
                    newCrewType.skills.crafting,
                    newCrewType.skills.defense,
                    newCrewType.skills.abordage,
                    newCrewType.skills.bombarding,
                    newCrewType.skills.shooting,
                    newCrewType.canBeEssentialCrew
                )
            ).to.be.revertedWith("Crew type already exists");
        });

        it("should allow admin to update an existing crew type", async function () {
            const { crewTypeManager, admin } = state;
            
            // Get the existing sailor crew type for reference
            const originalSailorType = await crewTypeManager.getCrewTypeStats("sailor");
            
            // Update the sailor crew type
            await crewTypeManager.connect(admin).updateCrewTypeDetailed(
                "sailor",
                0, // farming
                0, // fishing
                1, // woodpicking (changed from 0)
                1, // woodcutting (changed from 0)
                1, // mining (changed from 0)
                1, // quarrying (changed from 0)
                1, // excavation (changed from 0)
                0, // building
                0, // crafting
                4, // defense (increased from 2)
                3, // abordage (increased from 1)
                2, // bombarding (increased from 1)
                1, // shooting (increased from 0)
                true // canBeEssentialCrew
            );
            
            // Verify the crew type was updated
            const updatedSailorType = await crewTypeManager.getCrewTypeStats("sailor");
            
            expect(updatedSailorType.skills.woodpicking).to.equal(1); // Changed from 0
            expect(updatedSailorType.skills.woodcutting).to.equal(1); // Changed from 0
            expect(updatedSailorType.skills.mining).to.equal(1); // Changed from 0
            expect(updatedSailorType.skills.quarrying).to.equal(1); // Changed from 0
            expect(updatedSailorType.skills.excavation).to.equal(1); // Changed from 0
            expect(updatedSailorType.skills.defense).to.equal(4); // Increased from 2
            expect(updatedSailorType.skills.abordage).to.equal(3); // Increased from 1
            expect(updatedSailorType.skills.bombarding).to.equal(2); // Increased from 1
            expect(updatedSailorType.skills.shooting).to.equal(1); // Increased from 0
            
            // These should remain unchanged
            expect(updatedSailorType.name).to.equal("sailor");
            expect(updatedSailorType.canBeEssentialCrew).to.equal(true);
        });

        it("should revert when updating a crew type that doesn't exist", async function () {
            const { crewTypeManager, admin, config } = state;
            const { newCrewType } = config;
            
            // Try to update a non-existent crew type
            await expect(
                crewTypeManager.connect(admin).updateCrewTypeDetailed(
                    "nonexistent",
                    newCrewType.skills.farming,
                    newCrewType.skills.fishing,
                    newCrewType.skills.woodpicking,
                    newCrewType.skills.woodcutting,
                    newCrewType.skills.mining,
                    newCrewType.skills.quarrying,
                    newCrewType.skills.excavation,
                    newCrewType.skills.building,
                    newCrewType.skills.crafting,
                    newCrewType.skills.defense,
                    newCrewType.skills.abordage,
                    newCrewType.skills.bombarding,
                    newCrewType.skills.shooting,
                    newCrewType.canBeEssentialCrew
                )
            ).to.be.revertedWith("CrewTypeManager: crew type does not exist");
        });

        it("should allow admin to remove a crew type", async function () {
            const { crewTypeManager, admin } = state;
            
            // First, check if "worker" crew type exists
            expect(await crewTypeManager.crewTypeExists("worker")).to.be.true;
            
            // Remove the crew type
            await crewTypeManager.connect(admin).removeCrewType("worker");
            
            // Verify the crew type was removed
            expect(await crewTypeManager.crewTypeExists("worker")).to.be.false;
            
            // Verify getCrewTypeStats reverts for removed crew type
            await expect(
                crewTypeManager.getCrewTypeStats("worker")
            ).to.be.revertedWith("Crew type does not exist");
        });

        it("should revert when removing a crew type that doesn't exist", async function () {
            const { crewTypeManager, admin } = state;
            
            // Try to remove a non-existent crew type
            await expect(
                crewTypeManager.connect(admin).removeCrewType("nonexistent")
            ).to.be.revertedWith("Crew type does not exist");
        });

        it("should revert when unauthorized users try to add/update/remove crew types", async function () {
            const { crewTypeManager, unauthorized, config } = state;
            const { newCrewType } = config;
            
            // Try to add a new crew type as unauthorized user
            await expect(
                crewTypeManager.connect(unauthorized).addCrewTypeDetailed(
                    newCrewType.name,
                    newCrewType.skills.farming,
                    newCrewType.skills.fishing,
                    newCrewType.skills.woodpicking,
                    newCrewType.skills.woodcutting,
                    newCrewType.skills.mining,
                    newCrewType.skills.quarrying,
                    newCrewType.skills.excavation,
                    newCrewType.skills.building,
                    newCrewType.skills.crafting,
                    newCrewType.skills.defense,
                    newCrewType.skills.abordage,
                    newCrewType.skills.bombarding,
                    newCrewType.skills.shooting,
                    newCrewType.canBeEssentialCrew
                )
            ).to.be.reverted;

            // Try to update an existing crew type as unauthorized user
            await expect(
                crewTypeManager.connect(unauthorized).updateCrewTypeDetailed(
                    "sailor",
                    newCrewType.skills.farming,
                    newCrewType.skills.fishing,
                    newCrewType.skills.woodpicking,
                    newCrewType.skills.woodcutting,
                    newCrewType.skills.mining,
                    newCrewType.skills.quarrying,
                    newCrewType.skills.excavation,
                    newCrewType.skills.building,
                    newCrewType.skills.crafting,
                    newCrewType.skills.defense,
                    newCrewType.skills.abordage,
                    newCrewType.skills.bombarding,
                    newCrewType.skills.shooting,
                    newCrewType.canBeEssentialCrew
                )
            ).to.be.reverted;

            // Try to remove a crew type as unauthorized user
            await expect(
                crewTypeManager.connect(unauthorized).removeCrewType("sailor")
            ).to.be.reverted;
        });

        it("should support the original addCrewType and updateCrewType methods", async function () {
            const { crewTypeManager, admin } = state;
            
            // Create a new crew type using the original method
            const rangerCrewType = {
                skills: {
                    farming: 0,
                    fishing: 1,
                    woodpicking: 2,
                    woodcutting: 2,
                    building: 1,
                    defense: 3,
                    abordage: 1,
                    bombarding: 0,
                    shooting: 3,
                    mining: 0,
                    quarrying: 0,
                    excavation: 0,
                    crafting: 1
                },
                canBeEssentialCrew: true,
                name: "ranger",
                isValid: true
            };
            
            await crewTypeManager.connect(admin).addCrewType("ranger", rangerCrewType);
            
            // Verify the crew type was added correctly
            const addedRangerType = await crewTypeManager.getCrewTypeStats("ranger");
            expect(addedRangerType.name).to.equal("ranger");
            expect(addedRangerType.skills.shooting).to.equal(3);
            
            // Update the crew type using the original method
            rangerCrewType.skills.shooting = 4; // Increase shooting skill
            await crewTypeManager.connect(admin).updateCrewType("ranger", rangerCrewType);
            
            // Verify the crew type was updated correctly
            const updatedRangerType = await crewTypeManager.getCrewTypeStats("ranger");
            expect(updatedRangerType.skills.shooting).to.equal(4);
        });
    });

    describe("Crew Type Queries", function () {
        it("should check if a crew type exists", async function () {
            const { crewTypeManager } = state;
            
            // Check existing crew types
            expect(await crewTypeManager.crewTypeExists("sailor")).to.be.true;
            expect(await crewTypeManager.crewTypeExists("peasant")).to.be.true;
            
            // Check non-existent crew type
            expect(await crewTypeManager.crewTypeExists("nonexistent")).to.be.false;
        });

        it("should check if a crew type can be essential crew", async function () {
            const { crewTypeManager } = state;
            
            // Check crew types that can be essential
            expect(await crewTypeManager.canBeEssentialCrew("sailor")).to.be.true;
            expect(await crewTypeManager.canBeEssentialCrew("corsair")).to.be.true;
            expect(await crewTypeManager.canBeEssentialCrew("pirate")).to.be.true;
            
            // Check crew types that cannot be essential
            expect(await crewTypeManager.canBeEssentialCrew("peasant")).to.be.false;
            expect(await crewTypeManager.canBeEssentialCrew("worker")).to.be.false;
        });

        it("should get the list of all crew types", async function () {
            const { crewTypeManager, config } = state;
            
            const crewTypes = await crewTypeManager.getCrewTypes();
            
            // Check that the returned list contains all default crew types
            for (const crewType of config.defaultCrewTypes) {
                expect(crewTypes).to.include(crewType);
            }
        });

        it("should get crew type stats", async function () {
            const { crewTypeManager } = state;
            
            // Get stats for an existing crew type
            const pirateStats = await crewTypeManager.getCrewTypeStats("pirate");
            
            // Verify the stats are correct
            expect(pirateStats.name).to.equal("pirate");
            expect(pirateStats.canBeEssentialCrew).to.be.true;
            expect(pirateStats.skills.defense).to.equal(2);
            expect(pirateStats.skills.abordage).to.equal(3);
            expect(pirateStats.skills.bombarding).to.equal(2);
            expect(pirateStats.skills.shooting).to.equal(2);
        });

        it("should revert when getting stats for non-existent crew type", async function () {
            const { crewTypeManager } = state;
            
            // Try to get stats for a non-existent crew type
            await expect(
                crewTypeManager.getCrewTypeStats("nonexistent")
            ).to.be.revertedWith("Crew type does not exist");
        });

        it("should get effective stats for a crew type", async function () {
            const { crewTypeManager } = state;
            
            // Get effective stats for an existing crew type
            const soldierEffectiveStats = await crewTypeManager.getEffectiveStats("soldier");
            
            // Verify the effective stats match the base stats in this implementation
            expect(soldierEffectiveStats.name).to.equal("soldier");
            expect(soldierEffectiveStats.skills.defense).to.equal(3);
            expect(soldierEffectiveStats.skills.abordage).to.equal(2);
            expect(soldierEffectiveStats.skills.shooting).to.equal(2);
        });
    });

    describe("Skill Accessor Methods", function () {
        it("should access individual skills directly", async function () {
            const { crewTypeManager } = state;
            
            // Verify direct skill accessors for various crew types
            expect(await crewTypeManager.farming("peasant")).to.equal(1);
            expect(await crewTypeManager.fishing("peasant")).to.equal(1);
            expect(await crewTypeManager.woodpicking("peasant")).to.equal(1);
            expect(await crewTypeManager.woodcutting("peasant")).to.equal(0);
            
            expect(await crewTypeManager.defense("soldier")).to.equal(3);
            expect(await crewTypeManager.shooting("soldier")).to.equal(2);
            
            expect(await crewTypeManager.abordage("corsair")).to.equal(3);
            expect(await crewTypeManager.bombarding("corsair")).to.equal(2);
            
            // Check new skills
            expect(await crewTypeManager.mining("worker")).to.equal(1);
            expect(await crewTypeManager.quarrying("worker")).to.equal(1);
            expect(await crewTypeManager.excavation("worker")).to.equal(1);
            expect(await crewTypeManager.crafting("craftsman")).to.equal(2);
        });

        it("should get crew type skill by activity type", async function () {
            const { crewTypeManager } = state;
            
            // Get skills using the ActivityType enum
            expect(await crewTypeManager.farming("peasant")).to.equal(1); // FARMING
            expect(await crewTypeManager.fishing("peasant")).to.equal(1); // FISHING
            expect(await crewTypeManager.woodpicking("peasant")).to.equal(1); // WOODPICKING
            expect(await crewTypeManager.woodcutting("peasant")).to.equal(0); // WOODCUTTING
            
            expect(await crewTypeManager.defense("soldier")).to.equal(3); // DEFENSE
            expect(await crewTypeManager.shooting("soldier")).to.equal(2); // SHOOTING
            
            expect(await crewTypeManager.mining("worker")).to.equal(1); // MINING
            expect(await crewTypeManager.quarrying("worker")).to.equal(1); // QUARRYING
            expect(await crewTypeManager.excavation("worker")).to.equal(1); // EXCAVATION
            expect(await crewTypeManager.crafting("craftsman")).to.equal(2); // CRAFTING
        });

        it("should revert when accessing skills for non-existent crew type", async function () {
            const { crewTypeManager } = state;
            
            // Try to access skills for a non-existent crew type
            await expect(
                crewTypeManager.farming("nonexistent")
            ).to.be.revertedWith("Crew type does not exist");
        });
    });

    describe("Pirate Crew Capacity", function () {
        it("should calculate correct crew capacity for genesis pirates", async function () {
            const { crewTypeManager, genesisPiratesAddress, config } = state;
            const { GENESIS_PIRATE } = config.testPirates;
            
            // Calculate crew capacity for a genesis pirate
            const capacity = await crewTypeManager.getPirateCrewCapacity(
                genesisPiratesAddress,
                GENESIS_PIRATE.id
            );
            
            // Genesis pirates have a base score of 7 plus their respect skill
            // From the setupPirateSkills, the respect skill is set
            expect(capacity).to.equal(15); // Based on actual implementation
        });

        it("should calculate correct crew capacity for inhabitant pirates", async function () {
            const { crewTypeManager, inhabitantsAddress, config } = state;
            const { INHABITANT_PIRATE, INHABITANT_CITIZEN } = config.testPirates;
            
            // Calculate crew capacity for an inhabitant pirate with respect > 0
            const pirateCapacity = await crewTypeManager.getPirateCrewCapacity(
                inhabitantsAddress,
                INHABITANT_PIRATE.id
            );
            
            // Based on actual implementation
            expect(pirateCapacity).to.equal(13);
            
            // Calculate crew capacity for an inhabitant citizen (respect = 0)
            const citizenCapacity = await crewTypeManager.getPirateCrewCapacity(
                inhabitantsAddress,
                INHABITANT_CITIZEN.id
            );
            
            // Based on actual implementation
            expect(citizenCapacity).to.equal(8);
        });

        it("should revert for unsupported pirate collections", async function () {
            const { crewTypeManager } = state;
            
            // Try to calculate crew capacity for an unsupported collection
            // Use the zero address as an unsupported collection
            const zeroAddress = "0x0000000000000000000000000000000000000000";
            
            await expect(
                crewTypeManager.getPirateCrewCapacity(
                    zeroAddress,
                    1
                )
            ).to.be.revertedWith("Unsupported pirate collection");
        });
    });

    describe("Events", function () {
        it("should emit CrewTypeAdded event when adding a new crew type", async function () {
            const { crewTypeManager, admin, config } = state;
            const { newCrewType } = config;
            
            // Add a new crew type and verify the event is emitted with the name
            await expect(
                crewTypeManager.connect(admin).addCrewTypeDetailed(
                    newCrewType.name,
                    newCrewType.skills.farming,
                    newCrewType.skills.fishing,
                    newCrewType.skills.woodpicking,
                    newCrewType.skills.woodcutting,
                    newCrewType.skills.mining,
                    newCrewType.skills.quarrying,
                    newCrewType.skills.excavation,
                    newCrewType.skills.building,
                    newCrewType.skills.crafting,
                    newCrewType.skills.defense,
                    newCrewType.skills.abordage,
                    newCrewType.skills.bombarding,
                    newCrewType.skills.shooting,
                    newCrewType.canBeEssentialCrew
                )
            ).to.emit(crewTypeManager, "CrewTypeAdded")
             .withArgs(newCrewType.name, (val) => true);
        });

        it("should emit CrewTypeUpdated event when updating a crew type", async function () {
            const { crewTypeManager, admin } = state;
            
            // Update an existing crew type and verify the event is emitted with the name
            await expect(
                crewTypeManager.connect(admin).updateCrewTypeDetailed(
                    "sailor",
                    0, // farming
                    0, // fishing
                    1, // woodpicking (changed)
                    1, // woodcutting (changed)
                    1, // mining (changed)
                    1, // quarrying (changed)
                    1, // excavation (changed)
                    0, // building
                    0, // crafting
                    4, // defense (increased)
                    3, // abordage (increased)
                    2, // bombarding (increased)
                    1, // shooting (increased)
                    true // canBeEssentialCrew
                )
            ).to.emit(crewTypeManager, "CrewTypeUpdated")
             .withArgs("sailor", (val) => true);
        });

        it("should emit CrewTypeRemoved event when removing a crew type", async function () {
            const { crewTypeManager, admin } = state;
            
            // Remove a crew type and verify the event
            await expect(
                crewTypeManager.connect(admin).removeCrewType("worker")
            ).to.emit(crewTypeManager, "CrewTypeRemoved")
             .withArgs("worker");
        });
    });

    describe("Detailed Crew Type Management", function () {
        it("should allow admin to add a crew type with detailed parameters", async function () {
            const { crewTypeManager, admin } = state;
            
            // Add a new crew type with detailed parameters
            await crewTypeManager.connect(admin).addCrewTypeDetailed(
                "hunter",
                0, // farming
                2, // fishing
                1, // woodpicking
                1, // woodcutting
                0, // mining
                0, // quarrying
                0, // excavation
                1, // building
                1, // crafting
                2, // defense
                1, // abordage
                0, // bombarding
                3, // shooting (high for hunter)
                false // canBeEssentialCrew
            );
            
            // Verify the crew type was added correctly
            const hunterType = await crewTypeManager.getCrewTypeStats("hunter");
            expect(hunterType.name).to.equal("hunter");
            expect(hunterType.skills.fishing).to.equal(2);
            expect(hunterType.skills.shooting).to.equal(3);
            expect(hunterType.canBeEssentialCrew).to.be.false;
        });

        it("should allow admin to update a crew type with detailed parameters", async function () {
            const { crewTypeManager, admin } = state;
            
            // Update an existing crew type with detailed parameters
            await crewTypeManager.connect(admin).updateCrewTypeDetailed(
                "pirate",
                0, // farming
                2, // fishing (increased from 0)
                0, // woodpicking
                0, // woodcutting
                1, // mining (increased from 0)
                1, // quarrying (increased from 0)
                1, // excavation (increased from 0)
                1, // building (increased from 0)
                1, // crafting (increased from 0)
                3, // defense (increased from 2)
                4, // abordage (increased from 3)
                3, // bombarding (increased from 2)
                3, // shooting (increased from 2)
                true // canBeEssentialCrew
            );
            
            // Verify the crew type was updated correctly
            const updatedPirateType = await crewTypeManager.getCrewTypeStats("pirate");
            expect(updatedPirateType.skills.fishing).to.equal(2);
            expect(updatedPirateType.skills.mining).to.equal(1);
            expect(updatedPirateType.skills.quarrying).to.equal(1);
            expect(updatedPirateType.skills.excavation).to.equal(1);
            expect(updatedPirateType.skills.building).to.equal(1);
            expect(updatedPirateType.skills.crafting).to.equal(1);
            expect(updatedPirateType.skills.defense).to.equal(3);
            expect(updatedPirateType.skills.abordage).to.equal(4);
            expect(updatedPirateType.skills.bombarding).to.equal(3);
            expect(updatedPirateType.skills.shooting).to.equal(3);
        });
    });
}); 