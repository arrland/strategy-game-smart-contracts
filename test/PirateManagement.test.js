const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PirateManagement", function () {
    let PirateManagement, pirateManagement;
    let owner, admin, user, gameContract, collectionAddress;
    let centralAuthorizationRegistry;

    beforeEach(async function () {
        [owner, admin, user, gameContract, collectionAddress] = await ethers.getSigners();

        // Deploy a mock CentralAuthorizationRegistry contract
        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        // Deploy the PirateManagement contract
        PirateManagement = await ethers.getContractFactory("PirateManagement");
        pirateManagement = await PirateManagement.deploy(await centralAuthorizationRegistry.getAddress());

        await centralAuthorizationRegistry.setContractAddress(await pirateManagement.INTERFACE_ID(), await pirateManagement.getAddress());
        await centralAuthorizationRegistry.addAuthorizedContract(await pirateManagement.getAddress()); 
        await centralAuthorizationRegistry.addAuthorizedContract(gameContract.address); 

        const tokenSkillSets = [
            {
                tokenIds: [1n, 2n],
                skills: {
                    characterSkills: {
                        strength: 10,
                        stamina: 20n,
                        swimming: 30n,
                        melee: 40n,
                        shooting: 50n,
                        cannons: 60n,
                        agility: 70n,
                        engineering: 80n,
                        wisdom: 90n,
                        luck: 100n,
                        health: 110n,
                        speed: 120n
                    },
                    toolsSkills: {
                        harvest: 10n,
                        mining: 20n,
                        quarrying: 30n,
                        excavation: 40n,
                        husbandry: 50n,
                        woodcutting: 60n,
                        slaughter: 70n,
                        hunting: 80n,
                        cultivation: 90n
                    },
                    specialSkills: {
                        fruitPicking: 0n,
                        fishing: 20n,
                        building: 30n,
                        crafting: 40n
                    },
                    added: true
                }
            }
        ];

        await pirateManagement.connect(owner).batchUpdatePirateAttributes(collectionAddress.address, tokenSkillSets);
        
    });

    it("should batch add pirate attributes correctly", async function () {
        const tokenSkillSets = [
            {
                tokenIds: [2149n],
                skills: {
                    characterSkills: {
                        strength: 2000000000000000000n,
                        stamina: 2000000000000000000n,
                        swimming: 0n,
                        melee: 0n,
                        shooting: 2000000000000000000n,
                        cannons: 3000000000000000000n,
                        agility: 2000000000000000000n,
                        engineering: 2000000000000000000n,
                        wisdom: 0n,
                        luck: 3000000000000000000n,
                        health: 2000000000000000000n,
                        speed: 2000000000000000000n
                    },
                    toolsSkills: {
                        harvest: 0n,
                        mining: 1000000000000000000n,
                        quarrying: 0n,
                        excavation: 0n,
                        husbandry: 0n,
                        woodcutting: 0n,
                        slaughter: 0n,
                        hunting: 6000000000000000000n,
                        cultivation: 8000000000000000000n
                    },
                    specialSkills: {
                        fruitPicking: 1000000000000000000n,
                        fishing: 1000000000000000000n,
                        building: 0n,
                        crafting: 0n
                    },
                    added: true
                }
            },
            {
                tokenIds: [2150n],
                skills: {
                    characterSkills: {
                        strength: 2000000000000000000n,
                        stamina: 2000000000000000000n,
                        swimming: 2000000000000000000n,
                        melee: 3000000000000000000n,
                        shooting: 1000000000000000000n,
                        cannons: 0n,
                        agility: 3000000000000000000n,
                        engineering: 0n,
                        wisdom: 0n,
                        luck: 2000000000000000000n,
                        health: 2000000000000000000n,
                        speed: 3000000000000000000n
                    },
                    toolsSkills: {
                        harvest: 3000000000000000000n,
                        mining: 4000000000000000000n,
                        quarrying: 0n,
                        excavation: 0n,
                        husbandry: 0n,
                        woodcutting: 1000000000000000000n,
                        slaughter: 0n,
                        hunting: 6000000000000000000n,
                        cultivation: 4000000000000000000n
                    },
                    specialSkills: {
                        fruitPicking: 4000000000000000000n,
                        fishing: 4000000000000000000n,
                        building: 0n,
                        crafting: 0n
                    },
                    added: true
                }
            }
        ];

        await pirateManagement.connect(owner).batchUpdatePirateAttributes(collectionAddress.address, tokenSkillSets);

        const skillSetId1 = await pirateManagement.pirateSkillSetIds(collectionAddress.address, 2149n);
        const skills1 = await pirateManagement.skillSets(skillSetId1);

        expect(skills1.characterSkills.strength).to.equal(2000000000000000000n);
        expect(skills1.toolsSkills.mining).to.equal(1000000000000000000n);
        expect(skills1.specialSkills.fruitPicking).to.equal(1000000000000000000n);

        const skillSetId2 = await pirateManagement.pirateSkillSetIds(collectionAddress.address, 2150n);
        const skills2 = await pirateManagement.skillSets(skillSetId2);

        expect(skills2.characterSkills.strength).to.equal(2000000000000000000n);
        expect(skills2.toolsSkills.mining).to.equal(4000000000000000000n);
        expect(skills2.specialSkills.fruitPicking).to.equal(4000000000000000000n);
    });

    it("should allow admin to batch update pirate attributes", async function () {
        const skillSetId = await pirateManagement.pirateSkillSetIds(collectionAddress.address, 1n);
        const skills = await pirateManagement.skillSets(skillSetId);

        expect(skills.characterSkills.strength).to.equal(10n);
        expect(skills.toolsSkills.harvest).to.equal(10n);
        expect(skills.specialSkills.fruitPicking).to.equal(0n);
    });

    it("should allow authorized contract to upgrade skill set", async function () {
        const newSkills = {
            characterSkills: {
                strength: 15n,
                stamina: 25n,
                swimming: 35n,
                melee: 45n,
                shooting: 55n,
                cannons: 65n,
                agility: 75n,
                engineering: 85n,
                wisdom: 95n,
                luck: 105n,
                health: 115n,
                speed: 125n
            },
            toolsSkills: {
                harvest: 15n,
                mining: 25n,
                quarrying: 35n,
                excavation: 45n,
                husbandry: 55n,
                woodcutting: 65n,
                slaughter: 75n,
                hunting: 85n,
                cultivation: 95n
            },
            specialSkills: {
                fruitPicking: 15n,
                fishing: 25n,
                building: 35n,
                crafting: 45n
            },
            added: true
        };

        await pirateManagement.connect(gameContract).upgradeSkillSet(collectionAddress.address, 1n, newSkills);
        
        const skills = await pirateManagement.getPirateSkills(collectionAddress.address, 1n);

        expect(skills.characterSkills.strength).to.equal(15n);
        expect(skills.toolsSkills.harvest).to.equal(15n);
        expect(skills.specialSkills.fruitPicking).to.equal(15n);
    });

    it("should allow authorized user to update single skill", async function () {
        await pirateManagement.connect(gameContract).updateSingleSkill(user.address, 1n, 0, 0, 10n, true); // CharacterSkill.Strength

        const skills = await pirateManagement.getPirateSkills(collectionAddress.address, 1n);
        expect(skills.characterSkills.strength).to.equal(10n);
    });

    it("should revert if skill value becomes negative", async function () {
        await expect(
            pirateManagement.connect(gameContract).updateSingleSkill(user.address, 1n, 0, 0, 10n, false) // CharacterSkill.Strength
        ).to.be.revertedWith("Skill value cannot be negative");
    });

    it("should correctly add and retrieve skill sets without skipping IDs", async function () {
        const tokenSkillSets = [
            {
                tokenIds: [3001n],
                skills: {
                    characterSkills: {
                        strength: 100n,
                        stamina: 200n,
                        swimming: 300n,
                        melee: 400n,
                        shooting: 500n,
                        cannons: 600n,
                        agility: 700n,
                        engineering: 800n,
                        wisdom: 900n,
                        luck: 1000n,
                        health: 1100n,
                        speed: 1200n
                    },
                    toolsSkills: {
                        harvest: 100n,
                        mining: 200n,
                        quarrying: 300n,
                        excavation: 400n,
                        husbandry: 500n,
                        woodcutting: 600n,
                        slaughter: 700n,
                        hunting: 800n,
                        cultivation: 900n
                    },
                    specialSkills: {
                        fruitPicking: 100n,
                        fishing: 200n,
                        building: 300n,
                        crafting: 400n
                    },
                    added: true
                }
            },
            {
                tokenIds: [3002n],
                skills: {
                    characterSkills: {
                        strength: 150n,
                        stamina: 250n,
                        swimming: 350n,
                        melee: 450n,
                        shooting: 550n,
                        cannons: 650n,
                        agility: 750n,
                        engineering: 850n,
                        wisdom: 950n,
                        luck: 1050n,
                        health: 1150n,
                        speed: 1250n
                    },
                    toolsSkills: {
                        harvest: 150n,
                        mining: 250n,
                        quarrying: 350n,
                        excavation: 450n,
                        husbandry: 550n,
                        woodcutting: 650n,
                        slaughter: 750n,
                        hunting: 850n,
                        cultivation: 950n
                    },
                    specialSkills: {
                        fruitPicking: 150n,
                        fishing: 250n,
                        building: 350n,
                        crafting: 450n
                    },
                    added: true
                }
            }
        ];

        await pirateManagement.connect(owner).batchUpdatePirateAttributes(collectionAddress.address, tokenSkillSets);

        const skillSetId1 = await pirateManagement.pirateSkillSetIds(collectionAddress.address, 3001n);
        const skills1 = await pirateManagement.skillSets(skillSetId1);

        expect(skills1.characterSkills.strength).to.equal(100n);
        expect(skills1.toolsSkills.mining).to.equal(200n);
        expect(skills1.specialSkills.fruitPicking).to.equal(100n);

        const skillSetId2 = await pirateManagement.pirateSkillSetIds(collectionAddress.address, 3002n);
        const skills2 = await pirateManagement.skillSets(skillSetId2);

        expect(skills2.characterSkills.strength).to.equal(150n);
        expect(skills2.toolsSkills.mining).to.equal(250n);
        expect(skills2.specialSkills.fruitPicking).to.equal(150n);

        // Check that skill set IDs are sequential
        expect(skillSetId2).to.equal(skillSetId1 + 1n);
    });
});