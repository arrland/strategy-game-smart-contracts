// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IBaseStorage.sol";

interface IIslandStorage is IBaseStorage {
    function getIslandOwner(uint256 islandId) external view returns (address);
    function getIslandCoordinates(uint256 islandId) external view returns (uint256 x, uint256 y);
    function getIslandType(uint256 islandId) external view returns (string memory);
} 