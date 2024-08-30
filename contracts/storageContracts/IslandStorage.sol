// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/storageContracts/BaseStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

contract IslandStorage is BaseStorage {
    using Strings for string;

    enum IslandSize { Small, Medium, Large, Huge, ExtraSmall }

    struct Island {
        IslandSize size;
        uint256 capacity;
    }

    mapping(uint256 => Island) public islands;
    mapping(IslandSize => uint256) public defaultCapacities;
    mapping(IslandSize => uint256) public plotNumbers;

    constructor(address _centralAuthorizationRegistry, address _nftCollectionAddress, bool _isNft721) 
        BaseStorage(_centralAuthorizationRegistry, _nftCollectionAddress, _isNft721, keccak256("IIslandStorage")) {

        plotNumbers[IslandSize.Small] = 8;
        plotNumbers[IslandSize.Medium] = 24;
        plotNumbers[IslandSize.Large] = 64;
        plotNumbers[IslandSize.Huge] = 120;
        plotNumbers[IslandSize.ExtraSmall] = 1;

        defaultCapacities[IslandSize.Small] = (8 * 50)*10**18;
        defaultCapacities[IslandSize.Medium] = (24 * 50)*10**18;
        defaultCapacities[IslandSize.Large] = (64 * 50)*10**18;
        defaultCapacities[IslandSize.Huge] = (120 * 50)*10**18;
        defaultCapacities[IslandSize.ExtraSmall] = 50*10**18;

        
    }

    function initializeIslands(uint8 part) external onlyAdmin {
        if (part == 1) {
            _batchSetIslandSize(337, 1086, IslandSize.Small);
        } else if (part == 2) {
            _batchSetIslandSize(1423, 2172, IslandSize.Small);
        } else if (part == 3) {
            _batchSetIslandSize(2509, 3258, IslandSize.Small);
        } else if (part == 4) {
            _batchSetIslandSize(3595, 4344, IslandSize.Small);
        } else if (part == 5) {
            _batchSetIslandSize(81, 336, IslandSize.Medium);
        } else if (part == 6) {
            _batchSetIslandSize(1167, 1422, IslandSize.Medium);
        } else if (part == 7) {
            _batchSetIslandSize(2253, 2508, IslandSize.Medium);
        } else if (part == 8) {
            _batchSetIslandSize(3339, 3594, IslandSize.Medium);
        } else if (part == 9) {
            _batchSetIslandSize(17, 80, IslandSize.Large);
        } else if (part == 10) {
            _batchSetIslandSize(1103, 1166, IslandSize.Large);
        } else if (part == 11) {
            _batchSetIslandSize(2189, 2252, IslandSize.Large);
        } else if (part == 12) {
            _batchSetIslandSize(3275, 3338, IslandSize.Large);
        } else if (part == 13) {
            _batchSetIslandSize(1, 16, IslandSize.Huge);
        } else if (part == 14) {
            _batchSetIslandSize(1087, 1102, IslandSize.Huge);
        } else if (part == 15) {
            _batchSetIslandSize(2173, 2188, IslandSize.Huge);
        } else if (part == 16) {
            _batchSetIslandSize(3259, 3274, IslandSize.Huge);
        }
    }

    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) override external onlyAuthorized {
        require(newCapacity > islands[tokenId].capacity, "New capacity must be larger than current capacity");        
        islands[tokenId].capacity = newCapacity;
    }

    function getIslandSize(uint256 tokenId) public view returns (IslandSize) {
        if (islands[tokenId].capacity == 0) {
            return IslandSize.ExtraSmall;
        }
        return islands[tokenId].size;
    }

    function getStorageCapacity(uint256 tokenId) public view override returns (uint256) {
        if (islands[tokenId].capacity == 0) {
            return defaultCapacities[IslandSize.ExtraSmall];
        }
        return islands[tokenId].capacity;
    }

    function getPlotNumber(uint256 tokenId) public view returns (uint256) {
        if (islands[tokenId].capacity == 0) {
            return 1;
        }
        return plotNumbers[islands[tokenId].size];
    }

    function _batchSetIslandSize(uint256 startId, uint256 endId, IslandSize size) internal {
        require(startId <= endId, "Start ID must be less than or equal to End ID");

        // Create the Island struct in memory
        Island memory newIsland = Island(size, defaultCapacities[size]);

        for (uint256 tokenId = startId; tokenId <= endId; tokenId++) {
            islands[tokenId] = newIsland; // Write the pre-constructed island to storage
        }
    }
}
