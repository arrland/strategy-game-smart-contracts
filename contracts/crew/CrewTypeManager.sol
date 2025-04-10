// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/ICrewTypeManager.sol";
import "../missions/PirateSkills.sol";
import "../missions/PirateSkillsReader.sol";

contract CrewTypeManager is ICrewTypeManager, AuthorizationModifiers {
    // Constants for calculations and validations
    uint256 private constant MULTIPLIER_BASE = 100;
    uint256 private constant MAX_STAT_VALUE = 255; // uint8 max
    bytes32 private constant EMPTY_STRING_HASH = keccak256("");

    // State variables
    mapping(string => CrewType) public crewTypes;
    string[] private crewTypeNames;

    // Base crew scores
    uint256 public constant INHABITANT_CITIZEN_CREW_SCORE = 3;
    uint256 public constant INHABITANT_CITIZEN_WITH_CERT_CREW_SCORE = 4;
    uint256 public constant INHABITANT_PIRATE_BASIC_CREW_SCORE = 5;
    uint256 public constant GENESIS_PIRATE_CREW_SCORE = 7;

    // Collection addresses
    address public GENESIS_PIRATE_COLLECTION;
    address public INHABITANT_PIRATE_COLLECTION;

    constructor(address _centralAuthorizationRegistry, address _genesisPirateCollection, address _inhabitedPirateCollection)
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ICrewTypeManager"))
    {
        GENESIS_PIRATE_COLLECTION = _genesisPirateCollection;
        INHABITANT_PIRATE_COLLECTION = _inhabitedPirateCollection;
        // Initialize default crew types
        _initializeDefaultCrewTypes();
    }

    function getPirateSkillsReader() internal view virtual returns (PirateSkillsReader) {
        return PirateSkillsReader(centralAuthorizationRegistry.getContractAddress(keccak256("IPirateSkillsReader")));
    }

    function _addCrewType(string memory name, CrewType memory crewType) internal {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(!crewTypes[name].isValid, "Crew type already exists");
        
        crewTypes[name] = crewType;
        crewTypeNames.push(name);
        
        emit CrewTypeAdded(name, crewType);
    }

    function addCrewType(string memory name, CrewType memory crewType) external onlyAdmin {
        _addCrewType(name, crewType);
    }

    function _updateCrewType(string memory name, CrewType memory crewType) internal {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(crewTypes[name].isValid, "Crew type does not exist");
        
        crewType.isValid = true;  // Maintain isValid flag
        crewTypes[name] = crewType;
        emit CrewTypeUpdated(name, crewType);
    }

    function updateCrewType(string memory name, CrewType memory crewType) external onlyAdmin {
        _updateCrewType(name, crewType);
    }

    function _removeCrewType(string memory name) internal {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(crewTypes[name].isValid, "Crew type does not exist");
        
        delete crewTypes[name];
        emit CrewTypeRemoved(name);
    }

    function removeCrewType(string memory name) external onlyAdmin {
        _removeCrewType(name);
    }

    function crewTypeExists(string calldata crewType) external view returns (bool) {
        return crewTypes[crewType].isValid;
    }

    function getCrewTypes() external view override returns (string[] memory) {
        return crewTypeNames;
    }

    // Get the full stats structure for a crew type
    function getCrewTypeStats(string memory crewType) external view override returns (CrewType memory) {
        CrewType memory stats = crewTypes[crewType];
        require(stats.isValid, "Crew type does not exist");
        return stats;
    }

    // Add proxy functions to access skills directly from the CrewType
    function getCrewTypeSkill(string memory crewType, ActivityType activity) internal view returns (uint8) {
        CrewType memory stats = crewTypes[crewType];
        require(stats.isValid, "Crew type does not exist");
        // both WOODPICKING and WOODCUTTING are correct
        
        if (activity == ActivityType.FARMING) return stats.skills.farming;
        if (activity == ActivityType.FISHING) return stats.skills.fishing;
        if (activity == ActivityType.WOODPICKING) return stats.skills.woodpicking;
        if (activity == ActivityType.WOODCUTTING) return stats.skills.woodcutting;
        if (activity == ActivityType.BUILDING) return stats.skills.building;
        if (activity == ActivityType.DEFENSE) return stats.skills.defense;
        if (activity == ActivityType.ABORDAGE) return stats.skills.abordage;
        if (activity == ActivityType.BOMBARDING) return stats.skills.bombarding;
        if (activity == ActivityType.SHOOTING) return stats.skills.shooting;
        if (activity == ActivityType.MINING) return stats.skills.mining;
        if (activity == ActivityType.QUARRYING) return stats.skills.quarrying;
        if (activity == ActivityType.EXCAVATION) return stats.skills.excavation;
        if (activity == ActivityType.CRAFTING) return stats.skills.crafting;
        
        return 0;
    }

    // Common skill accessors to maintain backward compatibility
    function farming(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.FARMING);
    }

    function fishing(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.FISHING);
    }

    function woodpicking(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.WOODPICKING);
    }

    function woodcutting(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.WOODCUTTING);
    }

    function building(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.BUILDING);
    }

    function defense(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.DEFENSE);
    }

    function abordage(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.ABORDAGE);
    }

    function bombarding(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.BOMBARDING);
    }

    function shooting(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.SHOOTING);
    }

    function mining(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.MINING);
    }

    function quarrying(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.QUARRYING);
    }

    function excavation(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.EXCAVATION);
    }

    function crafting(string memory crewType) external view returns (uint8) {
        return getCrewTypeSkill(crewType, ActivityType.CRAFTING);
    }

    function getPirateCrewCapacity(
        address pirateCollection,
        uint256 pirateId
    ) external view override returns (uint256) {
        // Check if the collection is supported first
        if (pirateCollection != GENESIS_PIRATE_COLLECTION && pirateCollection != INHABITANT_PIRATE_COLLECTION) {
            revert("Unsupported pirate collection");
        }

        PirateSkillsReader pirateSkillsReader = getPirateSkillsReader();
        
        // Get ship respect skill directly
        uint256 shipRespect = pirateSkillsReader.getRespectSkillForCollection(pirateCollection, pirateId);
        
        // Get base crew score based on pirate type
        uint256 baseCrewScore;
        if (pirateCollection == GENESIS_PIRATE_COLLECTION) {
            baseCrewScore = GENESIS_PIRATE_CREW_SCORE;
        } else { // Must be INHABITANT_PIRATE_COLLECTION based on check above
            // Check if pirate has ship respect > 0
            if (shipRespect > 0) {
                baseCrewScore = INHABITANT_PIRATE_BASIC_CREW_SCORE;
            } else {
                baseCrewScore = INHABITANT_CITIZEN_CREW_SCORE;
            }
        }

        return baseCrewScore + shipRespect;
    }

    function canBeEssentialCrew(string memory crewType) external view override returns (bool) {
        return crewTypes[crewType].canBeEssentialCrew;
    }

    function _getEffectiveStats(
        string memory crewType
    ) internal view returns (CrewType memory) {
        CrewType memory baseStats = crewTypes[crewType];
        require(baseStats.isValid, "Crew type does not exist");
        return baseStats; // Return base stats directly without any scaling
    }

    function getEffectiveStats(
        string memory crewType
    ) external view returns (CrewType memory) {
        return _getEffectiveStats(crewType);
    }

    function _initializeDefaultCrewTypes() private {
        // Peasant: Skills for basic resource gathering and construction
        _addCrewType("peasant", CrewType({
            skills: Skills({
                farming: 1,
                fishing: 1,
                woodpicking: 1,
                woodcutting: 0,
                building: 1,
                defense: 1,
                abordage: 0,
                bombarding: 0,
                shooting: 0,
                mining: 0,
                quarrying: 0,
                excavation: 0,
                crafting: 0
            }),      
            canBeEssentialCrew: false,
            name: "peasant",
            isValid: true
        }));

        // Worker: Specialized in resource extraction and construction
        _addCrewType("worker", CrewType({
            skills: Skills({
                farming: 0,
                fishing: 0,
                woodpicking: 0,
                woodcutting: 1,
                building: 2,
                defense: 2,
                abordage: 1,
                bombarding: 1,
                shooting: 0,
                mining: 1,
                quarrying: 1,
                excavation: 1,
                crafting: 0
            }),          
            canBeEssentialCrew: false,
            name: "worker",
            isValid: true
        }));

        // Craftsman: Specialized in crafting and building
        _addCrewType("craftsman", CrewType({
            skills: Skills({
                farming: 0,
                fishing: 0,
                woodpicking: 0,
                woodcutting: 0,
                building: 2,
                defense: 1,
                abordage: 0,
                bombarding: 2,
                shooting: 0,
                mining: 0,
                quarrying: 0,
                excavation: 0,
                crafting: 2
            }),            
            canBeEssentialCrew: false,
            name: "craftsman",
            isValid: true
        }));

        // Sailor: Ship operations specialist
        _addCrewType("sailor", CrewType({
            skills: Skills({
                farming: 0,
                fishing: 0,
                woodpicking: 0,
                woodcutting: 0,
                building: 0,
                defense: 2,
                abordage: 1,
                bombarding: 1,
                shooting: 0,
                mining: 0,
                quarrying: 0,
                excavation: 0,
                crafting: 0
            }),         
            canBeEssentialCrew: true,
            name: "sailor",
            isValid: true
        }));

        // Soldier: Combat specialist with focus on defense and ranged combat
        _addCrewType("soldier", CrewType({
            skills: Skills({
                farming: 0,
                fishing: 0,
                woodpicking: 0,
                woodcutting: 0,
                building: 0,
                defense: 3,
                abordage: 2,
                bombarding: 1,
                shooting: 2,
                mining: 0,
                quarrying: 0,
                excavation: 0,
                crafting: 0
            }),           
            canBeEssentialCrew: false,
            name: "soldier",
            isValid: true
        }));

        // Corsair: Naval combat specialist with focus on boarding
        _addCrewType("corsair", CrewType({
            skills: Skills({
                farming: 0,
                fishing: 0,
                woodpicking: 0,
                woodcutting: 0,
                building: 0,
                defense: 2,
                abordage: 3,
                bombarding: 2,
                shooting: 1,
                mining: 0,
                quarrying: 0,
                excavation: 0,
                crafting: 0
            }),         
            canBeEssentialCrew: true,
            name: "corsair",
            isValid: true
        }));

        // Pirate: Elite naval combat specialist with balanced ranged and boarding skills
        _addCrewType("pirate", CrewType({
            skills: Skills({
                farming: 0,
                fishing: 0,
                woodpicking: 0,
                woodcutting: 0,
                building: 0,
                defense: 2,
                abordage: 3,
                bombarding: 2,
                shooting: 2,
                mining: 0,
                quarrying: 0,
                excavation: 0,
                crafting: 0
            }),      
            canBeEssentialCrew: true,
            name: "pirate",
            isValid: true
        }));

        // Young Pirate: Versatile crew with balanced skills across resource gathering and combat
        _addCrewType("youngPirate", CrewType({
            skills: Skills({
                farming: 1,
                fishing: 1,
                woodpicking: 0,
                woodcutting: 1,
                building: 1,
                defense: 2,
                abordage: 2,
                bombarding: 1,
                shooting: 1,
                mining: 0,
                quarrying: 0,
                excavation: 0,
                crafting: 1
            }),
            canBeEssentialCrew: true,
            name: "youngPirate",
            isValid: true
        }));
    }

    // Admin function to add a new crew type with detailed skill parameters
    function addCrewTypeDetailed(
        string calldata _name,
        // Resource gathering skills
        uint8 _farming,
        uint8 _fishing,
        uint8 _woodpicking,
        uint8 _woodcutting,
        uint8 _mining,
        uint8 _quarrying,
        uint8 _excavation,
        // Construction skills
        uint8 _building,
        uint8 _crafting,
        // Combat skills
        uint8 _defense,
        uint8 _abordage,
        uint8 _bombarding,
        uint8 _shooting,
        bool _canBeEssentialCrew
    ) external onlyAdmin {
        // Create Skills struct
        Skills memory skills = Skills({
            farming: _farming,
            fishing: _fishing,
            woodpicking: _woodpicking,
            woodcutting: _woodcutting,
            mining: _mining,
            quarrying: _quarrying,
            excavation: _excavation,
            building: _building,
            crafting: _crafting,
            defense: _defense,
            abordage: _abordage,
            bombarding: _bombarding,
            shooting: _shooting
        });
        
        // Create CrewType struct
        CrewType memory newCrewType = CrewType({
            skills: skills,
            canBeEssentialCrew: _canBeEssentialCrew,
            name: _name,
            isValid: true
        });
        
        // Add the crew type
        _addCrewType(_name, newCrewType);
    }
    
    // Admin function to update an existing crew type with detailed skill parameters
    function updateCrewTypeDetailed(
        string calldata _name,
        // Resource gathering skills
        uint8 _farming,
        uint8 _fishing,
        uint8 _woodpicking,
        uint8 _woodcutting,
        uint8 _mining,
        uint8 _quarrying,
        uint8 _excavation,
        // Construction skills
        uint8 _building,
        uint8 _crafting,
        // Combat skills
        uint8 _defense,
        uint8 _abordage,
        uint8 _bombarding,
        uint8 _shooting,
        bool _canBeEssentialCrew
    ) external onlyAdmin {
        // Verify crew type exists
        require(crewTypes[_name].isValid, "CrewTypeManager: crew type does not exist");
        
        // Create Skills struct
        Skills memory skills = Skills({
            farming: _farming,
            fishing: _fishing,
            woodpicking: _woodpicking,
            woodcutting: _woodcutting,
            mining: _mining,
            quarrying: _quarrying,
            excavation: _excavation,
            building: _building,
            crafting: _crafting,
            defense: _defense,
            abordage: _abordage,
            bombarding: _bombarding,
            shooting: _shooting
        });
        
        // Create CrewType struct
        CrewType memory updatedCrewType = CrewType({
            skills: skills,
            canBeEssentialCrew: _canBeEssentialCrew,
            name: _name,
            isValid: true
        });
        
        // Update the crew type
        _updateCrewType(_name, updatedCrewType);
    }
}
