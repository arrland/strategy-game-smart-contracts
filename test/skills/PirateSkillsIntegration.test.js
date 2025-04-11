const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { setupPirateWithSkills, verifyPirateSkills } = require("../utils/skills-helpers");
const { deployAndAuthorizeContract } = require('../utils');

describe("PirateSkills and PirateSkillsReader Integration", function () {
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

    describe("Full Skill Lifecycle", function () {
        it("should add, read, update, and read updated skills correctly", async function () {
            const tokenId = 1;
            
            // Initial skill values
            const characterSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [10, 9, 8, 7];
            const shipSkills = [5, 6, 7];
            const magicSkills = [5, 6, 7, 8, 9, 10];
            
            // Add all skills
            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills,
                toolsSkills,
                specialSkills,
                shipSkills,
                magicSkills
            );
            
            // Read skills using PirateSkillsReader
            const initialSkills = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId);
            
            // Verify that skills were correctly added
            expect(initialSkills.characterSkills.length).to.equal(characterSkills.length);
            expect(initialSkills.toolsSkills.length).to.equal(toolsSkills.length);
            expect(initialSkills.specialSkills.length).to.equal(specialSkills.length);
            expect(initialSkills.shipSkills.length).to.equal(shipSkills.length);
            expect(initialSkills.magicSkills.length).to.equal(magicSkills.length);
            
            // Verify specific values
            expect(initialSkills.characterSkills[0]).to.equal(characterSkills[0]);
            expect(initialSkills.toolsSkills[0]).to.equal(toolsSkills[0]);
            expect(initialSkills.specialSkills[0]).to.equal(specialSkills[0]);
            expect(initialSkills.shipSkills[0]).to.equal(shipSkills[0]);
            expect(initialSkills.magicSkills[0]).to.equal(magicSkills[0]);
            
            // Update some skills
            const newCharacterSkillValue = 20;
            const characterCategory = 0;
            const characterSkillId = 0;
            
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                tokenId,
                characterCategory,
                characterSkillId,
                newCharacterSkillValue
            );
            
            const newToolsSkillValue = 25;
            const toolsCategory = 1;
            const toolsSkillId = 0;
            
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                tokenId,
                toolsCategory,
                toolsSkillId,
                newToolsSkillValue
            );
            
            // Read updated skills
            const updatedSkills = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId);
            
            // Verify that only the updated skills changed
            expect(updatedSkills.characterSkills[characterSkillId]).to.equal(newCharacterSkillValue);
            expect(updatedSkills.toolsSkills[toolsSkillId]).to.equal(newToolsSkillValue);
            
            // Verify that other skills remained unchanged
            expect(updatedSkills.characterSkills[1]).to.equal(characterSkills[1]);
            expect(updatedSkills.toolsSkills[1]).to.equal(toolsSkills[1]);
            expect(updatedSkills.specialSkills[0]).to.equal(specialSkills[0]);
            expect(updatedSkills.shipSkills[0]).to.equal(shipSkills[0]);
            expect(updatedSkills.magicSkills[0]).to.equal(magicSkills[0]);
            
            // Read individual skill values
            const characterSkillValue = await pirateSkillsReader.getSkill(
                genesisPiratesAddress,
                tokenId,
                characterCategory,
                characterSkillId
            );
            
            const toolsSkillValue = await pirateSkillsReader.getSkill(
                genesisPiratesAddress,
                tokenId,
                toolsCategory,
                toolsSkillId
            );
            
            // Verify individual skill values
            expect(characterSkillValue).to.equal(newCharacterSkillValue);
            expect(toolsSkillValue).to.equal(newToolsSkillValue);
        });
    });

    describe("Multiple NFT Collections", function () {
        it("should handle skills for both ERC721 and ERC1155 tokens correctly", async function () {
            const erc721TokenId = 1;
            const erc1155TokenId = 1;
            
            // Skills for ERC721 token
            const erc721CharacterSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8];
            const erc721ToolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const erc721SpecialSkills = [10, 9, 8, 7];
            const erc721ShipSkills = [5, 6, 7];
            const erc721MagicSkills = [5, 6, 7, 8, 9, 10];
            
            // Skills for ERC1155 token
            const erc1155CharacterSkills = [5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4, 3];
            const erc1155ToolsSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2];
            const erc1155SpecialSkills = [5, 4, 3, 2];
            const erc1155ShipSkills = [10, 9, 8];
            const erc1155MagicSkills = [10, 9, 8, 7, 6, 5];
            
            // Add skills for ERC721 token
            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                erc721TokenId,
                erc721CharacterSkills,
                erc721ToolsSkills,
                erc721SpecialSkills,
                erc721ShipSkills,
                erc721MagicSkills
            );
            
            // Add skills for ERC1155 token
            await pirateSkills.connect(admin).addAllSkills(
                inhabitantAddress,
                erc1155TokenId,
                erc1155CharacterSkills,
                erc1155ToolsSkills,
                erc1155SpecialSkills,
                erc1155ShipSkills,
                erc1155MagicSkills
            );
            
            // Read skills for ERC721 token
            const erc721Skills = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, erc721TokenId);
            
            // Read skills for ERC1155 token
            const erc1155Skills = await pirateSkillsReader.getAllSkills(inhabitantAddress, erc1155TokenId);
            
            // Verify skills for ERC721 token
            expect(erc721Skills.characterSkills[0]).to.equal(erc721CharacterSkills[0]);
            expect(erc721Skills.toolsSkills[0]).to.equal(erc721ToolsSkills[0]);
            expect(erc721Skills.specialSkills[0]).to.equal(erc721SpecialSkills[0]);
            expect(erc721Skills.shipSkills[0]).to.equal(erc721ShipSkills[0]);
            expect(erc721Skills.magicSkills[0]).to.equal(erc721MagicSkills[0]);
            
            // Verify skills for ERC1155 token
            expect(erc1155Skills.characterSkills[0]).to.equal(erc1155CharacterSkills[0]);
            expect(erc1155Skills.toolsSkills[0]).to.equal(erc1155ToolsSkills[0]);
            expect(erc1155Skills.specialSkills[0]).to.equal(erc1155SpecialSkills[0]);
            expect(erc1155Skills.shipSkills[0]).to.equal(erc1155ShipSkills[0]);
            expect(erc1155Skills.magicSkills[0]).to.equal(erc1155MagicSkills[0]);
            
            // Update skills for ERC721 token
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                erc721TokenId,
                0, // CHARACTER
                0, // First skill
                50 // New value
            );
            
            // Update skills for ERC1155 token
            await pirateSkills.connect(admin).updateSkill(
                inhabitantAddress,
                erc1155TokenId,
                0, // CHARACTER
                0, // First skill
                60 // New value
            );
            
            // Read updated skills
            const updatedERC721Skills = await pirateSkillsReader.getSkill(
                genesisPiratesAddress, 
                erc721TokenId, 
                0, 
                0
            );
            
            const updatedERC1155Skills = await pirateSkillsReader.getSkill(
                inhabitantAddress, 
                erc1155TokenId, 
                0, 
                0
            );
            
            // Verify updates were independent
            expect(updatedERC721Skills).to.equal(50);
            expect(updatedERC1155Skills).to.equal(60);
        });
    });

    describe("Permission and Access Control", function () {
        it("should allow anyone to read skills but only authorized contracts to update", async function () {
            const tokenId = 1;
            
            // Set up skills
            const characterSkills = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 10, 9, 8];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [10, 9, 8, 7];
            const shipSkills = [5, 6, 7];
            const magicSkills = [5, 6, 7, 8, 9, 10];
            
            // Add skills using authorized admin
            await pirateSkills.connect(admin).addAllSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills,
                toolsSkills,
                specialSkills,
                shipSkills,
                magicSkills
            );
            
            // Try to update skills using unauthorized account
            await expect(
                pirateSkills.connect(unauthorized).updateSkill(
                    genesisPiratesAddress,
                    tokenId,
                    0, // CHARACTER
                    0, // First skill
                    20 // New value
                )
            ).to.be.reverted;
            
            // Read skills using unauthorized account - should be allowed
            const skills = await pirateSkillsReader.connect(unauthorized).getAllSkills(
                genesisPiratesAddress, 
                tokenId
            );
            
            // Verify skills can be read
            expect(skills.characterSkills[0]).to.equal(characterSkills[0]);
            
            // Authorize user account
            await centralAuthorizationRegistry.addAuthorizedContract(user.address);
            
            // Update skills using newly authorized account
            await pirateSkills.connect(user).updateSkill(
                genesisPiratesAddress,
                tokenId,
                0, // CHARACTER
                0, // First skill
                20 // New value
            );
            
            // Read updated skill
            const updatedSkill = await pirateSkillsReader.getSkill(
                genesisPiratesAddress, 
                tokenId, 
                0, 
                0
            );
            
            // Verify update was successful
            expect(updatedSkill).to.equal(20);
        });
    });

    describe("Batch Operations", function () {
        it("should correctly handle batch skill setting and reading for multiple tokens", async function () {
            // Set up skills for multiple tokens
            for (let tokenId = 1; tokenId <= 3; tokenId++) {
                const characterSkills = new Array(13).fill(tokenId * 10); // Different values for each token
                const toolsSkills = new Array(9).fill(tokenId * 5);
                const specialSkills = new Array(4).fill(tokenId * 2);
                const shipSkills = new Array(3).fill(tokenId);
                const magicSkills = new Array(6).fill(tokenId * 3);
                
                await pirateSkills.connect(admin).addAllSkills(
                    genesisPiratesAddress,
                    tokenId,
                    characterSkills,
                    toolsSkills,
                    specialSkills,
                    shipSkills,
                    magicSkills
                );
            }
            
            // Read and verify skills for each token
            for (let tokenId = 1; tokenId <= 3; tokenId++) {
                const skills = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId);
                
                expect(skills.characterSkills[0]).to.equal(tokenId * 10);
                expect(skills.toolsSkills[0]).to.equal(tokenId * 5);
                expect(skills.specialSkills[0]).to.equal(tokenId * 2);
                expect(skills.shipSkills[0]).to.equal(tokenId);
                expect(skills.magicSkills[0]).to.equal(tokenId * 3);
            }
            
            // Test individual skill reading for each token
            for (let tokenId = 1; tokenId <= 3; tokenId++) {
                const characterSkill = await pirateSkillsReader.getSkill(
                    genesisPiratesAddress, 
                    tokenId, 
                    0, // CHARACTER
                    0  // First skill
                );
                
                const toolsSkill = await pirateSkillsReader.getSkill(
                    genesisPiratesAddress, 
                    tokenId, 
                    1, // TOOLS
                    0  // First skill
                );
                
                expect(characterSkill).to.equal(tokenId * 10);
                expect(toolsSkill).to.equal(tokenId * 5);
            }
        });
    });

    describe("Loading Skills from JSON", function () {
        it("should correctly load skills from a JSON file", async function () {
            // Create a test JSON file with skills data
            const skillsData = [
                {
                    tokenId: 4,
                    characterSkills: [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3],
                    toolsSkills: [10, 10, 10, 10, 10, 10, 10, 10, 10],
                    specialSkills: [7, 7, 7, 7],
                    shipSkills: [12, 12, 12],
                    magicSkills: [8, 8, 8, 8, 8, 8]
                }
            ];
            
            const testDataPath = path.join(__dirname, "../data/temp_test_skills.json");
            fs.writeFileSync(testDataPath, JSON.stringify(skillsData, null, 2));
            
            // Read the JSON file and add skills to the contract
            const jsonData = JSON.parse(fs.readFileSync(testDataPath, "utf8"));
            
            for (const data of jsonData) {
                await pirateSkills.connect(admin).addAllSkills(
                    genesisPiratesAddress,
                    data.tokenId,
                    data.characterSkills,
                    data.toolsSkills,
                    data.specialSkills,
                    data.shipSkills,
                    data.magicSkills
                );
            }
            
            // Read the skills from the contract using the reader
            const tokenId = 4;
            const skills = await pirateSkillsReader.getAllSkills(genesisPiratesAddress, tokenId);
            
            // Verify the skills match the data in the JSON file
            expect(skills.characterSkills.length).to.equal(skillsData[0].characterSkills.length);
            expect(skills.toolsSkills.length).to.equal(skillsData[0].toolsSkills.length);
            
            expect(skills.characterSkills[0]).to.equal(skillsData[0].characterSkills[0]);
            expect(skills.toolsSkills[0]).to.equal(skillsData[0].toolsSkills[0]);
            expect(skills.specialSkills[0]).to.equal(skillsData[0].specialSkills[0]);
            expect(skills.shipSkills[0]).to.equal(skillsData[0].shipSkills[0]);
            expect(skills.magicSkills[0]).to.equal(skillsData[0].magicSkills[0]);
            
            // Clean up the temporary file
            fs.unlinkSync(testDataPath);
        });
    });
}); 