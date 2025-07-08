// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {IMissionValidator} from "../interfaces/IMissionValidator.sol";

// Define Resource struct locally if not available from IMissionValidator
struct Resource {
    string name;
    uint256 amount;
}

/**
 * @title MockMissionValidator
 * @notice Mock contract for testing purposes, implementing IMissionValidator.
 */
contract MockMissionValidator is IMissionValidator {
    bool private _validateAllResult = true; // Default to true
    bool private _validateCalled = false;
    ValidateAllRequirementsParams private _lastCallParams;

    struct ValidateAllRequirementsParams {
        uint256 missionId;
        uint256 shipId;
        address[] pirates;
        Resource[] resources;
        address user;
    }

    // --- Mutative functions to control mock behavior ---

    function setValidateAllResult(bool result) external {
        _validateAllResult = result;
    }

    function reset() external {
        _validateCalled = false;
        // Optionally clear _lastCallParams if needed
    }

    // --- Implementation of IMissionValidator ---

    function validateAllRequirements(
        uint256 missionId,
        uint256 shipId,
        address[] calldata pirates,
        Resource[] calldata resources,
        address user
    ) external returns (bool) {
        _validateCalled = true;
        _lastCallParams = ValidateAllRequirementsParams({
            missionId: missionId,
            shipId: shipId,
            pirates: pirates,
            resources: resources,
            user: user
        });
        return _validateAllResult;
    }
    
    // --- View functions to check mock state ---

    function validateCalled() external view returns (bool) {
        return _validateCalled;
    }

    function getLastValidateParams() external view returns (ValidateAllRequirementsParams memory) {
        return _lastCallParams;
    }

    // --- Dummy implementations for IMissionValidator interface compliance ---
    function validateShipRequirements(uint256 /*shipId*/) external view override {
        // No-op for mock
    }

    function validateIslandRequirements(
        uint256 /*fromIslandId*/, 
        uint256 /*toIslandId*/, 
        uint256 /*missionType*/
    ) external view override {
        // No-op for mock
    }

    function validateShipCapacity(
        uint256 /*shipId*/, 
        uint256 /*amount*/,
        uint256 /*travelDays*/,
        string calldata /*foodChoice*/,
        string calldata /*foodRationChoice*/
    ) external view override returns (bool) {
        return true; // Default to true
    }

    function isShipLocked(uint256 /*shipId*/) external view override returns (bool) {
        return false; // Default to false
    }

    function isIslandOwner(uint256 /*islandId*/, address /*user*/) external view override returns (bool) {
        return true; // Default to true
    }

    function getShipHomeIsland(uint256 /*shipId*/) external view override returns (uint256) {
        return 0; // Default to 0
    }

    function getShipLevel(uint256 /*shipId*/) external view override returns (uint256) {
        return 1; // Default to 1
    }

    function validateAndBurnMissionStartResources(
        uint256 /*shipId*/,
        uint256 /*travelDays*/,
        uint256 /*intendedCargo*/,
        string calldata /*foodChoice*/,
        string calldata /*foodRationChoice*/,
        address /*user*/
    ) external override {
        // No-op for mock
    }

    function getTotalCrewCount(uint256 /*shipId*/) external view override returns (uint256) {
        return 1; // Default to 1 (e.g., captain)
    }
} 