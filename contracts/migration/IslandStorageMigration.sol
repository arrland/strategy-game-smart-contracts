// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../storageContracts/BaseStorage.sol";
import "../StorageManagement.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "contracts/interfaces/storage/IIslandStorage.sol";
import "contracts/interfaces/IIslandNft.sol";

contract IslandStorageMigration is Ownable {
    using Strings for string;

    BaseStorage public oldIslandStorage;
    BaseStorage public newIslandStorage;
    address public CollectionAddress;
    StorageManagement public storageManagement;

    event MigrationCompleted(address indexed owner, uint256 indexed tokenId);

    constructor(
        address _oldIslandStorage,
        address _newIslandStorage,
        address _storageManagement,
        address _collectionAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        oldIslandStorage = BaseStorage(_oldIslandStorage);
        newIslandStorage = BaseStorage(_newIslandStorage);
        storageManagement = StorageManagement(_storageManagement);
        CollectionAddress = _collectionAddress;
    }

    function migrateTokenResources(uint256 tokenId, address owner) internal {
        (string[] memory resourceTypes, uint256[] memory resourceBalances) = oldIslandStorage.getAllResourceBalances(tokenId);

        for (uint256 i = 0; i < resourceTypes.length; i++) {
            if (resourceBalances[i] > 0) {
                newIslandStorage.addResource(tokenId, owner, resourceTypes[i], resourceBalances[i]);
                oldIslandStorage.dumpResource(tokenId, owner, resourceTypes[i], resourceBalances[i]);
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
        uint256[] memory tokenIds = getTokenIdsByOwner(owner);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            migrateTokenResources(tokenIds[i], owner);
        }
    }

    function migrateAllOwners(address[] memory owners) public onlyOwner {
        storageManagement.removeStorageContract(CollectionAddress);
        storageManagement.addStorageContract(CollectionAddress, address(newIslandStorage));

        for (uint256 i = 0; i < owners.length; i++) {
            migrateOwnerTokens(owners[i]);
        }
    }


}