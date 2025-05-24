const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { 
    deployBaseInfrastructure, 
    deployAndRegisterContract,
    deployAndAuthorizeContract,
    setupNFTsForStaking,
    setupTokenInfrastructure,
    setupPirateSkills,
    setupCrewForPirates,
    prepareAssetsForStaking,
    stakeShipWithPirates,
    createTestConfig,
    setMissionActive,
    deployAndRegisterMock,
    setupCoreGameContracts,
    setupEmptyResourceProduction
} = require("../utils");

// Minimal config for setting up staking prerequisites
const ValidatorTestConfig = createTestConfig({
    ships: { SHIP_1: { id: 1 } },
    pirates: { CAPTAIN: { id: 1, collection: "genesis" } },
    shipAttributes: { 
        class: "Small", 
        crewMin: 1, 
        crewMax: 5,
        durability: 100,
        speed: 10,
        agility: 10,
        viewingRange: 5,
        cannonsCapacity: 4,
        armor: 20,
        ramming: 10,
        cargoBay: ethers.parseUnits("500", 18),
        shipType: "Combat",
        oars: false,
        shallowWaters: true,
        deepWaters: true
    },
    crew: { crewType: "sailor", captainCrewCount: 1 /* Min needed */ }
});

describe("MissionValidator", function () {
    let state = {}; // Define state variable for the describe block

    async function setupFixture() {
        const baseInfrastructure = await deployBaseInfrastructure();
        const { admin, user: owner, otherAccount, centralAuthorizationRegistry } = baseInfrastructure;

        // Authorize owner for calling test functions on MissionValidator (if needed directly)
        // MissionValidator itself is authorized by setupCoreGameContracts.
        // If tests call MissionValidator directly using 'owner', then owner needs to be an authorized contract in CAR.
        // await centralAuthorizationRegistry.connect(admin).addAuthorizedContract(owner.address);

        // 1. Deploy NFTs
        const nfts = await setupNFTsForStaking(admin, owner, centralAuthorizationRegistry);
        // nfts object includes: shipNFT, genesisPiratesNFT, genesisPiratesAddress, inhabitantsNFT, inhabitantsAddress, islandNft, genesisIslandsAddress
        
        // 2. Deploy core game contracts using the new utility
        const coreContractsPack = await setupCoreGameContracts(admin, owner, centralAuthorizationRegistry, nfts, {
            // Pass ValidatorTestConfig to setupCoreGameContracts if it influences its setup,
            // though setupCoreGameContracts itself doesn't currently take a direct 'config' like this.
            // For now, ValidatorTestConfig is primarily for prepareAssetsForStaking.
        });

        // Destructure all necessary contracts from coreContractsPack
        // Ensure all contracts previously deployed manually are now available from coreContractsPack
        const {
            arrcToken, rumToken, feeManagement,
            islandStorage, buildingStorage, resourceManagement, resourceSpendManagement, resourceTypeManager,
            crewTypeManager, crewManagement, pirateSkills, pirateSkillsReader,
            shipMetadata, shipStorage, dockingManagement, shipAndPirateStaking, missionsStorage, // staking is ShipAndPirateStaking
            mockIslandManager, missionValidator, // missionValidator is from core pack
            storageManagement, // Added
            // missionRequirements is also from coreContractsPack if setupCoreGameContracts provides it as a mock
            missionRequirements 
        } = coreContractsPack;

        // Use the new utility to set empty resource production requirements
        // This should use instances from coreContractsPack
        await setupEmptyResourceProduction(
            admin, 
            resourceSpendManagement, // from coreContractsPack
            resourceTypeManager,    // from coreContractsPack
            ["citrus", "fish", "crate-packed citrus", "bread"] // Example resources
        );
        
        // Corrected call to prepareAssetsForStaking:
        // Argument 1 (user in util): owner (from baseInfrastructure)
        // Argument 2 (admin in util): admin (from baseInfrastructure)
        // Argument 3 (contracts in util): An object of contract instances
        // Argument 4 (nfts in util): nfts (from setupNFTsForStaking)
        // Argument 5 (config in util): ValidatorTestConfig
        await prepareAssetsForStaking(
            owner, // Corrected: user for the utility function
            admin, // Corrected: admin for the utility function
            {      // Corrected: contracts object
                shipMetadata, 
                shipStorage, 
                shipAndPirateStaking, 
                pirateSkills, 
                crewManagement 
                // Add other contracts here if prepareAssetsForStaking requires them
            },
            nfts,  // Correctly passed
            ValidatorTestConfig // Corrected: config object
        );
        
        // Mint specific ship and pirate for direct use in MissionValidator tests if not covered by general staking setup
        // Ensure ValidatorTestConfig.ships.SHIP_1.id and pirates.CAPTAIN.id are used consistently
        // These are minted in setupNFTsForStaking and their skills/crew in prepareAssetsForStaking
        // So, no need to re-mint here if prepareAssetsForStaking handles it based on ValidatorTestConfig.

        // Setup skills for the captain pirate (Ensure pirateIds match config)
        // This is now handled within prepareAssetsForStaking based on the config passed to it.
        // So, the direct call to setupPirateSkills here might be redundant or need adjustment
        // if prepareAssetsForStaking already configures the necessary pirates from ValidatorTestConfig.
        // For now, let's assume prepareAssetsForStaking based on ValidatorTestConfig is sufficient.

        // Return all necessary components for tests
        return {
            admin, owner, otherAccount, centralAuthorizationRegistry,
            shipNFT: nfts.shipNFT,
            genesisPiratesNFT: nfts.genesisPiratesNFT,
            inhabitantsNFT: nfts.inhabitantsNFT,
            genesisAddr: nfts.genesisPiratesAddress,
            inhabitantsAddr: nfts.inhabitantsAddress,
            shipNftAddress: await nfts.shipNFT.getAddress(),
            
            // Spread all contracts from the core pack
            ...coreContractsPack,
            config: ValidatorTestConfig
        };
    }

    beforeEach(async function () {
        state = await loadFixture(setupFixture); // Load fixture into state before each test
    });

    describe("validateShipRequirements", function () {
        it("should revert if ship is not staked", async function () {
            // Destructure from state
            const { missionValidator, shipNFT, admin, owner, config } = state; 
            const shipId = config.ships.SHIP_1.id;
            await expect(missionValidator.validateShipRequirements(shipId))
                .to.be.revertedWith("Ship not staked");
        });

        it("should revert if ship is on mission", async function () {
            // Destructure from state
            const { 
                missionValidator, shipAndPirateStaking, missionsStorage, admin, owner, config,
                shipNFT, genesisPiratesNFT, arrcToken, centralAuthorizationRegistry, feeManagement
            } = state; 
            const shipId = config.ships.SHIP_1.id;
            const captainId = config.pirates.CAPTAIN.id;
            const genesisAddr = await genesisPiratesNFT.getAddress();
            
            const stakeFee = await feeManagement.calculateStakingArrcFee(1);
            await arrcToken.connect(owner).approve(await shipAndPirateStaking.getAddress(), stakeFee);
            await shipNFT.connect(owner).approve(await shipAndPirateStaking.getAddress(), shipId);
            await genesisPiratesNFT.connect(owner).setApprovalForAll(await shipAndPirateStaking.getAddress(), true); // ERC1155 requires setApprovalForAll
            await stakeShipWithPirates(shipAndPirateStaking, owner, shipId, captainId, genesisAddr);

            // 2. Register a dummy mission type and storage (required by real MissionsStorage)
            const missionType = 1; // Example type
            const dummyStorage = await deployAndRegisterMock("MockMissionTypeStorage", "IMissionTypeStorage", centralAuthorizationRegistry);
            await dummyStorage.setSupportedMissionType(missionType); // Tell mock it supports type 1
            await missionsStorage.connect(admin).registerMissionType(missionType, "TestMission");
            await missionsStorage.connect(admin).registerSpecializedStorage(missionType, await dummyStorage.getAddress());

            // 3. Start a mission using the real MissionsStorage contract
            const missionId = 101;
            const duration = 3600; // 1 hour
            const missionData = ethers.AbiCoder.defaultAbiCoder().encode([],[]); // Empty data for dummy

            await missionsStorage.connect(admin).startMission(shipId, missionId, missionType, duration, missionData);
            expect(await missionsStorage.isOnMission(shipId)).to.be.true; // Verify state

            // 4. Expect validation to revert
            await expect(missionValidator.validateShipRequirements(shipId))
                .to.be.revertedWith("Ship already on mission");
        });

        // ... test for locked resources ...
    });

    describe("validateIslandRequirements", function () {
        const fromIslandId = 0; // Not checked
        const targetIslandId = 5;
        const missionType = 2; // Example mission type

        it("should allow mission if island meets requirements", async function () {
            // Destructure from state
            const { missionValidator, missionRequirements, owner } = state; 

            // Configure mock to return true (island is valid)
            await missionRequirements.setIslandValidity(targetIslandId, missionType, true);

            // Expect validation to pass
            await expect(missionValidator.validateIslandRequirements(fromIslandId, targetIslandId, missionType))
                .to.not.be.reverted;
        });

        it("should revert if island does not meet requirements", async function () {
            // Destructure from state
            const { missionValidator, missionRequirements, owner } = state; 

            // Configure mock to return false (island is invalid)
            await missionRequirements.setIslandValidity(targetIslandId, missionType, false);

            // Expect validation to revert with specific message
            await expect(missionValidator.validateIslandRequirements(fromIslandId, targetIslandId, missionType))
                .to.be.revertedWith("Destination island missing required buildings");
        });
    });

    describe("validateShipCapacity", function () {
        it("should return true if ship has enough capacity", async function () {
            // Destructure from state
            const { missionValidator, shipStorage, shipMetadata, admin, config, owner } = state; 
            const shipId = config.ships.SHIP_1.id;
            const amountToValidate = ethers.parseUnits("100", 0); // Changed to 0 decimals for cargo units

            // Capacity is set by ShipMetadata in fixture (e.g., 500)
            // Current cargo is 0 as no resources have been added yet.
            // Available capacity = metadata.cargoBay - 0. If cargoBay is 500, available is 500.
            // 500 > 100, so this should be true.

            expect(await missionValidator.validateShipCapacity(shipId, amountToValidate)).to.be.true;
        });

        it("should return false if ship does not have enough capacity", async function () {
            // Destructure from state
            const { missionValidator, shipStorage, shipMetadata, admin, config, owner } = state; 
            const shipId = config.ships.SHIP_1.id;
            const amountToValidate = ethers.parseUnits("600", 18); // More than capacity (e.g. 500)

            // Capacity from metadata (e.g. 500). Current cargo is 0.
            // Available capacity = 500. 500 < 600, so this should be false.

            expect(await missionValidator.validateShipCapacity(shipId, amountToValidate)).to.be.false;
        });

        it("should return true if amount equals available capacity", async function () {
            // Destructure from state
            const { missionValidator, shipStorage, shipMetadata, admin, config, owner } = state; 
            const shipId = config.ships.SHIP_1.id;
            // Amount should be equal to shipAttributes.cargoBay from ValidatorTestConfig
            const amountToValidate = ethers.parseUnits(config.shipAttributes.cargoBay.toString(), 0);

            // Capacity from metadata (e.g. 500). Current cargo is 0.
            // Available capacity = 500. If amountToValidate is 500, this should be true.

            expect(await missionValidator.validateShipCapacity(shipId, amountToValidate)).to.be.true;
        });

        // Add more tests for this function (e.g., zero capacity)
    });

    describe("isShipLocked", function () {
        it("should return true if ship resources are locked", async function () {
            // Destructure from state
            const { missionValidator, shipStorage, owner, admin, config } = state; 
            const shipId = config.ships.SHIP_1.id;
            const lockDuration = 3600; // 1 hour
            const missionId = 123; // Dummy mission ID

            // Lock resources using the real ShipStorage function, called by admin
            await shipStorage.connect(admin).lockResources(shipId, lockDuration, missionId);

            expect(await missionValidator.isShipLocked(shipId)).to.be.true;
        });

        it("should return false if ship resources are not locked", async function () {
            // Destructure from state
            const { missionValidator, shipStorage, owner, config } = state; 
            const shipId = config.ships.SHIP_1.id;
            const lockDuration = 3600; // 1 hour
            const missionId = 123; // Dummy mission ID

            // Ensure resources are not locked initially (or explicitly unlock if needed after a lock)
            // If previously locked in another test or setup, uncommenting unlock might be necessary:
            // await shipStorage.connect(owner).lockResources(shipId, lockDuration, missionId); 
            // await shipStorage.connect(owner).unlockResources(shipId);
            // For this test, we assume it starts unlocked or becomes unlocked if the previous test ran.
            // A more robust way is to ensure state, but for now, direct check based on default (false) is okay.

            expect(await missionValidator.isShipLocked(shipId)).to.be.false;
        });
    });

    describe("isIslandOwner", function () {
        it("should return true if caller is the island owner", async function () {
            // Destructure from state
            const { missionValidator, mockIslandManager, admin, owner } = state; 
            const islandId = 1;

            // Use mockIslandManager to set ownership for the test
            await mockIslandManager.connect(admin).setOwner(islandId, owner.address);

            expect(await missionValidator.connect(owner).isIslandOwner(islandId, owner.address)).to.be.true;
        });

        it("should return false if caller is not the island owner", async function () {
            // Destructure from state
            const { missionValidator, mockIslandManager, admin, owner, otherAccount } = state; 
            const islandId = 1;

            // Use mockIslandManager to set ownership for the test
            await mockIslandManager.connect(admin).setOwner(islandId, owner.address);

            expect(await missionValidator.connect(otherAccount).isIslandOwner(islandId, otherAccount.address)).to.be.false;
        });
    });

    describe("validateAndBurnMissionStartResources", function () {
        it("should successfully validate and burn resources for a mission (happy path with citrus)", async function () {
            // Destructure from state
            const { 
                missionValidator, shipAndPirateStaking, shipNFT, genesisPiratesNFT, admin, owner, 
                shipStorage, feeManagement, resourceSpendManagement, arrcToken, rumToken, 
                config, centralAuthorizationRegistry, crewManagement, pirateSkills, shipMetadata
            } = state; 

            const shipId = config.ships.SHIP_1.id;
            const captainId = config.pirates.CAPTAIN.id;
            const genesisAddr = await genesisPiratesNFT.getAddress();
            const travelDays = 2; // CHANGED back to 1
            const intendedCargo = ethers.parseUnits("100", 0); 
            const foodChoice = "citrus";
            const foodRationChoice = "fish";

            // 1. Stake ship (using a helper or simplified setup for this test)
            
            // Approve ShipAndPirateStaking for ARRC and NFTs
            const stakeFeeInitial = await feeManagement.calculateStakingArrcFee(1); // For captain only
            await arrcToken.connect(owner).approve(await shipAndPirateStaking.getAddress(), stakeFeeInitial);
            await shipNFT.connect(owner).approve(await shipAndPirateStaking.getAddress(), shipId);
            await genesisPiratesNFT.connect(owner).setApprovalForAll(await shipAndPirateStaking.getAddress(), true);

            await stakeShipWithPirates(shipAndPirateStaking, owner, shipId, captainId, genesisAddr);

            // 2. ShipStorage capacity is handled by ShipMetadata and initializeStorage in setupFixture.
            // Current cargo is implicitly 0 until resources are added.
         

            // 3. Ensure user has enough RUM and approves FeeManagement
            const nftCrewCount = await missionValidator.getNFTCrewCount(shipId);
            const totalCrewCount = await missionValidator.getTotalCrewCount(shipId);
            // const rumAmountInBaseUnits = await missionValidator.calculateTotalRUM(travelDays, nftCrewCount); 
            // Replicate the RUM calculation logic from MissionValidator.sol directly
            // totalRUMAmountForFeeManagement = travelDays * nftCrew * (1 ether); 
            // Since the contract uses 1 ether as the multiplier, and nftCrewCount is a number,
            // and travelDays is a number, the result here will be a BigInt if we use ethers.parseUnits or direct multiplication.
            // The contract intends the rate to be 1 RUM (1e18) per NFT crew per day.
            const rumAmountInWei = BigInt(travelDays) * BigInt(nftCrewCount) * ethers.parseUnits("1", 18);

            // Correctly calculated values based on actual totalCrewCount, travelDays,
            // and the rates from ResourceSpendManagement.
            // Citrus rate: 0.5e18 wei/crew/day. Base unit equivalent for preloading: (0.5 * totalCrew * travelDays)
            const actualCitrusToBurn = BigInt(0.5 * Number(totalCrewCount) * Number(travelDays) * 10 ** 18); // Should be 1n for 2 crew, 1 day
            
            // Fish rate: 1 base/crew/day
            const actualFoodRationToBurn = BigInt(1 * Number(totalCrewCount) * Number(travelDays) * 10 ** 18); // Should be 2n for 2 crew, 1 day

            // Convert base RUM amount to wei (assuming 18 decimals for RUM token)
            // const rumAmountInWei = ethers.parseUnits(rumAmountInWei.toString(), 18); // REMOVED REDECLARATION

            await rumToken.connect(admin).mint(owner.address, rumAmountInWei);
            await rumToken.connect(owner).approve(await feeManagement.getAddress(), rumAmountInWei);

            // Preload ship with correctly calculated resources
            await shipStorage.connect(admin).addResource(shipId, owner.address, foodChoice, actualCitrusToBurn);
            await shipStorage.connect(admin).addResource(shipId, owner.address, foodRationChoice, actualFoodRationToBurn);

            // 5. Call the function and capture the transaction for event checking
            const tx = await missionValidator.connect(admin).validateAndBurnMissionStartResources(
                shipId,
                travelDays,
                intendedCargo,
                foodChoice,
                foodRationChoice,
                owner.address
            );
            const receipt = await tx.wait();

            await expect(tx)
                .to.emit(feeManagement, "RumUsed")
                .withArgs(owner.address, rumAmountInWei);

            // Further checks: ResourceSpendManagement events (if any), or mock its calls.
            // For now, let's focus on FeeManagement.useRum and no revert.
            // We'd also need to mock ResourceSpendManagement.handleResourceBurning or verify its effects.
            // For this initial test, let's assume it doesn't revert if resources are there.
        });
    });

    // ... other describe blocks ... 
});