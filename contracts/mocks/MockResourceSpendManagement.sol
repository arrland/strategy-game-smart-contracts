// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IResourceSpendManagement.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../AuthorizationModifiers.sol";

// Basic ABSTRACT mock for IResourceSpendManagement
abstract contract MockResourceSpendManagement is IResourceSpendManagement, AuthorizationModifiers {

    event ResourceBurnHandled(
        address indexed shipStorage,
        uint256 indexed shipId,
        address indexed user,
        string resourceName,
        uint256 amount
    );

    constructor(address _car) AuthorizationModifiers(_car, keccak256("IResourceSpendManagement")) {}

    // --- Mock Control Functions ---
    // Add setters if needed to configure mock behavior (e.g., balances)

    // --- IResourceSpendManagement Interface Implementation ---
    function handleResourceBurning(
        address _shipStorage, // Changed to address type
        uint256 _shipId,
        address _user,
        string calldata _resourceName,
        uint256, // travelDays - unused in mock
        uint256 _amount,
        string[] calldata // foodType - unused in mock
    ) external override onlyAuthorized {
        // In a real contract, this would interact with ShipStorage
        // Mock simply emits an event to confirm it was called
        emit ResourceBurnHandled(_shipStorage, _shipId, _user, _resourceName, _amount);

        // Optionally, interact with a MockShipStorage instance if provided/needed
        // IShipStorage mockShipStorage = IShipStorage(_shipStorage);
        // mockShipStorage.removeResource(_shipId, _resourceName, _amount); // Requires MockShipStorage to be deployed and address passed
    }
} 