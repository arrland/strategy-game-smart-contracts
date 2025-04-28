// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract MockCrewManagement {
    // Mapping to store crew members for each Pirate NFT
    // pirateCollection => pirateId => crewType => amount
    mapping(address => mapping(uint256 => mapping(string => uint256))) public crewMembers;

    event CrewAdded(
        address indexed pirateCollection, 
        uint256 indexed pirateId, 
        address indexed owner, 
        string crewType, 
        uint256 amount
    );
    
    event CrewRemoved(
        address indexed pirateCollection, 
        uint256 indexed pirateId, 
        address indexed owner, 
        string crewType, 
        uint256 amount
    );

    function addCrew(
        address pirateCollection,
        uint256 pirateId,
        address owner,
        string memory crewType,
        uint256 amount
    ) external {
        // Update crew count
        crewMembers[pirateCollection][pirateId][crewType] += amount;

        emit CrewAdded(pirateCollection, pirateId, owner, crewType, amount);
    }

    function removeCrew(
        address pirateCollection,
        uint256 pirateId,
        address owner,
        string memory crewType,
        uint256 amount
    ) external {
        require(crewMembers[pirateCollection][pirateId][crewType] >= amount, "Insufficient crew members");
        
        crewMembers[pirateCollection][pirateId][crewType] -= amount;

        emit CrewRemoved(pirateCollection, pirateId, owner, crewType, amount);
    }

    function getCrewCount(
        address pirateCollection,
        uint256 pirateId,
        string memory crewType
    ) external view returns (uint256) {
        return crewMembers[pirateCollection][pirateId][crewType];
    }
} 