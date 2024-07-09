// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/storageContracts/BaseStorage.sol";
import "contracts/CentralAuthorizationRegistry.sol";

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
}