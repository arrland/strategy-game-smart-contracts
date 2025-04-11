// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title ICrewManagement
 * @notice Interface for crew management
 */
interface ICrewManagement {
    // Structs
    struct CrewMember {
        uint256 id;
        uint256 crewType;
        uint256 experience;
        uint256 loyalty;
        bool isActive;
    }

    // Events
    event CrewAssigned(uint256 indexed shipId, uint256 indexed crewId);
    event CrewUnassigned(uint256 indexed shipId, uint256 indexed crewId);
    event CrewExperienceGained(uint256 indexed crewId, uint256 amount);
    event CrewLoyaltyChanged(uint256 indexed crewId, uint256 newLoyalty);

    // Functions
    function assignCrew(uint256 shipId, uint256 crewId) external;
    function unassignCrew(uint256 shipId, uint256 crewId) external;
    function getShipCrew(uint256 shipId) external view returns (uint256[] memory);
    function getCrewMember(uint256 crewId) external view returns (CrewMember memory);
    function updateCrewExperience(uint256 crewId, uint256 amount) external;
    function updateCrewLoyalty(uint256 crewId, uint256 newLoyalty) external;
} 