const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
    deployBaseInfrastructure,
    deployAndAuthorizeContract,
    setupGenesisPiratesNFT,
    setupInhabitantsNFT,
    setupPirateSkills,
    setupCrewForPirates,
    registerContractAddresses
} = require('../utils');

describe("CrewManagement", function () {
    // Test state
    let state = {};
    
    beforeEach(async function () {
        // Deploy base infrastructure (admin, user, CAR)
        const baseInfrastructure = await deployBaseInfrastructure();
        const { admin, user, centralAuthorizationRegistry } = baseInfrastructure;
        
        // Create pirate owner signer
        const [, , pirateOwner] = await ethers.getSigners();
        
        // Setup NFTs
        const { genesisPiratesNFT, genesisPiratesAddress } = 
            await setupGenesisPiratesNFT(admin, centralAuthorizationRegistry, [pirateOwner], [1, 2, 3]);
        
        const { inhabitantsNFT, inhabitantsAddress } = 
            await setupInhabitantsNFT(admin, centralAuthorizationRegistry, [pirateOwner], 3);
        
        // Deploy contracts
        const pirateSkills = await deployAndAuthorizeContract("PirateSkills", centralAuthorizationRegistry);
        
        const pirateSkillsReader = await deployAndAuthorizeContract(
            "PirateSkillsReader", 
            centralAuthorizationRegistry            
        );
        
        const crewTypeManager = await deployAndAuthorizeContract(
            "CrewTypeManager", 
            centralAuthorizationRegistry, 
            genesisPiratesAddress, 
            inhabitantsAddress
        );
        
        const pirateManagement = await deployAndAuthorizeContract(
            "PirateManagement", 
            centralAuthorizationRegistry
        );
        
        const crewManagement = await deployAndAuthorizeContract(
            "CrewManagement", 
            centralAuthorizationRegistry
        );
        
        // Register contract addresses
        await registerContractAddresses(centralAuthorizationRegistry, {
            "IPirateSkills": await pirateSkills.getAddress(),
            "IPirateSkillsReader": await pirateSkillsReader.getAddress(),
            "ICrewTypeManager": await crewTypeManager.getAddress(),
            "IPirateManagement": await pirateManagement.getAddress(),
            "ICrewManagement": await crewManagement.getAddress()
        });
        
        // Setup pirate skills
        await setupPirateSkills(pirateSkills, admin, genesisPiratesAddress, inhabitantsAddress, {
            genesis: [1, 2],
            inhabitants: [1, 2]
        });
        
        // Setup crew for pirates
        await setupCrewForPirates(
            crewManagement, 
            admin, 
            genesisPiratesAddress, 
            inhabitantsAddress, 
            pirateOwner, 
            {
                genesis: [1, 2],
                inhabitants: [1, 2]
            }
        );
        
        // Add specialized crew for test cases
        await crewManagement.connect(admin).addCrew(genesisPiratesAddress, 1, pirateOwner.address, "pirate", 2);
        await crewManagement.connect(admin).addCrew(genesisPiratesAddress, 1, pirateOwner.address, "corsair", 1);
        await crewManagement.connect(admin).addCrew(genesisPiratesAddress, 2, pirateOwner.address, "youngPirate", 3);
        await crewManagement.connect(admin).addCrew(inhabitantsAddress, 2, pirateOwner.address, "corsair", 2);
        
        // Add corsair crew to inhabitant #1 to match test expectations
        await crewManagement.connect(admin).addCrew(inhabitantsAddress, 1, pirateOwner.address, "corsair", 2);
        
        // Store everything in state for tests
        state = {
            ...baseInfrastructure,
            pirateOwner,
            genesisPiratesNFT,
            genesisPiratesAddress,
            inhabitantsNFT,
            inhabitantsAddress,
            pirateSkills,
            pirateSkillsReader,
            crewTypeManager,
            pirateManagement,
            crewManagement
        };
    });

    describe("Crew Type Management", function() {
        it("should correctly get crew counts for a pirate", async function() {
            const { crewManagement, genesisPiratesAddress } = state;
            
            const [crewTypes, crewCounts] = await crewManagement.getAllCrewCountsForShip(
                genesisPiratesAddress,
                1
            );
            
            expect(crewTypes.length).to.be.greaterThan(0);
            expect(crewCounts.length).to.equal(crewTypes.length);
            
            // Verify specific crew types based on skills
            expect(crewTypes).to.include("sailor");
            expect(crewTypes).to.include("pirate");
            expect(crewTypes).to.include("corsair");
            
            // Verify counts
            const sailorIndex = crewTypes.indexOf("sailor");
            expect(crewCounts[sailorIndex]).to.equal(3);
        });

        it("should validate essential crew requirements", async function() {
            const { crewTypeManager } = state;
            
            const isEssentialCrew = await crewTypeManager.canBeEssentialCrew("sailor");
            expect(isEssentialCrew).to.be.true;
        });

        it("should get total crew count for a pirate", async function() {
            const { crewManagement, genesisPiratesAddress } = state;
            
            const totalCrew = await crewManagement.getTotalCrewCount(
                genesisPiratesAddress,
                1
            );
            expect(totalCrew).to.equal(6); // 3 sailor + 2 pirate + 1 corsair
        });
    });

    describe("Mixed Collection Crew", function() {
        it("should handle crew counts from different collections", async function() {
            const { crewManagement, genesisPiratesAddress, inhabitantsAddress } = state;
            
            // Get crew counts for Genesis Pirate
            const [genesisCrew, genesisCounts] = await crewManagement.getAllCrewCountsForShip(
                genesisPiratesAddress,
                1
            );

            // Get crew counts for Inhabitant
            const [inhabitantCrew, inhabitantCounts] = await crewManagement.getAllCrewCountsForShip(
                inhabitantsAddress,
                1
            );

            expect(genesisCrew.length).to.equal(genesisCounts.length);
            expect(inhabitantCrew.length).to.equal(inhabitantCounts.length);
            
            // Verify specific crew counts
            const sailorIndexGenesis = genesisCrew.indexOf("sailor");
            const sailorIndexInhabitant = inhabitantCrew.indexOf("sailor");
            
            expect(genesisCounts[sailorIndexGenesis]).to.equal(3);
            expect(inhabitantCounts[sailorIndexInhabitant]).to.equal(3); // Changed from 4 to 3 due to setupCrewForPirates default
        });

        it("should validate crew requirements across collections", async function() {
            const { crewManagement, genesisPiratesAddress, inhabitantsAddress } = state;
            
            // Get total crew count from both collections
            const genesisTotalCrew = await crewManagement.getTotalCrewCount(
                genesisPiratesAddress,
                1
            );
            const inhabitantTotalCrew = await crewManagement.getTotalCrewCount(
                inhabitantsAddress,
                1
            );

            expect(genesisTotalCrew).to.equal(6); // 3 sailor + 2 pirate + 1 corsair
            expect(inhabitantTotalCrew).to.equal(5); // 3 sailor + 2 corsair
        });
    });

    describe("Crew Type Validation", function() {
        it("should correctly identify valid crew types", async function() {
            const { crewTypeManager } = state;
            
            const validTypes = ["sailor", "corsair", "pirate", "youngPirate"];
            for (const type of validTypes) {
                const isValid = await crewTypeManager.crewTypeExists(type);
                expect(isValid).to.be.true;
            }
        });

        it("should reject invalid crew types", async function() {
            const { crewTypeManager } = state;
            
            const invalidType = "invalidCrewType";
            const isValid = await crewTypeManager.crewTypeExists(invalidType);
            expect(isValid).to.be.false;
        });
    });

    describe("Crew Requirements", function() {
        it("should calculate correct minimum crew requirements", async function() {
            const { crewManagement, genesisPiratesAddress } = state;
            
            const genesisTotalCrew = await crewManagement.getTotalCrewCount(
                genesisPiratesAddress,
                1
            );
            const essentialCrew = await crewManagement.getEssentialCrewCount(
                genesisPiratesAddress, 
                1
            );
            
            expect(genesisTotalCrew).to.equal(6);
            expect(essentialCrew).to.equal(6); // All crew types are essential (sailor, pirate, corsair)
        });

        it("should validate crew composition", async function() {
            const { crewManagement, crewTypeManager, genesisPiratesAddress } = state;
            
            const [types, counts] = await crewManagement.getAllCrewCountsForShip(
                genesisPiratesAddress,
                1
            );

            // Check if we have essential crew types
            const hasEssentialCrew = await Promise.all(
                types.map(type => crewTypeManager.canBeEssentialCrew(type))
            );
            expect(hasEssentialCrew).to.include(true);
            
            // Verify total essential crew count
            const essentialCrew = await crewManagement.getEssentialCrewCount(
                genesisPiratesAddress, 
                1
            );
            expect(essentialCrew).to.be.greaterThan(0);
        });
    });

    describe("Edge Cases", function() {
        it("should handle pirates with no crew", async function() {
            const { crewManagement, genesisPiratesAddress } = state;
            
            const [types, counts] = await crewManagement.getAllCrewCountsForShip(
                genesisPiratesAddress,
                3 // Pirate with no crew added
            );
            
            // Should return all crew types but with zero counts
            expect(types.length).to.be.greaterThan(0);
            
            // All counts should be zero
            for (let i = 0; i < counts.length; i++) {
                expect(counts[i]).to.equal(0);
            }
            
            const totalCrew = await crewManagement.getTotalCrewCount(
                genesisPiratesAddress,
                3
            );
            expect(totalCrew).to.equal(0);
        });

        it("should handle non-existent pirates gracefully", async function() {
            const { crewManagement, genesisPiratesAddress } = state;
            
            const nonExistentId = 9999;
            
            // Should return zero crew for non-existent pirates
            const totalCrew = await crewManagement.getTotalCrewCount(
                genesisPiratesAddress, 
                nonExistentId
            );
            expect(totalCrew).to.equal(0);
            
            // Should return all crew types but with zero counts
            const [types, counts] = await crewManagement.getAllCrewCountsForShip(
                genesisPiratesAddress,
                nonExistentId
            );
            
            expect(types.length).to.be.greaterThan(0);
            
            // All counts should be zero
            for (let i = 0; i < counts.length; i++) {
                expect(counts[i]).to.equal(0);
            }
        });

        it("should handle invalid collection addresses", async function() {
            const { crewManagement } = state;
            
            const invalidCollection = "0x0000000000000000000000000000000000000000";
            
            // Should return zero crew for invalid collection
            const totalCrew = await crewManagement.getTotalCrewCount(
                invalidCollection, 
                1
            );
            expect(totalCrew).to.equal(0);
            
            // Should return all crew types but with zero counts
            const [types, counts] = await crewManagement.getAllCrewCountsForShip(
                invalidCollection,
                1
            );
            
            expect(types.length).to.be.greaterThan(0);
            
            // All counts should be zero
            for (let i = 0; i < counts.length; i++) {
                expect(counts[i]).to.equal(0);
            }
        });
    });
}); 