// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface ICrewTypeManager {
    // Activity types as enum
    enum ActivityType {
        NONE,           // 0
        FARMING,        // 1
        FISHING,        // 2
        WOODPICKING,    // 3
        WOODCUTTING,    // 4
        BUILDING,       // 5
        DEFENSE,        // 6
        ABORDAGE,       // 7
        BOMBARDING,     // 8
        SHOOTING,       // 9
        MINING,         // 10
        QUARRYING,      // 11
        EXCAVATION,     // 12
        CRAFTING        // 13
    }

    // Skills struct to group all skill-related fields
    struct Skills {
        // Resource gathering skills
        uint8 farming;
        uint8 fishing;
        uint8 woodpicking;
        uint8 woodcutting;
        uint8 mining;
        uint8 quarrying;
        uint8 excavation;
        
        // Construction skills
        uint8 building;
        uint8 crafting;
        
        // Combat skills
        uint8 defense;
        uint8 abordage;
        uint8 bombarding;
        uint8 shooting;
    }

    struct CrewType {
        // Skills grouped in a separate struct
        Skills skills;
        
        // Additional fields        
        bool canBeEssentialCrew;
        string name;
        bool isValid;
    }

    // Events
    event CrewTypeAdded(string indexed name, CrewType crewType);
    event CrewTypeUpdated(string indexed name, CrewType crewType);
    event CrewTypeRemoved(string indexed name);

    function getCrewTypes() external view returns (string[] memory);
    function getCrewTypeStats(string memory crewType) external view returns (CrewType memory);
    function getPirateCrewCapacity(address pirateCollection, uint256 pirateId) external view returns (uint256);
    function canBeEssentialCrew(string memory crewType) external view returns (bool);
    function getEffectiveStats(string memory crewType) external view returns (CrewType memory);
    function crewTypeExists(string calldata crewType) external view returns (bool);
}