// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IIslandManagement {
    function getIslandStorageCapacity(address owner, uint256 islandId) external view returns (uint256);
    function verifyIslandStorage(address owner, uint256 islandId, uint256 amount) external view returns (bool);
    function setCapitalIsland(uint256 islandId) external;
    function getCapitalIsland(address owner) external view returns (uint256);
    function transferResourceToCapital(address user, address pirateCollectionContract, uint256 pirateTokenId, string memory resource, uint256 amount) external;
}
