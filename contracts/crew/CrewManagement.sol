// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "../CentralAuthorizationRegistry.sol";
import "../AuthorizationModifiers.sol";
import "../interfaces/ICrewTypeManager.sol";
import "hardhat/console.sol";


contract CrewManagement is AuthorizationModifiers {
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
    
    event CrewTransferred(
        address indexed fromPirateCollection,
        uint256 indexed fromPirateId,
        address indexed fromOwner,
        address toPirateCollection,
        uint256 toPirateId,
        address toOwner,
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

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ICrewManagement")) 
    {}

    function getCrewTypeManager() internal view returns (ICrewTypeManager) {
        return ICrewTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("ICrewTypeManager")));
    }


    function addCrew(
        address pirateCollection,
        uint256 pirateId,
        address owner,
        string memory crewType,
        uint256 amount
    ) external onlyAuthorized {
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        require(crewTypeManager.crewTypeExists(crewType), "Invalid crew type");
        
        // Get pirate's max crew capacity
        uint256 currentCrewCount = getTotalCrewCount(pirateCollection, pirateId);
        uint256 maxCrewCapacity = crewTypeManager.getPirateCrewCapacity(pirateCollection, pirateId);
        require(currentCrewCount + amount <= maxCrewCapacity, "Exceeds pirate's crew capacity");

        // Update crew count
        crewMembers[pirateCollection][pirateId][crewType] += amount;

        emit CrewAdded(pirateCollection, pirateId, owner, crewType, amount);
    }

    function transferCrew(
        address fromPirateCollection,
        uint256 fromPirateId,
        address fromOwner,
        address toPirateCollection,
        uint256 toPirateId,
        address toOwner,
        string memory crewType,
        uint256 amount
    ) external onlyAuthorized {
        require(crewMembers[fromPirateCollection][fromPirateId][crewType] >= amount, "Insufficient crew members");
        
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        require(crewTypeManager.crewTypeExists(crewType), "Invalid crew type");

        // Check destination pirate's crew capacity
        uint256 currentCrewCount = getTotalCrewCount(toPirateCollection, toPirateId);
        uint256 maxCrewCapacity = crewTypeManager.getPirateCrewCapacity(toPirateCollection, toPirateId);
        require(currentCrewCount + amount <= maxCrewCapacity, "Exceeds destination pirate's crew capacity");

        // Update crew counts
        crewMembers[fromPirateCollection][fromPirateId][crewType] -= amount;
        crewMembers[toPirateCollection][toPirateId][crewType] += amount;

        emit CrewTransferred(
            fromPirateCollection, fromPirateId, fromOwner,
            toPirateCollection, toPirateId, toOwner,
            crewType, amount
        );
    }

    function removeCrew(
        address pirateCollection,
        uint256 pirateId,
        address owner,
        string memory crewType,
        uint256 amount
    ) external onlyAuthorized {
        require(crewMembers[pirateCollection][pirateId][crewType] >= amount, "Insufficient crew members");
        
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        require(crewTypeManager.crewTypeExists(crewType), "Invalid crew type");

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

    function getAllCrewCounts(address pirateCollection, uint256 pirateId) 
        public view returns (string[] memory, uint256[] memory) 
    {
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        string[] memory crewTypes = crewTypeManager.getCrewTypes();
        uint256[] memory crewCounts = new uint256[](crewTypes.length);

        for (uint256 i = 0; i < crewTypes.length; i++) {
            crewCounts[i] = crewMembers[pirateCollection][pirateId][crewTypes[i]];
        }

        return (crewTypes, crewCounts);
    }

    function getAllCrewCountsForShip(address pirateCollection, uint256 pirateId) 
        external view returns (string[] memory, uint256[] memory) 
    {
        console.log("Getting all crew counts for ship: collection %s, id %s", pirateCollection, pirateId);
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        string[] memory crewTypes = crewTypeManager.getCrewTypes();
        uint256[] memory crewCounts = new uint256[](crewTypes.length);
        console.log("Above this is error");
        for (uint256 i = 0; i < crewTypes.length; i++) {
            if (crewTypeManager.canBeEssentialCrew(crewTypes[i])) {
                crewCounts[i] = crewMembers[pirateCollection][pirateId][crewTypes[i]];
            }
        }

        return (crewTypes, crewCounts);
    }

    function getTotalCrewCount(address pirateCollection, uint256 pirateId) 
        public view returns (uint256) 
    {
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        string[] memory crewTypes = crewTypeManager.getCrewTypes();
        uint256 totalCrew = 0;

        for (uint256 i = 0; i < crewTypes.length; i++) {
            totalCrew += crewMembers[pirateCollection][pirateId][crewTypes[i]];
        }

        return totalCrew;
    }

    // New function to get essential crew count
    function getEssentialCrewCount(address pirateCollection, uint256 pirateId) public view returns (uint256) {
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        string[] memory crewTypes = crewTypeManager.getCrewTypes();
        uint256 essentialCount = 0;

        for (uint256 i = 0; i < crewTypes.length; i++) {
            if (crewTypeManager.canBeEssentialCrew(crewTypes[i])) {
                essentialCount += crewMembers[pirateCollection][pirateId][crewTypes[i]];
            }
        }

        return essentialCount;
    }


}