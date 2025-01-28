const { expect } = require("chai");
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');
const { deployAndAuthorizeContract } = require("./utils");

async function updatePirateSkillsFromJSON(filePath, pirateManagement, admin, genesisPiratesAddress) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    for (const tokenSkillSet of data) {        
        const tokenIds = tokenSkillSet.tokenIds.map(id => parseInt(id));            
        const skills = tokenSkillSet.skills;
        const characterSkills = {
            strength: BigInt(skills.characterSkills.strength),
            stamina: BigInt(skills.characterSkills.stamina),
            swimming: BigInt(skills.characterSkills.swimming),
            melee: BigInt(skills.characterSkills.melee),
            shooting: BigInt(skills.characterSkills.shooting),
            cannons: BigInt(skills.characterSkills.cannons),
            agility: BigInt(skills.characterSkills.agility),
            engineering: BigInt(skills.characterSkills.engineering),
            wisdom: BigInt(skills.characterSkills.wisdom),
            luck: BigInt(skills.characterSkills.luck),
            health: BigInt(skills.characterSkills.health),
            speed: BigInt(skills.characterSkills.speed)
        };

        const toolsSkills = {
            harvest: BigInt(skills.toolsSkills.harvest),
            mining: BigInt(skills.toolsSkills.mining),
            quarrying: BigInt(skills.toolsSkills.quarrying),
            excavation: BigInt(skills.toolsSkills.excavation),
            husbandry: BigInt(skills.toolsSkills.husbandry),
            woodcutting: BigInt(skills.toolsSkills.woodcutting),
            slaughter: BigInt(skills.toolsSkills.slaughter),
            hunting: BigInt(skills.toolsSkills.hunting),
            cultivation: BigInt(skills.toolsSkills.cultivation)
        };

        const specialSkills = {
            fruitPicking: BigInt(skills.specialSkills.fruitPicking),
            fishing: BigInt(skills.specialSkills.fishing),
            building: BigInt(skills.specialSkills.building),
            crafting: BigInt(skills.specialSkills.crafting)
        };

        const pirateSkills = {
            characterSkills: characterSkills,
            toolsSkills: toolsSkills,
            specialSkills: specialSkills,
            added: true
        };

        for (const tokenId of tokenIds) {
            await pirateManagement.connect(admin).batchUpdatePirateAttributes(
                genesisPiratesAddress,
                [{ tokenIds: [tokenId], skills: pirateSkills }]
            );
        }
    }
}

