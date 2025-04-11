// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/IPirateSkillsReader.sol";
import "../libraries/PirateSkillsConstants.sol";
import "./PirateSkills.sol";

/**
 * @title PirateSkillsReader
 * @notice Implementation of IPirateSkillsReader that reads from PirateSkills
 */
contract PirateSkillsReader is IPirateSkillsReader, AuthorizationModifiers {
    // Import constants from library
    using PirateSkillsConstants for uint8;
    
    // Skill category constants
    uint8 constant CHARACTER = PirateSkillsConstants.CHARACTER;
    uint8 constant TOOLS = PirateSkillsConstants.TOOLS;
    uint8 constant SPECIAL = PirateSkillsConstants.SPECIAL;
    uint8 constant SHIP = PirateSkillsConstants.SHIP;
    uint8 constant MAGIC = PirateSkillsConstants.MAGIC;
    
    // Character skills
    uint8 constant STRENGTH = PirateSkillsConstants.STRENGTH;
    uint8 constant STAMINA = PirateSkillsConstants.STAMINA;
    uint8 constant SWIMMING = PirateSkillsConstants.SWIMMING;
    uint8 constant MELEE = PirateSkillsConstants.MELEE;
    uint8 constant SHOOTING = PirateSkillsConstants.SHOOTING;
    uint8 constant CANNONS = PirateSkillsConstants.CANNONS;
    uint8 constant AGILITY = PirateSkillsConstants.AGILITY;
    uint8 constant ENGINEERING = PirateSkillsConstants.ENGINEERING;
    uint8 constant WISDOM = PirateSkillsConstants.WISDOM;
    uint8 constant LUCK = PirateSkillsConstants.LUCK;
    uint8 constant HEALTH = PirateSkillsConstants.HEALTH;
    uint8 constant SPEED = PirateSkillsConstants.SPEED;
    uint8 constant ARMOUR = PirateSkillsConstants.ARMOUR;
    
    // Tools skills
    uint8 constant HARVEST = PirateSkillsConstants.HARVEST;
    uint8 constant MINING = PirateSkillsConstants.MINING;
    uint8 constant QUARRYING = PirateSkillsConstants.QUARRYING;
    uint8 constant EXCAVATION = PirateSkillsConstants.EXCAVATION;
    uint8 constant HUSBANDRY = PirateSkillsConstants.HUSBANDRY;
    uint8 constant WOODCUTTING = PirateSkillsConstants.WOODCUTTING;
    uint8 constant SLAUGHTER = PirateSkillsConstants.SLAUGHTER;
    uint8 constant HUNTING = PirateSkillsConstants.HUNTING;
    uint8 constant CULTIVATION = PirateSkillsConstants.CULTIVATION;
    
    // Ship skills
    uint8 constant NAVIGATION = PirateSkillsConstants.NAVIGATION;
    uint8 constant RESPECT = PirateSkillsConstants.RESPECT;
    uint8 constant SHIP_DETECTION = PirateSkillsConstants.SHIP_DETECTION;
    
    // Special skills
    uint8 constant ROPE = PirateSkillsConstants.ROPE;
    uint8 constant CRAFTING = PirateSkillsConstants.CRAFTING;
    uint8 constant BUILDING = PirateSkillsConstants.BUILDING;
    uint8 constant REPAIR = PirateSkillsConstants.REPAIR;
    
    // Magic skills
    uint8 constant ELEMENTAL = PirateSkillsConstants.ELEMENTAL;
    uint8 constant VOODOO = PirateSkillsConstants.VOODOO;
    uint8 constant WATER = PirateSkillsConstants.WATER;
    uint8 constant AIR = PirateSkillsConstants.AIR;
    uint8 constant FIRE = PirateSkillsConstants.FIRE;
    uint8 constant EARTH = PirateSkillsConstants.EARTH;
    
    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IPirateSkillsReader")) 
    {
    }
    
    /**
     * @notice Get the PirateSkills contract
     * @return PirateSkills contract instance
     */
    function pirateSkills() public view returns (PirateSkills) {
        address pirateSkillsAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IPirateSkills"));
        return PirateSkills(pirateSkillsAddr);
    }
        
    /**
     * @notice Get skill level for a specific collection
     */
    function getSkillLevelForCollection(address collection, uint256 tokenId, uint8 skillId) external view returns (uint8) {
        PirateSkills skills = pirateSkills();
        uint256 skillValue = skills.getSkill(collection, tokenId, CHARACTER, skillId);
        return uint8(skillValue);
    }
    
    /**
     * @notice Get a specific skill for any pirate collection
     */
    function getSkill(address collection, uint256 tokenId, uint8 skillCategory, uint8 skillId) external view returns (uint256) {
        PirateSkills skills = pirateSkills();
        return skills.getSkill(collection, tokenId, skillCategory, skillId);
    }
    
    // Character Skills Getters - Collection specific versions
    function getStrengthSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, STRENGTH);
    }

    function getStaminaSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, STAMINA);
    }

    function getSwimmingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, SWIMMING);
    }

    function getMeleeSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, MELEE);
    }

    function getShootingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, SHOOTING);
    }

    function getCannonsSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, CANNONS);
    }

    function getAgilitySkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, AGILITY);
    }

    function getEngineeringSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, ENGINEERING);
    }

    function getWisdomSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, WISDOM);
    }

    function getLuckSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, LUCK);
    }

    function getHealthSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, HEALTH);
    }

    function getSpeedSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, SPEED);
    }

    function getArmourSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, CHARACTER, ARMOUR);
    }

    function getLeadershipSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        // Leadership could be a derived skill based on other skills
        // For example, it could be an average of wisdom and respect
        uint256 wisdom = getSpecificSkill(collection, tokenId, CHARACTER, WISDOM);
        uint256 respect = getSpecificSkill(collection, tokenId, SHIP, RESPECT);
        return (wisdom + respect) / 2;
    }

    function getCombatSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        // Combat could be derived from multiple combat-related skills
        uint256 melee = getSpecificSkill(collection, tokenId, CHARACTER, MELEE);
        uint256 shooting = getSpecificSkill(collection, tokenId, CHARACTER, SHOOTING);
        return (melee + shooting) / 2;
    }

    // Tools Skills Getters - Collection specific versions
    function getHarvestSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, HARVEST);
    }

    function getMiningSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, MINING);
    }

    function getQuarryingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, QUARRYING);
    }

    function getExcavationSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, EXCAVATION);
    }

    function getHusbandrySkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, HUSBANDRY);
    }

    function getWoodcuttingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, WOODCUTTING);
    }

    function getSlaughterSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, SLAUGHTER);
    }

    function getHuntingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, HUNTING);
    }

    function getCultivationSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, TOOLS, CULTIVATION);
    }

    // Ship Skills Getters - Collection specific versions
    function getNavigationSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, SHIP, NAVIGATION);
    }

    function getRespectSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, SHIP, RESPECT);
    }

    function getShipDetectionSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, SHIP, SHIP_DETECTION);
    }

    // Special Skills Getters - Collection specific versions
    function getRopeSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, SPECIAL, ROPE);
    }

    function getCraftingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, SPECIAL, CRAFTING);
    }

    function getBuildingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, SPECIAL, BUILDING);
    }

    function getRepairSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, SPECIAL, REPAIR);
    }

    // Magic Skills Getters - Collection specific versions
    function getElementalSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, MAGIC, ELEMENTAL);
    }

    function getVoodooSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, MAGIC, VOODOO);
    }

    function getWaterSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, MAGIC, WATER);
    }

    function getAirSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, MAGIC, AIR);
    }

    function getFireSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, MAGIC, FIRE);
    }

    function getEarthSkillForCollection(address collection, uint256 tokenId) external view returns (uint256) {
        return getSpecificSkill(collection, tokenId, MAGIC, EARTH);
    }

    // Collection-specific bulk getters
    function getCharacterSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        PirateSkills skills = pirateSkills();
        return skills.getCharacterSkills(collection, tokenId);
    }
    
    function getToolsSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        PirateSkills skills = pirateSkills();
        return skills.getToolsSkills(collection, tokenId);
    }
    
    function getSpecialSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        PirateSkills skills = pirateSkills();
        return skills.getSpecialSkills(collection, tokenId);
    }
    
    function getShipSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        PirateSkills skills = pirateSkills();
        return skills.getShipSkills(collection, tokenId);
    }
    
    function getMagicSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        PirateSkills skills = pirateSkills();
        return skills.getMagicSkills(collection, tokenId);
    }

    // Interface methods implementation for backwards compatibility
    function getAllSkillsForCollection(address collection, uint256 tokenId) external view returns (uint8[] memory) {
        PirateSkills skills = pirateSkills();
        uint256[] memory characterSkills = skills.getCharacterSkills(collection, tokenId);
        uint256[] memory toolsSkills = skills.getToolsSkills(collection, tokenId);
        uint256[] memory specialSkills = skills.getSpecialSkills(collection, tokenId);
        uint256[] memory shipSkills = skills.getShipSkills(collection, tokenId);
        uint256[] memory magicSkills = skills.getMagicSkills(collection, tokenId);
        
        // Combine all skills into one array
        uint8[] memory allSkills = new uint8[](
            characterSkills.length + toolsSkills.length + specialSkills.length + 
            shipSkills.length + magicSkills.length
        );
        
        uint256 index = 0;
        for (uint256 i = 0; i < characterSkills.length; i++) {
            allSkills[index++] = uint8(characterSkills[i]);
        }
        for (uint256 i = 0; i < toolsSkills.length; i++) {
            allSkills[index++] = uint8(toolsSkills[i]);
        }
        for (uint256 i = 0; i < specialSkills.length; i++) {
            allSkills[index++] = uint8(specialSkills[i]);
        }
        for (uint256 i = 0; i < shipSkills.length; i++) {
            allSkills[index++] = uint8(shipSkills[i]);
        }
        for (uint256 i = 0; i < magicSkills.length; i++) {
            allSkills[index++] = uint8(magicSkills[i]);
        }
        
        return allSkills;
    }
    
    function hasMinimumSkillLevel(address collection, uint256 tokenId, uint8 skillId, uint8 minLevel) external view returns (bool) {
        uint8 currentLevel = this.getSkillLevelForCollection(collection, tokenId, skillId);
        return currentLevel >= minLevel;
    }
    
    function getTotalSkillPoints(address collection, uint256 tokenId) external view returns (uint256) {
        uint8[] memory allSkills = this.getAllSkillsForCollection(collection, tokenId);
        uint256 total = 0;
        for (uint256 i = 0; i < allSkills.length; i++) {
            total += allSkills[i];
        }
        return total;
    }

    /**
     * @notice Get all skills for a specific token
     * @param collection Collection address
     * @param tokenId Token ID
     * @return characterSkills Array of character skills
     */
    function getAllSkills(address collection, uint256 tokenId) external view returns (
        uint256[] memory characterSkills,
        uint256[] memory toolsSkills,
        uint256[] memory specialSkills,
        uint256[] memory shipSkills,
        uint256[] memory magicSkills
    ) {
        PirateSkills skills = pirateSkills();
        characterSkills = skills.getCharacterSkills(collection, tokenId);
        toolsSkills = skills.getToolsSkills(collection, tokenId);
        specialSkills = skills.getSpecialSkills(collection, tokenId);
        shipSkills = skills.getShipSkills(collection, tokenId);
        magicSkills = skills.getMagicSkills(collection, tokenId);
    }

    /**
     * @notice Get a specific skill for any pirate collection
     * @param collection The pirate collection address
     * @param tokenId The token ID
     * @param category The skill category (CHARACTER=0, TOOLS=1, SPECIAL=2, SHIP=3, MAGIC=4)
     * @param skillId The skill ID within the category
     * @return The skill value
     */
    function getSpecificSkill(
        address collection,
        uint256 tokenId,
        uint8 category,
        uint8 skillId
    ) public view returns (uint256) {
        PirateSkills skills = pirateSkills();
        return skills.getSkill(collection, tokenId, category, skillId);
    }
} 