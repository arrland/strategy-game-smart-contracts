// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IPirateManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./AuthorizationModifiers.sol";


contract ResourceFarmingRules is AuthorizationModifiers {
    using Strings for string;

    bytes32[19] private skillNames;
    bytes32[27] private resourceNames;
    
    // Convert mappings to use bytes32
    mapping(bytes32 => SkillType) private skillNameToType;
    mapping(ResourceType => bytes32) private resourceTypeToName;
    mapping(bytes32 => ResourceType) private nameToResourceType;
    mapping(bytes32 => ResourceRule) private resourceRules;

    // Keep string in structs for readability/display
    struct SkillRequirement {
        string skillName;     // Keep as string
        uint256 value;
        bool exactMatch;
    }

    struct ResourceRule {
        string name;         // Keep as string
        SkillRequirement[][] requirements;
        ResourceType resourceType;
    }

    enum SkillType {
        // Character Skills
        AGILITY,
        STRENGTH,
        STAMINA,
        LUCK,
        WISDOM,
        SWIMMING,
        MELEE,
        SHOOTING,
        // Special Skills
        FRUIT_PICKING,
        FISHING,
        CRAFTING,
        // Tools Skills
        HARVEST,
        CULTIVATION,
        HUSBANDRY,
        WOODCUTTING,
        SLAUGHTER,
        HUNTING,
        QUARRYING,
        EXCAVATION
    }

    enum ResourceType {
        COCONUT,
        CITRUS,
        FISH,
        TOBACCO,
        COTTON,
        PIG,
        WOOD,
        SUGARCANE,
        GRAIN,
        PLANKS,
        MEAT,
        CRATES,
        BARRELS,
        WILD_GAME,
        COCONUT_LIQUOR,
        CRATE_PACKED_CITRUS,
        CRATE_PACKED_COCONUTS,
        BARREL_PACKED_FISH,
        BARREL_PACKED_MEAT,
        BAGS,
        BAG_PACKED_TOBACCO,
        BAG_PACKED_GRAIN,
        BAG_PACKED_COTTON,
        BAG_PACKED_SUGARCANE,
        CLAY,
        STONE,
        BRICKS
    }

    struct ResourceInfo {
        string name;
        SkillRequirement[][] requirements;
    }

    constructor(address _centralAuthorizationRegistryContract) AuthorizationModifiers(_centralAuthorizationRegistryContract, keccak256("IResourceFarmingRules")) {
        _initializeSkillMapping();
        _initializeResourceNames();
        _initializeResourceRules();
    }

    function stringToBytes32(string memory source) private pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        assembly {
            result := mload(add(source, 32))
        }
    }

    function bytes32ToString(bytes32 _bytes32) private pure returns (string memory) {
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (uint8 j = 0; j < i; j++) {
            bytesArray[j] = _bytes32[j];
        }
        return string(bytesArray);
    }

    function _initializeSkillMapping() private {
        skillNameToType[bytes32("Agility")] = SkillType.AGILITY;
        skillNames[uint(SkillType.AGILITY)] = bytes32("Agility");

        skillNameToType[bytes32("Strength")] = SkillType.STRENGTH;
        skillNames[uint(SkillType.STRENGTH)] = bytes32("Strength");
        
        skillNameToType[bytes32("Stamina")] = SkillType.STAMINA;
        skillNames[uint(SkillType.STAMINA)] = bytes32("Stamina");
        
        skillNameToType[bytes32("Luck")] = SkillType.LUCK;
        skillNames[uint(SkillType.LUCK)] = bytes32("Luck");
        
        skillNameToType[bytes32("Wisdom")] = SkillType.WISDOM;
        skillNames[uint(SkillType.WISDOM)] = bytes32("Wisdom");
        
        skillNameToType[bytes32("Swimming")] = SkillType.SWIMMING;
        skillNames[uint(SkillType.SWIMMING)] = bytes32("Swimming");
        
        skillNameToType[bytes32("Melee")] = SkillType.MELEE;
        skillNames[uint(SkillType.MELEE)] = bytes32("Melee");
        
        skillNameToType[bytes32("Shooting")] = SkillType.SHOOTING;
        skillNames[uint(SkillType.SHOOTING)] = bytes32("Shooting");
        
        skillNameToType[bytes32("FruitPicking")] = SkillType.FRUIT_PICKING;
        skillNames[uint(SkillType.FRUIT_PICKING)] = bytes32("FruitPicking");
        
        skillNameToType[bytes32("Fishing")] = SkillType.FISHING;
        skillNames[uint(SkillType.FISHING)] = bytes32("Fishing");
        
        skillNameToType[bytes32("Crafting")] = SkillType.CRAFTING;
        skillNames[uint(SkillType.CRAFTING)] = bytes32("Crafting");
        
        skillNameToType[bytes32("Harvest")] = SkillType.HARVEST;
        skillNames[uint(SkillType.HARVEST)] = bytes32("Harvest");
        
        skillNameToType[bytes32("Cultivation")] = SkillType.CULTIVATION;
        skillNames[uint(SkillType.CULTIVATION)] = bytes32("Cultivation");
        
        skillNameToType[bytes32("Husbandry")] = SkillType.HUSBANDRY;
        skillNames[uint(SkillType.HUSBANDRY)] = bytes32("Husbandry");
        
        skillNameToType[bytes32("Woodcutting")] = SkillType.WOODCUTTING;
        skillNames[uint(SkillType.WOODCUTTING)] = bytes32("Woodcutting");
        
        skillNameToType[bytes32("Slaughter")] = SkillType.SLAUGHTER;
        skillNames[uint(SkillType.SLAUGHTER)] = bytes32("Slaughter");
        
        skillNameToType[bytes32("Hunting")] = SkillType.HUNTING;
        skillNames[uint(SkillType.HUNTING)] = bytes32("Hunting");

        skillNameToType[bytes32("Quarrying")] = SkillType.QUARRYING;
        skillNames[uint(SkillType.QUARRYING)] = bytes32("Quarrying");

        skillNameToType[bytes32("Excavation")] = SkillType.EXCAVATION;
        skillNames[uint(SkillType.EXCAVATION)] = bytes32("Excavation");
        
    }

    function _initializeResourceNames() private {
        resourceTypeToName[ResourceType.COCONUT] = bytes32("coconut");
        resourceNames[uint(ResourceType.COCONUT)] = bytes32("coconut");
        nameToResourceType[bytes32("coconut")] = ResourceType.COCONUT;

        resourceTypeToName[ResourceType.CITRUS] = bytes32("citrus");
        resourceNames[uint(ResourceType.CITRUS)] = bytes32("citrus");
        nameToResourceType[bytes32("citrus")] = ResourceType.CITRUS;

        resourceTypeToName[ResourceType.FISH] = bytes32("fish");
        resourceNames[uint(ResourceType.FISH)] = bytes32("fish");
        nameToResourceType[bytes32("fish")] = ResourceType.FISH;

        resourceTypeToName[ResourceType.TOBACCO] = bytes32("tobacco");
        resourceNames[uint(ResourceType.TOBACCO)] = bytes32("tobacco");
        nameToResourceType[bytes32("tobacco")] = ResourceType.TOBACCO;

        resourceTypeToName[ResourceType.COTTON] = bytes32("cotton");
        resourceNames[uint(ResourceType.COTTON)] = bytes32("cotton");
        nameToResourceType[bytes32("cotton")] = ResourceType.COTTON;

        resourceTypeToName[ResourceType.PIG] = bytes32("pig");
        resourceNames[uint(ResourceType.PIG)] = bytes32("pig");
        nameToResourceType[bytes32("pig")] = ResourceType.PIG;

        resourceTypeToName[ResourceType.WOOD] = bytes32("wood");
        resourceNames[uint(ResourceType.WOOD)] = bytes32("wood");
        nameToResourceType[bytes32("wood")] = ResourceType.WOOD;

        resourceTypeToName[ResourceType.SUGARCANE] = bytes32("sugarcane");
        resourceNames[uint(ResourceType.SUGARCANE)] = bytes32("sugarcane");
        nameToResourceType[bytes32("sugarcane")] = ResourceType.SUGARCANE;

        resourceTypeToName[ResourceType.GRAIN] = bytes32("grain");
        resourceNames[uint(ResourceType.GRAIN)] = bytes32("grain");
        nameToResourceType[bytes32("grain")] = ResourceType.GRAIN;

        resourceTypeToName[ResourceType.PLANKS] = bytes32("planks");
        resourceNames[uint(ResourceType.PLANKS)] = bytes32("planks");
        nameToResourceType[bytes32("planks")] = ResourceType.PLANKS;

        resourceTypeToName[ResourceType.MEAT] = bytes32("meat");
        resourceNames[uint(ResourceType.MEAT)] = bytes32("meat");
        nameToResourceType[bytes32("meat")] = ResourceType.MEAT;

        resourceTypeToName[ResourceType.CRATES] = bytes32("crates");
        resourceNames[uint(ResourceType.CRATES)] = bytes32("crates");
        nameToResourceType[bytes32("crates")] = ResourceType.CRATES;

        resourceTypeToName[ResourceType.BARRELS] = bytes32("barrels");
        resourceNames[uint(ResourceType.BARRELS)] = bytes32("barrels");
        nameToResourceType[bytes32("barrels")] = ResourceType.BARRELS;

        resourceTypeToName[ResourceType.WILD_GAME] = bytes32("wild game");
        resourceNames[uint(ResourceType.WILD_GAME)] = bytes32("wild game");
        nameToResourceType[bytes32("wild game")] = ResourceType.WILD_GAME;

        resourceTypeToName[ResourceType.COCONUT_LIQUOR] = bytes32("coconut liquor");
        resourceNames[uint(ResourceType.COCONUT_LIQUOR)] = bytes32("coconut liquor");
        nameToResourceType[bytes32("coconut liquor")] = ResourceType.COCONUT_LIQUOR;

        resourceTypeToName[ResourceType.CRATE_PACKED_CITRUS] = bytes32("crate-packed citrus");
        resourceNames[uint(ResourceType.CRATE_PACKED_CITRUS)] = bytes32("crate-packed citrus");
        nameToResourceType[bytes32("crate-packed citrus")] = ResourceType.CRATE_PACKED_CITRUS;

        resourceTypeToName[ResourceType.CRATE_PACKED_COCONUTS] = bytes32("crate-packed coconuts");
        resourceNames[uint(ResourceType.CRATE_PACKED_COCONUTS)] = bytes32("crate-packed coconuts");
        nameToResourceType[bytes32("crate-packed coconuts")] = ResourceType.CRATE_PACKED_COCONUTS;

        resourceTypeToName[ResourceType.BARREL_PACKED_FISH] = bytes32("barrel-packed fish");
        resourceNames[uint(ResourceType.BARREL_PACKED_FISH)] = bytes32("barrel-packed fish");
        nameToResourceType[bytes32("barrel-packed fish")] = ResourceType.BARREL_PACKED_FISH;

        resourceTypeToName[ResourceType.BARREL_PACKED_MEAT] = bytes32("barrel-packed meat");
        resourceNames[uint(ResourceType.BARREL_PACKED_MEAT)] = bytes32("barrel-packed meat");
        nameToResourceType[bytes32("barrel-packed meat")] = ResourceType.BARREL_PACKED_MEAT;

        resourceTypeToName[ResourceType.BAGS] = bytes32("bags");
        resourceNames[uint(ResourceType.BAGS)] = bytes32("bags");
        nameToResourceType[bytes32("bags")] = ResourceType.BAGS;

        resourceTypeToName[ResourceType.BAG_PACKED_TOBACCO] = bytes32("bag-packed tobacco");
        resourceNames[uint(ResourceType.BAG_PACKED_TOBACCO)] = bytes32("bag-packed tobacco");
        nameToResourceType[bytes32("bag-packed tobacco")] = ResourceType.BAG_PACKED_TOBACCO;

        resourceTypeToName[ResourceType.BAG_PACKED_GRAIN] = bytes32("bag-packed grain");
        resourceNames[uint(ResourceType.BAG_PACKED_GRAIN)] = bytes32("bag-packed grain");
        nameToResourceType[bytes32("bag-packed grain")] = ResourceType.BAG_PACKED_GRAIN;

        resourceTypeToName[ResourceType.BAG_PACKED_COTTON] = bytes32("bag-packed cotton");
        resourceNames[uint(ResourceType.BAG_PACKED_COTTON)] = bytes32("bag-packed cotton");
        nameToResourceType[bytes32("bag-packed cotton")] = ResourceType.BAG_PACKED_COTTON;

        resourceTypeToName[ResourceType.BAG_PACKED_SUGARCANE] = bytes32("bag-packed sugarcane");
        resourceNames[uint(ResourceType.BAG_PACKED_SUGARCANE)] = bytes32("bag-packed sugarcane");
        nameToResourceType[bytes32("bag-packed sugarcane")] = ResourceType.BAG_PACKED_SUGARCANE;

        resourceTypeToName[ResourceType.CLAY] = bytes32("clay");
        resourceNames[uint(ResourceType.CLAY)] = bytes32("clay");
        nameToResourceType[bytes32("clay")] = ResourceType.CLAY;

        resourceTypeToName[ResourceType.STONE] = bytes32("stone");
        resourceNames[uint(ResourceType.STONE)] = bytes32("stone");
        nameToResourceType[bytes32("stone")] = ResourceType.STONE;

        resourceTypeToName[ResourceType.BRICKS] = bytes32("bricks");
        resourceNames[uint(ResourceType.BRICKS)] = bytes32("bricks");
        nameToResourceType[bytes32("bricks")] = ResourceType.BRICKS;

        // Initialize reverse mapping
        for (uint i = 0; i <= uint(type(ResourceType).max); i++) {
            bytes32 name = resourceTypeToName[ResourceType(i)];
            nameToResourceType[name] = ResourceType(i);
        }
    }

    function getResourceName(ResourceType resourceType) private view returns (string memory) {
        bytes32 name = resourceTypeToName[resourceType];
        require(name != 0, "Invalid resource type");
        return bytes32ToString(name);
    }

    function getResourceType(string memory name) private view returns (ResourceType) {
        bytes32 nameBytes = stringToBytes32(name);
        ResourceType resourceType = nameToResourceType[nameBytes];
        require(nameBytes != 0, "Invalid resource name");
        return resourceType;
    }

    function _initializeResourceRules() private {
        // Free resources have empty requirements array
        resourceRules[bytes32("coconut")] = ResourceRule({
            name: "coconut",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.COCONUT
        });
        resourceRules[bytes32("citrus")] = ResourceRule({
            name: "citrus", 
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.CITRUS
        });
        resourceRules[bytes32("fish")] = ResourceRule({
            name: "fish",
            requirements: new SkillRequirement[][](0), 
            resourceType: ResourceType.FISH
        });
        resourceRules[bytes32("tobacco")] = ResourceRule({
            name: "tobacco",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.TOBACCO
        });
        resourceRules[bytes32("cotton")] = ResourceRule({
            name: "cotton",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.COTTON
        });
        resourceRules[bytes32("pig")] = ResourceRule({
            name: "pig",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.PIG
        });
        resourceRules[bytes32("wood")] = ResourceRule({
            name: "wood",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.WOOD
        });

        resourceRules[bytes32("bag-packed grain")] = ResourceRule({
            name: "bag-packed grain",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BAG_PACKED_GRAIN
        });

        resourceRules[bytes32("bag-packed sugarcane")] = ResourceRule({
            name: "bag-packed sugarcane",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BAG_PACKED_SUGARCANE
        });

        resourceRules[bytes32("bag-packed cotton")] = ResourceRule({
            name: "bag-packed cotton",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BAG_PACKED_COTTON
        });

        resourceRules[bytes32("barrel-packed fish")] = ResourceRule({
            name: "barrel-packed fish",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BARREL_PACKED_FISH
        });

        resourceRules[bytes32("barrel-packed meat")] = ResourceRule({
            name: "barrel-packed meat",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BARREL_PACKED_MEAT
        });

        resourceRules[bytes32("bag-packed tobacco")] = ResourceRule({
            name: "bag-packed tobacco",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BAG_PACKED_TOBACCO
        });

        resourceRules[bytes32("bags")] = ResourceRule({
            name: "bags",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BAGS
        });

        resourceRules[bytes32("coconut liquor")] = ResourceRule({
            name: "coconut liquor",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.COCONUT_LIQUOR
        });

        resourceRules[bytes32("crate-packed citrus")] = ResourceRule({
            name: "crate-packed citrus",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.CRATE_PACKED_CITRUS
        });

        resourceRules[bytes32("crate-packed coconuts")] = ResourceRule({
            name: "crate-packed coconuts",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.CRATE_PACKED_COCONUTS
        });


        // Resources with requirements
        {
            SkillTuple[] memory sugarcaneSkills = new SkillTuple[](1);
            sugarcaneSkills[0] = SkillTuple("Harvest", 1 ether, false);
            resourceRules[bytes32("sugarcane")] = ResourceRule({
                name: "sugarcane",
                requirements: _createRequirementGroup(sugarcaneSkills),
                resourceType: ResourceType.SUGARCANE
            });
        }

        {
            SkillTuple[] memory grainSkills = new SkillTuple[](1);
            grainSkills[0] = SkillTuple("Harvest", 1 ether, false);
            resourceRules[bytes32("grain")] = ResourceRule({
                name: "grain",
                requirements: _createRequirementGroup(grainSkills),
                resourceType: ResourceType.GRAIN
            });
        }

        {
            SkillTuple[] memory planksSkills = new SkillTuple[](1);
            planksSkills[0] = SkillTuple("Woodcutting", 4 ether, false);
            resourceRules[bytes32("planks")] = ResourceRule({
                name: "planks",
                requirements: _createRequirementGroup(planksSkills),
                resourceType: ResourceType.PLANKS
            });
        }

        {
            SkillTuple[] memory meatSkills = new SkillTuple[](1);
            meatSkills[0] = SkillTuple("Slaughter", 1 ether, false);
            resourceRules[bytes32("meat")] = ResourceRule({
                name: "meat",
                requirements: _createRequirementGroup(meatSkills),
                resourceType: ResourceType.MEAT
            });
        }

        {
            // Create array with 2 requirement groups for OR condition
            SkillRequirement[][] memory cratesReqs = new SkillRequirement[][](2);
            
            // First option: Crafting
            SkillTuple[] memory craftingSkill = new SkillTuple[](1);
            craftingSkill[0] = SkillTuple("Crafting", 1 ether, false);
            cratesReqs[0] = _createRequirements(craftingSkill);
            
            // Second option: Woodcutting
            SkillTuple[] memory woodSkills = new SkillTuple[](1);
            woodSkills[0] = SkillTuple("Woodcutting", 4 ether, false);
            cratesReqs[1] = _createRequirements(woodSkills);
            
            resourceRules[bytes32("crates")] = ResourceRule({
                name: "crates",
                requirements: cratesReqs,
                resourceType: ResourceType.CRATES
            });
        }

        {
            // Create array with 2 requirement groups for OR condition
            SkillRequirement[][] memory barrelsReqs = new SkillRequirement[][](2);
            
            // First option: Crafting
            SkillTuple[] memory craftingSkill = new SkillTuple[](1);
            craftingSkill[0] = SkillTuple("Crafting", 1 ether, false);
            barrelsReqs[0] = _createRequirements(craftingSkill);
            
            // Second option: Woodcutting
            SkillTuple[] memory woodSkills = new SkillTuple[](1);
            woodSkills[0] = SkillTuple("Woodcutting", 4 ether, false);
            barrelsReqs[1] = _createRequirements(woodSkills);
            
            resourceRules[bytes32("barrels")] = ResourceRule({
                name: "barrels",
                requirements: barrelsReqs,
                resourceType: ResourceType.BARRELS
            });
        }

        {
            SkillTuple[] memory wildGameSkills = new SkillTuple[](1);
            wildGameSkills[0] = SkillTuple("Hunting", 1 ether, false);
            resourceRules[bytes32("wild game")] = ResourceRule({
                name: "wild game",
                requirements: _createRequirementGroup(wildGameSkills),
                resourceType: ResourceType.WILD_GAME
            });
        }

        {
            SkillTuple[] memory claySkills = new SkillTuple[](1);
            claySkills[0] = SkillTuple("Excavation", 1 ether, false);
            resourceRules[bytes32("clay")] = ResourceRule({
                name: "clay",
                requirements: _createRequirementGroup(claySkills),
                resourceType: ResourceType.CLAY
            });
        }

        {
            SkillTuple[] memory stoneSkills = new SkillTuple[](1);
            stoneSkills[0] = SkillTuple("Quarrying", 1 ether, false);
            resourceRules[bytes32("stone")] = ResourceRule({
                name: "stone",
                requirements: _createRequirementGroup(stoneSkills),
                resourceType: ResourceType.STONE
            });
        }

        resourceRules[bytes32("bricks")] = ResourceRule({
            name: "bricks",
            requirements: new SkillRequirement[][](0),
            resourceType: ResourceType.BRICKS
        });
    }

    function getSkillValue(
        IPirateManagement.PirateSkills memory pirate, 
        string memory skillName
    ) private view returns (uint256) {
        SkillType skillType = skillNameToType[stringToBytes32(skillName)];
        
        if (skillType == SkillType.AGILITY) return pirate.characterSkills.agility;
        if (skillType == SkillType.STRENGTH) return pirate.characterSkills.strength;
        if (skillType == SkillType.STAMINA) return pirate.characterSkills.stamina;
        if (skillType == SkillType.LUCK) return pirate.characterSkills.luck;
        if (skillType == SkillType.WISDOM) return pirate.characterSkills.wisdom;
        if (skillType == SkillType.SWIMMING) return pirate.characterSkills.swimming;
        if (skillType == SkillType.MELEE) return pirate.characterSkills.melee;
        if (skillType == SkillType.SHOOTING) return pirate.characterSkills.shooting;
        if (skillType == SkillType.FRUIT_PICKING) return pirate.specialSkills.fruitPicking;
        if (skillType == SkillType.FISHING) return pirate.specialSkills.fishing;
        if (skillType == SkillType.CRAFTING) return pirate.specialSkills.crafting;
        if (skillType == SkillType.HARVEST) return pirate.toolsSkills.harvest;
        if (skillType == SkillType.CULTIVATION) return pirate.toolsSkills.cultivation;
        if (skillType == SkillType.HUSBANDRY) return pirate.toolsSkills.husbandry;
        if (skillType == SkillType.WOODCUTTING) return pirate.toolsSkills.woodcutting;
        if (skillType == SkillType.SLAUGHTER) return pirate.toolsSkills.slaughter;
        if (skillType == SkillType.HUNTING) return pirate.toolsSkills.hunting;
        if (skillType == SkillType.QUARRYING) return pirate.toolsSkills.quarrying;
        if (skillType == SkillType.EXCAVATION) return pirate.toolsSkills.excavation;
        return 0;
    }

    function getCoconutOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return (pirate.characterSkills.agility + pirate.specialSkills.fruitPicking) * durationSeconds/ 1 days;
    }

    function getCitrusOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return (pirate.characterSkills.agility + pirate.specialSkills.fruitPicking) * durationSeconds/ 1 days;
    }

    function getFishOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return (((pirate.characterSkills.swimming + pirate.characterSkills.luck)/2) + pirate.specialSkills.fishing) * durationSeconds/ 1 days;
    }

    function getTobaccoOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return (((pirate.characterSkills.stamina + pirate.toolsSkills.harvest + pirate.toolsSkills.cultivation + 7 ether)/15) * durationSeconds / 1 days);
    }

    function getCottonOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return (((pirate.characterSkills.stamina * 8) + pirate.toolsSkills.cultivation)/20) * durationSeconds / 1 days;
    }

    function getPigOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        if (pirate.toolsSkills.husbandry > 0) {
            return ((((pirate.characterSkills.stamina*2) + pirate.toolsSkills.husbandry) / 30) * durationSeconds / 1 days);
        } else {
            return (((pirate.characterSkills.stamina*2)/30) * durationSeconds / 1 days);
        }
    }

    function getWoodOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        if (pirate.toolsSkills.woodcutting > 0) {
            return (((pirate.characterSkills.melee + pirate.toolsSkills.woodcutting) / 10 ) * durationSeconds / 1 days);
        } else {
            return (((pirate.characterSkills.strength + pirate.characterSkills.speed) / 30 ) * durationSeconds / 1 days);
        }
    }

    function getSugarcaneOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.harvest > 0, "Pirate does not have harvesting tool");
        return (((((pirate.characterSkills.stamina/1e18 * pirate.toolsSkills.harvest/1e18)*10**18) + pirate.toolsSkills.cultivation)/30) * durationSeconds / 1 days);
    }

    function getGrainOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.harvest > 0, "Pirate does not have harvesting tool");
        return (((((pirate.characterSkills.stamina/1e18 * pirate.toolsSkills.harvest/1e18)*10**18) + pirate.toolsSkills.cultivation)/20) * durationSeconds / 1 days);
    }

    function getPlanksOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.woodcutting >= 4 ether, "Pirate does not have woodcutting tool");
        return (((pirate.characterSkills.agility + pirate.characterSkills.strength) /10) * durationSeconds / 1 days);
    }

    function getMeatOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.slaughter > 0, "Pirate does not have slaughtering tool");
        return ((pirate.characterSkills.melee + pirate.toolsSkills.slaughter) / 10) * durationSeconds / 1 days;
    }

    function getBarrelPackedFishOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return ((pirate.characterSkills.agility + pirate.characterSkills.stamina) / 3) * durationSeconds / 1 days;
    }

    function getBarrelPackedMeatOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return ((pirate.characterSkills.agility + pirate.characterSkills.stamina) / 3) * durationSeconds / 1 days;
    }

    function getCratesOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.specialSkills.crafting > 0 || pirate.toolsSkills.woodcutting > 3 ether, "Pirate does not have crafting or woodcutting tool");
        if (pirate.specialSkills.crafting > 0) {
            return (pirate.characterSkills.agility / 3) * durationSeconds / 1 days;
        } else {
            return (pirate.characterSkills.agility / 9 ) * durationSeconds / 1 days;
        }
    }

    function getBarrelsOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.woodcutting > 3 ether || pirate.specialSkills.crafting > 0, "Pirate does not have woodcutting or crafting tool");
        if (pirate.specialSkills.crafting > 0) {
            return ((pirate.characterSkills.agility + pirate.characterSkills.wisdom) / 10) * durationSeconds / 1 days;
        } else if (pirate.toolsSkills.woodcutting > 3 ether) {
            return ((pirate.characterSkills.agility + pirate.characterSkills.wisdom) / 40) * durationSeconds / 1 days;
        }
    }

    function getBagsOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return (pirate.characterSkills.agility/10) * durationSeconds / 1 days;
    }

    function getBagPackedTobaccoOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        if (pirate.toolsSkills.slaughter == 3 ether) {
            return ((pirate.characterSkills.strength + pirate.characterSkills.stamina) * 2) * durationSeconds / 1 days;
        } else {
            return ((pirate.characterSkills.strength + pirate.characterSkills.stamina) / 3) * durationSeconds / 1 days;
        }
    }

    function getBagPackedGrainOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        if (pirate.toolsSkills.husbandry == 8 ether && pirate.toolsSkills.excavation == 8 ether) {
            return ((pirate.characterSkills.strength + pirate.characterSkills.stamina)) * durationSeconds / 1 days;
        } else if (pirate.toolsSkills.husbandry == 8 ether) {
            return (((pirate.characterSkills.strength + pirate.characterSkills.stamina) * 2) / 3) * durationSeconds / 1 days;
        } else if (pirate.toolsSkills.excavation == 8 ether) {
            return (((pirate.characterSkills.strength + pirate.characterSkills.stamina) * 2) / 3) * durationSeconds / 1 days;
        } else {
            return ((pirate.characterSkills.strength + pirate.characterSkills.stamina) / 3) * durationSeconds / 1 days;
        }
    }

    function getBagPackedCottonOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        if (pirate.toolsSkills.slaughter == 3 ether) {
            return (((pirate.characterSkills.strength + pirate.characterSkills.stamina) * 2) / 3) * durationSeconds / 1 days;
        } else {
            return ((pirate.characterSkills.strength + pirate.characterSkills.stamina) / 3) * durationSeconds / 1 days;
        }
    }

    function getBagPackedSugarcaneOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        if (pirate.toolsSkills.husbandry == 8 ether && pirate.toolsSkills.harvest == 3 ether) {
            return ((pirate.characterSkills.strength + pirate.characterSkills.stamina)) * durationSeconds / 1 days;
        } else if (pirate.toolsSkills.husbandry == 8 ether) {
            return (((pirate.characterSkills.strength + pirate.characterSkills.stamina) * 2) / 3) * durationSeconds / 1 days;
        } else if (pirate.toolsSkills.harvest == 3 ether) {
            return (((pirate.characterSkills.strength + pirate.characterSkills.stamina) * 2) / 3) * durationSeconds / 1 days;
        } else {
            return ((pirate.characterSkills.strength + pirate.characterSkills.stamina) / 3) * durationSeconds / 1 days;
        }
    }

    function getWildGameOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.hunting > 0, "Pirate does not have hunting tool");
        return ((pirate.toolsSkills.hunting + pirate.characterSkills.luck + pirate.characterSkills.shooting + pirate.characterSkills.speed) / 10) * durationSeconds / 1 days;
    }

    function getCoconutLiquorOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return ((pirate.characterSkills.agility + pirate.characterSkills.wisdom) / 3) * durationSeconds / 1 days;
    }

    function getCratePackedCitrusOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return ((pirate.characterSkills.agility + pirate.characterSkills.stamina)) * durationSeconds / 1 days;
    }

    function getCratePackedCoconutsOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        return ((pirate.characterSkills.agility + pirate.characterSkills.stamina)) * durationSeconds / 1 days;
    }

    function getClayOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.excavation > 0, "Pirate does not have excavation tool");
        return ((pirate.characterSkills.strength + pirate.toolsSkills.excavation + pirate.specialSkills.fruitPicking) / 40) * durationSeconds / 1 days;
    }

    function getStoneOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        //require(pirate.toolsSkills.quarrying > 0, "Pirate does not have quarrying tool");
        return ((pirate.characterSkills.strength + pirate.toolsSkills.quarrying + pirate.specialSkills.fruitPicking) / 40) * durationSeconds / 1 days;
    }

    function getBricksOutput(IPirateManagement.PirateSkills memory pirate, uint256 durationSeconds) private pure returns (uint256 output) {
        if (pirate.toolsSkills.excavation == 5 ether || pirate.toolsSkills.excavation == 8 ether) {
            return (pirate.characterSkills.agility + 2 ether) * durationSeconds / 1 days;
        } else {
            return pirate.characterSkills.agility * durationSeconds / 1 days;
        }
    }

    function _getSkillRequirementString(SkillRequirement memory req) private pure returns (string memory) {
        string memory comparison = req.exactMatch ? "exactly" : "at least";
        return string(abi.encodePacked(
            "Pirate needs ",
            req.skillName,
            " ",
            comparison,
            " ",
            Strings.toString(req.value / 1 ether)
        ));
    }

    function _getMissingSkillsMessage(
        IPirateManagement.PirateSkills memory pirate,
        SkillRequirement[][] memory requirementGroups
    ) private view returns (string memory) {
        if (requirementGroups.length == 1) {
            // Single requirement group - simple message
            for (uint256 j = 0; j < requirementGroups[0].length; j++) {
                uint256 skillValue = getSkillValue(pirate, requirementGroups[0][j].skillName);
                if ((requirementGroups[0][j].exactMatch && skillValue != requirementGroups[0][j].value) ||
                    (!requirementGroups[0][j].exactMatch && skillValue < requirementGroups[0][j].value)) {
                    return _getSkillRequirementString(requirementGroups[0][j]);
                }
            }
        } else {
            // Multiple requirement groups - OR condition
            string memory firstReq = requirementGroups[0][0].skillName;
            string memory firstValue = Strings.toString(requirementGroups[0][0].value / 1 ether);
            string memory secondReq = requirementGroups[1][0].skillName;
            string memory secondValue = Strings.toString(requirementGroups[1][0].value / 1 ether);
            
            return string(abi.encodePacked(
                "Pirate needs either ",
                firstReq,
                " at least ",
                firstValue,
                " or ",
                secondReq,
                " at least ",
                secondValue
            ));
        }
        return "Pirate has all required skills";
    }

    function calculateResourceOutput(
        IPirateManagement.PirateSkills memory pirate,
        string memory resource,
        uint256 durationSeconds
    ) public view returns (uint256) {
        ResourceRule memory rule = resourceRules[stringToBytes32(resource)];
        require(bytes(rule.name).length > 0, "Invalid resource type");

        if (rule.requirements.length > 0) {
            require(
                canPirateFarmResource(pirate, rule.requirements),
                _getMissingSkillsMessage(pirate, rule.requirements)
            );
        }

        // Use ResourceType enum instead of string comparisons
        ResourceType resourceType = rule.resourceType;
        
        if (resourceType == ResourceType.COCONUT) return getCoconutOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.CITRUS) return getCitrusOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.FISH) return getFishOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.TOBACCO) return getTobaccoOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.COTTON) return getCottonOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.PIG) return getPigOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.WOOD) return getWoodOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.SUGARCANE) return getSugarcaneOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.GRAIN) return getGrainOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.PLANKS) return getPlanksOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.MEAT) return getMeatOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BARREL_PACKED_FISH) return getBarrelPackedFishOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BARREL_PACKED_MEAT) return getBarrelPackedMeatOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.CRATES) return getCratesOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BARRELS) return getBarrelsOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BAGS) return getBagsOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BAG_PACKED_TOBACCO) return getBagPackedTobaccoOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BAG_PACKED_GRAIN) return getBagPackedGrainOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BAG_PACKED_COTTON) return getBagPackedCottonOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BAG_PACKED_SUGARCANE) return getBagPackedSugarcaneOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.WILD_GAME) return getWildGameOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.COCONUT_LIQUOR) return getCoconutLiquorOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.CRATE_PACKED_CITRUS) return getCratePackedCitrusOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.CRATE_PACKED_COCONUTS) return getCratePackedCoconutsOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.CLAY) return getClayOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.STONE) return getStoneOutput(pirate, durationSeconds);
        if (resourceType == ResourceType.BRICKS) return getBricksOutput(pirate, durationSeconds);
        
        revert("Invalid resource type");
    }

    function getFarmableResourcesForPirate(address collectionAddress, uint256 tokenId) public view returns (ResourceInfo[] memory farmable, ResourceInfo[] memory unfarmable) {
        IPirateManagement pirateManagement = IPirateManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IPirateManagement")));
        IPirateManagement.PirateSkills memory pirateSkills = pirateManagement.getPirateSkills(collectionAddress, tokenId);

        uint256 totalResources = uint256(type(ResourceType).max) + 1;
        ResourceInfo[] memory farmableTemp = new ResourceInfo[](totalResources);
        ResourceInfo[] memory unfarmableTemp = new ResourceInfo[](totalResources);
        
        uint256 farmableCount = 0;
        uint256 unfarmableCount = 0;
        
        for (uint256 i = 0; i < totalResources; i++) {
            string memory resourceName = getResourceName(ResourceType(i));
            ResourceRule memory rule = resourceRules[stringToBytes32(resourceName)];
            
            // Skip if rule is not initialized
            if (bytes(rule.name).length == 0) continue;
            
            // If it's a free resource or pirate meets requirements
            if (rule.requirements.length == 0 || canPirateFarmResource(pirateSkills, rule.requirements)) {
                farmableTemp[farmableCount++] = ResourceInfo({
                    name: rule.name,
                    requirements: rule.requirements
                });
            } else {
                // Only add to unfarmable if it has requirements
                if (rule.requirements.length > 0) {
                    unfarmableTemp[unfarmableCount++] = ResourceInfo({
                        name: rule.name,
                        requirements: rule.requirements
                    });
                }
            }
        }

        // Create final arrays with exact sizes
        farmable = new ResourceInfo[](farmableCount);
        unfarmable = new ResourceInfo[](unfarmableCount);
        
        for (uint256 i = 0; i < farmableCount; i++) {
            farmable[i] = farmableTemp[i];
        }
        
        for (uint256 i = 0; i < unfarmableCount; i++) {
            unfarmable[i] = unfarmableTemp[i];
        }

        return (farmable, unfarmable);
    }

    function getAllResources() public view returns (ResourceInfo[] memory) {
        uint256 totalResources = uint256(type(ResourceType).max) + 1;
        ResourceInfo[] memory allResources = new ResourceInfo[](totalResources);
        
        for (uint256 i = 0; i < totalResources; i++) {
            string memory resourceName = getResourceName(ResourceType(i));
            ResourceRule memory rule = resourceRules[stringToBytes32(resourceName)];
            allResources[i] = ResourceInfo({
                name: rule.name,
                requirements: rule.requirements
            });
        }
        
        return allResources;
    }

    function canPirateFarmResource(
        IPirateManagement.PirateSkills memory pirate, 
        SkillRequirement[][] memory requirementGroups
    ) private view returns (bool) {
        if (requirementGroups.length == 0) return true;
        
        // Check each requirement group (OR condition between groups)
        for (uint256 i = 0; i < requirementGroups.length; i++) {
            bool groupMet = true;
            for (uint256 j = 0; j < requirementGroups[i].length; j++) {
                uint256 skillValue = getSkillValue(pirate, requirementGroups[i][j].skillName);
                if (requirementGroups[i][j].exactMatch) {
                    if (skillValue != requirementGroups[i][j].value) {
                        groupMet = false;
                        break;
                    }
                } else {
                    if (skillValue < requirementGroups[i][j].value) {
                        groupMet = false;
                        break;
                    }
                }
            }
            if (groupMet) return true;
        }
        return false;
    }

    // Helper struct for initialization
    struct SkillTuple {
        string skillName;
        uint256 value;
        bool exactMatch;
    }

    function _createRequirements(SkillTuple[] memory skills) private pure returns (SkillRequirement[] memory) {
        SkillRequirement[] memory requirements = new SkillRequirement[](skills.length);
        for (uint256 i = 0; i < skills.length; i++) {
            requirements[i] = SkillRequirement({
                skillName: skills[i].skillName,
                value: skills[i].value,
                exactMatch: skills[i].exactMatch
            });
        }
        return requirements;
    }

    // Helper function to create a single requirement group
    function _createRequirementGroup(SkillTuple[] memory skills) private pure returns (SkillRequirement[][] memory) {
        SkillRequirement[][] memory groups = new SkillRequirement[][](1);
        groups[0] = _createRequirements(skills);
        return groups;
    }
}