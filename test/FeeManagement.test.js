const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("FeeManagement", function () {
    let FeeManagement, feeManagement, centralAuthorizationRegistry;
    let RumToken, rumToken;
    let owner, admin, user, maticFeeRecipient, feeCaller;
    const initialRumFeePerDay = ethers.parseEther("1");
    const initialMaticFeePerDay = ethers.parseEther("0.05"); // 0.05 MATIC in wei

    beforeEach(async function () {
        [owner, admin, user, maticFeeRecipient, feeCaller] = await ethers.getSigners();

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();        
        await centralAuthorizationRegistry.initialize(admin.address);

        // Deploy a mock RUM token
        const DummyERC20Burnable = await ethers.getContractFactory("DummyERC20Burnable");
        rumToken = await DummyERC20Burnable.deploy("RUM Token", "RUM");
        
        // Deploy the FeeManagement contract
        FeeManagement = await ethers.getContractFactory("FeeManagement");
        feeManagement = await FeeManagement.deploy(
            await centralAuthorizationRegistry.getAddress(),
            await rumToken.getAddress(),
            maticFeeRecipient.address
        );

        await centralAuthorizationRegistry.setContractAddress(await feeManagement.INTERFACE_ID(), await feeManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await feeManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(feeCaller.address);
        
        // Mint some RUM tokens to the user
        await rumToken.mint(user.address, ethers.parseEther("100"));
    });

    it("should initialize with correct values", async function () {
        expect(await feeManagement.rumFeePerDay()).to.equal(initialRumFeePerDay);
        expect(await feeManagement.maticFeePerDay()).to.equal(initialMaticFeePerDay);
        expect(await feeManagement.maticFeeRecipient()).to.equal(await maticFeeRecipient.getAddress());
    });

    it("should allow authorized user to use RUM", async function () {
        const daysCount = 5n;
        const rumFee = initialRumFeePerDay * daysCount;
        await rumToken.connect(user).approve(feeManagement.getAddress(), rumFee);
        await feeManagement.connect(feeCaller).useRum(user.getAddress(), daysCount);        
        expect(await rumToken.balanceOf(user.getAddress())).to.equal(ethers.parseEther("95"));
    });

    it("should update RUM fee per day", async function () {
        const newFee = ethers.parseEther("2");
        await feeManagement.connect(owner).setRumFeePerDay(newFee);
        expect(await feeManagement.rumFeePerDay()).to.equal(newFee);
    });

    it("should update MATIC fee per day", async function () {
        const newFee = ethers.parseEther("0.1"); // 0.1 MATIC in wei
        await feeManagement.connect(owner).setMaticFeePerDay(newFee);
        expect(await feeManagement.maticFeePerDay()).to.equal(newFee);
    });

    it("should update MATIC fee recipient", async function () {
        const newRecipient = admin.address;
        await feeManagement.connect(owner).setMaticFeeRecipient(newRecipient);
        expect(await feeManagement.maticFeeRecipient()).to.equal(newRecipient);
    });

    it("should revert if non-admin tries to update fees or recipient", async function () {
        const newFee = ethers.parseEther("2");
        await expect(feeManagement.connect(user).setRumFeePerDay(newFee)).to.be.revertedWith("Caller is not an admin");

        const newMaticFee = ethers.parseEther("0.1"); // 0.1 MATIC in wei
        await expect(feeManagement.connect(user).setMaticFeePerDay(newMaticFee)).to.be.revertedWith("Caller is not an admin");

        const newRecipient = admin.getAddress();
        await expect(feeManagement.connect(user).setMaticFeeRecipient(newRecipient)).to.be.revertedWith("Caller is not an admin");
    });
});
