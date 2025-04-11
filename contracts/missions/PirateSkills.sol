// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../libraries/PirateSkillsConstants.sol";


contract PirateSkills is AuthorizationModifiers {
    // Import constants from library
    using PirateSkillsConstants for uint8;
    
    // Skill category constants
    uint8 constant CHARACTER = PirateSkillsConstants.CHARACTER;
    uint8 constant TOOLS = PirateSkillsConstants.TOOLS;
    uint8 constant SPECIAL = PirateSkillsConstants.SPECIAL;
    uint8 constant SHIP = PirateSkillsConstants.SHIP;
    uint8 constant MAGIC = PirateSkillsConstants.MAGIC;
    
    // Skill count constants
    uint8 constant CHARACTER_SKILL_COUNT = PirateSkillsConstants.CHARACTER_SKILL_COUNT;
    uint8 constant TOOLS_SKILL_COUNT = PirateSkillsConstants.TOOLS_SKILL_COUNT;
    uint8 constant SPECIAL_SKILL_COUNT = PirateSkillsConstants.SPECIAL_SKILL_COUNT;
    uint8 constant SHIP_SKILL_COUNT = PirateSkillsConstants.SHIP_SKILL_COUNT;
    uint8 constant MAGIC_SKILL_COUNT = PirateSkillsConstants.MAGIC_SKILL_COUNT;
    
    // Storage for pirate skills
    mapping(address => mapping(uint256 => uint256[])) private characterSkills;
    mapping(address => mapping(uint256 => uint256[])) private toolsSkills;
    mapping(address => mapping(uint256 => uint256[])) private specialSkills;
    mapping(address => mapping(uint256 => uint256[])) private shipSkills;
    mapping(address => mapping(uint256 => uint256[])) private magicSkills;
    
    // Events
    event SkillsAdded(address indexed collection, uint256 indexed tokenId);
    event SkillUpdated(address indexed collection, uint256 indexed tokenId, uint8 skillCategory, uint8 skillId, uint256 oldValue, uint256 newValue);

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IPirateSkills")) 
    {
    }
    
    /**
     * @notice Add character skills for a specific pirate token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param _characterSkills Array of character skills to add (must be of length CHARACTER_SKILL_COUNT)
     */
    function addCharacterSkills(
        address collection,
        uint256 tokenId,
        uint256[] calldata _characterSkills
    ) public onlyAuthorized {
        require(_characterSkills.length == CHARACTER_SKILL_COUNT, "Invalid character skills length");
        require(characterSkills[collection][tokenId].length == 0, "Character skills already exist");
        
        characterSkills[collection][tokenId] = _characterSkills;
        
        if (
            characterSkills[collection][tokenId].length > 0 &&
            toolsSkills[collection][tokenId].length > 0 &&
            specialSkills[collection][tokenId].length > 0 &&
            shipSkills[collection][tokenId].length > 0 &&
            magicSkills[collection][tokenId].length > 0
        ) {
            emit SkillsAdded(collection, tokenId);
        }
    }
    
    /**
     * @notice Add tools skills for a specific pirate token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param _toolsSkills Array of tools skills to add (must be of length TOOLS_SKILL_COUNT)
     */
    function addToolsSkills(
        address collection, 
        uint256 tokenId, 
        uint256[] calldata _toolsSkills
    ) public onlyAuthorized {
        require(_toolsSkills.length == TOOLS_SKILL_COUNT, "Invalid tools skills length");
        require(toolsSkills[collection][tokenId].length == 0, "Tools skills already exist");
        
        toolsSkills[collection][tokenId] = _toolsSkills;
        
        if (
            characterSkills[collection][tokenId].length > 0 &&
            toolsSkills[collection][tokenId].length > 0 &&
            specialSkills[collection][tokenId].length > 0 &&
            shipSkills[collection][tokenId].length > 0 &&
            magicSkills[collection][tokenId].length > 0
        ) {
            emit SkillsAdded(collection, tokenId);
        }
    }
    
    /**
     * @notice Add special skills for a specific pirate token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param _specialSkills Array of special skills to add (must be of length SPECIAL_SKILL_COUNT)
     */
    function addSpecialSkills(
        address collection, 
        uint256 tokenId,
        uint256[] calldata _specialSkills
    ) public onlyAuthorized {
        require(_specialSkills.length == SPECIAL_SKILL_COUNT, "Invalid special skills length");
        require(specialSkills[collection][tokenId].length == 0, "Special skills already exist");
        
        specialSkills[collection][tokenId] = _specialSkills;
        
        if (
            characterSkills[collection][tokenId].length > 0 &&
            toolsSkills[collection][tokenId].length > 0 &&
            specialSkills[collection][tokenId].length > 0 &&
            shipSkills[collection][tokenId].length > 0 &&
            magicSkills[collection][tokenId].length > 0
        ) {
            emit SkillsAdded(collection, tokenId);
        }
    }
    
    /**
     * @notice Add ship skills for a specific pirate token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param _shipSkills Array of ship skills to add (must be of length SHIP_SKILL_COUNT)
     */
    function addShipSkills(
        address collection, 
        uint256 tokenId,
        uint256[] calldata _shipSkills
    ) public onlyAuthorized {
        require(_shipSkills.length == SHIP_SKILL_COUNT, "Invalid ship skills length");
        require(shipSkills[collection][tokenId].length == 0, "Ship skills already exist");
        
        shipSkills[collection][tokenId] = _shipSkills;
        
        if (
            characterSkills[collection][tokenId].length > 0 &&
            toolsSkills[collection][tokenId].length > 0 &&
            specialSkills[collection][tokenId].length > 0 &&
            shipSkills[collection][tokenId].length > 0 &&
            magicSkills[collection][tokenId].length > 0
        ) {
            emit SkillsAdded(collection, tokenId);
        }
    }
    
    /**
     * @notice Add magic skills for a specific pirate token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param _magicSkills Array of magic skills to add (must be of length MAGIC_SKILL_COUNT)
     */
    function addMagicSkills(
        address collection,
        uint256 tokenId,
        uint256[] calldata _magicSkills
    ) public onlyAuthorized {
        require(_magicSkills.length == MAGIC_SKILL_COUNT, "Invalid magic skills length");
        require(magicSkills[collection][tokenId].length == 0, "Magic skills already exist");
        
        magicSkills[collection][tokenId] = _magicSkills;
        
        if (
            characterSkills[collection][tokenId].length > 0 &&
            toolsSkills[collection][tokenId].length > 0 &&
            specialSkills[collection][tokenId].length > 0 &&
            shipSkills[collection][tokenId].length > 0 &&
            magicSkills[collection][tokenId].length > 0
        ) {
            emit SkillsAdded(collection, tokenId);
        }
    }
    
    /**
     * @notice Add all skills for a specific pirate token
     * @param collection Collection address
     * @param tokenId Token ID
     * @param _characterSkills Array of character skills to add
     * @param _toolsSkills Array of tools skills to add
     * @param _specialSkills Array of special skills to add
     * @param _shipSkills Array of ship skills to add
     * @param _magicSkills Array of magic skills to add
     */
    function addAllSkills(
        address collection,
        uint256 tokenId,
        uint256[] calldata _characterSkills,
        uint256[] calldata _toolsSkills,
        uint256[] calldata _specialSkills,
        uint256[] calldata _shipSkills,
        uint256[] calldata _magicSkills
    ) external onlyAuthorized {
        addCharacterSkills(collection, tokenId, _characterSkills);
        addToolsSkills(collection, tokenId, _toolsSkills);
        addSpecialSkills(collection, tokenId, _specialSkills);
        addShipSkills(collection, tokenId, _shipSkills);
        addMagicSkills(collection, tokenId, _magicSkills);
    }
    
    /**
     * @notice Get a specific skill for a pirate
     * @param collection Collection address
     * @param tokenId Token ID
     * @param skillCategory Skill category (see constants)
     * @param skillId Skill ID within the category
     * @return Skill value
     */
    function getSkill(
        address collection,
        uint256 tokenId,
        uint8 skillCategory,
        uint8 skillId
    ) external view returns (uint256) {
        if (skillCategory == CHARACTER) {
            require(skillId < CHARACTER_SKILL_COUNT, "Invalid character skill ID");
            require(characterSkills[collection][tokenId].length > 0, "Character skills not found");
            return characterSkills[collection][tokenId][skillId];
        } else if (skillCategory == TOOLS) {
            require(skillId < TOOLS_SKILL_COUNT, "Invalid tools skill ID");
            require(toolsSkills[collection][tokenId].length > 0, "Tools skills not found");
            return toolsSkills[collection][tokenId][skillId];
        } else if (skillCategory == SPECIAL) {
            require(skillId < SPECIAL_SKILL_COUNT, "Invalid special skill ID");
            require(specialSkills[collection][tokenId].length > 0, "Special skills not found");
            return specialSkills[collection][tokenId][skillId];
        } else if (skillCategory == SHIP) {
            require(skillId < SHIP_SKILL_COUNT, "Invalid ship skill ID");
            require(shipSkills[collection][tokenId].length > 0, "Ship skills not found");
            return shipSkills[collection][tokenId][skillId];
        } else if (skillCategory == MAGIC) {
            require(skillId < MAGIC_SKILL_COUNT, "Invalid magic skill ID");
            require(magicSkills[collection][tokenId].length > 0, "Magic skills not found");
            return magicSkills[collection][tokenId][skillId];
        } else {
            revert("Invalid skill category");
        }
    }
    
    /**
     * @notice Update a specific skill for a pirate
     * @param collection Collection address
     * @param tokenId Token ID
     * @param skillCategory Skill category (see constants)
     * @param skillId Skill ID within the category
     * @param newValue New skill value
     */
    function updateSkill(
        address collection,
        uint256 tokenId,
        uint8 skillCategory,
        uint8 skillId,
        uint256 newValue
    ) external onlyAuthorized {
        uint256 oldValue;
        
        if (skillCategory == CHARACTER) {
            require(skillId < CHARACTER_SKILL_COUNT, "Invalid character skill ID");
            require(characterSkills[collection][tokenId].length > 0, "Character skills not found");
            oldValue = characterSkills[collection][tokenId][skillId];
            characterSkills[collection][tokenId][skillId] = newValue;
        } else if (skillCategory == TOOLS) {
            require(skillId < TOOLS_SKILL_COUNT, "Invalid tools skill ID");
            require(toolsSkills[collection][tokenId].length > 0, "Tools skills not found");
            oldValue = toolsSkills[collection][tokenId][skillId];
            toolsSkills[collection][tokenId][skillId] = newValue;
        } else if (skillCategory == SPECIAL) {
            require(skillId < SPECIAL_SKILL_COUNT, "Invalid special skill ID");
            require(specialSkills[collection][tokenId].length > 0, "Special skills not found");
            oldValue = specialSkills[collection][tokenId][skillId];
            specialSkills[collection][tokenId][skillId] = newValue;
        } else if (skillCategory == SHIP) {
            require(skillId < SHIP_SKILL_COUNT, "Invalid ship skill ID");
            require(shipSkills[collection][tokenId].length > 0, "Ship skills not found");
            oldValue = shipSkills[collection][tokenId][skillId];
            shipSkills[collection][tokenId][skillId] = newValue;
        } else if (skillCategory == MAGIC) {
            require(skillId < MAGIC_SKILL_COUNT, "Invalid magic skill ID");
            require(magicSkills[collection][tokenId].length > 0, "Magic skills not found");
            oldValue = magicSkills[collection][tokenId][skillId];
            magicSkills[collection][tokenId][skillId] = newValue;
        } else {
            revert("Invalid skill category");
        }
        
        emit SkillUpdated(collection, tokenId, skillCategory, skillId, oldValue, newValue);
    }
    
    /**
     * @notice Get character skills for a pirate
     * @param collection Collection address
     * @param tokenId Token ID
     * @return Array of character skills
     */
    function getCharacterSkills(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        require(characterSkills[collection][tokenId].length > 0, "Character skills not found");
        return characterSkills[collection][tokenId];
    }
    
    /**
     * @notice Get tools skills for a pirate
     * @param collection Collection address
     * @param tokenId Token ID
     * @return Array of tools skills
     */
    function getToolsSkills(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        require(toolsSkills[collection][tokenId].length > 0, "Tools skills not found");
        return toolsSkills[collection][tokenId];
    }
    
    /**
     * @notice Get special skills for a pirate
     * @param collection Collection address
     * @param tokenId Token ID
     * @return Array of special skills
     */
    function getSpecialSkills(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        require(specialSkills[collection][tokenId].length > 0, "Special skills not found");
        return specialSkills[collection][tokenId];
    }
    
    /**
     * @notice Get ship skills for a pirate
     * @param collection Collection address
     * @param tokenId Token ID
     * @return Array of ship skills
     */
    function getShipSkills(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        require(shipSkills[collection][tokenId].length > 0, "Ship skills not found");
        return shipSkills[collection][tokenId];
    }
    
    /**
     * @notice Get magic skills for a pirate
     * @param collection Collection address
     * @param tokenId Token ID
     * @return Array of magic skills
     */
    function getMagicSkills(address collection, uint256 tokenId) external view returns (uint256[] memory) {
        require(magicSkills[collection][tokenId].length > 0, "Magic skills not found");
        return magicSkills[collection][tokenId];
    }
} 