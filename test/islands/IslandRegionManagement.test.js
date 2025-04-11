const { expect } = require("chai");
const { ethers } = require("hardhat");
const { deployAndAuthorizeContract } = require('../utils');

describe("IslandRegionManagement", function () {
    let islandRegionManagement;
    let centralAuthorizationRegistry;
    let admin;
    let user;
    let unauthorized;

    // Enum values for Region
    const Region = {
        NorthWest: 0,
        NorthEast: 1,
        SouthWest: 2,
        SouthEast: 3,
        North: 4,
        South: 5,
        East: 6,
        West: 7
    };

    // Enum values for Distance
    const Distance = {
        Short: 0,
        Medium: 1,
        Long: 2
    };

    beforeEach(async function () {
        [admin, user, unauthorized] = await ethers.getSigners();

        // Deploy CentralAuthorizationRegistry
        const CentralAuthRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        // Deploy IslandRegionManagement using the helper function
        islandRegionManagement = await deployAndAuthorizeContract("IslandRegionManagement", centralAuthorizationRegistry);

        // Add admin as authorized contract
        await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
    });

    describe("Setting Island Regions", function () {
        it("should set an island region correctly", async function () {
            const islandId = 1;
            const region = Region.NorthWest;

            await islandRegionManagement.connect(admin).setIslandRegion(islandId, region);
            
            const assignedRegion = await islandRegionManagement.islandRegions(islandId);
            expect(assignedRegion).to.equal(region);
        });

        it("should not allow unauthorized users to set island region", async function () {
            const islandId = 1;
            const region = Region.NorthWest;

            await expect(
                islandRegionManagement.connect(unauthorized).setIslandRegion(islandId, region)
            ).to.be.reverted;
        });

        it("should batch set island regions correctly", async function () {
            const islandIds = [1, 2, 3];
            const regions = [Region.NorthWest, Region.NorthEast, Region.SouthWest];

            await islandRegionManagement.connect(admin).batchSetIslandRegions(islandIds, regions);

            for (let i = 0; i < islandIds.length; i++) {
                const assignedRegion = await islandRegionManagement.islandRegions(islandIds[i]);
                expect(assignedRegion).to.equal(regions[i]);
            }
        });

        it("should revert batch set if arrays have different lengths", async function () {
            const islandIds = [1, 2, 3];
            const regions = [Region.NorthWest, Region.NorthEast];

            await expect(
                islandRegionManagement.connect(admin).batchSetIslandRegions(islandIds, regions)
            ).to.be.revertedWith("Array length mismatch");
        });
    });

    describe("Calculating Distances", function () {
        beforeEach(async function () {
            // Set up some islands with regions
            await islandRegionManagement.connect(admin).batchSetIslandRegions(
                [1, 2, 3, 4],
                [Region.NorthWest, Region.SouthEast, Region.NorthEast, Region.SouthWest]
            );
        });

        it("should return Short distance for same region", async function () {
            // Set two islands in the same region
            await islandRegionManagement.connect(admin).batchSetIslandRegions(
                [5, 6],
                [Region.North, Region.North]
            );

            const distance = await islandRegionManagement.calculateDistance(5, 6);
            expect(distance).to.equal(Distance.Short);
        });

        it("should return Medium distance for diagonal regions", async function () {
            // NorthWest to SouthEast
            let distance = await islandRegionManagement.calculateDistance(1, 2);
            expect(distance).to.equal(Distance.Medium);

            // NorthEast to SouthWest
            distance = await islandRegionManagement.calculateDistance(3, 4);
            expect(distance).to.equal(Distance.Medium);
        });

        it("should return Long distance for non-diagonal different regions", async function () {
            // Set up islands in non-diagonal regions
            await islandRegionManagement.connect(admin).batchSetIslandRegions(
                [7, 8],
                [Region.North, Region.South]
            );

            const distance = await islandRegionManagement.calculateDistance(7, 8);
            expect(distance).to.equal(Distance.Long);
        });

        it("should handle distance calculation for unset regions", async function () {
            // Using an unset island ID should still work but treat it as Region(0)
            const unsetIslandId = 999;
            const setIslandId = 1; // This is set to NorthWest (0)

            const distance = await islandRegionManagement.calculateDistance(unsetIslandId, setIslandId);
            expect(distance).to.equal(Distance.Short); // Both will be NorthWest (0), so distance is Short
        });

        it("should be symmetric in distance calculation", async function () {
            // Distance should be the same regardless of direction
            const distance1 = await islandRegionManagement.calculateDistance(1, 2); // NorthWest to SouthEast
            const distance2 = await islandRegionManagement.calculateDistance(2, 1); // SouthEast to NorthWest

            expect(distance1).to.equal(distance2);
            expect(distance1).to.equal(Distance.Medium);
        });
    });
}); 