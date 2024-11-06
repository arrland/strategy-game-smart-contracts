// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../StorageManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IResourceManagement.sol";
import "../AuthorizationModifiers.sol";


contract PirateStorageMigration is AuthorizationModifiers {
    using Strings for string;

    address public oldPirateStorage;
    address public newPirateStorage;    
    bool public migrationCompleted = false; // Flag to track if migration has been completed
    address[] public migratedOwners;

    event MigrationCompleted(address indexed owner, uint256 indexed tokenId);

    constructor(
        address _centralAuthorizationRegistry,
        address _oldPirateStorage,
        address _newPirateStorage   
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IIslandStorageMigration")) {
        oldPirateStorage = _oldPirateStorage;
        newPirateStorage = _newPirateStorage;            
    }

    function getMigratedOwners() public view returns (address[] memory) {
        return migratedOwners;
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }

    function migrateTokenResources(uint256 tokenId, address owner) internal {
        IResourceManagement resourceManagement = getResourceManagement();
        (string[] memory resourceTypes, uint256[] memory resourceBalances) = resourceManagement.getAllResourceBalances(address(oldPirateStorage), tokenId);

        for (uint256 i = 0; i < resourceTypes.length; i++) {
            if (resourceBalances[i] > 0) {
                resourceManagement.addResource(address(newPirateStorage), tokenId, owner, resourceTypes[i], resourceBalances[i]);
                // use sender as owner to dump resources                
                resourceManagement.burnResource(address(oldPirateStorage), tokenId, msg.sender, resourceTypes[i], resourceBalances[i]);
                bool ownerExists = false;
                for (uint256 j = 0; j < migratedOwners.length; j++) {
                    if (migratedOwners[j] == owner) {
                        ownerExists = true;
                        break;
                    }
                }
                
                if (!ownerExists) {
                    migratedOwners.push(owner);
                }
            }
        }

        emit MigrationCompleted(owner, tokenId);
    }

     

    function migrateOwnerTokens(address owner, uint256[] memory tokenIds) public onlyAdmin {
        require(!migrationCompleted, "Migration has already been completed");
  
        for (uint256 i = 0; i < tokenIds.length; i++) {
            migrateTokenResources(tokenIds[i], owner);
        }
    }

    function updateStorageManagement() public onlyAdmin {
        require(!migrationCompleted, "Migration has already been completed");
        migrationCompleted = true;
    }

    struct OwnerTokens {
        address owner;
        uint256[] tokenIds;
    }

    function migrateAllOwners(OwnerTokens[] memory ownerTokensList) public onlyAdmin {
        require(!migrationCompleted, "Migration has already been completed");
        for (uint256 i = 0; i < ownerTokensList.length; i++) {
            migrateOwnerTokens(ownerTokensList[i].owner, ownerTokensList[i].tokenIds);
        }
    }


}