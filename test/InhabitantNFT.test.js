const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("InhabitantNFT", function () {
    let InhabitantNFT, inhabitantNFT;
    let owner, minter, royaltyRecipient, addr1, addr2;

    beforeEach(async function () {
        [owner, minter, royaltyRecipient, addr1, addr2] = await ethers.getSigners();

        InhabitantNFT = await ethers.getContractFactory("InhabitantNFT");
        inhabitantNFT = await InhabitantNFT.deploy(owner.address, minter.address, royaltyRecipient.address);        
    });

    it("Should set the right roles", async function () {
        expect(await inhabitantNFT.hasRole(await inhabitantNFT.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        expect(await inhabitantNFT.hasRole(await inhabitantNFT.MINTER_ROLE(), owner.address)).to.be.true;
        expect(await inhabitantNFT.hasRole(await inhabitantNFT.MINTER_ROLE(), minter.address)).to.be.true;
    });

    it("Should mint a token", async function () {
        await inhabitantNFT.connect(minter).safeMint(addr1.address, 1);
        expect(await inhabitantNFT.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should mint multiple tokens", async function () {
        const tokenIds = [2, 3, 4];
        await inhabitantNFT.connect(minter).safeMintMany(addr1.address, tokenIds);
        for (const tokenId of tokenIds) {
            expect(await inhabitantNFT.ownerOf(tokenId)).to.equal(addr1.address);
        }
    });

    it("Should batch mint tokens", async function () {
        const addresses = [addr1.address, addr2.address];
        const tokenIds = [5, 6];
        await inhabitantNFT.connect(minter).batchMint(addresses, tokenIds);
        expect(await inhabitantNFT.ownerOf(5)).to.equal(addr1.address);
        expect(await inhabitantNFT.ownerOf(6)).to.equal(addr2.address);
    });

    it("Should set and get base URI", async function () {
        const newBaseURI = "https://new-uri.com/";
        await inhabitantNFT.connect(owner).setBaseURI(newBaseURI);
        expect(await inhabitantNFT.getBaseURI()).to.equal(newBaseURI);
    });

    it("Should return contract URI", async function () {
        const expectedContractURI = "https://arrland-media.s3-eu-central-1.amazonaws.com/meta/inhabitants/contract.json";
        expect(await inhabitantNFT.contractURI()).to.equal(expectedContractURI);
    });

    it("Should set default royalty", async function () {
        await inhabitantNFT.connect(owner).setDefaultRoyalty(addr1.address, 1000);
        const royaltyInfo = await inhabitantNFT.royaltyInfo(1, ethers.parseEther("1"));
        expect(royaltyInfo[0]).to.equal(addr1.address);
        expect(royaltyInfo[1]).to.equal(BigInt(ethers.parseEther("0.1")));
    });

    it("Should set token royalty", async function () {
        await inhabitantNFT.connect(owner).setTokenRoyalty(1, addr1.address, 1000);
        const royaltyInfo = await inhabitantNFT.royaltyInfo(1, ethers.parseEther("1"));
        expect(royaltyInfo[0]).to.equal(addr1.address);
        expect(royaltyInfo[1]).to.equal(BigInt(ethers.parseEther("0.1")));
    });

    it("Should get all minted token IDs", async function () {
        await inhabitantNFT.connect(minter).safeMint(addr1.address, 7);
        await inhabitantNFT.connect(minter).safeMint(addr1.address, 8);
        const tokenIds = await inhabitantNFT.getAllMintedTokenIds();
        expect(tokenIds.map(id => id.toString())).to.deep.equal(["7", "8"]);
    });

    it("Should get token IDs by owner", async function () {
        await inhabitantNFT.connect(minter).safeMint(addr1.address, 9);
        await inhabitantNFT.connect(minter).safeMint(addr1.address, 10);
        const tokenIds = await inhabitantNFT.getTokenIdsByOwner(addr1.address);
        expect(tokenIds.map(id => id.toString())).to.deep.equal(["9", "10"]);
    });

    it("Should get all unique owners", async function () {
        await inhabitantNFT.connect(minter).safeMint(addr1.address, 11);
        await inhabitantNFT.connect(minter).safeMint(addr2.address, 12);
        const owners = await inhabitantNFT.getAllOwners();
        expect(owners).to.include.members([addr1.address, addr2.address]);
    });
});