describe("ResourceFarmingRules", function () {
    let ResourceFarmingRules, resourceFarmingRules;
    let centralAuthorizationRegistry;
    let admin, user;
    let pirateManagement;
    let genesisPiratesAddress;

    beforeEach(async function () {
        [admin, user] = await ethers.getSigners();

        // Deploy SimpleERC1155 for genesis pirates
        const SimpleERC1155 = await ethers.getContractFactory("SimpleERC1155");
        const simpleERC1155 = await SimpleERC1155.deploy(admin.address, "https://ipfs.io/ipfs/");
        genesisPiratesAddress = await simpleERC1155.getAddress();

        // Deploy and initialize CAR
        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        // Deploy PirateManagement
        pirateManagement = await deployAndAuthorizeContract("PirateManagement", centralAuthorizationRegistry);

        // Deploy ResourceFarmingRules
        const ResourceFarmingRulesFactory = await ethers.getContractFactory("ResourceFarmingRules");
        resourceFarmingRules = await ResourceFarmingRulesFactory.deploy(await centralAuthorizationRegistry.getAddress());

        // Set contract addresses in CAR
        await centralAuthorizationRegistry.setContractAddress(
            ethers.id("IPirateManagement"),
            await pirateManagement.getAddress()
        );

        // Import pirate skills from JSON
        await updatePirateSkillsFromJSON(
            path.join(__dirname, '../scripts/pirate_skils_test.json'),
            pirateManagement,
            admin,
            genesisPiratesAddress
        );
    });

    it("should calculate resource output for coconut", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 3n*10n**18n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 4n*10n**18n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "coconut";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(7000000000000000000n);
    });

    it("should calculate resource output for fish", async function () {
        const pirateSkills = {
            characterSkills: {
                shooting: 0n,
                agility: 0n,
                stamina: 0n,
                swimming: 3n*10n**18n,
                melee: 0n,
                strength: 0n,
                luck: 2n*10n**18n,
                health: 0n,
                speed: 0n,
                cannons: 0n,
                engineering: 0n,
                wisdom: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 4n*10n**18n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "fish";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(6500000000000000000n);
    });

    it("should calculate resource output for wood", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 2n*10n**18n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 8n*10n**18n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "wood";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(1000000000000000000n);
    });

    it("should calculate resource output for wood when woodcutting skill is zero", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 3n*10n**18n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0,
                health: 0n,
                speed: 2n*10n**18n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "wood";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(166666666666666666n); // (3 + 2) / 30 = 0.1666... * 10**18
    });
    it("should calculate resource output for citrus", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 4n*10n**18n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "citrus";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(6000000000000000000n);
    });
    it("should calculate resource output for tobacco", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 3n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 5n*10n**18n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 2n*10n**18n
            },
            added: true
        };

        const resource = "tobacco";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(1133333333333333333n);
    });
    it("should calculate resource output for cotton", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 3n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 2000000000000000000n
            },
            added: true
        };

        const resource = "cotton";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(1300000000000000000n);
    });
    it("should calculate resource output for pig with husbandry skill", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 2n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 5n*10n**18n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "pig";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(300000000000000000n);
    });

    it("should calculate resource output for pig without husbandry skill", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 2n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "pig";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(133333333333333333n);
    });
    it("should calculate resource output for sugarcane with harvesting tool", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 2n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 8n*10n**18n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 2n*10n**18n
            },
            added: true
        };

        const resource = "sugarcane";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(600000000000000000n);
    });

    it("should revert if pirate does not have harvesting tool for sugarcane", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 10000000000000000000n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 2000000000000000000n
            },
            added: true
        };

        const resource = "sugarcane";
        const durationSeconds = 86400n; // 1 day

        await expect(resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)).to.be.revertedWith("Pirate needs Harvest at least 1");
    });
    it("should calculate resource output for grain", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 10000000000000000000n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 5000000000000000000n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 2000000000000000000n
            },
            added: true
        };

        const resource = "grain";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(2600000000000000000n);
    });

    it("should revert if pirate does not have harvesting tool for grain", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 10000000000000000000n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 2000000000000000000n
            },
            added: true
        };

        const resource = "grain";
        const durationSeconds = 86400n; // 1 day

        await expect(resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)).to.be.revertedWith("Pirate needs Harvest at least 1");
    });
    it("should calculate resource output for planks", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 2n*10n**18n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 4n*10n**18n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "planks";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(400000000000000000n);
    });

    it("should revert if pirate does not have woodcutting tool for planks", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 10000000000000000000n,
                stamina: 0n,
                swimming: 0n,
                melee: 10000000000000000000n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "planks";
        const durationSeconds = 86400n; // 1 day

        await expect(resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)).to.be.revertedWith("Pirate needs Woodcutting at least 4");
    });

    it("should return all available resources for pirate with no skills", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        await pirateManagement.connect(admin).batchUpdatePirateAttributes(
            genesisPiratesAddress,
            [{
                tokenIds: [0],
                skills: pirateSkills
            }]
        );

        const [farmable, unfarmable] = await resourceFarmingRules.getFarmableResourcesForPirate(genesisPiratesAddress, 0);
        
        // Should only have access to free resources
        expect(farmable.length).to.equal(18); // Number of free resources
        expect(farmable.map(r => r.name)).to.include.members([
            "coconut",
            "citrus",
            "fish",
            "tobacco",
            "cotton",
            "pig",
            "wood",
            "barrel-packed fish",
            "barrel-packed meat",
            "bags",
            "bag-packed tobacco",
            "bag-packed grain",
            "bag-packed cotton",
            "bag-packed sugarcane",
            "coconut liquor",
            "crate-packed citrus",
            "crate-packed coconuts"
        ]);

        // Should have unfarmable resources that require skills
        expect(unfarmable.length).to.be.greaterThan(0);
    });

    it("should return all available resources for skilled pirate", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 2n * 10n**18n,
                stamina: 2n * 10n**18n,
                swimming: 2n * 10n**18n,
                melee: 2n * 10n**18n,
                shooting: 2n * 10n**18n,
                cannons: 0n,
                agility: 2n * 10n**18n,
                engineering: 0n,
                wisdom: 2n * 10n**18n,
                luck: 2n * 10n**18n,
                health: 0n,
                speed: 2n * 10n**18n,
            },
            specialSkills: {
                fruitPicking: 2n * 10n**18n,
                fishing: 2n * 10n**18n,
                building: 0n,
                crafting: 2n * 10n**18n
            },
            toolsSkills: {
                harvest: 2n * 10n**18n,
                mining: 8n * 10n**18n,
                quarrying: 8n * 10n**18n,
                excavation: 8n * 10n**18n,
                husbandry: 8n * 10n**18n,
                woodcutting: 4n * 10n**18n,
                slaughter: 3n * 10n**18n,
                hunting: 2n * 10n**18n,
                cultivation: 2n * 10n**18n
            },
            added: true
        };

        await pirateManagement.connect(admin).batchUpdatePirateAttributes(
            genesisPiratesAddress,
            [{
                tokenIds: [0],
                skills: pirateSkills
            }]
        );

        const [farmable, unfarmable] = await resourceFarmingRules.getFarmableResourcesForPirate(genesisPiratesAddress, 0);
        // Should have access to all resources
        expect(farmable.length).to.be.greaterThan(17); // More than free resources
        expect(farmable.map(r => r.name)).to.include.members([
            "coconut",
            "citrus",
            "fish",
            "tobacco", 
            "cotton",
            "pig",
            "wood",
            "sugarcane",
            "grain",
            "planks",
            "meat",
            "crates",
            "barrels",
            "wild game",
            "coconut liquor",
            "crate-packed citrus",
            "crate-packed coconuts",
            "barrel-packed fish",
            "barrel-packed meat",
            "bags",
            "bag-packed tobacco",
            "bag-packed grain", 
            "bag-packed cotton",
            "bag-packed sugarcane",
            "clay",
            "stone",
            "bricks"
        ]);

        // Should have no unfarmable resources since pirate has all skills
        expect(unfarmable.length).to.equal(0);
    });

    it("should return all available resources for pirate with imported skills", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 2n * 10n**18n,
                stamina: 2n * 10n**18n,
                swimming: 2n * 10n**18n,
                melee: 2n * 10n**18n,
                shooting: 2n * 10n**18n,
                cannons: 1n * 10n**18n,
                agility: 2n * 10n**18n,
                engineering: 0n,
                wisdom: 2n * 10n**18n,
                luck: 2n * 10n**18n,
                health: 0n,
                speed: 1n
            },
            specialSkills: {
                fruitPicking: 2n * 10n**18n,
                fishing: 2n * 10n**18n,
                building: 0n,
                crafting: 2n * 10n**18n
            },
            toolsSkills: {
                harvest: 2n * 10n**18n,
                mining: 1n * 10n**18n,
                quarrying: 1n * 10n**18n,
                excavation: 8n * 10n**18n,
                husbandry: 8n * 10n**18n,
                woodcutting: 4n * 10n**18n,
                slaughter: 3n * 10n**18n,
                hunting: 2n * 10n**18n,
                cultivation: 2n * 10n**18n
            },
            added: true
        };

        await pirateManagement.connect(admin).batchUpdatePirateAttributes(
            genesisPiratesAddress,
            [{
                tokenIds: [1],
                skills: pirateSkills
            }]
        );
        const [farmable, unfarmable] = await resourceFarmingRules.getFarmableResourcesForPirate(genesisPiratesAddress, 1);
        expect(farmable.length).to.be.greaterThan(0);
        // Check that all resources can be farmed by verifying each resource name is in the farmable array
        const expectedResources = [
            "coconut",
            "citrus", 
            "fish",
            "tobacco",
            "cotton",
            "pig",
            "wood",
            "sugarcane",
            "grain",
            "planks",
            "meat",
            "barrel-packed fish",
            "barrel-packed meat", 
            "crates",
            "barrels",
            "bags",
            "bag-packed tobacco",
            "bag-packed grain",
            "bag-packed cotton",
            "bag-packed sugarcane",
            "wild game",
            "coconut liquor",
            "crate-packed citrus",
            "crate-packed coconuts",
            "stone",
            "clay",
            "bricks"
        ];

        // Convert farmable resources to array of names for easier checking
        const farmableNames = farmable.map(r => r.name);

        console.log(farmableNames);
        
        // Verify each expected resource is in the farmable list
        for (const resource of expectedResources) {
            expect(farmableNames).to.include(resource, `${resource} should be farmable`);
        }

        // Verify we didn't miss any resources by checking counts match
        expect(farmable.length).to.equal(expectedResources.length, "Number of farmable resources should match expected");
        expect(unfarmable.length).to.be.equal(0);
    });

    it("should calculate resource output for barrels with woodcutting and crafting", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 2n*10n**18n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 4n*10n**18n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "barrels";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);        
        expect(output).to.equal(500000000000000000n); // (2 + 3) / 5 = 1
    });

    it("should revert if pirate does not have required woodcutting skill for barrels", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 3n*10n**18n, // Less than required 4 ether
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "barrels";
        const durationSeconds = 86400n; // 1 day

        await expect(
            resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)
        ).to.be.revertedWith("Pirate needs either Crafting at least 1 or Woodcutting at least 4");
        
    });
    it("should pass if pirate does have required crafting skill for barrels but no woodcutting skill", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 1n*10n**18n // No crafting skill
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0, 
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "barrels";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.be.greaterThan(0);
    });
    it("should fail if pirate does not have required crafting or woodcutting skill for crates", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n // No crafting skill
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 3n*10n**18n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "crates";
        const durationSeconds = 86400n; // 1 day

        await expect(
            resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)
        ).to.be.revertedWith("Pirate needs either Crafting at least 1 or Woodcutting at least 4");
    });

    it("should pass if pirate has required crafting skill for crates but no woodcutting skill", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 1n*10n**18n // Has crafting skill
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n, // No woodcutting skill
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "crates";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.be.greaterThan(0);
    });

    it("should pass if pirate has required woodcutting skill for crates but no crafting skill", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n // No crafting skill
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 4n*10n**18n, // Has woodcutting skill
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "crates";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.be.greaterThan(0);
    });
    it("should fail if pirate has no hunting skill for wild game", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 2n*10n**18n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 2n*10n**18n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n, // No hunting skill
                cultivation: 0n
            },
            added: true
        };

        const resource = "wild game";
        const durationSeconds = 86400n; // 1 day

        await expect(
            resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)
        ).to.be.revertedWith("Pirate needs Hunting at least 1");
    });

    it("should pass if pirate has required hunting skill for wild game", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 2n*10n**18n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 2n*10n**18n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 1n*10n**18n, // Has hunting skill
                cultivation: 0n
            },
            added: true
        };

        const resource = "wild game";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.be.greaterThan(0);
    });
    it("should fail if pirate has no slaughter skill for meat", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 2n*10n**18n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n, // No slaughter skill
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "meat";
        const durationSeconds = 86400n; // 1 day

        await expect(
            resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)
        ).to.be.revertedWith("Pirate needs Slaughter at least 1");
    });

    it("should pass if pirate has required slaughter skill for meat", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 2n*10n**18n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 1n*10n**18n, // Has slaughter skill
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "meat";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.be.greaterThan(0);
    });
    it("should fail if pirate has no harvest skill for grain", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n, // No harvest skill
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "grain";
        const durationSeconds = 86400n; // 1 day

        await expect(
            resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)
        ).to.be.revertedWith("Pirate needs Harvest at least 1");
    });

    it("should pass if pirate has required harvest skill for grain", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 3n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 1n*10n**18n, // Has harvest skill
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "grain";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.be.greaterThan(0);
    });
    it("should fail if pirate has no harvest skill for sugarcane", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 3n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n, // No harvest skill
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "sugarcane";
        const durationSeconds = 86400n; // 1 day

        await expect(
            resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)
        ).to.be.revertedWith("Pirate needs Harvest at least 1");
    });

    it("should pass if pirate has required harvest skill for sugarcane", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 3n*10n**18n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 2n*10n**18n,
                engineering: 0n,
                wisdom: 3n*10n**18n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 1n*10n**18n, // Has harvest skill
                mining: 0n,
                quarrying: 0n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "sugarcane";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.be.greaterThan(0);
    });

    it("should calculate resource output for clay", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 3n * 10n**18n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 5n * 10n**18n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "clay";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.equal((8n * 10n**18n)/40n); // Expected output based on strength + excavation
    });

    it("should calculate resource output for stone", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 2n * 10n**18n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 0n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 1n * 10n**18n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 5n * 10n**18n,
                excavation: 0n,
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "stone";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.equal(8n * 10n**18n / 40n); // (strength + quarrying + fruitPicking) / 40
    });

    it("should calculate resource output for bricks", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 3n * 10n**18n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 5n * 10n**18n, // Test with excavation level 5
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "bricks";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.equal(5n * 10n**18n); // agility + 2 when excavation is 5
    });

    it("should calculate resource output for bricks with different excavation level", async function () {
        const pirateSkills = {
            characterSkills: {
                strength: 0n,
                stamina: 0n,
                swimming: 0n,
                melee: 0n,
                shooting: 0n,
                cannons: 0n,
                agility: 3n * 10n**18n,
                engineering: 0n,
                wisdom: 0n,
                luck: 0n,
                health: 0n,
                speed: 0n
            },
            specialSkills: {
                fruitPicking: 0n,
                fishing: 0n,
                building: 0n,
                crafting: 0n
            },
            toolsSkills: {
                harvest: 0n,
                mining: 0n,
                quarrying: 0n,
                excavation: 6n * 10n**18n, // Test with excavation level 6
                husbandry: 0n,
                woodcutting: 0n,
                slaughter: 0n,
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "bricks";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        expect(output).to.equal(3n * 10n**18n); // normal agility output when excavation is not 5 or 8
    });
});