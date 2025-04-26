const { expect } = require("chai");
const { ethers } = require("hardhat");
const { 
    deployAndAuthorizeContract,
    deployBaseInfrastructure,
    verifyContractState,
    createTestConfig,
    setupTokenInfrastructure
} = require("../utils");

// Configuration for ArrcLocking tests
const ArrcLockingConfig = createTestConfig({
    ships: {
        SHIP_1: { id: 1 },
        SHIP_2: { id: 2 }
    },
    lockingTypes: {
        NONE: 0,
        BUY_ORDER: 1,
        SELL_ORDER: 2
    },
    lockAmount: ethers.parseEther("100"),
    lockDuration: 86400 // 1 day in seconds
});

describe("ArrcLocking", function () {
    // Main test state
    let state = {};
    
    // Setup fixture
    async function setupFixture() {
        // Deploy base infrastructure
        const baseInfrastructure = await deployBaseInfrastructure();
        const { admin, user, centralAuthorizationRegistry } = baseInfrastructure;
        
        // Create another user for unauthorized tests and for attacker role
        const [, , unauthorized, attacker] = await ethers.getSigners();
        
        // Deploy tokens
        const tokenInfrastructure = await setupTokenInfrastructure(
            centralAuthorizationRegistry, 
            admin, 
            [user, unauthorized, attacker], 
            "1000"
        );
        const { arrcToken } = tokenInfrastructure;
        
        // Deploy ArrcLocking
        const arrcLocking = await deployAndAuthorizeContract(
            "ArrcLocking",
            centralAuthorizationRegistry,
            await arrcToken.getAddress()
        );
        
        // Deploy MockTradeMission that will interact with ArrcLocking
        const mockTradeMission = await deployAndAuthorizeContract(
            "MockTradeMission",
            centralAuthorizationRegistry
        );
        
        // Configure MockTradeMission to use ArrcLocking
        await mockTradeMission.connect(admin).setArrcLocking(
            await arrcLocking.getAddress()
        );
        
        // Get MockTradeMission address for logs
        const mockTradeMissionAddress = await mockTradeMission.getAddress();
        
        // Also approve MockTradeMission as an intermediate contract
        await arrcToken.connect(user).approve(mockTradeMissionAddress, ethers.parseEther("10000"));
        await arrcToken.connect(unauthorized).approve(mockTradeMissionAddress, ethers.parseEther("10000"));
        await arrcToken.connect(attacker).approve(mockTradeMissionAddress, ethers.parseEther("10000"));
        
        // Also approve ArrcLocking contract directly
        const arrcLockingAddress = await arrcLocking.getAddress();
        await arrcToken.connect(user).approve(arrcLockingAddress, ethers.parseEther("10000"));
        await arrcToken.connect(unauthorized).approve(arrcLockingAddress, ethers.parseEther("10000"));
        await arrcToken.connect(attacker).approve(arrcLockingAddress, ethers.parseEther("10000"));
        
        // Return all deployed contracts and config
        return {
            ...baseInfrastructure,
            unauthorized,
            attacker,
            ...tokenInfrastructure,
            arrcLocking,
            mockTradeMission,
            config: ArrcLockingConfig
        };
    }

    beforeEach(async function () {
        state = await setupFixture();
    });

    describe("Deployment", function () {
        it("should deploy successfully with correct configuration", async function () {
            const { arrcLocking, arrcToken, centralAuthorizationRegistry } = state;
            
            // Verify ARRC token is correctly set
            const actualArrcTokenAddress = await arrcLocking.arrcToken();
            const expectedArrcTokenAddress = await arrcToken.getAddress();
            
            expect(actualArrcTokenAddress).to.equal(expectedArrcTokenAddress,
                "ARRC token address should match");
            
            // Verify CAR is correctly set
            await verifyContractState(
                arrcLocking, 
                "centralAuthorizationRegistry", 
                await centralAuthorizationRegistry.getAddress(),
                "Central Authorization Registry address should match"
            );
        });
    });

    describe("Lock for Trade", function () {
        it("should lock ARRC tokens for a buy order", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                arrcToken,
                config: { ships, lockingTypes, lockAmount, lockDuration }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // Record initial token balance
            const initialBalance = await arrcToken.balanceOf(user.address);
            const contractAddress = await arrcLocking.getAddress();
            
            // Ensure token approval is set for this specific test
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Verify tokens are locked
            expect(await arrcToken.balanceOf(user.address)).to.equal(initialBalance - lockAmount);
            expect(await arrcToken.balanceOf(contractAddress)).to.equal(lockAmount);
            
            // Verify lock info
            const isLocked = await arrcLocking.isLocked(shipId);
            expect(isLocked).to.be.true;
            
            const lockInfo = await arrcLocking.getLock(shipId);
            expect(lockInfo[0]).to.equal(lockAmount); // amount
            expect(lockInfo[2]).to.be.closeTo(
                BigInt(Math.floor(Date.now() / 1000) + lockDuration), 
                BigInt(1000)
            ); // endTime
            expect(lockInfo[3]).to.be.true; // locked
            expect(lockInfo[4]).to.equal(ethers.ZeroAddress); // attacker
            expect(lockInfo[5]).to.equal(lockingType); // lockingType
        });
        
        it("should lock ARRC tokens for a sell order", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.SELL_ORDER;
            
            // Record initial token balance
            const initialBalance = await arrcToken.balanceOf(user.address);
            const contractAddress = await arrcLocking.getAddress();
            
            // Ensure token approval is set for this specific test
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Verify tokens are locked
            expect(await arrcToken.balanceOf(user.address)).to.equal(initialBalance - lockAmount);
            expect(await arrcToken.balanceOf(contractAddress)).to.equal(lockAmount);
            
            // Verify lock info has the correct locking type
            const lockInfo = await arrcLocking.getLock(shipId);
            expect(lockInfo[5]).to.equal(lockingType); // lockingType
        });
        
        it("should fail when locking with zero amount", async function () {
            const { 
                arrcLocking,
                mockTradeMission, 
                user,
                arrcToken,
                config: { ships, lockingTypes }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.BUY_ORDER;
            const zeroAmount = 0;
            
            // Ensure token approval is set for this specific test
            const contractAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(contractAddress, zeroAmount);
            
            // Try to lock with zero amount
            await expect(
                mockTradeMission.connect(user).startMission(
                    shipId,
                    zeroAmount,
                    lockingType,
                    user.address
                )
            ).to.be.revertedWith("Must lock ARRC");
        });
        
        it("should fail when locking with invalid locking type", async function () {
            const { 
                arrcLocking,
                mockTradeMission, 
                user,
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const invalidLockingType = lockingTypes.NONE;
            
            // Ensure token approval is set for this specific test
            const contractAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Try to lock with invalid locking type
            await expect(
                mockTradeMission.connect(user).startMission(
                    shipId,
                    lockAmount,
                    invalidLockingType,
                    user.address
                )
            ).to.be.revertedWith("Invalid locking type");
        });
        
        it("should fail when locking a ship that's already locked", async function () {
            const { 
                mockTradeMission, 
                user,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // First lock
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Try to lock again
            await expect(
                mockTradeMission.connect(user).startMission(
                    shipId,
                    lockAmount,
                    lockingType,
                    user.address
                )
            ).to.be.revertedWith("Already locked");
        });
    });
    
    describe("Unlock ARRC", function () {
        it("should unlock ARRC tokens after mission completion", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.SELL_ORDER;
            
            // Record initial token balance
            const initialBalance = await arrcToken.balanceOf(user.address);
            const contractAddress = await arrcLocking.getAddress();
            
            // Ensure token approval is set for this specific test
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Complete mission which unlocks tokens
            await mockTradeMission.connect(user).completeMission(
                shipId,
                user.address
            );
            
            // Verify tokens are returned
            expect(await arrcToken.balanceOf(user.address)).to.equal(initialBalance);
            
            // Verify lock is cleared
            expect(await arrcLocking.isLocked(shipId)).to.be.false;
            
            const lockInfo = await arrcLocking.getLock(shipId);
            expect(lockInfo[0]).to.equal(0); // amount
            expect(lockInfo[3]).to.be.false; // locked
        });
        
        it("should fail when unlocking a ship that's not locked", async function () {
            const { 
                mockTradeMission, 
                user,
                config: { ships }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            
            // Try to unlock without locking first
            await expect(
                mockTradeMission.connect(user).completeMission(
                    shipId,
                    user.address
                )
            ).to.be.revertedWith("Not locked");
        });
    });
    
    describe("Transfer ARRC to Recipient", function () {
        it("should transfer locked ARRC tokens to recipient", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                admin, // using admin as recipient
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.BUY_ORDER; // Must be BUY_ORDER for transferArrcToRecipient
            
            // Record initial token balances
            const initialUserBalance = await arrcToken.balanceOf(user.address);
            const initialRecipientBalance = await arrcToken.balanceOf(admin.address);
            const contractAddress = await arrcLocking.getAddress();
            
            // Ensure token approval is set for this specific test
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Complete outbound journey which transfers tokens to recipient
            await mockTradeMission.connect(user).completeOutboundJourney(
                shipId,
                admin.address
            );
            
            // Verify tokens are transferred to recipient
            expect(await arrcToken.balanceOf(user.address)).to.equal(initialUserBalance - lockAmount);
            expect(await arrcToken.balanceOf(admin.address)).to.equal(initialRecipientBalance + lockAmount);
            
            // Verify lock is cleared
            expect(await arrcLocking.isLocked(shipId)).to.be.false;
            
            const lockInfo = await arrcLocking.getLock(shipId);
            expect(lockInfo[0]).to.equal(0); // amount
            expect(lockInfo[3]).to.be.false; // locked
        });
        
        it("should fail when transferring ARRC for a non-buy order", async function () {
            const { 
                mockTradeMission, 
                user, 
                admin, // using admin as recipient
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.SELL_ORDER; // Not a BUY_ORDER
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Try to complete outbound journey for a SELL_ORDER
            await expect(
                mockTradeMission.connect(user).completeOutboundJourney(
                    shipId,
                    admin.address
                )
            ).to.be.revertedWith("Not a buy order");
        });
    });
    
    describe("Capture Locked ARRC", function () {
        it("should capture 50% of locked ARRC when ship is attacked", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                attacker,
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const targetShipId = ships.SHIP_1.id;
            const attackerShipId = ships.SHIP_2.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // Record initial token balances
            const initialUserBalance = await arrcToken.balanceOf(user.address);
            const initialAttackerBalance = await arrcToken.balanceOf(attacker.address);
            
            // Check allowances for debugging
            const arrcLockingAddress = await arrcLocking.getAddress();
            const userAllowanceToLocking = await arrcToken.allowance(user.address, arrcLockingAddress);

            // Ensure token approval is set for this specific test
            await arrcToken.connect(user).approve(arrcLockingAddress, lockAmount);

            // 1. Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                targetShipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // 2. Simulate attack
            await mockTradeMission.connect(attacker).simulateShipAttack(
                targetShipId,
                attackerShipId,
                attacker.address
            );
            
            // Expected capture amount is 50% of locked amount
            const expectedCaptureAmount = lockAmount / BigInt(2);
            
            // Verify tokens are captured by attacker
            expect(await arrcToken.balanceOf(attacker.address)).to.equal(
                initialAttackerBalance + expectedCaptureAmount
            );
            
            // Verify lock info is updated
            const lockInfo = await arrcLocking.getLock(targetShipId);
            expect(lockInfo[0]).to.equal(lockAmount - expectedCaptureAmount); // amount
            expect(lockInfo[3]).to.be.true; // still locked
            expect(lockInfo[4]).to.equal(attacker.address); // attacker
        });
        
        it("should record attacker in lock data", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                attacker,
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const targetShipId = ships.SHIP_1.id;
            const attackerShipId = ships.SHIP_2.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // Ensure token approval is set for this specific test
            const contractAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                targetShipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Simulate attack
            await mockTradeMission.connect(attacker).simulateShipAttack(
                targetShipId,
                attackerShipId,
                attacker.address
            );
            
            // Verify attacker is recorded
            const lockInfo = await arrcLocking.getLock(targetShipId);
            expect(lockInfo[4]).to.equal(attacker.address); // attacker
        });
        
        it("should fail when capturing from an unlocked ship", async function () {
            const { 
                mockTradeMission, 
                attacker,
                config: { ships }
            } = state;
            
            // Setup test variables
            const targetShipId = ships.SHIP_1.id;
            const attackerShipId = ships.SHIP_2.id;
            
            // Try to simulate attack on an unlocked ship
            await expect(
                mockTradeMission.connect(attacker).simulateShipAttack(
                    targetShipId,
                    attackerShipId,
                    attacker.address
                )
            ).to.be.revertedWith("Target not locked");
        });
        
        it("should fail when unlocking a ship that was attacked", async function () {
            const { 
                arrcLocking,
                mockTradeMission, 
                user, 
                attacker,
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const targetShipId = ships.SHIP_1.id;
            const attackerShipId = ships.SHIP_2.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // Ensure token approval is set for this specific test
            const contractAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                targetShipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Simulate attack
            await mockTradeMission.connect(attacker).simulateShipAttack(
                targetShipId,
                attackerShipId,
                attacker.address
            );
            
            // Try to unlock after attack
            await expect(
                mockTradeMission.connect(user).completeMission(
                    targetShipId,
                    user.address
                )
            ).to.be.revertedWith("Ship was attacked");
        });
    });
    
    describe("Query Functions", function () {
        it("should correctly report if a ship is locked", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user,
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // Initially not locked
            expect(await arrcLocking.isLocked(shipId)).to.be.false;
            
            // Ensure token approval is set for this specific test
            const contractAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Now locked
            expect(await arrcLocking.isLocked(shipId)).to.be.true;
            
            // Complete mission which unlocks tokens
            await mockTradeMission.connect(user).completeMission(
                shipId,
                user.address
            );
            
            // No longer locked
            expect(await arrcLocking.isLocked(shipId)).to.be.false;
        });
        
        it("should return correct lock information", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user,
                arrcToken,
                config: { ships, lockingTypes, lockAmount, lockDuration }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // Ensure token approval is set for this specific test
            const contractAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Get lock info
            const lockInfo = await arrcLocking.getLock(shipId);
            expect(lockInfo[0]).to.equal(lockAmount); // amount
            expect(lockInfo[1]).to.be.closeTo(
                BigInt(Math.floor(Date.now() / 1000)), 
                BigInt(1000)
            ); // startTime
            expect(lockInfo[2]).to.be.closeTo(
                BigInt(Math.floor(Date.now() / 1000) + lockDuration), 
                BigInt(1000)
            ); // endTime
            expect(lockInfo[3]).to.be.true; // locked
            expect(lockInfo[4]).to.equal(ethers.ZeroAddress); // attacker
            expect(lockInfo[5]).to.equal(lockingType); // lockingType
        });
    });
    
    describe("Integration Tests", function () {
        it("should handle the complete trade mission lifecycle", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                admin, // using admin as recipient
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const shipId = ships.SHIP_1.id;
            const lockingType = lockingTypes.BUY_ORDER;
            
            // Record initial token balances
            const initialUserBalance = await arrcToken.balanceOf(user.address);
            const initialRecipientBalance = await arrcToken.balanceOf(admin.address);
            
            // Ensure token approval is set for this specific test
            const contractAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(contractAddress, lockAmount);
            
            // 1. Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                shipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // Verify tokens are locked
            expect(await arrcToken.balanceOf(user.address)).to.equal(initialUserBalance - lockAmount);
            expect(await arrcLocking.isLocked(shipId)).to.be.true;
            
            // 2. Complete outbound journey which transfers tokens to recipient
            await mockTradeMission.connect(user).completeOutboundJourney(
                shipId,
                admin.address
            );
            
            // Verify tokens are transferred to recipient
            expect(await arrcToken.balanceOf(admin.address)).to.equal(initialRecipientBalance + lockAmount);
            expect(await arrcLocking.isLocked(shipId)).to.be.false;
        });
        
        it("should handle token locking behavior after attack", async function () {
            const { 
                arrcLocking, 
                mockTradeMission, 
                user, 
                attacker,
                arrcToken,
                config: { ships, lockingTypes, lockAmount }
            } = state;
            
            // Setup test variables
            const targetShipId = ships.SHIP_1.id;
            const attackerShipId = ships.SHIP_2.id;
            const lockingType = lockingTypes.SELL_ORDER;
            
            // Record initial token balances
            const initialUserBalance = await arrcToken.balanceOf(user.address);
            const initialAttackerBalance = await arrcToken.balanceOf(attacker.address);
            
            // Ensure token approval is set for this specific test
            const arrcLockingAddress = await arrcLocking.getAddress();
            await arrcToken.connect(user).approve(arrcLockingAddress, lockAmount);

            // 1. Start mission which locks tokens
            await mockTradeMission.connect(user).startMission(
                targetShipId,
                lockAmount,
                lockingType,
                user.address
            );
            
            // 2. Simulate attack
            await mockTradeMission.connect(attacker).simulateShipAttack(
                targetShipId,
                attackerShipId,
                attacker.address
            );
            
            // Expected capture amount is 50% of locked amount
            const expectedCaptureAmount = lockAmount / BigInt(2);
            
            // Verify tokens are captured by attacker
            expect(await arrcToken.balanceOf(attacker.address)).to.equal(
                initialAttackerBalance + expectedCaptureAmount,
                "Attacker should receive 50% of locked tokens"
            );
            
            // 3. Try to complete mission (should fail)
            await expect(
                mockTradeMission.connect(user).completeMission(
                    targetShipId,
                    user.address
                )
            ).to.be.revertedWith("Ship was attacked");
            
            // 4. Verify remaining tokens are still locked
            const contractAddress = await arrcLocking.getAddress();
            expect(await arrcToken.balanceOf(contractAddress)).to.equal(lockAmount - expectedCaptureAmount);
            
            // 5. Verify user's balance hasn't changed since the attack
            expect(await arrcToken.balanceOf(user.address)).to.equal(initialUserBalance - lockAmount);
            
            // 6. Verify lock info shows the ship is still locked
            expect(await arrcLocking.isLocked(targetShipId)).to.be.true;
        });
    });
}); 