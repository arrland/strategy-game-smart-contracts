// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IIslandStorage {
    function setDefaultStorageCapacity(uint256 tokenId, uint256 capacity) external;
    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external;
    function getStorageCapacity(uint256 tokenId) external view returns (uint256);
}
