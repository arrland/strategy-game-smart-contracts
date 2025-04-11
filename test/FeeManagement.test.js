const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require("./utils");

describe("FeeManagement", function () {
    let FeeManagement, feeManagement, centralAuthorizationRegistry;
    let RumToken, rumToken;
    let ArrcToken, arrcToken;
    let owner, admin, user, maticFeeRecipient, feeCaller;
    const initialRumFeePerDay = ethers.parseEther("1");
    const initialMaticFeePerDay = ethers.parseEther("0.05"); // 0.05 MATIC in wei
    const stakePirateArrcFee = ethers.parseEther("0.1"); // 0.1 ARRC per pirate

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

        await centralAuthorizationRegistry.addAuthorizedContract(feeCaller.address);
        
        // Mint tokens to the user
        await rumToken.mint(user.address, ethers.parseEther("100"));
        await arrcToken.mint(user.address, ethers.parseEther("100"));
    });

    describe("Initialization", function () {
        it("should initialize with correct values", async function () {
            expect(await feeManagement.rumFeePerDay()).to.equal(initialRumFeePerDay);
            expect(await feeManagement.maticFeePerDay()).to.equal(initialMaticFeePerDay);
            expect(await feeManagement.maticFeeRecipient()).to.equal(await maticFeeRecipient.getAddress());
        });
    });

    describe("RUM Token Operations", function () {
        it("should allow authorized user to use RUM", async function () {
            const daysCount = 5n;
            const rumFee = initialRumFeePerDay * daysCount;
            await rumToken.connect(user).approve(feeManagement.getAddress(), rumFee);
            await feeManagement.connect(feeCaller).useRum(user.getAddress(), daysCount);        
            expect(await rumToken.balanceOf(user.getAddress())).to.equal(ethers.parseEther("95"));
        });

        it("should revert if unauthorized user tries to use RUM", async function () {
            const daysCount = 5n;
            const rumFee = initialRumFeePerDay * daysCount;
            await rumToken.connect(user).approve(feeManagement.getAddress(), rumFee);
            await expect(
                feeManagement.connect(user).useRum(user.getAddress(), daysCount)
            ).to.be.revertedWith("Caller is not authorized");
        });

        it("should revert if insufficient RUM balance", async function () {
            const daysCount = 200n; // More days than user has RUM for
            const rumFee = initialRumFeePerDay * daysCount;
            await rumToken.connect(user).approve(feeManagement.getAddress(), rumFee);
            await expect(
                feeManagement.connect(feeCaller).useRum(user.getAddress(), daysCount)
            ).to.be.revertedWith("Insufficient RUM balance");
        });
    });

    describe("ARRC Token Operations", function () {
        it("should allow authorized user to burn ARRC for staking", async function () {
            const pirateCount = 5n;
            const arrcFee = stakePirateArrcFee * pirateCount;
            await arrcToken.connect(user).approve(feeManagement.getAddress(), arrcFee);
            await feeManagement.connect(feeCaller).burnArrcForStaking(user.getAddress(), pirateCount);
            expect(await arrcToken.balanceOf(user.getAddress())).to.equal(ethers.parseEther("99.5"));
        });

        it("should revert if unauthorized user tries to burn ARRC", async function () {
            const pirateCount = 5n;
            const arrcFee = stakePirateArrcFee * pirateCount;
            await arrcToken.connect(user).approve(feeManagement.getAddress(), arrcFee);
            await expect(
                feeManagement.connect(user).burnArrcForStaking(user.getAddress(), pirateCount)
            ).to.be.revertedWith("Caller is not authorized");
        });

        it("should revert if insufficient ARRC balance", async function () {
            const pirateCount = 2000n; // More pirates than user has ARRC for
            const arrcFee = stakePirateArrcFee * pirateCount;
            await arrcToken.connect(user).approve(feeManagement.getAddress(), arrcFee);
            await expect(
                feeManagement.connect(feeCaller).burnArrcForStaking(user.getAddress(), pirateCount)
            ).to.be.revertedWith("Insufficient ARRC balance");
        });
    });

    describe("Fee Management", function () {
        it("should update RUM fee per day", async function () {
            const newFee = ethers.parseEther("2");
            await feeManagement.connect(admin).setRumFeePerDay(newFee);
            expect(await feeManagement.rumFeePerDay()).to.equal(newFee);
        });

        it("should update MATIC fee per day", async function () {
            const newFee = ethers.parseEther("0.1"); // 0.1 MATIC in wei
            await feeManagement.connect(admin).setMaticFeePerDay(newFee);
            expect(await feeManagement.maticFeePerDay()).to.equal(newFee);
        });

        it("should update MATIC fee recipient", async function () {
            const newRecipient = admin.address;
            await feeManagement.connect(admin).setMaticFeeRecipient(newRecipient);
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

            const newRecipient = admin.getAddress();
            await expect(feeManagement.connect(user).setMaticFeeRecipient(newRecipient))
                .to.be.revertedWith("Caller is not an admin");
        });
    });

    describe("Fee Queries", function () {
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
    });
});
