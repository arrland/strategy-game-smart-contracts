// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title PirateSkillsConstants
 * @notice Shared constants for pirate skills
 */
library PirateSkillsConstants {
    // Skill categories
    uint8 constant CHARACTER = 0;
    uint8 constant TOOLS = 1;
    uint8 constant SPECIAL = 2;
    uint8 constant SHIP = 3;
    uint8 constant MAGIC = 4;
    
    // Character skills (0-12)
    uint8 constant STRENGTH = 0;
    uint8 constant STAMINA = 1;
    uint8 constant SWIMMING = 2;
    uint8 constant MELEE = 3;
    uint8 constant SHOOTING = 4;
    uint8 constant CANNONS = 5;
    uint8 constant AGILITY = 6;
    uint8 constant ENGINEERING = 7;
    uint8 constant WISDOM = 8;
    uint8 constant LUCK = 9;
    uint8 constant HEALTH = 10;
    uint8 constant SPEED = 11;
    uint8 constant ARMOUR = 12;
    
    // Tools skills (0-8)
    uint8 constant HARVEST = 0;
    uint8 constant MINING = 1;
    uint8 constant QUARRYING = 2;
    uint8 constant EXCAVATION = 3;
    uint8 constant HUSBANDRY = 4;
    uint8 constant WOODCUTTING = 5;
    uint8 constant SLAUGHTER = 6;
    uint8 constant HUNTING = 7;
    uint8 constant CULTIVATION = 8;
    
    // Ship skills (0-2)
    uint8 constant NAVIGATION = 0;
    uint8 constant RESPECT = 1;
    uint8 constant SHIP_DETECTION = 2;
    
    // Special skills (0-3)
    uint8 constant ROPE = 0;
    uint8 constant CRAFTING = 1;
    uint8 constant BUILDING = 2;
    uint8 constant REPAIR = 3;
    
    // Magic skills (0-5)
    uint8 constant ELEMENTAL = 0;
    uint8 constant VOODOO = 1;
    uint8 constant WATER = 2;
    uint8 constant AIR = 3;
    uint8 constant FIRE = 4;
    uint8 constant EARTH = 5;
    
    // Skill count constants
    uint8 constant CHARACTER_SKILL_COUNT = 13;  // 0-12
    uint8 constant TOOLS_SKILL_COUNT = 9;      // 0-8
    uint8 constant SPECIAL_SKILL_COUNT = 4;    // 0-3
    uint8 constant SHIP_SKILL_COUNT = 3;       // 0-2
    uint8 constant MAGIC_SKILL_COUNT = 6;      // 0-5
} 