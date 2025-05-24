// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol"; // Import AuthorizationModifiers

// Basic mock for IIslandManager (or similar ERC721)
contract MockIslandManager is AuthorizationModifiers { // Inherit AuthorizationModifiers
    mapping(uint256 => address) private _owners;

    constructor(address _car) AuthorizationModifiers(_car, keccak256("IIslandManager")) {} // Add constructor

    // --- Mock Control Functions ---
    function setOwner(uint256 islandId, address owner) external {
        _owners[islandId] = owner;
    }

    // --- IIslandManager/ERC721 Interface Implementation (Partial) ---
    function ownerOf(uint256 islandId) external view returns (address) {
        address owner = _owners[islandId];
        // Revert if not set, similar to ERC721 behavior
        require(owner != address(0), "MockIslandManager: invalid island ID"); 
        return owner;
    }

    // Add other ERC721 functions if needed by tests, e.g., safeTransferFrom
    // For now, ownerOf is likely sufficient for MissionValidator
} 