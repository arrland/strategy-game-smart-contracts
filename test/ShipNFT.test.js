const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShipNFT", function () {
    let ShipNFT, shipNFT;
    let admin, minter, royaltyRecipient, user1, user2;

    beforeEach(async function () {
        [admin, minter, royaltyRecipient, user1, user2] = await ethers.getSigners();
        
        ShipNFT = await ethers.getContractFactory("ShipNFT");
        shipNFT = await ShipNFT.deploy(
            admin.address,
            minter.address,
            royaltyRecipient.address
        );
    });

    describe("Deployment", function () {
        it("Should set the correct name and symbol", async function () {
            expect(await shipNFT.name()).to.equal("Ships of Arrland");
            expect(await shipNFT.symbol()).to.equal("Ships");
        });

        it("Should set the correct roles", async function () {
            const MINTER_ROLE = await shipNFT.MINTER_ROLE();
            const DEFAULT_ADMIN_ROLE = await shipNFT.DEFAULT_ADMIN_ROLE();

            expect(await shipNFT.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
            expect(await shipNFT.hasRole(MINTER_ROLE, admin.address)).to.be.true;
            expect(await shipNFT.hasRole(MINTER_ROLE, minter.address)).to.be.true;
        });

        it("Should set the correct base URI", async function () {
            expect(await shipNFT.getBaseURI()).to.equal(
                "https://arrland-media.s3-eu-central-1.amazonaws.com/meta/shipsV2/"
            );
        });

        it("Should set the default royalty", async function () {
            const [recipient, amount] = await shipNFT.royaltyInfo(1, 10000);
            expect(recipient).to.equal(royaltyRecipient.address);
            expect(amount).to.equal(500); // 5% of 10000
        });
    });

    describe("Minting", function () {
        it("Should allow minter to mint a single token", async function () {
            await shipNFT.connect(minter).safeMint(user1.address, 1);
            
            expect(await shipNFT.ownerOf(1)).to.equal(user1.address);
            expect(await shipNFT.balanceOf(user1.address)).to.equal(1);
        });

        it("Should allow minting multiple tokens to same address", async function () {
            await shipNFT.connect(minter).safeMintMany(user1.address, [1, 2, 3]);
            
            expect(await shipNFT.balanceOf(user1.address)).to.equal(3);
            expect(await shipNFT.ownerOf(1)).to.equal(user1.address);
            expect(await shipNFT.ownerOf(2)).to.equal(user1.address);
            expect(await shipNFT.ownerOf(3)).to.equal(user1.address);
        });

        it("Should allow batch minting to different addresses", async function () {
            await shipNFT.connect(minter).batchMint(
                [user1.address, user2.address],
                [1, 2]
            );
            
            expect(await shipNFT.ownerOf(1)).to.equal(user1.address);
            expect(await shipNFT.ownerOf(2)).to.equal(user2.address);
        });

        it("Should revert when non-minter tries to mint", async function () {
            await expect(
                shipNFT.connect(user1).safeMint(user1.address, 1)
            ).to.be.revertedWithCustomError(shipNFT, "AccessControlUnauthorizedAccount");
        });
    });

    describe("URI Management", function () {
        it("Should allow admin to set new base URI", async function () {
            const newBaseURI = "https://new-uri.com/";
            await shipNFT.connect(admin).setBaseURI(newBaseURI);
            
            expect(await shipNFT.getBaseURI()).to.equal(newBaseURI);
        });

        it("Should return correct contract URI", async function () {
            expect(await shipNFT.contractURI()).to.equal(
                "https://arrland-media.s3-eu-central-1.amazonaws.com/meta/shipsV2/contract.json"
            );
        });
    });

    describe("Token Enumeration", function () {
        it("Should correctly return all minted token IDs", async function () {
            await shipNFT.connect(minter).safeMintMany(user1.address, [1, 2, 3]);
            
            const tokenIds = await shipNFT.getAllMintedTokenIds();
            expect(tokenIds.map(id => Number(id))).to.deep.equal([1, 2, 3]);
        });

        it("Should correctly return token IDs by owner", async function () {
            await shipNFT.connect(minter).safeMintMany(user1.address, [1, 2]);
            await shipNFT.connect(minter).safeMint(user2.address, 3);
            
            const user1TokenIds = await shipNFT.getTokenIdsByOwner(user1.address);
            expect(user1TokenIds.map(id => Number(id))).to.deep.equal([1, 2]);
        });

        it("Should correctly return all unique owners", async function () {
            await shipNFT.connect(minter).safeMintMany(user1.address, [1, 2]);
            await shipNFT.connect(minter).safeMint(user2.address, 3);
            
            const owners = await shipNFT.getAllOwners();
            const actualOwners = owners.map(addr => addr.toLowerCase());
            const expectedOwners = [user1.address.toLowerCase(), user2.address.toLowerCase()];
            
            expect(actualOwners).to.have.lengthOf(expectedOwners.length);
            expectedOwners.forEach(owner => {
                expect(actualOwners).to.include(owner);
            });
        });
    });

    describe("Royalties", function () {
        it("Should allow admin to set default royalty", async function () {
            await shipNFT.connect(admin).setDefaultRoyalty(user1.address, 1000);
            
            const [recipient, amount] = await shipNFT.royaltyInfo(1, 10000);
            expect(recipient).to.equal(user1.address);
            expect(amount).to.equal(1000);
        });

        it("Should allow admin to set token-specific royalty", async function () {
            await shipNFT.connect(minter).safeMint(user2.address, 1);
            await shipNFT.connect(admin).setTokenRoyalty(1, user1.address, 1000);
            
            const [recipient, amount] = await shipNFT.royaltyInfo(1, 10000);
            expect(recipient).to.equal(user1.address);
            expect(amount).to.equal(1000);
        });

        it("Should allow admin to set multiple token royalties", async function () {
            await shipNFT.connect(minter).safeMintMany(user2.address, [1, 2, 3]);
            await shipNFT.connect(admin).setTokenRoyalties([1, 2, 3], user1.address, 1000);
            
            for (let tokenId of [1, 2, 3]) {
                const [recipient, amount] = await shipNFT.royaltyInfo(tokenId, 10000);
                expect(recipient).to.equal(user1.address);
                expect(amount).to.equal(1000);
            }
        });
    });

    describe("Role Management", function () {
        it("Should correctly return role members", async function () {
            const MINTER_ROLE = await shipNFT.MINTER_ROLE();
            const minters = await shipNFT.getRoleMembers(MINTER_ROLE);
            
            const actualMinters = minters.map(addr => addr.toLowerCase());
            const expectedMinters = [admin.address.toLowerCase(), minter.address.toLowerCase()];
            
            expect(actualMinters).to.have.lengthOf(expectedMinters.length);
            expectedMinters.forEach(minterAddr => {
                expect(actualMinters).to.include(minterAddr);
            });
        });
    });
});
