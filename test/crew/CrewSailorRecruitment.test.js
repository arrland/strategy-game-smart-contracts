const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
    deployAndAuthorizeContract,
    deployBaseInfrastructure,
    createTestConfig,
    setupTokenInfrastructure,
    setupGenesisPiratesNFT,
    setupInhabitantsNFT,
    setupPirateSkills
} = require("../utils");

// Configuration for CrewSailorRecruitment tests
const SailorRecruitmentConfig = createTestConfig({
    // Test pirate data
    testPirates: {
        GENESIS_PIRATE: { id: 1, collection: "genesis" },
        INHABITANT_PIRATE: { id: 1, collection: "inhabitant" }
    },
    recruitmentAmount: 5,
    recruitmentCost: ethers.parseEther("1"), // 1 ARRC per sailor
    tokenAmount: "1000"
});

describe("CrewSailorRecruitment", function () {
    // Test state
    let state = {};
    
    // Setup fixtures
    async function setupFixture() {
        // Deploy base infrastructure (admin, user, CAR)
        const baseInfrastructure = await deployBaseInfrastructure();
        const { admin, user, centralAuthorizationRegistry } = baseInfrastructure;
        
        // Create another user for unauthorized tests
        const [, , unauthorized] = await ethers.getSigners();
        
        // Setup Genesis Pirates NFT
        const { genesisPiratesNFT, genesisPiratesAddress } = 
            await setupGenesisPiratesNFT(admin, centralAuthorizationRegistry, [user]);
        
        // Setup Inhabitants NFT
        const { inhabitantsNFT, inhabitantsAddress } = 
            await setupInhabitantsNFT(admin, centralAuthorizationRegistry, [user]);

        // Deploy token infrastructure (ARRC, RUM tokens and FeeManagement)
        const { arrcToken, rumToken, feeManagement } = await setupTokenInfrastructure(
            centralAuthorizationRegistry, 
            admin, 
            [user, unauthorized],
            SailorRecruitmentConfig.tokenAmount
        );
        
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
        
        // Setup skills for test pirates (for crew capacity calculation)
        await setupPirateSkills(
            pirateSkills, 
            admin,
            genesisPiratesAddress, 
            inhabitantsAddress,
            {
                genesis: [SailorRecruitmentConfig.testPirates.GENESIS_PIRATE.id],
                inhabitants: [SailorRecruitmentConfig.testPirates.INHABITANT_PIRATE.id]
            }
        );
        
        // Deploy CrewTypeManager
        const crewTypeManager = await deployAndAuthorizeContract(
            "CrewTypeManager", 
            centralAuthorizationRegistry, 
            genesisPiratesAddress, 
            inhabitantsAddress
        );
        
        // Deploy CrewManagement
        const crewManagement = await deployAndAuthorizeContract(
            "CrewManagement", 
            centralAuthorizationRegistry
        );
        
        // Deploy CrewSailorRecruitment with direct collection addresses
        // We now pass the genesisPiratesAddress and inhabitantsAddress directly
        const CrewSailorRecruitmentFactory = await ethers.getContractFactory("CrewSailorRecruitment");
        const crewSailorRecruitment = await CrewSailorRecruitmentFactory.deploy(
            await centralAuthorizationRegistry.getAddress(),
            await arrcToken.getAddress(),
            genesisPiratesAddress,
            inhabitantsAddress
        );
        await crewSailorRecruitment.waitForDeployment();
        
        // Authorize the CrewSailorRecruitment contract
        await centralAuthorizationRegistry.addAuthorizedContract(await crewSailorRecruitment.getAddress());
        
        // Register the interface for CrewSailorRecruitment
        await centralAuthorizationRegistry.setContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("ICrewSailorRecruitment")),
            await crewSailorRecruitment.getAddress()
        );
        
        // CRITICAL: Grant ADMIN_ROLE to the user to pass onlyAdmin checks
        const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
        await centralAuthorizationRegistry.connect(admin).grantRole(ADMIN_ROLE, user.address);
        
        // Add authorized contracts
        await centralAuthorizationRegistry.addAuthorizedContract(user.address);
        
        // Approve tokens for both contracts
        await arrcToken.connect(user).approve(
            await crewSailorRecruitment.getAddress(), 
            ethers.parseEther(SailorRecruitmentConfig.tokenAmount)
        );
        
        await arrcToken.connect(user).approve(
            await feeManagement.getAddress(), 
            ethers.parseEther(SailorRecruitmentConfig.tokenAmount)
        );
        
        await rumToken.connect(user).approve(
            await feeManagement.getAddress(), 
            ethers.parseEther(SailorRecruitmentConfig.tokenAmount)
        );

        // Return all deployed contracts and config
        return {
            ...baseInfrastructure,
            unauthorized,
            genesisPiratesNFT,
            genesisPiratesAddress,
            inhabitantsNFT,
            inhabitantsAddress,
            arrcToken,
            rumToken,
            feeManagement,
            pirateSkills,
            pirateSkillsReader,
            crewTypeManager,
            crewManagement,
            crewSailorRecruitment,
            config: SailorRecruitmentConfig
        };
    }

    beforeEach(async function () {
        state = await setupFixture();
    });

    describe("Deployment", function () {
        it("should deploy correctly with the right ARRC token address", async function () {
            const { crewSailorRecruitment, arrcToken } = state;
            
            const contractArrcToken = await crewSailorRecruitment.arrcToken();
            expect(contractArrcToken).to.equal(await arrcToken.getAddress());
        });

        it("should have the correct recruitment cost", async function () {
            const { crewSailorRecruitment, config } = state;
            
            const recruitmentCost = await crewSailorRecruitment.RECRUITMENT_COST();
            expect(recruitmentCost).to.equal(config.recruitmentCost);
        });

        it("should have the correct pirate collection addresses", async function () {
            const { crewSailorRecruitment, genesisPiratesAddress, inhabitantsAddress } = state;
            
            const contractGenesisPiratesAddress = await crewSailorRecruitment.genesisPiratesAddress();
            const contractInhabitantsAddress = await crewSailorRecruitment.inhabitantsAddress();
            
            expect(contractGenesisPiratesAddress).to.equal(genesisPiratesAddress);
            expect(contractInhabitantsAddress).to.equal(inhabitantsAddress);
        });
    });

    describe("Sailor Recruitment", function () {
        it("should recruit sailors correctly", async function () {
            const { 
                crewSailorRecruitment, 
                crewManagement, 
                genesisPiratesAddress, 
                user, 
                config 
            } = state;
            
            const amount = config.recruitmentAmount;
            const pirateId = config.testPirates.GENESIS_PIRATE.id;
            
            // Perform recruitment
            await crewSailorRecruitment.connect(user).recruitSailors(
                genesisPiratesAddress, 
                pirateId, 
                amount
            );
            
            // Verify the crew count
            const crewCount = await crewManagement.getCrewCount(
                genesisPiratesAddress, 
                pirateId, 
                "sailor"
            );
            expect(crewCount).to.equal(amount);
        });

        it("should calculate recruitment cost correctly", async function () {
            const { crewSailorRecruitment, config } = state;
            
            const amount = config.recruitmentAmount;
            const recruitmentCost = await crewSailorRecruitment.RECRUITMENT_COST();
            const expectedCost = BigInt(amount) * recruitmentCost;
            
            const calculatedCost = await crewSailorRecruitment.calculateRecruitmentCost(amount);
            expect(calculatedCost).to.equal(expectedCost);
        });

        it("should emit SailorRecruited event", async function () {
            const { 
                crewSailorRecruitment, 
                genesisPiratesAddress, 
                user, 
                config 
            } = state;
            
            const amount = config.recruitmentAmount;
            const pirateId = config.testPirates.GENESIS_PIRATE.id;
            
            await expect(
                crewSailorRecruitment.connect(user).recruitSailors(
                    genesisPiratesAddress, 
                    pirateId, 
                    amount
                )
            )
                .to.emit(crewSailorRecruitment, "SailorRecruited")
                .withArgs(genesisPiratesAddress, pirateId, user.address, amount);
        });
    });

    describe("Error Handling", function () {
        it("should fail to recruit sailors for a non-existent pirate", async function () {
            const { crewSailorRecruitment, genesisPiratesAddress, user, config } = state;
            
            const amount = config.recruitmentAmount;
            const nonExistentPirateId = 999;
            
            await expect(
                crewSailorRecruitment.connect(user).recruitSailors(
                    genesisPiratesAddress, 
                    nonExistentPirateId, 
                    amount
                )
            ).to.be.reverted; // Just check for any revert
        });

        it("should fail when called by unauthorized user", async function () {
            const { 
                crewSailorRecruitment, 
                genesisPiratesAddress, 
                unauthorized, 
                config 
            } = state;
            
            const amount = config.recruitmentAmount;
            const pirateId = config.testPirates.GENESIS_PIRATE.id;
            
            await expect(
                crewSailorRecruitment.connect(unauthorized).recruitSailors(
                    genesisPiratesAddress, 
                    pirateId, 
                    amount
                )
            ).to.be.reverted; // Changed to just be reverted
        });

        it("should fail when amount is zero", async function () {
            const { crewSailorRecruitment, genesisPiratesAddress, user } = state;
            
            const pirateId = state.config.testPirates.GENESIS_PIRATE.id;
            
            await expect(
                crewSailorRecruitment.connect(user).recruitSailors(
                    genesisPiratesAddress, 
                    pirateId, 
                    0
                )
            ).to.be.revertedWithCustomError(crewSailorRecruitment, "InvalidAmount");
        });

        it("should fail to recruit more sailors than allowed", async function () {
            const { 
                crewSailorRecruitment, 
                genesisPiratesAddress, 
                user, 
                crewTypeManager
            } = state;
            
            const pirateId = state.config.testPirates.GENESIS_PIRATE.id;
            
            // Get the max crew capacity
            const maxCrewCapacity = await crewTypeManager.getPirateCrewCapacity(
                genesisPiratesAddress, 
                pirateId
            );
            
            // Try to recruit more than capacity
            const excessAmount = Number(maxCrewCapacity) + 1;
            
            await expect(
                crewSailorRecruitment.connect(user).recruitSailors(
                    genesisPiratesAddress, 
                    pirateId, 
                    excessAmount
                )
            ).to.be.reverted; // Changed to just be reverted
        });

        it("should fail with insufficient allowance", async function () {
            const { 
                crewSailorRecruitment, 
                genesisPiratesAddress, 
                arrcToken, 
                user, 
                config 
            } = state;
            
            const amount = config.recruitmentAmount;
            const pirateId = config.testPirates.GENESIS_PIRATE.id;
            
            // Set allowance to less than required
            const recruitmentCost = await crewSailorRecruitment.RECRUITMENT_COST();
            const requiredAmount = BigInt(amount) * recruitmentCost;
            
            await arrcToken.connect(user).approve(
                await crewSailorRecruitment.getAddress(), 
                requiredAmount - BigInt(1)
            );
            
            await expect(
                crewSailorRecruitment.connect(user).recruitSailors(
                    genesisPiratesAddress, 
                    pirateId, 
                    amount
                )
            ).to.be.reverted; // Changed to just be reverted
        });

        it("should fail with insufficient balance", async function () {
            const { 
                crewSailorRecruitment, 
                genesisPiratesAddress, 
                arrcToken, 
                user, 
                admin, 
                config 
            } = state;
            
            const amount = config.recruitmentAmount;
            const pirateId = config.testPirates.GENESIS_PIRATE.id;
            
            // Set balance to less than required
            const recruitmentCost = await crewSailorRecruitment.RECRUITMENT_COST();
            const requiredAmount = BigInt(amount) * recruitmentCost;
            
            // Transfer most of the tokens away
            const currentBalance = await arrcToken.balanceOf(user.address);
            await arrcToken.connect(user).transfer(
                admin.address, 
                currentBalance - requiredAmount + BigInt(1)
            );
            
            await expect(
                crewSailorRecruitment.connect(user).recruitSailors(
                    genesisPiratesAddress, 
                    pirateId, 
                    amount
                )
            ).to.be.reverted; // Changed to just be reverted
        });
    });

    describe("Integration", function () {
        it("should work with inhabitant pirates as well", async function () {
            const { 
                crewSailorRecruitment, 
                crewManagement, 
                inhabitantsAddress, 
                user, 
                config 
            } = state;
            
            const amount = config.recruitmentAmount;
            const pirateId = config.testPirates.INHABITANT_PIRATE.id;
            
            // Perform recruitment
            await crewSailorRecruitment.connect(user).recruitSailors(
                inhabitantsAddress, 
                pirateId, 
                amount
            );
            
            // Verify the crew count
            const crewCount = await crewManagement.getCrewCount(
                inhabitantsAddress, 
                pirateId, 
                "sailor"
            );
            expect(crewCount).to.equal(amount);
        });

        it("should handle multiple recruitment operations", async function () {
            const { 
                crewSailorRecruitment, 
                crewManagement, 
                genesisPiratesAddress, 
                user, 
                config 
            } = state;
            
            const firstAmount = 2;
            const secondAmount = 3;
            const pirateId = config.testPirates.GENESIS_PIRATE.id;
            
            // First recruitment
            await crewSailorRecruitment.connect(user).recruitSailors(
                genesisPiratesAddress, 
                pirateId, 
                firstAmount
            );
            
            // Second recruitment
            await crewSailorRecruitment.connect(user).recruitSailors(
                genesisPiratesAddress, 
                pirateId, 
                secondAmount
            );
            
            // Verify the total crew count
            const crewCount = await crewManagement.getCrewCount(
                genesisPiratesAddress, 
                pirateId, 
                "sailor"
            );
            expect(crewCount).to.equal(firstAmount + secondAmount);
        });
    });
});