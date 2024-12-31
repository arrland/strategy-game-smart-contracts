// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IUpgradeConstructionTime {
    function calculateConstructionTime(address pirateCollection, uint256 pirateId, uint256 difficulty) external view returns (uint256);
}
