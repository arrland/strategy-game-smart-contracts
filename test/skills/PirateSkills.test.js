const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

describe("PirateSkills", function () {
    let PirateSkills, pirateSkills;
    let CentralAuthorizationRegistry, centralAuthorizationRegistry;
    let SimpleERC1155, simpleERC1155;
    let SimpleERC721, inhabitantNFT;
    let genesisPiratesAddress, InhabitantsAddress;
    let admin, user, unauthorized, pirateOwner;

    const { deployAndAuthorizeContract } = require('../utils');
    const { setupPirateWithSkills, verifyPirateSkills } = require('../utils/skills-helpers');

    beforeEach(async function () {
        [admin, user, unauthorized, pirateOwner] = await ethers.getSigners();
        
        // Deploy CentralAuthorizationRegistry
        const CentralAuthRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);
        
        // Deploy SimpleERC1155 for pirates
        SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://example.com/pirates/");
        genesisPiratesAddress = await simpleERC1155.getAddress();
        
        // Deploy SimpleERC721 for inhabitants
        SimpleERC721 = await ethers.getContractFactory("SimpleERC721");
        inhabitantNFT = await SimpleERC721.deploy("Inhabitant", "INH", "https://example.com/inhabitants/", admin.address);
        InhabitantsAddress = await inhabitantNFT.getAddress();
        
        // Register NFT contracts
        await centralAuthorizationRegistry.registerPirateNftContract(genesisPiratesAddress);
        await centralAuthorizationRegistry.registerPirateNftContract(InhabitantsAddress);
        
        // Deploy PirateSkills using the helper function
        pirateSkills = await deployAndAuthorizeContract("PirateSkills", centralAuthorizationRegistry);
        
        // Add admin as authorized contract
        await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
        
        // Mint NFTs to pirateOwner
        await simpleERC1155.mint(pirateOwner.address, 1);
        await simpleERC1155.mint(pirateOwner.address, 2);
        await simpleERC1155.mint(pirateOwner.address, 3);
        
        await inhabitantNFT.mint(pirateOwner.address); // TokenId 1
        await inhabitantNFT.mint(pirateOwner.address); // TokenId 2
    });

    describe("Deployment & Authorization", function () {
        it("should deploy with the correct authorization registry", async function () {
            const registryAddress = await centralAuthorizationRegistry.getAddress();
            expect(await pirateSkills.centralAuthorizationRegistry()).to.equal(registryAddress);
        });
        
        it("should be authorized in the registry", async function () {
            const isAuthorized = await centralAuthorizationRegistry.isAuthorized(await pirateSkills.getAddress());
            expect(isAuthorized).to.be.true;
        });
        
        it("should have the correct interface ID in the registry", async function () {
            const interfaceId = ethers.keccak256(ethers.toUtf8Bytes("IPirateSkills"));
            const registeredAddress = await centralAuthorizationRegistry.getContractAddress(interfaceId);
            expect(registeredAddress).to.equal(await pirateSkills.getAddress());
        });
    });

    describe("Adding Skills", function () {
        it("should add character skills correctly", async function () {
            const tokenId = 1;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            const skills = await pirateSkills.getCharacterSkills(genesisPiratesAddress, tokenId);
            
            for (let i = 0; i < characterSkills.length; i++) {
                expect(skills[i]).to.equal(characterSkills[i]);
            }
        });
        
        it("should add tools skills correctly", async function () {
            const tokenId = 1;
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            
            await pirateSkills.connect(admin).addToolsSkills(
                genesisPiratesAddress,
                tokenId,
                toolsSkills
            );
            
            const skills = await pirateSkills.getToolsSkills(genesisPiratesAddress, tokenId);
            
            for (let i = 0; i < toolsSkills.length; i++) {
                expect(skills[i]).to.equal(toolsSkills[i]);
            }
        });
        
        it("should add special skills correctly", async function () {
            const tokenId = 1;
            const specialSkills = [5, 6, 7, 8];
            
            await pirateSkills.connect(admin).addSpecialSkills(
                genesisPiratesAddress,
                tokenId,
                specialSkills
            );
            
            const skills = await pirateSkills.getSpecialSkills(genesisPiratesAddress, tokenId);
            
            for (let i = 0; i < specialSkills.length; i++) {
                expect(skills[i]).to.equal(specialSkills[i]);
            }
        });
        
        it("should add ship skills correctly", async function () {
            const tokenId = 1;
            const shipSkills = [5, 6, 7];
            
            await pirateSkills.connect(admin).addShipSkills(
                genesisPiratesAddress,
                tokenId,
                shipSkills
            );
            
            const skills = await pirateSkills.getShipSkills(genesisPiratesAddress, tokenId);
            
            for (let i = 0; i < shipSkills.length; i++) {
                expect(skills[i]).to.equal(shipSkills[i]);
            }
        });
        
        it("should add magic skills correctly", async function () {
            const tokenId = 1;
            const magicSkills = [5, 6, 7, 8, 9, 10];
            
            await pirateSkills.connect(admin).addMagicSkills(
                genesisPiratesAddress,
                tokenId,
                magicSkills
            );
            
            const skills = await pirateSkills.getMagicSkills(genesisPiratesAddress, tokenId);
            
            for (let i = 0; i < magicSkills.length; i++) {
                expect(skills[i]).to.equal(magicSkills[i]);
            }
        });
        
        it("should add all skills at once", async function () {
            const tokenId = 2;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [5, 6, 7, 8];
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
            
            // Verify character skills
            const retrievedCharacterSkills = await pirateSkills.getCharacterSkills(genesisPiratesAddress, tokenId);
            for (let i = 0; i < characterSkills.length; i++) {
                expect(retrievedCharacterSkills[i]).to.equal(characterSkills[i]);
            }
            
            // Verify tools skills
            const retrievedToolsSkills = await pirateSkills.getToolsSkills(genesisPiratesAddress, tokenId);
            for (let i = 0; i < toolsSkills.length; i++) {
                expect(retrievedToolsSkills[i]).to.equal(toolsSkills[i]);
            }
            
            // Verify special skills
            const retrievedSpecialSkills = await pirateSkills.getSpecialSkills(genesisPiratesAddress, tokenId);
            for (let i = 0; i < specialSkills.length; i++) {
                expect(retrievedSpecialSkills[i]).to.equal(specialSkills[i]);
            }
            
            // Verify ship skills
            const retrievedShipSkills = await pirateSkills.getShipSkills(genesisPiratesAddress, tokenId);
            for (let i = 0; i < shipSkills.length; i++) {
                expect(retrievedShipSkills[i]).to.equal(shipSkills[i]);
            }
            
            // Verify magic skills
            const retrievedMagicSkills = await pirateSkills.getMagicSkills(genesisPiratesAddress, tokenId);
            for (let i = 0; i < magicSkills.length; i++) {
                expect(retrievedMagicSkills[i]).to.equal(magicSkills[i]);
            }
        });
        
        it("should revert when adding character skills with incorrect length", async function () {
            const tokenId = 1;
            const characterSkills = [5, 6, 7]; // Too short
            
            await expect(
                pirateSkills.connect(admin).addCharacterSkills(
                    genesisPiratesAddress,
                    tokenId,
                    characterSkills
                )
            ).to.be.revertedWith("Invalid character skills length");
        });
        
        it("should revert when adding tools skills with incorrect length", async function () {
            const tokenId = 1;
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8]; // Too long
            
            await expect(
                pirateSkills.connect(admin).addToolsSkills(
                    genesisPiratesAddress,
                    tokenId,
                    toolsSkills
                )
            ).to.be.revertedWith("Invalid tools skills length");
        });
        
        it("should revert when adding special skills with incorrect length", async function () {
            const tokenId = 1;
            const specialSkills = [5, 6, 7]; // Too short
            
            await expect(
                pirateSkills.connect(admin).addSpecialSkills(
                    genesisPiratesAddress,
                    tokenId,
                    specialSkills
                )
            ).to.be.revertedWith("Invalid special skills length");
        });
        
        it("should revert when adding ship skills with incorrect length", async function () {
            const tokenId = 1;
            const shipSkills = [5, 6]; // Too short
            
            await expect(
                pirateSkills.connect(admin).addShipSkills(
                    genesisPiratesAddress,
                    tokenId,
                    shipSkills
                )
            ).to.be.revertedWith("Invalid ship skills length");
        });
        
        it("should revert when adding magic skills with incorrect length", async function () {
            const tokenId = 1;
            const magicSkills = [5, 6, 7, 8, 9]; // Too short
            
            await expect(
                pirateSkills.connect(admin).addMagicSkills(
                    genesisPiratesAddress,
                    tokenId,
                    magicSkills
                )
            ).to.be.revertedWith("Invalid magic skills length");
        });
        
        it("should revert when adding skills that already exist", async function () {
            const tokenId = 3;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            // Add skills first time
            await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            // Try to add skills again
            await expect(
                pirateSkills.connect(admin).addCharacterSkills(
                    genesisPiratesAddress,
                    tokenId,
                    characterSkills
                )
            ).to.be.revertedWith("Character skills already exist");
        });
        
        it("should work with helper function setupPirateWithSkills", async function () {
            const tokenId = 3;
            const skills = {
                characterSkills: {
                    0: 10, 1: 9, 2: 8, 3: 7, 4: 6, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 9, 12: 8
                },
                toolsSkills: {
                    0: 7, 1: 6, 2: 5, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9
                },
                specialSkills: {
                    0: 8, 1: 7, 2: 6, 3: 5
                },
                shipSkills: {
                    0: 6, 1: 7, 2: 8
                },
                magicSkills: {
                    0: 9, 1: 8, 2: 7, 3: 6, 4: 5, 5: 4
                }
            };
            
            await setupPirateWithSkills(pirateSkills.connect(admin), genesisPiratesAddress, tokenId, skills);
            
            // Verify skills were set correctly
            const result = await verifyPirateSkills(pirateSkills, genesisPiratesAddress, tokenId, skills);
            expect(result).to.be.true;
        });
    });

    describe("Retrieving Skills", function () {
        beforeEach(async function() {
            // Set up a pirate with all skills for testing
            const tokenId = 1;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [5, 6, 7, 8];
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
        
        it("should retrieve a specific skill correctly", async function () {
            const tokenId = 1;
            const skillCategory = 0; // CHARACTER
            const skillId = 3; // MELEE
            
            const skill = await pirateSkills.getSkill(
                genesisPiratesAddress,
                tokenId,
                skillCategory,
                skillId
            );
            
            expect(skill).to.equal(8); // Based on the character skills array [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5]
        });
        
        it("should retrieve character skills correctly", async function () {
            const tokenId = 1;
            const expectedSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            const skills = await pirateSkills.getCharacterSkills(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(expectedSkills.length);
            for (let i = 0; i < expectedSkills.length; i++) {
                expect(skills[i]).to.equal(expectedSkills[i]);
            }
        });
        
        it("should retrieve tools skills correctly", async function () {
            const tokenId = 1;
            const expectedSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            
            const skills = await pirateSkills.getToolsSkills(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(expectedSkills.length);
            for (let i = 0; i < expectedSkills.length; i++) {
                expect(skills[i]).to.equal(expectedSkills[i]);
            }
        });
        
        it("should retrieve special skills correctly", async function () {
            const tokenId = 1;
            const expectedSkills = [5, 6, 7, 8];
            
            const skills = await pirateSkills.getSpecialSkills(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(expectedSkills.length);
            for (let i = 0; i < expectedSkills.length; i++) {
                expect(skills[i]).to.equal(expectedSkills[i]);
            }
        });
        
        it("should retrieve ship skills correctly", async function () {
            const tokenId = 1;
            const expectedSkills = [5, 6, 7];
            
            const skills = await pirateSkills.getShipSkills(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(expectedSkills.length);
            for (let i = 0; i < expectedSkills.length; i++) {
                expect(skills[i]).to.equal(expectedSkills[i]);
            }
        });
        
        it("should retrieve magic skills correctly", async function () {
            const tokenId = 1;
            const expectedSkills = [5, 6, 7, 8, 9, 10];
            
            const skills = await pirateSkills.getMagicSkills(genesisPiratesAddress, tokenId);
            
            expect(skills.length).to.equal(expectedSkills.length);
            for (let i = 0; i < expectedSkills.length; i++) {
                expect(skills[i]).to.equal(expectedSkills[i]);
            }
        });
        
        it("should revert when retrieving a skill with invalid category", async function () {
            const tokenId = 1;
            const invalidCategory = 5; // Invalid category
            const skillId = 0;
            
            await expect(
                pirateSkills.getSkill(
                    genesisPiratesAddress,
                    tokenId,
                    invalidCategory,
                    skillId
                )
            ).to.be.revertedWith("Invalid skill category");
        });
        
        it("should revert when retrieving a skill with invalid skill ID", async function () {
            const tokenId = 1;
            const category = 0; // CHARACTER
            const invalidSkillId = 13; // Out of bounds
            
            await expect(
                pirateSkills.getSkill(
                    genesisPiratesAddress,
                    tokenId,
                    category,
                    invalidSkillId
                )
            ).to.be.revertedWith("Invalid character skill ID");
        });
        
        it("should revert when skills do not exist for the token", async function () {
            const nonExistentTokenId = 999;
            const category = 0; // CHARACTER
            const skillId = 0;
            
            await expect(
                pirateSkills.getSkill(
                    genesisPiratesAddress,
                    nonExistentTokenId,
                    category,
                    skillId
                )
            ).to.be.revertedWith("Character skills not found");
        });
    });

    describe("Updating Skills", function () {
        beforeEach(async function() {
            // Set up a pirate with all skills for testing
            const tokenId = 2;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [5, 6, 7, 8];
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
        
        it("should update a character skill correctly", async function () {
            const tokenId = 2;
            const category = 0; // CHARACTER
            const skillId = 0; // STRENGTH
            const newValue = 15;
            
            // Get the old value for verification
            const oldValue = await pirateSkills.getSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId
            );
            
            // Update the skill
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId,
                newValue
            );
            
            // Get the updated value
            const updatedValue = await pirateSkills.getSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId
            );
            
            expect(oldValue).to.equal(5);
            expect(updatedValue).to.equal(newValue);
        });
        
        it("should update a tools skill correctly", async function () {
            const tokenId = 2;
            const category = 1; // TOOLS
            const skillId = 2; // QUARRYING
            const newValue = 16;
            
            // Update the skill
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId,
                newValue
            );
            
            // Get the updated value
            const updatedValue = await pirateSkills.getSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId
            );
            
            expect(updatedValue).to.equal(newValue);
        });
        
        it("should update a special skill correctly", async function () {
            const tokenId = 2;
            const category = 2; // SPECIAL
            const skillId = 1; // CRAFTING
            const newValue = 17;
            
            // Update the skill
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId,
                newValue
            );
            
            // Get the updated value
            const updatedValue = await pirateSkills.getSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId
            );
            
            expect(updatedValue).to.equal(newValue);
        });
        
        it("should update a ship skill correctly", async function () {
            const tokenId = 2;
            const category = 3; // SHIP
            const skillId = 0; // NAVIGATION
            const newValue = 18;
            
            // Update the skill
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId,
                newValue
            );
            
            // Get the updated value
            const updatedValue = await pirateSkills.getSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId
            );
            
            expect(updatedValue).to.equal(newValue);
        });
        
        it("should update a magic skill correctly", async function () {
            const tokenId = 2;
            const category = 4; // MAGIC
            const skillId = 3; // AIR
            const newValue = 19;
            
            // Update the skill
            await pirateSkills.connect(admin).updateSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId,
                newValue
            );
            
            // Get the updated value
            const updatedValue = await pirateSkills.getSkill(
                genesisPiratesAddress,
                tokenId,
                category,
                skillId
            );
            
            expect(updatedValue).to.equal(newValue);
        });
        
        it("should revert when updating a skill with invalid category", async function () {
            const tokenId = 2;
            const invalidCategory = 5; // Invalid category
            const skillId = 0;
            const newValue = 20;
            
            await expect(
                pirateSkills.connect(admin).updateSkill(
                    genesisPiratesAddress,
                    tokenId,
                    invalidCategory,
                    skillId,
                    newValue
                )
            ).to.be.revertedWith("Invalid skill category");
        });
        
        it("should revert when updating a skill with invalid skill ID", async function () {
            const tokenId = 2;
            const category = 0; // CHARACTER
            const invalidSkillId = 13; // Out of bounds
            const newValue = 20;
            
            await expect(
                pirateSkills.connect(admin).updateSkill(
                    genesisPiratesAddress,
                    tokenId,
                    category,
                    invalidSkillId,
                    newValue
                )
            ).to.be.revertedWith("Invalid character skill ID");
        });
        
        it("should revert when skills do not exist for the token", async function () {
            const nonExistentTokenId = 999;
            const category = 0; // CHARACTER
            const skillId = 0;
            const newValue = 20;
            
            await expect(
                pirateSkills.connect(admin).updateSkill(
                    genesisPiratesAddress,
                    nonExistentTokenId,
                    category,
                    skillId,
                    newValue
                )
            ).to.be.revertedWith("Character skills not found");
        });
    });

    describe("Authorization Controls", function () {
        beforeEach(async function () {
            // Remove admin authorization for these specific tests
            await centralAuthorizationRegistry.removeAuthorizedContract(admin.address);
        });
        
        it("should allow authorized contracts to add skills", async function () {
            // First, authorize another contract address
            await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
            
            const tokenId = 5;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            // Admin is now authorized, should be able to add skills
            await expect(
                pirateSkills.connect(admin).addCharacterSkills(
                    genesisPiratesAddress,
                    tokenId,
                    characterSkills
                )
            ).not.to.be.reverted;
        });
        
        it("should not allow unauthorized contracts to add skills", async function () {
            const tokenId = 5;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            // User is not authorized, should not be able to add skills
            await expect(
                pirateSkills.connect(user).addCharacterSkills(
                    genesisPiratesAddress,
                    tokenId,
                    characterSkills
                )
            ).to.be.reverted; // Exact message may vary based on the modifier implementation
        });
        
        it("should allow authorized contracts to update skills", async function () {
            // First, add skills using an authorized account
            const tokenId = 5;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
            
            await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            // Now update using the authorized account
            const category = 0; // CHARACTER
            const skillId = 0;
            const newValue = 20;
            
            await expect(
                pirateSkills.connect(admin).updateSkill(
                    genesisPiratesAddress,
                    tokenId,
                    category,
                    skillId,
                    newValue
                )
            ).not.to.be.reverted;
        });
        
        it("should not allow unauthorized contracts to update skills", async function () {
            // First, add skills using an authorized account
            const tokenId = 5;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
            
            await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            // Now try to update using an unauthorized account
            const category = 0; // CHARACTER
            const skillId = 0;
            const newValue = 20;
            
            await expect(
                pirateSkills.connect(user).updateSkill(
                    genesisPiratesAddress,
                    tokenId,
                    category,
                    skillId,
                    newValue
                )
            ).to.be.reverted; // Exact message may vary based on the modifier implementation
        });
        
        it("should allow anyone to read skills", async function () {
            // First, add skills using an authorized account
            const tokenId = 5;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            await centralAuthorizationRegistry.addAuthorizedContract(admin.address);
            
            await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            // Now read skills using an unauthorized account
            await expect(
                pirateSkills.connect(unauthorized).getCharacterSkills(
                    genesisPiratesAddress,
                    tokenId
                )
            ).not.to.be.reverted;
            
            // Verify the skills are correct
            const skills = await pirateSkills.connect(unauthorized).getCharacterSkills(
                genesisPiratesAddress,
                tokenId
            );
            
            expect(skills.length).to.equal(characterSkills.length);
            for (let i = 0; i < characterSkills.length; i++) {
                expect(skills[i]).to.equal(characterSkills[i]);
            }
        });
    });

    describe("Event Emissions", function () {
        it("should emit SkillsAdded event when all skills are added", async function () {
            const tokenId = 3;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [5, 6, 7, 8];
            const shipSkills = [5, 6, 7];
            const magicSkills = [5, 6, 7, 8, 9, 10];
            
            await expect(
                pirateSkills.connect(admin).addAllSkills(
                    genesisPiratesAddress,
                    tokenId,
                    characterSkills,
                    toolsSkills,
                    specialSkills,
                    shipSkills,
                    magicSkills
                )
            ).to.emit(pirateSkills, "SkillsAdded")
                .withArgs(genesisPiratesAddress, tokenId);
        });
        
        it("should not emit SkillsAdded event when only some skills are added", async function () {
            const tokenId = 3;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            
            // Adding only character skills shouldn't emit SkillsAdded
            const tx = await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            // Get the transaction receipt
            const receipt = await tx.wait();
            
            // Check for the SkillsAdded event
            const skillsAddedEvents = receipt.logs.filter(
                log => log.topics[0] === ethers.id("SkillsAdded(address,uint256)")
            );
            
            expect(skillsAddedEvents.length).to.equal(0);
        });
        
        it("should emit SkillUpdated event when a skill is updated", async function () {
            // First, add skills
            const tokenId = 3;
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            const specialSkills = [5, 6, 7, 8];
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
            
            // Now update a skill
            const category = 0; // CHARACTER
            const skillId = 0; // STRENGTH
            const oldValue = characterSkills[skillId];
            const newValue = 20;
            
            await expect(
                pirateSkills.connect(admin).updateSkill(
                    genesisPiratesAddress,
                    tokenId,
                    category,
                    skillId,
                    newValue
                )
            ).to.emit(pirateSkills, "SkillUpdated")
                .withArgs(genesisPiratesAddress, tokenId, category, skillId, oldValue, newValue);
        });
        
        it("should emit SkillsAdded event when adding the final skill category", async function () {
            const tokenId = 3;
            
            // Add character skills
            const characterSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7, 8, 9, 10, 5];
            await pirateSkills.connect(admin).addCharacterSkills(
                genesisPiratesAddress,
                tokenId,
                characterSkills
            );
            
            // Add tools skills
            const toolsSkills = [5, 6, 7, 8, 9, 10, 5, 6, 7];
            await pirateSkills.connect(admin).addToolsSkills(
                genesisPiratesAddress,
                tokenId,
                toolsSkills
            );
            
            // Add special skills
            const specialSkills = [5, 6, 7, 8];
            await pirateSkills.connect(admin).addSpecialSkills(
                genesisPiratesAddress,
                tokenId,
                specialSkills
            );
            
            // Add ship skills
            const shipSkills = [5, 6, 7];
            await pirateSkills.connect(admin).addShipSkills(
                genesisPiratesAddress,
                tokenId,
                shipSkills
            );
            
            // Add magic skills - this should emit SkillsAdded as it's the final category
            const magicSkills = [5, 6, 7, 8, 9, 10];
            await expect(
                pirateSkills.connect(admin).addMagicSkills(
                    genesisPiratesAddress,
                    tokenId,
                    magicSkills
                )
            ).to.emit(pirateSkills, "SkillsAdded")
                .withArgs(genesisPiratesAddress, tokenId);
        });
    });
}); 