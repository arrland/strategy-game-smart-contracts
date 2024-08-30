// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/storageContracts/BaseStorage.sol";
import "contracts/CentralAuthorizationRegistry.sol";
import "contracts/interfaces/IResourceFarming.sol";
import "hardhat/console.sol";

contract PirateStorage is BaseStorage {
    uint256 public constant DEFAULT_STORAGE_CAPACITY = 50 * 10 ** 18;

    constructor(address _centralAuthorizationRegistry, address _nftCollectionAddress, bool _isNft721)
        BaseStorage(_centralAuthorizationRegistry, _nftCollectionAddress, _isNft721, keccak256("IPirateStorage"))
    {}

    function getStorageCapacity(uint256 tokenId) public view override returns (uint256) {
        uint256 capacity = storageCapacities[tokenId];
        if (capacity == 0) {
            return DEFAULT_STORAGE_CAPACITY;
        }
        return capacity;
    }

    function dumpResource(uint256 tokenId, address owner, string memory resource, uint256 amount) external override onlyAuthorized {
        IResourceFarming resourceFarming = getResourceFarming();
        if (isNft721) {            
            require(nftCollection721.ownerOf(tokenId) == owner || resourceFarming.isPirateStakedByOwner(nftCollectionAddress, tokenId, owner), "Caller does not own the 721 token or it is not staked in ResourceFarming");
        } else {               
            require(nftCollection1155.balanceOf(owner, tokenId) > 0 || resourceFarming.isPirateStakedByOwner(nftCollectionAddress, tokenId, owner), "Caller does not own the 1155 token or it is not staked in ResourceFarming");
        }
        IResourceManagement resourceManagement = getResourceManagement();
        resourceManagement.burnResource(address(this), tokenId, owner, resource, amount);
    }
}