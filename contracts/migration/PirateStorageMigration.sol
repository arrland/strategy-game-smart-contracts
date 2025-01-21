// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./BaseStorageMigration.sol";
import "../interfaces/storage/IPirateStorage.sol";
import "../interfaces/IResourceManagement.sol";

contract PirateStorageMigration is BaseStorageMigration {
    constructor(
        address _centralAuthorizationRegistry,
        address _oldPirateStorage,
        address _newPirateStorage
    ) BaseStorageMigration(
        _centralAuthorizationRegistry,
        _oldPirateStorage,
        _newPirateStorage,
        keccak256("IPirateStorageMigration")
    ) {}

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }

    function migrateOwnerTokens(address owner, uint256[] memory tokenIds) public onlyAdmin {
        require(!migrationCompleted, "Migration has already been completed");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            migrateTokenResources(tokenIds[i], owner);
        }
    }

    function migrateTokenResources(uint256 tokenId, address owner) internal {
        IResourceManagement resourceManagement = getResourceManagement();
        (string[] memory resourceTypes, uint256[] memory resourceBalances) = resourceManagement.getAllResourceBalances(address(oldStorage), tokenId);

        for (uint256 i = 0; i < resourceTypes.length; i++) {
            if (resourceBalances[i] > 0) {
                resourceManagement.burnResource(address(oldStorage), tokenId, msg.sender, resourceTypes[i], resourceBalances[i]);
                resourceManagement.addResource(address(newStorage), tokenId, owner, resourceTypes[i], resourceBalances[i]);
            }    
        }
    }
}