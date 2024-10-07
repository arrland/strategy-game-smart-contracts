const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ResourceFarmingRules", function () {
    let ResourceFarmingRules, resourceFarmingRules;
    let centralAuthorizationRegistry;
    let admin, user;

    beforeEach(async function () {
        [admin, user] = await ethers.getSigners();

        const CentralAuthorizationRegistry = await ethers.getContractFactory("CentralAuthorizationRegistry");
        centralAuthorizationRegistry = await CentralAuthorizationRegistry.deploy();
        await centralAuthorizationRegistry.initialize(admin.address);

        const ResourceFarmingRulesFactory = await ethers.getContractFactory("ResourceFarmingRules");
        resourceFarmingRules = await ResourceFarmingRulesFactory.deploy(await centralAuthorizationRegistry.getAddress());
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
        console.log("Output per day for coconut:", Number(output)/10**18);
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
        console.log("Output per day for fish:", Number(output)/10**18);
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
        console.log("Output per day for wood:", Number(output)/10**18);
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
                hunting: 0n,
                cultivation: 0n
            },
            added: true
        };

        const resource = "wood";
        const durationSeconds = 86400n; // 1 day

        const output = await resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds);
        console.log("Output per day for wood without woodcutting skill:", Number(output)/10**18);
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

        console.log("Output per day for citrus:", Number(output)/10**18);
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
        console.log("Output per day for tobacco:", Number(output)/10**18);
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
        console.log("Output per day for cotton:", Number(output)/10**18);
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
        console.log("Output per day for pig with husbandry:", Number(output)/10**18);
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
        console.log("Output per day for pig without husbandry:",Number(output)/10**18);
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
        console.log("Output per day for sugarcane:", Number(output)/10**18);
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

        await expect(resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)).to.be.revertedWith("Pirate does not have harvesting tool");
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
        console.log("Output per day for grain:", Number(output)/10**18);
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

        await expect(resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)).to.be.revertedWith("Pirate does not have harvesting tool");
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
        console.log("Output per day for planks:", Number(output)/10**18);
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

        await expect(resourceFarmingRules.calculateResourceOutput(pirateSkills, resource, durationSeconds)).to.be.revertedWith("Pirate does not have woodcutting tool");
    });
});