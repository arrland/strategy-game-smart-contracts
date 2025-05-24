// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/mission-storage/IMissionTypeStorage.sol";
import "../AuthorizationModifiers.sol";

// Mock contract for IMissionTypeStorage
contract MockMissionTypeStorage is IMissionTypeStorage, AuthorizationModifiers {
    uint256 private _supportedMissionType;

    constructor(address _car) AuthorizationModifiers(_car, keccak256("IMissionTypeStorage")) {} // Use a relevant key if needed

    // --- Mock Control Functions ---
    function setSupportedMissionType(uint256 missionType) external {
        _supportedMissionType = missionType;
    }

    // --- IMissionTypeStorage Interface Implementation ---
    function supportsMissionType(uint256 missionType) external view override returns (bool) {
        return missionType == _supportedMissionType;
    }

    // Dummy implementations for other required functions
    function initializeMission(uint256 /*missionId*/, bytes calldata /*data*/) external override onlyAuthorized {
        // No-op for mock
    }

    function completeMission(uint256 /*missionId*/) external override onlyAuthorized {
        // No-op for mock
    }

    // Dummy implementation for getMissionData
    function getMissionData(uint256 /*missionId*/) external view override returns (bytes memory) {
        return bytes(""); // Return empty bytes
    }
} 