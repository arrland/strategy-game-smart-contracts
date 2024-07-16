const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CentralAuthorizationRegistry", function () {
    let CentralAuthorizationRegistry, centralAuthorizationRegistry;
    let owner, admin, addr1, addr2;

    beforeEach(async function () {
        [owner, admin, addr1, addr2] = await ethers.getSigners();
        CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();        
        await centralAuthorizationRegistry.initialize(admin.address);
    });

    describe("Deployment", function () {
        it("Should set the right admin", async function () {
            expect(await centralAuthorizationRegistry.hasRole(await centralAuthorizationRegistry.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.false;
            expect(await centralAuthorizationRegistry.hasRole(await centralAuthorizationRegistry.ADMIN_ROLE(), owner.address)).to.be.true;
            expect(await centralAuthorizationRegistry.hasRole(await centralAuthorizationRegistry.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
            expect(await centralAuthorizationRegistry.hasRole(await centralAuthorizationRegistry.ADMIN_ROLE(), admin.address)).to.be.true;
        });
    });

    describe("Authorization", function () {
        it("Should authorize a contract", async function () {
            await centralAuthorizationRegistry.addAuthorizedContract(addr1.address);
            expect(await centralAuthorizationRegistry.isAuthorized(addr1.address)).to.be.true;
        });

        it("Should deauthorize a contract", async function () {
            await centralAuthorizationRegistry.addAuthorizedContract(addr1.address);
            await centralAuthorizationRegistry.removeAuthorizedContract(addr1.address);
            expect(await centralAuthorizationRegistry.isAuthorized(addr1.address)).to.be.false;
        });

        it("Should return the list of authorized contracts", async function () {
            await centralAuthorizationRegistry.addAuthorizedContract(addr1.address);
            await centralAuthorizationRegistry.addAuthorizedContract(addr2.address);
            const authorizedContracts = await centralAuthorizationRegistry.getAuthorizedContracts();
            expect(authorizedContracts).to.include(addr1.address);
            expect(authorizedContracts).to.include(addr2.address);
        });
    });

    describe("Pirate NFT Contracts", function () {
        it("Should register a pirate NFT contract", async function () {
            await centralAuthorizationRegistry.registerPirateNftContract(addr1.address);
            expect(await centralAuthorizationRegistry.getPirateNftContract(addr1.address)).to.equal(addr1.address);
        });
    });

    describe("Contract Addresses", function () {
        it("Should set and get contract address by interface ID", async function () {
            const interfaceId = ethers.encodeBytes32String("testInterface");
            await centralAuthorizationRegistry.setContractAddress(interfaceId, addr1.address);
            expect(await centralAuthorizationRegistry.getContractAddress(interfaceId)).to.equal(addr1.address);
        });
    });
    describe("Default Admin Role Users", function () {
        it("Should return all users with the default admin role", async function () {
            const defaultAdminRoleUsers = await centralAuthorizationRegistry.getAllDefaultAdminRoleUsers();
            expect(defaultAdminRoleUsers).to.include(admin.address);
            expect(defaultAdminRoleUsers).to.not.include(owner.address);
        });
    });
});