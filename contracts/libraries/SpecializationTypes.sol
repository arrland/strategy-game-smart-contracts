// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title SpecializationTypes
 * @notice Library defining constants for pirate specialization types
 * @dev Used by combat and farming contracts to reference specialization types
 */
library SpecializationTypes {
    // Combat specializations
    uint8 constant LAND_DEFENSE = 0;
    uint8 constant LAND_ATTACK = 1;
    uint8 constant SEA_MANEUVERING = 2;
    uint8 constant BOARDING_ATTACK = 3;
    uint8 constant BOARDING_DEFENSE = 4;
    uint8 constant FIREARMS_SHOOTING = 5;
    uint8 constant CANNON_SHOOTING = 6;
    uint8 constant NAVIGATION = 7;
    
    // Farming specialization
    uint8 constant FARMING = 8;
    
    // Total number of specializations
    uint8 constant SPECIALIZATION_COUNT = 9;
    
    /**
     * @notice Get the name of a specialization type
     * @param specializationType The type of specialization (0-8)
     * @return The name of the specialization
     */
    function getName(uint8 specializationType) internal pure returns (string memory) {
        if (specializationType == LAND_DEFENSE) return "LAND_DEFENSE";
        if (specializationType == LAND_ATTACK) return "LAND_ATTACK";
        if (specializationType == SEA_MANEUVERING) return "SEA_MANEUVERING";
        if (specializationType == BOARDING_ATTACK) return "BOARDING_ATTACK";
        if (specializationType == BOARDING_DEFENSE) return "BOARDING_DEFENSE";
        if (specializationType == FIREARMS_SHOOTING) return "FIREARMS_SHOOTING";
        if (specializationType == CANNON_SHOOTING) return "CANNON_SHOOTING";
        if (specializationType == NAVIGATION) return "NAVIGATION";
        if (specializationType == FARMING) return "FARMING";
        revert("Invalid specialization type");
    }
    
    /**
     * @notice Get the description of a specialization type
     * @param specializationType The type of specialization (0-8)
     * @return The description of the specialization
     */
    function getDescription(uint8 specializationType) internal pure returns (string memory) {
        if (specializationType == LAND_DEFENSE) return "+15% in defense in land battles";
        if (specializationType == LAND_ATTACK) return "+15% in attack in land battles";
        if (specializationType == SEA_MANEUVERING) return "+15% in maneuvering in sea battles";
        if (specializationType == BOARDING_ATTACK) return "+15% in attack during boarding";
        if (specializationType == BOARDING_DEFENSE) return "+15% in defense against boarding";
        if (specializationType == FIREARMS_SHOOTING) return "+15% in firearms shooting";
        if (specializationType == CANNON_SHOOTING) return "+15% in cannon shooting";
        if (specializationType == NAVIGATION) return "+15% in navigation";
        if (specializationType == FARMING) return "+15% to any farming activity";
        revert("Invalid specialization type");
    }
} 