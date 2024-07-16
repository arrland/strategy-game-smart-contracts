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
});
