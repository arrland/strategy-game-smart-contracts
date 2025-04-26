const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { deployAndAuthorizeContract } = require("./utils");

describe("FeeManagement", function () {
    let FeeManagement, feeManagement, centralAuthorizationRegistry;
    let RumToken, rumToken;
    let ArrcToken, arrcToken;
    let owner, admin, user, maticFeeRecipient, feeCaller;
    const initialRumFeePerDay = ethers.parseEther("1");
    const initialMaticFeePerDay = ethers.parseEther("0.05"); // 0.05 MATIC in wei
    // We keep this for querying test, but burning logic changes
    const stakePirateArrcFee = ethers.parseEther("0.5"); 

    beforeEach(async function () {
        [owner, admin, user, maticFeeRecipient, feeCaller] = await ethers.getSigners();

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();        
        await centralAuthorizationRegistry.initialize(admin.address);

        // Deploy mock tokens
        const DummyERC20Burnable = await ethers.getContractFactory("DummyERC20Burnable");
        rumToken = await DummyERC20Burnable.deploy("RUM Token", "RUM");
        arrcToken = await DummyERC20Burnable.deploy("ARRC Token", "ARRC");
        
        // Deploy the FeeManagement contract
        feeManagement = await deployAndAuthorizeContract("FeeManagement", centralAuthorizationRegistry, await rumToken.getAddress(), await arrcToken.getAddress(), maticFeeRecipient.address);

        // Authorize feeCaller address (representing e.g., ShipAndPirateStaking)
        await centralAuthorizationRegistry.addAuthorizedContract(feeCaller.address);
        
        // Mint tokens to the user
        await rumToken.mint(user.address, ethers.parseEther("100"));
        await arrcToken.mint(user.address, ethers.parseEther("100"));
    });

    describe("Initialization", function () {
        it("should initialize with correct values", async function () {
            expect(await feeManagement.rumFeePerDay()).to.equal(initialRumFeePerDay);
            expect(await feeManagement.maticFeePerDay()).to.equal(initialMaticFeePerDay);
            // Check the staking fee variable if it still exists
            expect(await feeManagement.stakePirateArrcFee()).to.equal(stakePirateArrcFee);
            expect(await feeManagement.maticFeeRecipient()).to.equal(await maticFeeRecipient.getAddress());
        });
    });

    describe("RUM Token Operations", function () {
        it("should allow authorized user to use RUM", async function () {
            const daysCount = 5n;
            const rumFee = initialRumFeePerDay * daysCount;
            await rumToken.connect(user).approve(feeManagement.getAddress(), rumFee);
            
            await expect(feeManagement.connect(feeCaller).useRum(user.address, daysCount))
                .to.emit(feeManagement, "RumUsed")
                .withArgs(user.address, rumFee);
                
            expect(await rumToken.balanceOf(user.address)).to.equal(ethers.parseEther("95"));
            // Check contract balance is zero after burn
            expect(await rumToken.balanceOf(await feeManagement.getAddress())).to.equal(0);
        });

        it("should revert if unauthorized user tries to use RUM", async function () {
            const daysCount = 5n;
            const rumFee = initialRumFeePerDay * daysCount;
            await rumToken.connect(user).approve(feeManagement.getAddress(), rumFee);
            await expect(
                feeManagement.connect(user).useRum(user.address, daysCount)
            ).to.be.revertedWith("Caller is not authorized");
        });

        it("should revert if insufficient RUM balance", async function () {
            const daysCount = 200n; // More days than user has RUM for
            const rumFee = initialRumFeePerDay * daysCount;
            await rumToken.connect(user).approve(feeManagement.getAddress(), rumFee);
            await expect(
                feeManagement.connect(feeCaller).useRum(user.address, daysCount)
            ).to.be.revertedWith("ERC20InsufficientBalance"); // Updated to match OZ error
        });
    });

    // --- Tests for burnArrc (New Generic Function) --- 
    describe("Generic ARRC Burn Operations", function () {
        it("should allow authorized caller to burn a specific ARRC amount", async function () {
            const amountToBurn = ethers.parseEther("12.34"); 
            const action = "TestBurn";
            await arrcToken.connect(user).approve(await feeManagement.getAddress(), amountToBurn);
            
            await expect(feeManagement.connect(feeCaller).burnArrc(user.address, amountToBurn, action))
                .to.emit(feeManagement, "ArrcBurned")
                .withArgs(user.address, amountToBurn, action);

            const expectedRemaining = ethers.parseEther("100") - amountToBurn;
            expect(await arrcToken.balanceOf(user.address)).to.equal(expectedRemaining);
            // Check contract balance is zero after burn
            expect(await arrcToken.balanceOf(await feeManagement.getAddress())).to.equal(0);
        });

        it("should revert if unauthorized caller tries to burn ARRC", async function () {
            const amountToBurn = ethers.parseEther("10");
            const action = "TestBurnUnauthorized";
            await arrcToken.connect(user).approve(await feeManagement.getAddress(), amountToBurn);
            await expect(
                feeManagement.connect(user).burnArrc(user.address, amountToBurn, action)
            ).to.be.revertedWith("Caller is not authorized");
        });

        it("should revert if user has insufficient ARRC balance", async function () {
            const amountToBurn = ethers.parseEther("101"); // More than user has
            const action = "TestBurnInsufficientBalance";
            await arrcToken.connect(user).approve(await feeManagement.getAddress(), amountToBurn);
            await expect(
                feeManagement.connect(feeCaller).burnArrc(user.address, amountToBurn, action)
            ).to.be.revertedWith("ERC20InsufficientBalance"); // Updated to match OZ error
        });

        it("should revert if user has insufficient ARRC allowance", async function () {
            const amountToBurn = ethers.parseEther("50");
            const allowance = ethers.parseEther("10"); 
            const action = "TestBurnInsufficientAllowance";
            await arrcToken.connect(user).approve(await feeManagement.getAddress(), allowance);
            await expect(
                feeManagement.connect(feeCaller).burnArrc(user.address, amountToBurn, action)
            ).to.be.revertedWith("ERC20InsufficientAllowance"); // Updated to match OZ error
        });

        it("should handle burning zero ARRC amount", async function () {
            const amountToBurn = ethers.parseEther("0");
            const action = "TestBurnZero";
            await arrcToken.connect(user).approve(await feeManagement.getAddress(), amountToBurn); // Approve 0
            
            await expect(feeManagement.connect(feeCaller).burnArrc(user.address, amountToBurn, action))
                .to.emit(feeManagement, "ArrcBurned")
                .withArgs(user.address, amountToBurn, action);

            expect(await arrcToken.balanceOf(user.address)).to.equal(ethers.parseEther("100")); // No change
        });
    });

    describe("Fee Setting Management", function () {
        it("should update RUM fee per day", async function () {
            const newFee = ethers.parseEther("2");
            await expect(feeManagement.connect(admin).setRumFeePerDay(newFee))
                .to.emit(feeManagement, "RumFeePerDayUpdated").withArgs(newFee);
            expect(await feeManagement.rumFeePerDay()).to.equal(newFee);
        });

        it("should update MATIC fee per day", async function () {
            const newFee = ethers.parseEther("0.1"); // 0.1 MATIC in wei
            await expect(feeManagement.connect(admin).setMaticFeePerDay(newFee))
                .to.emit(feeManagement, "MaticFeePerDayUpdated").withArgs(newFee);
            expect(await feeManagement.maticFeePerDay()).to.equal(newFee);
        });

        // Test for setting stakePirateArrcFee (assuming it's kept for querying)
        it("should update stake pirate ARRC fee", async function () {
            const newFee = ethers.parseEther("0.75");
            await expect(feeManagement.connect(admin).setStakePirateArrcFee(newFee))
                .to.emit(feeManagement, "StakePirateArrcFeeUpdated").withArgs(newFee);
            expect(await feeManagement.stakePirateArrcFee()).to.equal(newFee);
        });

        it("should update ship rebase ARRC fee", async function () {
            const newFee = ethers.parseEther("0.25");
            // This test will fail until setShipRebaseArrcFee is implemented
            await expect(feeManagement.connect(admin).setShipRebaseArrcFee(newFee))
                .to.emit(feeManagement, "ShipRebaseArrcFeeUpdated").withArgs(newFee);
            expect(await feeManagement.getShipRebaseArrcFee()).to.equal(newFee);
        });

        it("should update MATIC fee recipient", async function () {
            const newRecipient = admin.address;
            await expect(feeManagement.connect(admin).setMaticFeeRecipient(newRecipient))
                .to.emit(feeManagement, "MaticFeeRecipientUpdated").withArgs(newRecipient);
            expect(await feeManagement.maticFeeRecipient()).to.equal(newRecipient);
        });

        it("should revert if setting MATIC fee recipient to zero address", async function () {
            await expect(
                feeManagement.connect(admin).setMaticFeeRecipient(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid recipient address");
        });

        it("should revert if non-admin tries to update fees or recipient", async function () {
            const newFee = ethers.parseEther("2");
            await expect(feeManagement.connect(user).setRumFeePerDay(newFee))
                .to.be.revertedWith("Caller is not an admin");

            const newMaticFee = ethers.parseEther("0.1");
            await expect(feeManagement.connect(user).setMaticFeePerDay(newMaticFee))
                .to.be.revertedWith("Caller is not an admin");
            
            // Test setStakePirateArrcFee access control
            const newArrcFee = ethers.parseEther("1");
            await expect(feeManagement.connect(user).setStakePirateArrcFee(newArrcFee))
                .to.be.revertedWith("Caller is not an admin");

            // Test setShipRebaseArrcFee access control
            const newRebaseFee = ethers.parseEther("0.3");
            await expect(feeManagement.connect(user).setShipRebaseArrcFee(newRebaseFee))
                .to.be.revertedWith("Caller is not an admin");

            const newRecipient = admin.getAddress();
            await expect(feeManagement.connect(user).setMaticFeeRecipient(newRecipient))
                .to.be.revertedWith("Caller is not an admin");
        });
    });

    describe("Fee Calculation/Query Functions", function () {
        it("should return correct fees via getAllFees", async function () {
            const [rumFee, maticFee] = await feeManagement.getAllFees();
            expect(rumFee).to.equal(initialRumFeePerDay);
            expect(maticFee).to.equal(initialMaticFeePerDay);
        });

        it("should return updated fees after changes", async function () {
            const newRumFee = ethers.parseEther("2");
            const newMaticFee = ethers.parseEther("0.1");
            
            await feeManagement.connect(admin).setRumFeePerDay(newRumFee);
            await feeManagement.connect(admin).setMaticFeePerDay(newMaticFee);
            
            const [rumFee, maticFee] = await feeManagement.getAllFees();
            expect(rumFee).to.equal(newRumFee);
            expect(maticFee).to.equal(newMaticFee);
        });

        // Test calculateStakingArrcFee (assuming it's kept)
        it("should calculate correct staking ARRC fee", async function () {
            const pirateCount = 10n;
            const expectedFee = stakePirateArrcFee * pirateCount;
            expect(await feeManagement.calculateStakingArrcFee(pirateCount)).to.equal(expectedFee);
        });

        // Test getPirateBoardingCost (assuming it's kept)
        it("should return correct pirate boarding cost", async function () {
            const pirateCount = 7n;
            const expectedFee = stakePirateArrcFee * pirateCount;
            expect(await feeManagement.getPirateBoardingCost(pirateCount)).to.equal(expectedFee);
        });

        it("should calculate staking ARRC fee correctly", async function () {
            const pirateCount = 3n;
            const expectedFee = stakePirateArrcFee * pirateCount;
            expect(await feeManagement.calculateStakingArrcFee(pirateCount)).to.equal(expectedFee);
        });

        it("should return the correct ship rebase ARRC fee", async function () {
            const expectedRebaseFee = ethers.parseUnits("0.1", 18); // 0.1 ARRC
            // This test will fail until the getter and state variable are added
            expect(await feeManagement.getShipRebaseArrcFee()).to.equal(expectedRebaseFee);
        });
    });
});
