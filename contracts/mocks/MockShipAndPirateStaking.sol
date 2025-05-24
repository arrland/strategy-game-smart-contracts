// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/ships/IShipAndPirateStaking.sol";
import "../AuthorizationModifiers.sol";

// Basic ABSTRACT mock implementing essential IShipAndPirateStaking functions for MissionValidator tests
abstract contract MockShipAndPirateStaking is IShipAndPirateStaking, AuthorizationModifiers {
    mapping(uint256 => bool) private _isStaked;

    constructor(address _car) AuthorizationModifiers(_car, keccak256("IShipAndPirateStaking")) {}

    // --- Mock Control Functions ---
    function setShipStaked(uint256 shipId, bool staked) external {
        _isStaked[shipId] = staked;
    }

    // --- IShipAndPirateStaking Interface Implementation (Minimal Abstract Set) ---
    function isShipStaked(uint256 shipId) external view override returns (bool) {
        return _isStaked[shipId];
    }
}