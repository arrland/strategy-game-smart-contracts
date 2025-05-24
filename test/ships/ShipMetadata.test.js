const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require('../utils');

describe("ShipMetadata", function () {
    let shipMetadata;
    let centralAuthorizationRegistry;
    let admin;
    let user;
    let unauthorized;

    beforeEach(async function () {
        [admin, user, unauthorized] = await ethers.getSigners();

        // Deploy CentralAuthorizationRegistry
        const CentralAuthRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        // Deploy ShipMetadata
        shipMetadata = await deployAndAuthorizeContract("ShipMetadata", centralAuthorizationRegistry);

        // Add admin as authorized contract
        await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
    });

    describe("Ship Attributes", function () {
        const testShipId = 1;
        const testAttributes = {
            class: "Medium",
            durability: 100,
            speed: 20,
            agility: 15,
            viewingRange: 10,
            cannonsCapacity: 10,
            armor: 50,
            ramming: 30,
            crewMin: 5,
            crewMax: 20,
            cargoBay: 1000n * 10n **18n,
            oars: false,
            shallowWaters: true,
            deepWaters: true,
            shipType: "Combat"
        };

        it("should update ship metadata correctly", async function () {
            await shipMetadata.connect(admin).updateShipMetadata(testShipId, testAttributes);
            const attributes = await shipMetadata.getShipMetadata(testShipId);

            expect(attributes.class).to.equal(testAttributes.class);
            expect(attributes.durability).to.equal(testAttributes.durability);
            expect(attributes.speed).to.equal(testAttributes.speed);
            expect(attributes.agility).to.equal(testAttributes.agility);
            expect(attributes.viewingRange).to.equal(testAttributes.viewingRange);
            expect(attributes.cannonsCapacity).to.equal(testAttributes.cannonsCapacity);
            expect(attributes.armor).to.equal(testAttributes.armor);
            expect(attributes.ramming).to.equal(testAttributes.ramming);
            expect(attributes.crewMin).to.equal(testAttributes.crewMin);
            expect(attributes.crewMax).to.equal(testAttributes.crewMax);
            expect(attributes.cargoBay).to.equal(testAttributes.cargoBay);
            expect(attributes.oars).to.equal(testAttributes.oars);
            expect(attributes.shallowWaters).to.equal(testAttributes.shallowWaters);
            expect(attributes.deepWaters).to.equal(testAttributes.deepWaters);
            expect(attributes.shipType).to.equal(testAttributes.shipType);
        });

        it("should revert when unauthorized user tries to update metadata", async function () {
            await expect(
                shipMetadata.connect(unauthorized).updateShipMetadata(testShipId, testAttributes)
            ).to.be.revertedWith("Caller is not authorized");
        });

        it("should revert when setting invalid ship class", async function () {
            const invalidAttributes = { ...testAttributes, class: "" };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid ship class");
        });

        it("should revert when setting invalid durability", async function () {
            const invalidAttributes = { ...testAttributes, durability: 0 };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid durability");
        });

        it("should revert when setting invalid speed", async function () {
            const invalidAttributes = { ...testAttributes, speed: 0 };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid speed");
        });

        it("should revert when setting invalid agility", async function () {
            const invalidAttributes = { ...testAttributes, agility: 0 };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid agility");
        });

        it("should revert when setting invalid viewing range", async function () {
            const invalidAttributes = { ...testAttributes, viewingRange: 0 };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid viewing range");
        });

        it("should revert when setting invalid crew range", async function () {
            const invalidAttributes = { ...testAttributes, crewMax: testAttributes.crewMin - 1 };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid crew range");
        });

        it("should revert when setting invalid cargo bay capacity", async function () {
            const invalidAttributes = { ...testAttributes, cargoBay: 0 };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid cargo bay capacity");
        });

        it("should revert when setting invalid ship type", async function () {
            const invalidAttributes = { ...testAttributes, shipType: "" };
            await expect(
                shipMetadata.connect(admin).updateShipMetadata(testShipId, invalidAttributes)
            ).to.be.revertedWith("Invalid ship type");
        });

        it("should batch update ship metadata correctly", async function () {
            const shipIds = [1, 2, 3];
            const attributes = shipIds.map(() => testAttributes);

            await shipMetadata.connect(admin).batchSetShipMetadata(shipIds, attributes);

            for (const shipId of shipIds) {
                const storedAttributes = await shipMetadata.getShipMetadata(shipId);
                expect(storedAttributes.class).to.equal(testAttributes.class);
                expect(storedAttributes.durability).to.equal(testAttributes.durability);
                expect(storedAttributes.speed).to.equal(testAttributes.speed);
                expect(storedAttributes.agility).to.equal(testAttributes.agility);
                expect(storedAttributes.viewingRange).to.equal(testAttributes.viewingRange);
                expect(storedAttributes.cannonsCapacity).to.equal(testAttributes.cannonsCapacity);
                expect(storedAttributes.armor).to.equal(testAttributes.armor);
                expect(storedAttributes.ramming).to.equal(testAttributes.ramming);
                expect(storedAttributes.crewMin).to.equal(testAttributes.crewMin);
                expect(storedAttributes.crewMax).to.equal(testAttributes.crewMax);
                expect(storedAttributes.cargoBay).to.equal(testAttributes.cargoBay);
                expect(storedAttributes.oars).to.equal(testAttributes.oars);
                expect(storedAttributes.shallowWaters).to.equal(testAttributes.shallowWaters);
                expect(storedAttributes.deepWaters).to.equal(testAttributes.deepWaters);
                expect(storedAttributes.shipType).to.equal(testAttributes.shipType);
            }
        });

        it("should revert batch update with mismatched array lengths", async function () {
            const shipIds = [1, 2, 3];
            const attributes = [testAttributes, testAttributes]; // One less than shipIds

            await expect(
                shipMetadata.connect(admin).batchSetShipMetadata(shipIds, attributes)
            ).to.be.revertedWith("Array length mismatch");
        });
    });
}); 