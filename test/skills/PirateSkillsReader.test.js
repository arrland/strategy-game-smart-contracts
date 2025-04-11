const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { setupPirateWithSkills, verifyPirateSkills } = require("../utils/skills-helpers");
const { deployAndAuthorizeContract } = require('../utils');

describe("PirateSkillsReader", function () {
    let pirateSkills;
    let pirateSkillsReader;
    let simpleERC721;
    let simpleERC1155;
    let centralAuthorizationRegistry;
    let admin;
    let user;
    let unauthorized;
    let pirateOwner;
    let genesisPiratesAddress;
    let inhabitantAddress;

    beforeEach(async function () {
        // Get signers
        [admin, user, unauthorized, pirateOwner] = await ethers.getSigners();

        // Deploy CentralAuthorizationRegistry
        const CentralAuthRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        // Deploy SimpleERC721 for testing
        const SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        simpleERC721 = await SimpleERC721.deploy("Genesis Pirates", "GP", "https://example.com/pirates/", admin.address);
        genesisPiratesAddress = await simpleERC721.getAddress();

        // Deploy SimpleERC1155 for testing
        const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://example.com/inhabitants/");
        inhabitantAddress = await simpleERC1155.getAddress();

        // Register NFT contracts in registry
        await centralAuthorizationRegistry.registerPirateNftContract(genesisPiratesAddress);
        await centralAuthorizationRegistry.registerPirateNftContract(inhabitantAddress);

        // Deploy PirateSkills using the helper function
        pirateSkills = await deployAndAuthorizeContract("PirateSkills", centralAuthorizationRegistry);

        // Add admin as authorized contract
        await centralAuthorizationRegistry.addAuthorizedContract(admin.address);

        // Deploy PirateSkillsReader
        pirateSkillsReader = await deployAndAuthorizeContract("PirateSkillsReader", centralAuthorizationRegistry);

        // Mint some NFTs to pirateOwner for testing
        for (let i = 1; i <= 5; i++) {
            await simpleERC721.mint(pirateOwner.address);
        }
        await simpleERC1155.mint(pirateOwner.address, 1);
    });

    describe("Deployment", function () {
        it("should deploy successfully and set the PirateSkills contract address", async function () {
            expect(await pirateSkillsReader.pirateSkills()).to.equal(await pirateSkills.getAddress());
        });
    });

    describe("Reading Single Skills", function () {
        beforeEach(async function () {
            // Set up a pirate with skills
            const tokenId = 1;
            const characterSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [10, 9, 8, 7];
            const shipSkills = [5, 6, 7];
            const magicSkills = [5, 6, 7, 8, 9, 10];

            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills,
                toolsSkills,
                specialSkills,
                shipSkills,
                magicSkills
            );
        });

        it("should correctly get a single skill value", async function () {
            const tokenId = 1;
            const category = 0; // CHARACTER
            const skillId = 0; // First skill in CHARACTER category

            const skillValue = await pirateSkillsReader.getSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId
            );

            expect(skillValue).to.equal(10); // First skill in characterSkills array
        });

        it("should revert when getting a skill that doesn't exist", async function () {
            const tokenId = 999; // Non-existent token
            const category = 0;
            const skillId = 0;

            await expect(
                pirateSkillsReader.getSkill(genesisPiratesAddress, tokenId, category, skillId)
            ).to.be.reverted;
        });

        it("should revert when getting a skill with an invalid category", async function () {
            const tokenId = 1;
            const category = 5; // Invalid category (0-4 are valid)
            const skillId = 0;

            await expect(
                pirateSkillsReader.getSkill(genesisPiratesAddress, tokenId, category, skillId)
            ).to.be.reverted;
        });

        it("should revert when getting a skill with an invalid skill ID", async function () {
            const tokenId = 1;
            const category = 0; // CHARACTER
            const skillId = 100; // Invalid skill ID

            await expect(
                pirateSkillsReader.getSkill(genesisPiratesAddress, tokenId, category, skillId)
            ).to.be.reverted;
        });
    });

    describe("Reading Skill Categories", function () {
        beforeEach(async function () {
            // Set up a pirate with skills
            const tokenId = 1;
            const characterSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [10, 9, 8, 7];
            const shipSkills = [5, 6, 7];
            const magicSkills = [5, 6, 7, 8, 9, 10];

            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills,
                toolsSkills,
                specialSkills,
                shipSkills,
                magicSkills
            );
        });

        it("should correctly get character skills", async function () {
            const tokenId = 1;
            const skills = await pirateSkillsReader.getCharacterSkillsForCollection(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(13);
            expect(skills[0]).to.equal(10);
            expect(skills[6]).to.equal(4);
            expect(skills[12]).to.equal(8);
        });

        it("should correctly get tools skills", async function () {
            const tokenId = 1;
            const skills = await pirateSkillsReader.getToolsSkillsForCollection(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(9);
            expect(skills[0]).to.equal(5);
            expect(skills[5]).to.equal(10);
            expect(skills[8]).to.equal(7);
        });

        it("should correctly get special skills", async function () {
            const tokenId = 1;
            const skills = await pirateSkillsReader.getSpecialSkillsForCollection(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(4);
            expect(skills[0]).to.equal(10);
            expect(skills[3]).to.equal(7);
        });

        it("should correctly get ship skills", async function () {
            const tokenId = 1;
            const skills = await pirateSkillsReader.getShipSkillsForCollection(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(3);
            expect(skills[0]).to.equal(5);
            expect(skills[2]).to.equal(7);
        });

        it("should correctly get magic skills", async function () {
            const tokenId = 1;
            const skills = await pirateSkillsReader.getMagicSkillsForCollection(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(6);
            expect(skills[0]).to.equal(5);
            expect(skills[5]).to.equal(10);
        });

        it("should revert when getting skills for a non-existent token", async function () {
            const tokenId = 999; // Non-existent token
            
            await expect(
                pirateSkillsReader.getCharacterSkillsForCollection(genesisPiratesAddress, tokenId)
            ).to.be.reverted;
        });
    });

    describe("Reading All Skills", function () {
        beforeEach(async function () {
            // Set up a pirate with skills
            const tokenId = 1;
            const characterSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [10, 9, 8, 7];
            const shipSkills = [5, 6, 7];
            const magicSkills = [5, 6, 7, 8, 9, 10];

            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills,
                toolsSkills,
                specialSkills,
                shipSkills,
                magicSkills
            );
        });

        it("should correctly get all skills", async function () {
            const tokenId = 1;
            const allSkills = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId);
            
            // Verify the structure of the returned object
            expect(allSkills.characterSkills.length).to.equal(13);
            expect(allSkills.toolsSkills.length).to.equal(9);
            expect(allSkills.specialSkills.length).to.equal(4);
            expect(allSkills.shipSkills.length).to.equal(3);
            expect(allSkills.magicSkills.length).to.equal(6);
            
            // Verify specific values
            expect(allSkills.characterSkills[0]).to.equal(10);
            expect(allSkills.toolsSkills[0]).to.equal(5);
            expect(allSkills.specialSkills[0]).to.equal(10);
            expect(allSkills.shipSkills[0]).to.equal(5);
            expect(allSkills.magicSkills[0]).to.equal(5);
        });

        it("should revert when getting all skills for a non-existent token", async function () {
            const tokenId = 999; // Non-existent token
            
            await expect(
                pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId)
            ).to.be.reverted;
        });

        it("should handle multiple tokens with different skills", async function () {
            // Set up another pirate with different skills
            const tokenId2 = 2;
            const characterSkills2 = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
            const toolsSkills2 = [7, 7, 7, 7, 7, 7, 7, 7, 7];
            const specialSkills2 = [9, 9, 9, 9];
            const shipSkills2 = [3, 3, 3];
            const magicSkills2 = [1, 1, 1, 1, 1, 1];

            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                tokenId2,
                characterSkills2,
                toolsSkills2,
                specialSkills2,
                shipSkills2,
                magicSkills2
            );
            
            // Get skills for token 1
            const skills1 = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, 1);
            
            // Verify token 1 skills
            expect(skills1.characterSkills[0]).to.equal(10);
            expect(skills1.toolsSkills[0]).to.equal(5);
            
            // Get skills for token 2
            const skills2 = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, 2);
            
            // Verify token 2 skills
            expect(skills2.characterSkills[0]).to.equal(5);
            expect(skills2.toolsSkills[0]).to.equal(7);
            
            // Verify the skills are different
            expect(skills1.characterSkills[0]).to.not.equal(skills2.characterSkills[0]);
            expect(skills1.toolsSkills[0]).to.not.equal(skills2.toolsSkills[0]);
        });
    });

    describe("Reading Skills for Different Collection Types", function () {
        beforeEach(async function () {
            // Set up skills for an ERC721 token
            const pirateTokenId = 1;
            const characterSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [10, 9, 8, 7];
            const shipSkills = [5, 6, 7];
            const magicSkills = [5, 6, 7, 8, 9, 10];

            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                pirateTokenId,
                characterSkills,
                toolsSkills,
                specialSkills,
                shipSkills,
                magicSkills
            );

            // Set up skills for an ERC1155 token
            const inhabitantTokenId = 1;
            await simpleERC1155.mint(pirateOwner.address, inhabitantTokenId);
            
            await pirateSkills.connect(admin).addAllSkills(
                inhabitantAddress,
                inhabitantTokenId,
                characterSkills,
                toolsSkills,
                specialSkills,
                shipSkills,
                magicSkills
            );
        });

        it("should read skills for ERC721 tokens", async function () {
            const tokenId = 1;
            const skills = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId);
            
            expect(skills.characterSkills.length).to.equal(13);
            expect(skills.toolsSkills.length).to.equal(9);
            expect(skills.characterSkills[0]).to.equal(10);
        });

        it("should read skills for ERC1155 tokens", async function () {
            const tokenId = 1;
            const skills = await pirateSkillsReader.getAllSkills(inhabitantAddress, tokenId);
            
            expect(skills.characterSkills.length).to.equal(13);
            expect(skills.toolsSkills.length).to.equal(9);
            expect(skills.characterSkills[0]).to.equal(10);
        });

        it("should handle different token types independently", async function () {
            // Update skills for the ERC721 token
            const pirateTokenId = 1;
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                pirateTokenId,
                0, // CHARACTER category
                0, // First skill
                20 // New value
            );
            
            // Read skills for both token types
            const pirateSkills1 = await pirateSkillsReader.getSkill(
                genesisPiratesAddress, 
                pirateTokenId, 
                0, 
                0
            );
            
            const inhabitantSkills1 = await pirateSkillsReader.getSkill(
                inhabitantAddress, 
                1, 
                0, 
                0
            );
            
            // Verify they're different
            expect(pirateSkills1).to.equal(20);
            expect(inhabitantSkills1).to.equal(10);
        });
    });

    describe("Performance and Edge Cases", function () {
        it("should handle tokens with no skills gracefully", async function () {
            const tokenId = 5; // Token exists but has no skills
            
            await expect(
                pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId)
            ).to.be.reverted; // Should revert if skills don't exist
        });

        it("should handle tokens with partial skills", async function () {
            const tokenId = 3;
            const characterSkills = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
            
            // Only add character skills
            await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            // Should still be able to read character skills
            const skills = await pirateSkillsReader.getCharacterSkillsForCollection(genesisPiratesAddress, tokenId);
            expect(skills.length).to.equal(13);
            expect(skills[0]).to.equal(5);
            
            // But getAllSkills should revert
            await expect(
                pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId)
            ).to.be.reverted;
        });

        it("should handle reading skills from a non-contract address", async function () {
            // Use a random address that's not a contract
            const randomAddress = "0x1234567890123456789012345678901234567890";
            const tokenId = 1;
            
            await expect(
                pirateSkillsReader.getAllSkills(randomAddress, tokenId)
            ).to.be.reverted;
        });
    });
}); 