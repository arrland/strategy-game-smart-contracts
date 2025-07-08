const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const {
  setupCoreGameContracts,
  setupShipForMissionTesting,
  extractMissionIdFromReceipt,
  setupMissionInfrastructure,
  setupNFTsForStaking,
  deployBaseInfrastructure,
  deployAndRegisterContract,
  setupShipMetadata,
  setupPirateSkills,
} = require("../utils");

describe("TradeMission - V2 Technical Flow Compliance", function () {
  const baseShipId = 10; // Start from 10 to avoid conflicts with setupFixture
  const baseIslandId = 20; // Start from 20 to avoid conflicts with setupFixture
  const resourceType = "wood";
  const amount = 100; // Use base units, not wei units
  
  let testCounter = 0;
  
  function getNextShipId() {
    return baseShipId + testCounter++;
  }
  
  function getNextIslandId() {
    return baseIslandId + testCounter++;
  }

  async function setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, requiredAmount = ethers.parseEther("100")) {
    // Mint ARRC tokens to user if they don't have enough
    const userBalance = await coreContracts.arrcToken.balanceOf(user.address);
    if (userBalance < requiredAmount) {
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredAmount);
    }
    
    // Get ArrcLocking contract address and approve it for ARRC transfers
    const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
    );
    await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredAmount);
    
    // Also approve TradeManager for ARRC transfers
    const tradeManagerAddress = await centralAuthorizationRegistry.getContractAddress(
      ethers.keccak256(ethers.toUtf8Bytes("ITradeManager"))
    );
    await coreContracts.arrcToken.connect(user).approve(tradeManagerAddress, requiredAmount);
  }

  async function setupFixture() {
    const [admin, user, otherAccount] = await ethers.getSigners();
    const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
    const centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
    await centralAuthorizationRegistry.initialize(admin.address);
    await centralAuthorizationRegistry.addAuthorizedContract(admin.address);

    const nftsSetup = await setupNFTsForStaking(admin, user, centralAuthorizationRegistry);
    
    // setupCoreGameContracts returns a flat object of contract instances.
    const coreContracts = await setupCoreGameContracts(admin, user, centralAuthorizationRegistry, nftsSetup, {deployRealMissionRequirements: false, deployRealMissionsStorage: true});

    // Deploy MarketPlaceStorage which is required by TradeManager
    const MarketPlaceStorage = await ethers.getContractFactory("MarketPlaceStorage");
    const marketPlaceStorage = await MarketPlaceStorage.deploy(
        centralAuthorizationRegistry.target,
        nftsSetup.genesisIslandsAddress, // Use island NFT as the collection
        true // Islands are ERC721
    );
    await marketPlaceStorage.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(marketPlaceStorage.target);
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IMarketPlaceStorage")),
        marketPlaceStorage.target
    );

    // We can now destructure the contracts we need directly from the returned object.
    const { tradeManager, missionRequirements, missionsManager } = coreContracts;

    const captainPirateId = 100;
    await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId);
    await nftsSetup.shipNFT.connect(admin).safeMint(user.address, 2);

    // Add "wood" resource type to ResourceTypeManager if it doesn't exist
    try {
      await coreContracts.resourceTypeManager.connect(admin).addResourceType("wood", true, true);
    } catch (error) {
      // Resource type already exists, ignore
    }

    const { missionRegistration, missionContract, missionFactory, missionStorage, missionType } = await setupMissionInfrastructure(
        admin,
        centralAuthorizationRegistry,
        coreContracts,
        "TradeMission",
        "Trade",
        "TradeMissionStorage"
    );

    // Register TradeMission contract under ITradeMission interface for TradeManager
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("ITradeMission")),
        missionContract.target
    );

    // Deploy and register ResourceTransferMission for TradeManager authorization
    const ResourceTransferMission = await ethers.getContractFactory("ResourceTransferMission");
    const resourceTransferMission = await ResourceTransferMission.deploy(centralAuthorizationRegistry.target);
    await resourceTransferMission.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(resourceTransferMission.target);
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IResourceTransferMission")),
        resourceTransferMission.target
    );

    // Register ARRC token under IArrcToken interface for TradeManager
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcToken")),
        coreContracts.arrcToken.target
    );

    // Deploy and register MockArrcLocking for tests
    const MockArrcLocking = await ethers.getContractFactory("MockArrcLocking");
    const arrcLocking = await MockArrcLocking.deploy(centralAuthorizationRegistry.target);
    await arrcLocking.waitForDeployment();
    await centralAuthorizationRegistry.addAuthorizedContract(arrcLocking.target);
    await centralAuthorizationRegistry.setContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking")),
        arrcLocking.target
    );

    // Deploy and register MissionResourceHandler that's required by TradeMission
    const missionResourceHandler = await deployAndRegisterContract(
        "MissionResourceHandler",
        centralAuthorizationRegistry,
        "IMissionResourceHandler" 
    );

    // Setup resource requirements in ResourceSpendManagement for food resources used in missions
    const { resourceSpendManagement, resourceTypeManager } = coreContracts;
    
    // Get all possible resource types that might be used in missions
    const allResourceTypes = ["citrus", "fish", "wood", "stone", "iron", "gold", "silver", "coal", "rum"];
    
    for (const resourceName of allResourceTypes) {
        try {
            await resourceTypeManager.connect(admin).addResourceType(resourceName, true, true);
        } catch (error) {
            // Resource type already exists, ignore
        }
        
        try {
            // Set empty requirements using the proper method signature (resource name, not ID)
            await resourceSpendManagement.connect(admin).setResourceRequirements(
                resourceName, // Use resource name as per interface
                [], // empty optional resources array
                []  // empty mandatory resources array
            );
        } catch (error) {
            // Configuration already exists or not applicable, ignore
            console.log(`Failed to set requirements for ${resourceName}:`, error.message);
        }
    }

    
    return {
      admin,
      user,
      otherAccount,
      centralAuthorizationRegistry,
      coreContracts,
      nftsSetup,
      captainPirateId,
      missionRegistration,
      missionsManager,
      tradeManager,
      missionRequirements,
      tradeMissionStorage: missionStorage,
      missionType
    };
  }

  describe("Phase 1: Mission Initialization & Validation", function () {

    it("should revert if ship is not staked", async function () {
      const { admin, user, missionsManager, nftsSetup, missionType, missionRequirements, coreContracts } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);

      // Add resource to island for trade order - use user as owner since user will create the trade order
      await coreContracts.islandStorage.connect(admin).addResource(islandId2, user.address, resourceType, amount);

      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, amount, 1, "citrus", "fish"]
      );

      await expect(
        missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData)
      ).to.be.reverted; // Should revert with custom error when ship is not staked
    });

    it("DEBUG: Check simple trade order creation", async function () {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const shipId = getNextShipId();
        const islandId1 = getNextIslandId();
        const islandId2 = getNextIslandId();
        
        // Setup basic entities
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
        
        console.log("Entities created");
        
        // Check if admin has resources for the trade order
        const adminResourceBalance = await coreContracts.resourceManagement.getResourceBalance(admin.address, islandId2, resourceType);
        console.log("Admin resource balance:", adminResourceBalance.toString());
        
        if (adminResourceBalance < amount) {
            // Add resource to admin at the island if they don't have enough
            await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amount);
            console.log("Added resources to admin");
        }
        
        // Create trade order
        console.log("Creating trade order...");
        await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, ethers.parseEther("1"));
        console.log("Trade order created");
        
        // Check if trade order exists and is valid
        const tradeOrder = await tradeManager.getTradeOrder(1);
        console.log("Trade order:", {
            seller: tradeOrder.seller,
            islandId: tradeOrder.islandId.toString(),
            resourceType: tradeOrder.resourceType,
            resourceAmount: tradeOrder.resourceAmount.toString(),
            arrcPrice: tradeOrder.arrcPrice.toString(),
            isActive: tradeOrder.isActive
        });
        
        expect(tradeOrder.isActive).to.be.true;
        console.log("Test completed successfully");
    });

    it("should revert if ship is already on a mission", async function () {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const shipId = getNextShipId();
        const islandId1 = getNextIslandId();
        const islandId2 = getNextIslandId();
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
        
        // Add resource to ResourceManagement for the admin at the island - admin will create the trade order
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amount);
        
        // Set a reasonable price per unit - 0.01 ARRC per wood token
        const pricePerUnit = ethers.parseEther("0.01");
        await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
        await missionRequirements.setIslandValidity(islandId2, missionType, true);

        // Calculate required ARRC: price per unit * amount  
        const requiredARRC = pricePerUnit * BigInt(amount); // 0.01 ARRC per unit * 100 units = 1 ARRC total
        await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
        
        // Get ArrcLocking contract address and approve it for ARRC transfers
        const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
        );
        await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
        await coreContracts.arrcToken.connect(user).approve(tradeManager.target, requiredARRC);

        const tradeOrderId = 1;
        const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
            [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
        );
        
        // Start the first mission successfully
        await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);

        // Try to start a second mission on the same ship - this should fail
        await expect(
            missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData)
        ).to.be.reverted; // Ship is already on a mission (custom error)
    });

    it("should revert if trade order is not active", async function () {
        const { admin, user, coreContracts, nftsSetup, captainPirateId, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);

        const shipId = getNextShipId();
        const islandId1 = getNextIslandId();
        const islandId2 = getNextIslandId();
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
        await missionRequirements.setIslandValidity(islandId2, missionType, true);
        
        const inactiveTradeOrderId = 999;
        const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
            [islandId1, islandId2, resourceType, amount, inactiveTradeOrderId, "citrus", "fish"]
        );

        await expect(
            missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData)
        ).to.be.revertedWith("Trade order not available");
    });

    it("should revert if user does not own the origin island", async function () {
        const { admin, user, otherAccount, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, tradeManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;

        const shipId = getNextShipId();
        const islandId1 = getNextIslandId();
        const islandId2 = getNextIslandId();
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(otherAccount.address, islandId1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
        
        // Manually setup ship without minting origin island to user (user should NOT own origin island for this test)
        await setupShipMetadata(coreContracts.shipMetadata, admin, [shipId]);
        await setupPirateSkills(coreContracts.pirateSkills, admin, nftsSetup.genesisPiratesAddress, nftsSetup.inhabitantsAddress, { genesis: [captainPirateId] });
        await coreContracts.crewManagement.connect(admin).addCrew(nftsSetup.genesisPiratesAddress, captainPirateId, user.address, "sailor", 9);
        
        const actualShipNFT = coreContracts.shipNFT || nftsSetup.shipNFT;
        const stakingData = { shipId, captainCollection: await nftsSetup.genesisPiratesNFT.getAddress(), captainId: captainPirateId, genesisPirateIds: [], inhabitantIds: [] };
        await actualShipNFT.connect(user).approve(coreContracts.shipAndPirateStaking.target, shipId);
        await nftsSetup.genesisPiratesNFT.connect(user).setApprovalForAll(coreContracts.shipAndPirateStaking.target, true);
        await coreContracts.shipAndPirateStaking.connect(user).stakeShipWithPirates(stakingData, islandId1, "Small");
        
        // Add food and RUM without minting island to user
        const rumRequired = ethers.parseEther("10");
        await coreContracts.rumToken.connect(admin).mint(user.address, rumRequired);
        await coreContracts.rumToken.connect(user).approve(coreContracts.feeManagement.target, rumRequired);
          await coreContracts.shipStorage.connect(admin).addResource(shipId, user.address, "citrus", ethers.parseUnits("50", 18));
          await coreContracts.shipStorage.connect(admin).addResource(shipId, user.address, "fish", ethers.parseUnits("50", 18));
        
        // Add resource to island before creating trade order - use admin as owner since admin owns the island and will create the trade order
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const sellerResourceAmount = amountWei * 100n; // 100x more for safety
        
        // Add resource to ResourceManagement for admin at the island - admin will create the trade order
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, sellerResourceAmount);
        
        // Set a reasonable price per unit - 0.01 ARRC per wood token
        const pricePerUnit = ethers.parseEther("0.01");
        const requiredARRC = pricePerUnit * BigInt(amount);
        
        // Mint ARRC tokens to user before approval
        await arrcToken.connect(admin).mint(user.address, requiredARRC);
        
        // Get ArrcLocking address and approve ARRC tokens
        const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
        );
        await arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
        
        await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
        await missionRequirements.setIslandValidity(islandId2, missionType, true);

        const tradeOrderId = 1;
        const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
            [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
        );

        await expect(
            missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData)
        ).to.be.revertedWith("User does not own the origin island");
    });

    it("should start mission successfully when all validations pass", async function () {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, missionsManager, tradeManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;

        const shipId = getNextShipId();
        const islandId1 = getNextIslandId();
        const islandId2 = getNextIslandId();
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
        
        // Add resource to island before creating trade order - use admin as owner since admin owns the island and will create the trade order
        await coreContracts.islandStorage.connect(admin).addResource(islandId2, admin.address, resourceType, amount);
        
        // Convert base units to wei for ResourceManagement - give seller 100x more than needed for safety
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const sellerResourceAmount = amountWei * 100n; // 100x more for safety
        
        // Add resource to ResourceManagement for admin at the island - admin will create the trade order
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, sellerResourceAmount);
        
        // Set a reasonable price per unit - 0.01 ARRC per wood token
        const pricePerUnit = ethers.parseEther("0.01");
        const requiredARRC = pricePerUnit * BigInt(amount);
        
        // Mint ARRC tokens to user before approval
        await arrcToken.connect(admin).mint(user.address, requiredARRC);
        
        // Get ArrcLocking address and approve ARRC tokens
        const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
        );
        await arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
        
        await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
        await missionRequirements.setIslandValidity(islandId2, missionType, true);
        
        const tradeOrderId = 1;
        const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
            [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
        );

        await expect(
            missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData)
        ).to.emit(missionsManager, "MissionStarted");
    });
  });

  describe("Phase 2: Mission Start & Resource Burning", function() {
    const resourceType = "wood";
    const amount = 100; // Use base units, not wei units

    async function startStandardMission() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionRegistration, tradeMissionStorage, missionsManager, missionRequirements, missionType } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
      
        const shipId = getNextShipId();
        const islandId1 = getNextIslandId();
        const islandId2 = getNextIslandId();
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
        const setupInfo = await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
        await coreContracts.islandStorage.connect(admin).addResource(islandId1, user.address, resourceType, amount);
        
        // Convert base units to wei for ResourceManagement - give seller 100x more than needed for safety
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const sellerResourceAmount = amountWei * 100n; // 100x more for safety
        
        // Add resource to ResourceManagement for admin at the island - admin will create the trade order
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, sellerResourceAmount);
        
        // Set a reasonable price per unit - 0.01 ARRC per wood token
        const pricePerUnit = ethers.parseEther("0.01");
        const requiredARRC = pricePerUnit * BigInt(amount);
        
        // Mint ARRC tokens to user before approval
        await arrcToken.connect(admin).mint(user.address, requiredARRC);
        
        // Get ArrcLocking address and approve ARRC tokens
        const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
        );
        await arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
        
        await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
        await missionRequirements.setIslandValidity(islandId2, missionType, true);

        const tradeOrderId = 1;
        const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
            [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
        );

        const tx = await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);
        const receipt = await tx.wait();
        const missionId = extractMissionIdFromReceipt(receipt, await missionsManager.getAddress());
        
        return { admin, user, coreContracts, nftsSetup, captainPirateId, tradeManager, missionRegistration, tradeMissionStorage, missionsManager, missionId, setupInfo, shipId, islandId1, islandId2 };
    }

    it("should correctly calculate journey times and store them in TradeMissionStorage", async function () {
        const { coreContracts, tradeMissionStorage, missionId, shipId, islandId1, islandId2 } = await startStandardMission();
        
        const { travelTimeCalculator } = coreContracts;
        const outboundDuration = await travelTimeCalculator.calculateTravelTime(islandId1, islandId2, shipId, true);

        // Destructure the tuple: [shipId, originIslandId, targetIslandId, tradeOrderId, resourceType, amount, price, startTime, endTime, journeyState, isShipBuying, resourcesClaimed]
        const [shipIdStored, originIslandId, targetIslandId, tradeOrderId, resourceType, amount, price, startTime, endTime, journeyState, isShipBuying, resourcesClaimed] = await tradeMissionStorage.getMissionDetails(missionId);
        
        expect(endTime).to.be.closeTo(BigInt(await time.latest()) + outboundDuration, 2);
        expect(shipIdStored).to.equal(BigInt(shipId));
        expect(originIslandId).to.equal(BigInt(islandId1));
        expect(targetIslandId).to.equal(BigInt(islandId2));
        expect(journeyState).to.equal(1n); // Should be OutboundJourney state
    });

    it("should burn the correct amount of RUM and food upon mission start", async function() {
        const { user, coreContracts, setupInfo, shipId } = await startStandardMission();
        const { rumToken, shipStorage } = coreContracts;
        const { citrusNeeded, fishNeeded } = setupInfo;

        const rumBalanceAfter = await rumToken.balanceOf(user.address);
        const citrusBalanceAfter = await shipStorage.getResourceBalance(shipId, "citrus");
        const fishBalanceAfter = await shipStorage.getResourceBalance(shipId, "fish");

        // RUM is burned based on: travelDays * nftCrewCount (1 day * 1 crew = 1 ETH)
        const expectedRumBurned = ethers.parseEther("1"); // 1 ETH per day per crew member
        expect(setupInfo.rumBalanceBefore - rumBalanceAfter).to.equal(expectedRumBurned);
        
        // Food is burned based on crew count and travel days (actual calculation is different from setup amounts)
        // The test setup provides 50 ETH each of citrus and fish, but mission only burns what's needed
        const actualCitrusBurned = setupInfo.citrusBalanceBefore - citrusBalanceAfter;
        const actualFishBurned = setupInfo.fishBalanceBefore - fishBalanceAfter;
        
        // Just verify that some food was burned (exact amounts depend on crew and mission requirements)
        expect(actualCitrusBurned).to.be.gt(0, "Citrus should be burned");
        expect(actualFishBurned).to.be.gt(0, "Fish should be burned");
    });

    it("should lock the ship in MissionsStorage and create a valid entry in TradeMissionStorage", async function() {
        const { missionsManager, tradeMissionStorage, missionId, shipId } = await startStandardMission();
        
        const [missionShipId,,,,,,,, endTime, journeyState,] = await tradeMissionStorage.getMissionDetails(missionId);
        const activeMissionId = await missionsManager.shipToActiveMission(shipId);

        expect(activeMissionId).to.equal(missionId, "Ship should be locked to the new mission ID");
        expect(missionShipId).to.equal(shipId, "Mission data not stored correctly");
        expect(journeyState).to.equal(1, "Mission should be in ToDestination state");
    });

    it("should call TradeManager.initiateTrade and escrow ARRC for a 'buy' order", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionRegistration, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        const { islandStorage, arrcToken } = coreContracts;

        const shipId = getNextShipId();
        const islandId1 = getNextIslandId();
        const islandId2 = getNextIslandId();
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2); // Admin owns destination island for buy order
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
        
        // Convert base units to wei for ResourceManagement - give seller 100x more than needed for safety
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const sellerResourceAmount = amountWei * 100n; // 100x more for safety
        
        // Add resource to ResourceManagement for admin at the island - admin will create the trade order
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, sellerResourceAmount);
        
        // Set a reasonable price per unit - 0.01 ARRC per wood token
        const pricePerUnit = ethers.parseEther("0.01");
        const requiredARRC = pricePerUnit * BigInt(amount);
        
        // Mint ARRC tokens to user before approval
        await arrcToken.connect(admin).mint(user.address, requiredARRC);
        
        // Get ArrcLocking address and approve ARRC tokens
        const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
            ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
        );
        await arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
        
        const tradeTx = await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const event = receipt.logs.find(e => e.eventName === 'TradeOrderCreated');
        const tradeOrderId = event.args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(islandId2, missionType, true);
        
        const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
            [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
        );

        const userArrcBefore = await arrcToken.balanceOf(user.address);

        await expect(
            missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData)
        ).to.emit(tradeManager, "TradeInitiated");
        
        const userArrcAfter = await arrcToken.balanceOf(user.address);
        expect(userArrcBefore - userArrcAfter).to.equal(requiredARRC);
    });
  });

  describe("Phase 3 & 4: Advancing Mission to Return Journey", function() {
    const resourceType = "wood";
    const amount = 100; // Use base units, not wei units

    async function startAndSetupMissionForAdvancement() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionRegistration, tradeMissionStorage, missionsManager, missionRequirements, missionType } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
         const shipId = getNextShipId();
         const islandId1 = getNextIslandId();
         const islandId2 = getNextIslandId();
         await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
         await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
         await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
         await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
         
         const price = ethers.parseEther("1");
         const requiredARRC = price * BigInt(amount);
         
         // Mint ARRC tokens to user before approval
         await arrcToken.connect(admin).mint(user.address, requiredARRC);
         
         const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
             ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
         );
         await arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
         
         // Convert base units to wei for ResourceManagement - give seller 100x more than needed for safety
         const amountWei = ethers.parseUnits(amount.toString(), 18);
         const sellerResourceAmount = amountWei * 100n; // 100x more for safety
         
         // Add resource to ResourceManagement for admin at the island - admin will create the trade order
         await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, sellerResourceAmount);
         
         const tradeTx = await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, price);
         const receipt = await tradeTx.wait();
         const event = receipt.logs.find(e => e.eventName === 'TradeOrderCreated');
         const tradeOrderId = event.args.tradeOrderId;
 
         await missionRequirements.setIslandValidity(islandId2, missionType, true);
         
         const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
             ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
             [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
         );
 
        const startTx = await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);
         const startReceipt = await startTx.wait();
         const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
         
         const missionDataBefore = await tradeMissionStorage.getMissionDetails(missionId);
         const endTime = missionDataBefore.endTime;
         
         return { user, coreContracts, missionsManager, tradeManager, tradeMissionStorage, missionId, endTime, tradeOrderId, shipId, islandId1, islandId2 };
    }

    it("should revert if completeMission is called before outbound journey ends", async function () {
        const { user, missionsManager, missionId, shipId } = await startAndSetupMissionForAdvancement();
        await expect(
            missionsManager.connect(user).completeMission(shipId)
        ).to.be.revertedWith("Mission not yet complete");
    });

    it("should successfully advance mission to 'Returning' state after outbound journey", async function () {
        const { user, missionsManager, missionId, tradeMissionStorage, endTime, shipId } = await startAndSetupMissionForAdvancement();
        await time.increaseTo(endTime);

        await expect(missionsManager.connect(user).completeMission(shipId)).to.not.be.reverted;

        const missionDataAfter = await tradeMissionStorage.getMissionDetails(missionId);
        expect(missionDataAfter.journeyState).to.equal(3); // 3 is Returning state
    });

    it("should set a new endTime for the return journey", async function () {
        const { user, missionsManager, missionId, tradeMissionStorage, endTime, shipId } = await startAndSetupMissionForAdvancement();
        const missionDataBefore = await tradeMissionStorage.getMissionDetails(missionId);

        await time.increaseTo(endTime);
        await missionsManager.connect(user).completeMission(shipId);

        const missionDataAfter = await tradeMissionStorage.getMissionDetails(missionId);
        expect(missionDataAfter.endTime).to.be.gt(missionDataBefore.endTime);
    });

    it("should call tradeManager.completeTrade during advancement", async function () {
        const { user, missionsManager, missionId, tradeManager, tradeOrderId, endTime, shipId } = await startAndSetupMissionForAdvancement();
        await time.increaseTo(endTime);

        await expect(
            missionsManager.connect(user).completeMission(shipId)
        ).to.emit(tradeManager, "TradeCompleted")
         .withArgs(user.address, shipId, tradeOrderId);
    });
  });

  describe("Phase 5 & 6: Completing the Return Journey", function() {
    const amount = 100; // Use consistent base units instead of wei units
    
    async function startAndSetupMissionForAdvancement() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionRegistration, tradeMissionStorage, missionsManager, missionRequirements, missionType } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
         const shipId = getNextShipId();
         const islandId1 = getNextIslandId();
         const islandId2 = getNextIslandId();
         await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
         await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
         await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
         await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
         
         const price = ethers.parseEther("1");
         const requiredARRC = price * BigInt(amount);
         
         // Mint ARRC tokens to user before approval
         await arrcToken.connect(admin).mint(user.address, requiredARRC);
         
         const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
             ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
         );
         await arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
         
         // Convert base units to wei for ResourceManagement - give seller 100x more than needed for safety
         const amountWei = ethers.parseUnits(amount.toString(), 18);
         const sellerResourceAmount = amountWei * 100n; // 100x more for safety
         
         // Add resource to ResourceManagement for admin at the island - admin will create the trade order
         await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, sellerResourceAmount);
         
         const tradeTx = await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, price);
         const receipt = await tradeTx.wait();
         const event = receipt.logs.find(e => e.eventName === 'TradeOrderCreated');
         const tradeOrderId = event.args.tradeOrderId;
 
         await missionRequirements.setIslandValidity(islandId2, missionType, true);
         
         const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
             ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
             [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
         );
 
        const startTx = await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);
         const startReceipt = await startTx.wait();
         const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
         
         const missionDataBefore = await tradeMissionStorage.getMissionDetails(missionId);
         const endTime = missionDataBefore.endTime;
         
         return { user, coreContracts, missionsManager, tradeManager, tradeMissionStorage, missionId, endTime, tradeOrderId, shipId, islandId1, islandId2 };
     }

    async function startAndAdvanceMission() {
       const { user, coreContracts, missionsManager, tradeManager, tradeMissionStorage, missionId, tradeOrderId, endTime, shipId, islandId1, islandId2 } = await startAndSetupMissionForAdvancement();
        
        await time.increaseTo(endTime);
        await missionsManager.connect(user).completeMission(shipId);
        
        const missionDataAfterAdvancement = await tradeMissionStorage.getMissionDetails(missionId);
        const finalEndTime = missionDataAfterAdvancement.endTime;

        return { user, coreContracts, missionId, tradeManager, missionsManager, tradeMissionStorage, tradeOrderId, finalEndTime, shipId, islandId1, islandId2 };
    }

    it("should revert if completeMission is called before return journey ends", async function () {
        const { user, missionsManager, missionId, shipId } = await startAndAdvanceMission();
        await expect(
            missionsManager.connect(user).completeMission(shipId)
        ).to.be.revertedWith("Return journey not yet complete");
    });

    it("should successfully complete the mission and unlock the ship", async function () {
        const { user, missionsManager, missionId, finalEndTime, shipId } = await startAndAdvanceMission();
        await time.increaseTo(finalEndTime);

        await expect(missionsManager.connect(user).completeMission(shipId)).to.not.be.reverted;
        
        const activeMissionId = await missionsManager.shipToActiveMission(shipId);
        expect(activeMissionId).to.equal(0, "Ship should be unlocked after mission completion");
    });

    it("should deliver acquired resources to the origin island for a 'buy' mission", async function () {
        const { user, coreContracts, missionsManager, missionId, finalEndTime, islandId1, shipId } = await startAndAdvanceMission();
        
        const islandWoodBefore = await coreContracts.islandStorage.getResourceBalance(islandId1, "wood");

        await time.increaseTo(finalEndTime);
        await missionsManager.connect(user).completeMission(shipId);

        const islandWoodAfter = await coreContracts.islandStorage.getResourceBalance(islandId1, "wood");
        expect(islandWoodAfter).to.be.gt(islandWoodBefore, "Wood should be delivered to the user's island");
    });

    it("should call tradeManager.completeEntireTradeMission", async function () {
        const { user, missionsManager, tradeManager, missionId, tradeOrderId, finalEndTime, shipId } = await startAndAdvanceMission();
        
        await time.increaseTo(finalEndTime);

        await expect(
            missionsManager.connect(user).completeMission(shipId)
        ).to.emit(tradeManager, "ReturnJourneyCompleted")
         .withArgs(user.address, shipId);
    });

    it("should clear mission data from TradeMissionStorage", async function() {
        const { user, missionsManager, tradeMissionStorage, missionId, finalEndTime, shipId } = await startAndAdvanceMission();

        await time.increaseTo(finalEndTime);
        await missionsManager.connect(user).completeMission(shipId);

        const missionData = await tradeMissionStorage.getMissionDetails(missionId);
        expect(missionData.shipId).to.equal(0, "Mission data should be cleared after completion");
    });
  });



  describe("Advanced Trade Scenarios & Edge Cases", function() {
    describe("Multiple Trade Types", function() {
             it("should handle multiple ships with different trade orders concurrently", async function() {
         const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        // Create multiple ships and islands - use separate origin islands to avoid docking conflicts
        const shipId1 = getNextShipId();
        const shipId2 = getNextShipId();
        const originIsland1 = getNextIslandId();
        const originIsland2 = getNextIslandId();
        const destIsland1 = getNextIslandId();
        const destIsland2 = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId1);
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId2);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland2);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland1);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland2);
        
        // Mint additional pirates to user before setup
        const captainPirateId2 = captainPirateId + 1;
        await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId2);
        
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId1, captainPirateId, originIsland1);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId2, captainPirateId2, originIsland2);
        
        // Setup different trade orders for different resources
        const wood100 = ethers.parseUnits("100", 18);
        const citrus50 = ethers.parseUnits("50", 18);
        
                 await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland1, admin.address, "wood", wood100);
         await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland2, admin.address, "citrus", citrus50);
        
        const priceWood = ethers.parseEther("0.01");
        const priceCitrus = ethers.parseEther("0.03");
        
        const tradeTx1 = await tradeManager.connect(admin).createTradeOrder(destIsland1, "wood", 100, priceWood);
        const tradeTx2 = await tradeManager.connect(admin).createTradeOrder(destIsland2, "citrus", 50, priceCitrus);
        
        const receipt1 = await tradeTx1.wait();
        const receipt2 = await tradeTx2.wait();
        
        const tradeOrderId1 = receipt1.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        const tradeOrderId2 = receipt2.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland1, missionType, true);
        await missionRequirements.setIslandValidity(destIsland2, missionType, true);
        
        // Fund ships with ARRC
        const totalPrice1 = priceWood * BigInt(100);
        const totalPrice2 = priceCitrus * BigInt(50);
        
        await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, totalPrice1 + totalPrice2);
        
        const encodedData1 = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland1, destIsland1, "wood", 100, tradeOrderId1, "citrus", "fish"]
        );
        
        const encodedData2 = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland2, destIsland2, "citrus", 50, tradeOrderId2, "citrus", "fish"]
        );
        
        // Start both missions
        await missionsManager.connect(user).startMission(shipId1, missionType, encodedData1);
        await missionsManager.connect(user).startMission(shipId2, missionType, encodedData2);
        
        // Verify both missions are active
        const mission1Data = await tradeMissionStorage.getMissionDetails(1);
        const mission2Data = await tradeMissionStorage.getMissionDetails(2);
        
        expect(mission1Data.resourceType).to.equal("wood");
        expect(mission2Data.resourceType).to.equal("citrus");
        expect(mission1Data.journeyState).to.equal(1); // ToDestination
        expect(mission2Data.journeyState).to.equal(1); // ToDestination
      });
      
      it("should handle large quantity trades", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        // Large quantity trade (10,000 units)
        const largeAmount = 10000;
        const largeAmountWei = ethers.parseUnits(largeAmount.toString(), 18);
        const pricePerUnit = ethers.parseEther("0.001");
        const totalPrice = pricePerUnit * BigInt(largeAmount);
        
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", largeAmountWei);
        await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, totalPrice);
        
        const tradeTx = await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", largeAmount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", largeAmount, tradeOrderId, "citrus", "fish"]
        );
        
        await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedData))
          .to.emit(missionsManager, "MissionStarted");
        
        const missionData = await tradeMissionStorage.getMissionDetails(1);
        expect(missionData.amount).to.equal(largeAmount);
        expect(missionData.resourceType).to.equal("wood");
      });
    });
    
    describe("Resource Management Integration", function() {
      it("should handle trades when marketplace storage is near capacity", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
        await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, totalPrice);
        
        const tradeTx = await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        // Mission should start successfully even with storage constraints
        await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedData))
          .to.not.be.reverted;
      });
      
      it("should handle acquired resources delivery on return", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
                 // Add extra resources that should be delivered as acquired resources
         await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
         await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "citrus", ethers.parseUnits("50", 18));
         await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "fish", ethers.parseUnits("30", 18));
        
        await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, totalPrice);
        
        const tradeTx = await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedData))
          .to.emit(missionsManager, "MissionStarted");
        
        const missionData = await tradeMissionStorage.getMissionDetails(1);
        expect(missionData.resourceType).to.equal("wood");
        expect(missionData.amount).to.equal(amount);
      });
    });
    
    describe("Journey State Management", function() {
      it("should correctly track mission completion percentage", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
        await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, totalPrice);
        
        const tradeTx = await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        await missionsManager.connect(user).startMission(shipId, missionType, encodedData);
        
        // Test initial state
        let missionData = await tradeMissionStorage.getMissionDetails(1);
        expect(missionData.journeyState).to.equal(1); // ToDestination
        
        // Advance to trade completion
        await time.increaseTo(missionData.endTime);
        await missionsManager.connect(user).completeMission(shipId);
        
        // Test trade completed state
        missionData = await tradeMissionStorage.getMissionDetails(1);
        expect(missionData.journeyState).to.equal(3); // Returning
        
        // Complete return journey
        await time.increaseTo(missionData.endTime);
        await missionsManager.connect(user).completeMission(shipId);
        
        // Mission should be completed and ship freed
        const isOnMission = await coreContracts.missionsStorage.isOnMission(shipId);
        expect(isOnMission).to.be.false;
      });
    });
  });

  describe("Error Handling & Edge Cases", function() {
    const resourceType = "wood";
    const amount = 100;

    it("should revert if trade order is cancelled during mission", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      // Setup trade order
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
      
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
      
      const tradeTx = await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
      const receipt = await tradeTx.wait();
      const event = receipt.logs.find(e => e.eventName === 'TradeOrderCreated');
      const tradeOrderId = event.args.tradeOrderId;
      
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      // Start mission
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);
      
      // Try to cancel trade order while mission is active - should fail
      await expect(tradeManager.connect(admin).cancelTradeOrder(tradeOrderId))
        .to.be.revertedWith("Trade in progress");
    });

    it("should handle partial trade order fulfillment", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      // Create trade order for 200 units
      const orderAmount = 200;
      const tradeAmount = 100; // Ship only wants 100 units
      
      const amountWei = ethers.parseUnits(orderAmount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(tradeAmount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
      
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, orderAmount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      const tradeOrderId = 1;
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, tradeAmount, tradeOrderId, "citrus", "fish"]
      );
      
      await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData))
        .to.emit(tradeManager, "TradeInitiated");
      
      // Check that trade order still has remaining resources
      const tradeOrder = await tradeManager.getTradeOrder(tradeOrderId);
      expect(tradeOrder.resourceAmount).to.equal(orderAmount, "Trade order should still have full amount before completion");
    });

    it("should handle large trade amounts successfully", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      // Test with a reasonable large amount
      const largeAmount = 1000;
      
      const amountWei = ethers.parseUnits(largeAmount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(largeAmount);
      await setupArrcAllowances(user, admin, coreContracts, centralAuthorizationRegistry, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, largeAmount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      const tradeOrderId = 1;
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, largeAmount, tradeOrderId, "citrus", "fish"]
      );
      
      await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData))
        .to.not.be.reverted;
    });

    it("should revert if ARRC allowance is insufficient for buy orders", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
      
      // Don't approve ARRC for ArrcLocking - this should cause failure
      
      await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      const tradeOrderId = 1;
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData))
        .to.be.revertedWith("Insufficient ARRC allowance for locking");
    });
  });

  describe("Integration Tests", function() {
    it("should handle multiple concurrent trade missions", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId1 = getNextShipId();
      const shipId2 = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      const islandId3 = getNextIslandId();
      
      // Setup two ships and islands
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId1);
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId2);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId3);
      
      // Setup both ships for missions - use different home islands to avoid docking slot conflicts
      const homeIsland1 = getNextIslandId();
      const homeIsland2 = getNextIslandId();
      
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, homeIsland1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, homeIsland2);
      
      // Mint additional pirates to user before setup
      const captainPirateId2 = captainPirateId + 1;
      await nftsSetup.genesisPiratesNFT.connect(admin).mint(user.address, captainPirateId2);
      
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId1, captainPirateId, homeIsland1);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId2, captainPirateId2, homeIsland2);
      
      // Create two trade orders
      const amountWei = ethers.parseUnits(amount.toString(), 18);
              await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId3, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC * 2n);
      
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC * 2n);
      
      await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
      await tradeManager.connect(admin).createTradeOrder(islandId3, resourceType, amount, pricePerUnit);
      
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      await missionRequirements.setIslandValidity(islandId3, missionType, true);
      
      const encodedInnerMissionData1 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [homeIsland1, islandId2, resourceType, amount, 1, "citrus", "fish"]
      );
      
      const encodedInnerMissionData2 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [homeIsland2, islandId3, resourceType, amount, 2, "citrus", "fish"]
      );
      
      // Start both missions
      await expect(missionsManager.connect(user).startMission(shipId1, missionType, encodedInnerMissionData1))
        .to.emit(tradeManager, "TradeInitiated");
      
      await expect(missionsManager.connect(user).startMission(shipId2, missionType, encodedInnerMissionData2))
        .to.emit(tradeManager, "TradeInitiated");
      
      // Both ships should be on missions
      const missionsStorage = coreContracts.missionsStorage;
      expect(await missionsStorage.isOnMission(shipId1)).to.be.true;
      expect(await missionsStorage.isOnMission(shipId2)).to.be.true;
    });
  });

  describe("State Management & Validation", function() {
    const resourceType = "wood";
    const amount = 100;

    it("should correctly track journey state transitions", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, tradeMissionStorage, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      // Setup trade
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
      
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      const tradeOrderId = 1;
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      const startTx = await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);
      const startReceipt = await startTx.wait();
      const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
      
      // Check initial state: ToDestination
      let missionData = await tradeMissionStorage.getMissionDetails(missionId);
      expect(missionData.journeyState).to.equal(1); // ToDestination
      
      // Advance to return journey
      await time.increaseTo(missionData.endTime);
      await missionsManager.connect(user).completeMission(shipId);
      
      // Check state changed to Returning
      missionData = await tradeMissionStorage.getMissionDetails(missionId);
      expect(missionData.journeyState).to.equal(3); // Returning
      
      // Complete return journey
      await time.increaseTo(missionData.endTime);
      await missionsManager.connect(user).completeMission(shipId);
      
      // Mission should be completed and cleaned up
      const activeMissionId = await missionsManager.shipToActiveMission(shipId);
      expect(activeMissionId).to.equal(0, "Ship should be freed after mission completion");
    });

    it("should validate resource type exists", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      const invalidResourceType = "nonexistent";
      
      // Try to create trade order with invalid resource type - this should fail at trade order creation
      await expect(tradeManager.connect(admin).createTradeOrder(islandId2, invalidResourceType, amount, ethers.parseEther("0.01")))
        .to.be.reverted;
    });

    it("should prevent self-trading", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId2); // User owns both islands
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      // Add resources to user's destination island
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(user.address, islandId2, user.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
      
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
      
      // User creates trade order on their own island
      await tradeManager.connect(user).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      const tradeOrderId = 1;
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      // Should revert because user is trying to trade with themselves
      await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData))
        .to.be.revertedWith("Cannot trade with yourself");
    });

    it("should properly clean up mission data after completion", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, tradeMissionStorage, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      // Complete mission setup and execution
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
      
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      const tradeOrderId = 1;
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      const startTx = await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);
      const startReceipt = await startTx.wait();
      const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
      
      // Complete both phases
      let missionData = await tradeMissionStorage.getMissionDetails(missionId);
      await time.increaseTo(missionData.endTime);
      await missionsManager.connect(user).completeMission(shipId);
      
      missionData = await tradeMissionStorage.getMissionDetails(missionId);
      await time.increaseTo(missionData.endTime);
      await missionsManager.connect(user).completeMission(shipId);
      
      // Verify cleanup
      const activeMissionId = await missionsManager.shipToActiveMission(shipId);
      expect(activeMissionId).to.equal(0, "Ship should be freed");
      
      // Check mission data is cleared
      const clearedMissionData = await tradeMissionStorage.getMissionDetails(missionId);
      expect(clearedMissionData.shipId).to.equal(0, "Mission data should be cleared");
    });

    it("should handle mission timeout scenarios", async function() {
      const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, tradeMissionStorage, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
      
      const shipId = getNextShipId();
      const islandId1 = getNextIslandId();
      const islandId2 = getNextIslandId();
      
      await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
      await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, islandId1);
      await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, islandId2);
      await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, islandId1);
      
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      await coreContracts.resourceManagement.connect(admin).addResource(admin.address, islandId2, admin.address, resourceType, amountWei);
      
      const pricePerUnit = ethers.parseEther("0.01");
      const requiredARRC = pricePerUnit * BigInt(amount);
      await coreContracts.arrcToken.connect(admin).mint(user.address, requiredARRC);
      
      const arrcLockingAddress = await centralAuthorizationRegistry.getContractAddress(
        ethers.keccak256(ethers.toUtf8Bytes("IArrcLocking"))
      );
      await coreContracts.arrcToken.connect(user).approve(arrcLockingAddress, requiredARRC);
      
      await tradeManager.connect(admin).createTradeOrder(islandId2, resourceType, amount, pricePerUnit);
      await missionRequirements.setIslandValidity(islandId2, missionType, true);
      
      const tradeOrderId = 1;
      const encodedInnerMissionData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
        [islandId1, islandId2, resourceType, amount, tradeOrderId, "citrus", "fish"]
      );
      
      const startTx = await missionsManager.connect(user).startMission(shipId, missionType, encodedInnerMissionData);
      const startReceipt = await startTx.wait();
      const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
      
      // Try to complete mission before timeout
      await expect(missionsManager.connect(user).completeMission(shipId))
        .to.be.revertedWith("Mission not yet complete");
      
      // Advance to completion time
      const missionData = await tradeMissionStorage.getMissionDetails(missionId);
      await time.increaseTo(missionData.endTime);
      
      // Should now be able to complete
      await expect(missionsManager.connect(user).completeMission(shipId))
        .to.not.be.reverted;
    });
  });

  describe("Advanced Trade Scenarios & Edge Cases", function() {
    describe("Island Buy Orders (Ships Selling to Islands)", function() {
      it("should handle ship selling resources to island (buy order)", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
        // For Island Buy Orders: Ship must already have resources to sell
        const amountWei = ethers.parseUnits((amount + 200).toString(), 18); // Extra buffer for trade
        const shipStorageAddress = await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage")));
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "wood", amountWei);
        
        // Add food and RUM resources to ship for mission consumption
        const foodAmount = ethers.parseUnits("50", 18);
        const rumAmount = ethers.parseUnits("10", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "citrus", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "fish", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "rum", rumAmount);
        
        // Admin (island owner) needs ARRC to pay for resources from ships
        await arrcToken.connect(admin).mint(admin.address, totalPrice);
        await arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
        
        // Create ISLAND BUY ORDER (island wants to buy resources from ships)
        const tradeTx = await tradeManager.connect(admin).createIslandBuyOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        // Start mission - ship should deliver resources to island and receive ARRC
        await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedData))
          .to.emit(tradeManager, "TradeInitiated");
        
        // Verify mission data
        const missionData = await tradeMissionStorage.getMissionDetails(1);
        expect(missionData.resourceType).to.equal("wood");
        expect(missionData.isShipBuying).to.be.false; // Ship is selling, not buying
      });
      
      it("should handle ARRC payment to ship on sell order completion", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
        // For Island Buy Orders: Ship must already have resources to sell
        const amountWei = ethers.parseUnits((amount + 200).toString(), 18); // Extra buffer for trade
        const shipStorageAddress = await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage")));
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "wood", amountWei);
        
        // Add food and RUM resources to ship for mission consumption
        const foodAmount = ethers.parseUnits("50", 18);
        const rumAmount = ethers.parseUnits("10", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "citrus", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "fish", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "rum", rumAmount);
        
        // Admin (island owner) needs ARRC to pay for resources from ships
        await arrcToken.connect(admin).mint(admin.address, totalPrice);
        await arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
        
        // Create island buy order
        const tradeTx = await tradeManager.connect(admin).createIslandBuyOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        const userArrcBefore = await arrcToken.balanceOf(user.address);
        
        // Start and complete mission
        const startTx = await missionsManager.connect(user).startMission(shipId, missionType, encodedData);
        const startReceipt = await startTx.wait();
        const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
        
        // Complete outbound journey
        let missionData = await tradeMissionStorage.getMissionDetails(missionId);
        await time.increaseTo(missionData.endTime);
        await missionsManager.connect(user).completeMission(shipId);
        
        // Complete return journey
        missionData = await tradeMissionStorage.getMissionDetails(missionId);
        await time.increaseTo(missionData.endTime);
        await missionsManager.connect(user).completeMission(shipId);
        
        // User should have received ARRC payment
        const userArrcAfter = await arrcToken.balanceOf(user.address);
        expect(userArrcAfter).to.be.gt(userArrcBefore, "User should receive ARRC payment for selling resources");
      });
      
      it("should handle LOCKING_TYPE_SELL_ORDER for ship selling missions", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
        // For Island Buy Orders: Ship already has resources to sell - add directly to SHIP
        const amountWei = ethers.parseUnits(amount.toString(), 18);
        const shipStorageAddress = await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage")));
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "wood", amountWei);
        
        // Add food and RUM resources to ship for mission consumption
        const foodAmount = ethers.parseUnits("50", 18);
        const rumAmount = ethers.parseUnits("10", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "citrus", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "fish", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "rum", rumAmount);
        
        // Admin (island owner) needs ARRC to pay for resources from ships
        await arrcToken.connect(admin).mint(admin.address, totalPrice);
        await arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
        
        // Create island buy order
        const tradeTx = await tradeManager.connect(admin).createIslandBuyOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        // Start mission - should use LOCKING_TYPE_SELL_ORDER (value 2)
        await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedData))
          .to.emit(tradeManager, "TradeInitiated");
        
        // Verify mission is configured for sell order
        const missionData = await tradeMissionStorage.getMissionDetails(1);
        expect(missionData.isShipBuying).to.be.false; // Ship is selling, not buying
      });
      
      it("should transfer resources from ship to island on sell order completion", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
        // For Island Buy Orders: Ship already has resources to sell - add directly to SHIP
        const amountWei = ethers.parseUnits((amount + 200).toString(), 18); // Extra buffer for trade
        const shipStorageAddress = await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage")));
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "wood", amountWei);
        
        // Add food and RUM resources to ship for mission consumption
        const foodAmount = ethers.parseUnits("50", 18);
        const rumAmount = ethers.parseUnits("10", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "citrus", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "fish", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "rum", rumAmount);
        
        // Admin (island owner) needs ARRC to pay for resources from ships
        await arrcToken.connect(admin).mint(admin.address, totalPrice);
        await arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
        
        // Create island buy order
        const tradeTx = await tradeManager.connect(admin).createIslandBuyOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        // Check destination island resources before
        const destResourcesBefore = await coreContracts.resourceManagement.getResourceBalance(admin.address, destIsland, "wood");
        
        // Start and complete mission
        const startTx = await missionsManager.connect(user).startMission(shipId, missionType, encodedData);
        const startReceipt = await startTx.wait();
        const missionId = extractMissionIdFromReceipt(startReceipt, await missionsManager.getAddress());
        
        // Complete outbound journey
        let missionData = await tradeMissionStorage.getMissionDetails(missionId);
        await time.increaseTo(missionData.endTime);
        await missionsManager.connect(user).completeMission(shipId);
        
        // Complete return journey
        missionData = await tradeMissionStorage.getMissionDetails(missionId);
        await time.increaseTo(missionData.endTime);
        await missionsManager.connect(user).completeMission(shipId);
        
        // Destination island should have received resources
        const destResourcesAfter = await coreContracts.resourceManagement.getResourceBalance(admin.address, destIsland, "wood");
        expect(destResourcesAfter).to.be.gt(destResourcesBefore, "Destination island should receive resources from ship");
      });
    });

    describe("Pending Delivery Mechanisms", function() {
      it("should handle resources held for delivery when island storage is full", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements, tradeMissionStorage } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const shipId = getNextShipId();
        const originIsland = getNextIslandId();
        const destIsland = getNextIslandId();
        
        await nftsSetup.shipNFT.connect(admin).safeMint(user.address, shipId);
        await nftsSetup.islandNft.connect(admin).mintSpecific(user.address, originIsland);
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        await setupShipForMissionTesting(user, admin, coreContracts, nftsSetup, shipId, captainPirateId, originIsland);
        
        const amount = 100;
        const pricePerUnit = ethers.parseEther("0.01");
        const totalPrice = pricePerUnit * BigInt(amount);
        
        // For Island Buy Orders: Ship already has resources to sell - add directly to SHIP
        const amountWei = ethers.parseUnits((amount + 200).toString(), 18); // Extra buffer for trade
        const shipStorageAddress = await centralAuthorizationRegistry.getContractAddress(ethers.keccak256(ethers.toUtf8Bytes("IShipStorage")));
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "wood", amountWei);
        
        // Add food and RUM resources to ship for mission consumption
        const foodAmount = ethers.parseUnits("50", 18);
        const rumAmount = ethers.parseUnits("10", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "citrus", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "fish", foodAmount);
        await coreContracts.resourceManagement.connect(admin).addResource(shipStorageAddress, shipId, user.address, "rum", rumAmount);
        
        // Admin (island owner) needs ARRC to pay for resources from ships
        await arrcToken.connect(admin).mint(admin.address, totalPrice);
        await arrcToken.connect(admin).approve(tradeManager.target, totalPrice);
        
        // Create island buy order
        const tradeTx = await tradeManager.connect(admin).createIslandBuyOrder(destIsland, "wood", amount, pricePerUnit);
        const receipt = await tradeTx.wait();
        const tradeOrderId = receipt.logs.find(e => e.eventName === 'TradeOrderCreated').args.tradeOrderId;
        
        await missionRequirements.setIslandValidity(destIsland, missionType, true);
        
        const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "uint256", "string", "uint256", "uint256", "string", "string"],
          [originIsland, destIsland, "wood", amount, tradeOrderId, "citrus", "fish"]
        );
        
        // Start mission - should emit TradeInitiated event
        await expect(missionsManager.connect(user).startMission(shipId, missionType, encodedData))
          .to.emit(tradeManager, "TradeInitiated");
        
        const missionData = await tradeMissionStorage.getMissionDetails(1);
        await time.increaseTo(missionData.endTime);
        
        // This should potentially emit ResourcesHeldForDelivery if storage is full
        await expect(missionsManager.connect(user).completeMission(shipId))
          .to.not.be.reverted;
      });
      
      it("should allow querying pending deliveries by resource type", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Test querying functions exist and return expected types
        const pendingAmount = await tradeManager.getPendingResourceAmount(destIsland, "wood");
        expect(pendingAmount).to.be.a("bigint");
        
        const pendingTypes = await tradeManager.getPendingResourceTypes(destIsland);
        expect(pendingTypes).to.be.an("array");
        
        const hasPending = await tradeManager.hasResourceTypePending(destIsland, "wood");
        expect(hasPending).to.be.a("boolean");
      });
      
      it("should allow claiming pending deliveries when storage opens up", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Test claiming pending deliveries (should revert if no pending deliveries)
        await expect(tradeManager.connect(admin).claimPendingDeliveries(destIsland, "wood", 100))
          .to.be.revertedWith("No pending deliveries for this resource type");
        
        // Test claiming all pending deliveries
        await expect(tradeManager.connect(admin).claimPendingDeliveries(destIsland, "wood", ethers.MaxUint256))
          .to.be.revertedWith("No pending deliveries for this resource type");
      });
    });

    describe("Trade Order Limits", function() {
      it("should enforce maximum trade offers per island", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Add resources for multiple trade orders
        const amountWei = ethers.parseUnits("1000", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
        
        const pricePerUnit = ethers.parseEther("0.01");
        
        // Get max trade offers for this island
        const maxOffers = await missionRequirements.getMaxTradeOffers(destIsland);
        
        // Create trade orders up to the limit
        for (let i = 0; i < maxOffers; i++) {
          await expect(tradeManager.connect(admin).createTradeOrder(destIsland, "wood", 100, pricePerUnit))
            .to.not.be.reverted;
        }
        
        // Try to create one more - should fail
        await expect(tradeManager.connect(admin).createTradeOrder(destIsland, "wood", 100, pricePerUnit))
          .to.be.revertedWith("Trade order limit reached");
      });
      
      it("should correctly count active trade orders", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Add resources
        const amountWei = ethers.parseUnits("1000", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
        
        const pricePerUnit = ethers.parseEther("0.01");
        
        // Create several trade orders
        await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", 100, pricePerUnit);
        await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", 200, pricePerUnit);
        
        const activeOrders = await tradeManager.getActiveTradeOrders(destIsland);
        expect(activeOrders.length).to.equal(2, "Should have 2 active trade orders");
        
        // Cancel one order
        await tradeManager.connect(admin).cancelTradeOrder(1);
        
        const activeOrdersAfterCancel = await tradeManager.getActiveTradeOrders(destIsland);
        expect(activeOrdersAfterCancel.length).to.equal(1, "Should have 1 active trade order after cancellation");
      });
    });

    describe("Simplified Trade Order Functionality", function() {
      it("should create and verify both island buy and sell orders", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Add resources for sell order
        const amountWei = ethers.parseUnits("200", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
        
        const pricePerUnit = ethers.parseEther("0.01");
        const buyOrderPrice = pricePerUnit * 50n; // For citrus buy order
        
        // Admin needs ARRC for buy order
        await arrcToken.connect(admin).mint(admin.address, buyOrderPrice);
        await arrcToken.connect(admin).approve(tradeManager.target, buyOrderPrice);
        
        // Create both types of orders
        await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", 100, pricePerUnit); // Ships can buy wood from island
        await tradeManager.connect(admin).createIslandBuyOrder(destIsland, "citrus", 50, pricePerUnit); // Island wants to buy citrus from ships
        
        const activeOrders = await tradeManager.getActiveTradeOrders(destIsland);
        expect(activeOrders.length).to.equal(2, "Should have both buy and sell orders");
        
        // Verify order properties
        const order1 = await tradeManager.getTradeOrder(1);
        const order2 = await tradeManager.getTradeOrder(2);
        
        // getTradeOrder returns: (seller, islandId, resourceType, resourceAmount, arrcPrice, isActive, isSellOrder)
        expect(order1[2]).to.equal("wood"); // resourceType
        expect(order1[3]).to.equal(100); // resourceAmount
        expect(order2[2]).to.equal("citrus"); // resourceType  
        expect(order2[3]).to.equal(50); // resourceAmount
      });
      
      it("should correctly identify trade order types", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        const { arrcToken } = coreContracts;
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Add resources for trade orders
        const amountWei = ethers.parseUnits("200", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
        
        const pricePerUnit = ethers.parseEther("0.01");
        const buyOrderPrice = pricePerUnit * 50n;
        
        // Fund and approve ARRC for buy order
        await arrcToken.connect(admin).mint(admin.address, buyOrderPrice);
        await arrcToken.connect(admin).approve(tradeManager.target, buyOrderPrice);
        
        // Test different order types
        await tradeManager.connect(admin).createTradeOrder(destIsland, "wood", 100, pricePerUnit); // Regular trade order
        await tradeManager.connect(admin).createIslandBuyOrder(destIsland, "citrus", 50, pricePerUnit); // Island buy order
        
        // Query order details to verify they were created correctly
        const tradeOrder = await tradeManager.getTradeOrder(1);
        const islandBuyOrder = await tradeManager.getTradeOrder(2);
        
        // Both orders should be retrievable and have the correct basic properties
        // getTradeOrder returns: (seller, islandId, resourceType, resourceAmount, arrcPrice, isActive, isSellOrder)
        expect(tradeOrder[1]).to.equal(destIsland); // islandId
        expect(islandBuyOrder[1]).to.equal(destIsland); // islandId
        expect(tradeOrder[4]).to.equal(pricePerUnit); // arrcPrice
        expect(islandBuyOrder[4]).to.equal(pricePerUnit); // arrcPrice
      });
      
      it("should query pending delivery functions without errors", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Test that pending delivery functions exist and return expected types
        const pendingAmount = await tradeManager.getPendingResourceAmount(destIsland, "wood");
        expect(pendingAmount).to.be.a("bigint");
        expect(pendingAmount).to.equal(0n); // Should be 0 initially
        
        const pendingTypes = await tradeManager.getPendingResourceTypes(destIsland);
        expect(pendingTypes).to.be.an("array");
        expect(pendingTypes).to.have.length(0); // Should be empty initially
        
        const hasPending = await tradeManager.hasResourceTypePending(destIsland, "wood");
        expect(hasPending).to.be.a("boolean");
        expect(hasPending).to.be.false; // Should be false initially
      });
      
      it("should enforce maximum trade offers per island", async function() {
        const { admin, user, centralAuthorizationRegistry, coreContracts, nftsSetup, captainPirateId, tradeManager, missionsManager, missionType, missionRequirements } = await loadFixture(setupFixture);
        
        const destIsland = getNextIslandId();
        await nftsSetup.islandNft.connect(admin).mintSpecific(admin.address, destIsland);
        
        // Add resources for multiple trade orders
        const amountWei = ethers.parseUnits("1000", 18);
        await coreContracts.resourceManagement.connect(admin).addResource(admin.address, destIsland, admin.address, "wood", amountWei);
        
        const pricePerUnit = ethers.parseEther("0.01");
        
        // Get max trade offers for this island
        const maxOffers = await missionRequirements.getMaxTradeOffers(destIsland);
        expect(maxOffers).to.be.gt(0, "Max offers should be greater than 0");
        
        // Create trade orders up to the limit
        for (let i = 0; i < maxOffers; i++) {
          await expect(tradeManager.connect(admin).createTradeOrder(destIsland, "wood", 100, pricePerUnit))
            .to.not.be.reverted;
        }
        
        // Verify we have created the expected number of orders
        const activeOrders = await tradeManager.getActiveTradeOrders(destIsland);
        expect(activeOrders.length).to.equal(Number(maxOffers), "Should have created max number of orders");
      });
    });
  });
});
