// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/ICrewManagement.sol";
import "../AuthorizationModifiers.sol";

// Basic ABSTRACT mock for ICrewManagement
abstract contract MockCrewManagement is ICrewManagement, AuthorizationModifiers {

    // pirateCollection => pirateId => crewType => count
    mapping(address => mapping(uint256 => mapping(string => uint256))) private _crewCounts;
    // pirateCollection => pirateId => array of crew types (for getAllCrewCountsForShip)
    mapping(address => mapping(uint256 => string[])) private _crewTypesForPirate;

    constructor(address _car) AuthorizationModifiers(_car, keccak256("ICrewManagement")) {}

    // --- Mock Control Functions ---
    function setCrewCount(address collection, uint256 pirateId, string calldata crewType, uint256 count) external {
        bool exists = false;
        for(uint i = 0; i < _crewTypesForPirate[collection][pirateId].length; i++) {
            if (keccak256(bytes(_crewTypesForPirate[collection][pirateId][i])) == keccak256(bytes(crewType))) {
                exists = true;
                break;
            }
        }
        if (!exists) {
             _crewTypesForPirate[collection][pirateId].push(crewType);
        }
        _crewCounts[collection][pirateId][crewType] = count;
    }

    // --- ICrewManagement Interface Implementation ---
    function getAllCrewCountsForShip(address collection, uint256 pirateId) external view returns (string[] memory crewTypes, uint256[] memory crewCounts) {
        string[] storage types = _crewTypesForPirate[collection][pirateId];
        crewTypes = new string[](types.length);
        crewCounts = new uint256[](types.length);

        for(uint i = 0; i < types.length; i++) {
            crewTypes[i] = types[i];
            crewCounts[i] = _crewCounts[collection][pirateId][types[i]];
        }
        return (crewTypes, crewCounts);
    }

    // Implement other functions with basic return types or reverts if needed
    function addCrew(address collection, uint256 pirateId, address user, string calldata crewType, uint256 count) external {}
    function removeCrew(address collection, uint256 pirateId, address user, string calldata crewType, uint256 count) external {}
    function getCrewCount(address collection, uint256 pirateId, string calldata crewType) external view returns (uint256) {
         return _crewCounts[collection][pirateId][crewType];
    }
} 