// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IPirateSkillsReader
 * @notice Interface for reading pirate skills
 */
interface IPirateSkillsReader {
    /**
     * @notice Get the skill level for a specific collection, pirate and skill ID
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @param skillId Skill identifier
     * @return Skill level (0-100)
     */
    function getSkillLevelForCollection(address collection, uint256 tokenId, uint8 skillId) external view returns (uint8);
    
    /**
     * @notice Get the wisdom skill for a specific collection and pirate
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Wisdom skill level (0-100)
     */
    function getWisdomSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the navigation skill for a specific collection and pirate
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Navigation skill level (0-100)
     */
    function getNavigationSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the respect skill for a specific collection and pirate
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Respect skill level (0-100)
     */
    function getRespectSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the leadership skill for a specific collection and pirate
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Leadership skill level (0-100)
     */
    function getLeadershipSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the combat skill for a specific collection and pirate
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Combat skill level (0-100)
     */
    function getCombatSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the luck skill for a specific collection and pirate
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Luck skill level (0-100)
     */
    function getLuckSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get all skills for a specific collection and pirate
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Array of skill levels (0-100) in order of skill IDs
     */
    function getAllSkillsForCollection(address collection, uint256 tokenId) external view returns (uint8[] memory);
    
    /**
     * @notice Check if a pirate meets minimum skill requirements
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @param skillId Skill identifier
     * @param minLevel Minimum required skill level
     * @return True if the pirate meets or exceeds the minimum skill level
     */
    function hasMinimumSkillLevel(address collection, uint256 tokenId, uint8 skillId, uint8 minLevel) external view returns (bool);
    
    /**
     * @notice Get the total skill points for a pirate (sum of all skills)
     * @param collection The pirate collection address
     * @param tokenId Pirate token ID
     * @return Total skill points
     */
    function getTotalSkillPoints(address collection, uint256 tokenId) external view returns (uint256);

    /**
     * @notice Get a specific skill for any pirate collection
     * @param collection The pirate collection address
     * @param tokenId The token ID
     * @param skillCategory The skill category
     * @param skillId The skill ID within the category
     * @return The skill value
     */
    function getSkill(address collection, uint256 tokenId, uint8 skillCategory, uint8 skillId) external view returns (uint256);

    // Character Skills
    function getStrengthSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getStaminaSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getSwimmingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getMeleeSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getShootingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getCannonsSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getAgilitySkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getEngineeringSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getHealthSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getSpeedSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getArmourSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);

    // Tools Skills
    function getHarvestSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getMiningSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getQuarryingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getExcavationSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getHusbandrySkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getWoodcuttingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getSlaughterSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getHuntingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getCultivationSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);

    // Ship Skills
    function getShipDetectionSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);

    // Special Skills
    function getRopeSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getCraftingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getBuildingSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getRepairSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);

    // Magic Skills
    function getElementalSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getVoodooSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getWaterSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getAirSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getFireSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);
    function getEarthSkillForCollection(address collection, uint256 tokenId) external view returns (uint256);

    // Bulk Getters
    function getCharacterSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory);
    function getToolsSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory);
    function getSpecialSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory);
    function getShipSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory);
    function getMagicSkillsForCollection(address collection, uint256 tokenId) external view returns (uint256[] memory);
    
    function getAllSkills(address collection, uint256 tokenId) external view returns (
        uint256[] memory characterSkills,
        uint256[] memory toolsSkills,
        uint256[] memory specialSkills,
        uint256[] memory shipSkills,
        uint256[] memory magicSkills
    );
} 