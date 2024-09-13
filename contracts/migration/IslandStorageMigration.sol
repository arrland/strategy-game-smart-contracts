// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../storageContracts/BaseStorage.sol";
import "../StorageManagement.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "contracts/interfaces/storage/IIslandStorage.sol";
import "contracts/interfaces/IIslandNft.sol";
import "contracts/IslandManagement.sol";


contract IslandStorageMigration is Ownable {
    using Strings for string;

    BaseStorage public oldIslandStorage;
    BaseStorage public newIslandStorage;
    address public CollectionAddress;
    StorageManagement public storageManagement;
    IslandManagement public islandManagement;
    bool public migrationCompleted = false; // Flag to track if migration has been completed
    address[] public migratedOwners;

    event MigrationCompleted(address indexed owner, uint256 indexed tokenId);

    constructor(
        address _oldIslandStorage,
        address _newIslandStorage,
        address _storageManagement,
        address _collectionAddress,
        address initialOwner,
        address _islandManagement
    ) Ownable(initialOwner) {
        oldIslandStorage = BaseStorage(_oldIslandStorage);
        newIslandStorage = BaseStorage(_newIslandStorage);
        storageManagement = StorageManagement(_storageManagement);
        CollectionAddress = _collectionAddress;
        islandManagement = IslandManagement(_islandManagement);
    }

    function getMigratedOwners() public view returns (address[] memory) {
        return migratedOwners;
    }

    function migrateTokenResources(uint256 tokenId, address owner) internal {
        (string[] memory resourceTypes, uint256[] memory resourceBalances) = oldIslandStorage.getAllResourceBalances(tokenId);

        for (uint256 i = 0; i < resourceTypes.length; i++) {
            if (resourceBalances[i] > 0) {
                newIslandStorage.addResource(tokenId, owner, resourceTypes[i], resourceBalances[i]);
                oldIslandStorage.dumpResource(tokenId, owner, resourceTypes[i], resourceBalances[i]);
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

     function getTokenIdsByOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = IIslandNft(CollectionAddress).balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = IIslandNft(CollectionAddress).tokenOfOwnerByIndex(owner, i);
        }
        return tokenIds;
    }

    function migrateOwnerTokens(address owner) public onlyOwner {
        require(!migrationCompleted, "Migration has already been completed");
        uint256[] memory tokenIds = getTokenIdsByOwner(owner);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            migrateTokenResources(tokenIds[i], owner);
        }
    }

    function updateStorageManagement() public onlyOwner {
        require(!migrationCompleted, "Migration has already been completed");
        migrationCompleted = true;
    }

    function migrateAllOwners(address[] memory owners) public onlyOwner {
        require(!migrationCompleted, "Migration has already been completed");
        for (uint256 i = 0; i < owners.length; i++) {
            migrateOwnerTokens(owners[i]);
        }
    }

    function migrateCapitalIslands(address[] memory users, uint256[] memory ids) public onlyOwner {
        require(!migrationCompleted, "Migration has already been completed");
        islandManagement.setManyCapitalIslands(users, ids);
    }


}