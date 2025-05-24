// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "contracts/storageContracts/BaseStorage.sol";
import "../interfaces/IIslandStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

contract IslandStorage is BaseStorage {
    using Strings for string;

    struct Island {
        IIslandStorage.IslandSize size;
        uint256 capacity;
    }

    mapping(uint256 => Island) public islands;
    mapping(IIslandStorage.IslandSize => uint256) public defaultCapacities;
    mapping(IIslandStorage.IslandSize => uint256) public plotNumbers;

    constructor(address _centralAuthorizationRegistry, address _nftCollectionAddress, bool _isNft721) 
        BaseStorage(_centralAuthorizationRegistry, _nftCollectionAddress, _isNft721, keccak256("IIslandStorage")) {

        plotNumbers[IIslandStorage.IslandSize.ExtraSmall] = 1;
        plotNumbers[IIslandStorage.IslandSize.Small] = 6;
        plotNumbers[IIslandStorage.IslandSize.Medium] = 14;
        plotNumbers[IIslandStorage.IslandSize.Large] = 30;
        plotNumbers[IIslandStorage.IslandSize.Huge] = 62;
        

        defaultCapacities[IIslandStorage.IslandSize.ExtraSmall] = 50*10**18;
        defaultCapacities[IIslandStorage.IslandSize.Small] = (8 * 50)*10**18;
        defaultCapacities[IIslandStorage.IslandSize.Medium] = (24 * 50)*10**18;
        defaultCapacities[IIslandStorage.IslandSize.Large] = (64 * 50)*10**18;
        defaultCapacities[IIslandStorage.IslandSize.Huge] = (120 * 50)*10**18;
        

        
    }

    function _batchSetIslandSize(uint256 startId, uint256 endId, IIslandStorage.IslandSize size) internal onlyAdmin {
        require(startId <= endId, "Start ID must be less than or equal to End ID");

        Island memory newIsland = Island(size, defaultCapacities[size]);

        for (uint256 tokenId = startId; tokenId <= endId; tokenId++) {
            islands[tokenId] = newIsland;
        }
    }

    function initializeIslands(uint8 part) external onlyAdmin {
        if (part == 1) {
            _batchSetIslandSize(337, 600, IIslandStorage.IslandSize.Small);
        } else if (part == 2) {
            _batchSetIslandSize(1423, 1723, IIslandStorage.IslandSize.Small);
        } else if (part == 3) {
            _batchSetIslandSize(2809, 3258, IIslandStorage.IslandSize.Small);
        } else if (part == 4) {
            _batchSetIslandSize(3595, 3895, IIslandStorage.IslandSize.Small);
        } else if (part == 5) {
            _batchSetIslandSize(81, 336, IIslandStorage.IslandSize.Medium);
        } else if (part == 6) {
            _batchSetIslandSize(1167, 1422, IIslandStorage.IslandSize.Medium);
        } else if (part == 7) {
            _batchSetIslandSize(2253, 2508, IIslandStorage.IslandSize.Medium);
        } else if (part == 8) {
            _batchSetIslandSize(3339, 3594, IIslandStorage.IslandSize.Medium);
        } else if (part == 9) {
            _batchSetIslandSize(17, 80, IIslandStorage.IslandSize.Large);
        } else if (part == 10) {
            _batchSetIslandSize(1103, 1166, IIslandStorage.IslandSize.Large);
        } else if (part == 11) {
            _batchSetIslandSize(2189, 2252, IIslandStorage.IslandSize.Large);
        } else if (part == 12) {
            _batchSetIslandSize(3275, 3338, IIslandStorage.IslandSize.Large);
        } else if (part == 13) {
            _batchSetIslandSize(1, 16, IIslandStorage.IslandSize.Huge);
        } else if (part == 14) {
            _batchSetIslandSize(1087, 1102, IIslandStorage.IslandSize.Huge);
        } else if (part == 15) {
            _batchSetIslandSize(2173, 2188, IIslandStorage.IslandSize.Huge);
        } else if (part == 16) {
            _batchSetIslandSize(3259, 3274, IIslandStorage.IslandSize.Huge);
        } else if (part == 17) {
            _batchSetIslandSize(600, 1086, IIslandStorage.IslandSize.Small);
        } else if (part == 18) {
            _batchSetIslandSize(1723, 2172, IIslandStorage.IslandSize.Small);
        } else if (part == 19) {
            _batchSetIslandSize(2509, 2809, IIslandStorage.IslandSize.Small);
        } else if (part == 20) {
            _batchSetIslandSize(3895, 4344, IIslandStorage.IslandSize.Small);
        }

    }

    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) override(BaseStorage) external onlyAuthorized {
        require(newCapacity > islands[tokenId].capacity, "New capacity must be larger than current capacity");        
        islands[tokenId].capacity = newCapacity;
    }

    function getIslandSize(uint256 tokenId) public view returns (IIslandStorage.IslandSize) {
        if (islands[tokenId].capacity == 0) {
            return IIslandStorage.IslandSize.ExtraSmall;
        }
        return islands[tokenId].size;
    }

    function getStorageCapacity(uint256 tokenId) public view override(BaseStorage) returns (uint256) {
        if (islands[tokenId].capacity == 0) {
            return defaultCapacities[IIslandStorage.IslandSize.ExtraSmall];
        }
        return islands[tokenId].capacity;
    }

    function getPlotNumber(uint256 tokenId) public view returns (uint256) {        
        if (islands[tokenId].capacity == 0) {
            return plotNumbers[IIslandStorage.IslandSize.ExtraSmall];
        }
        return plotNumbers[islands[tokenId].size];
    }

    // Function to allow admin to set a specific island's size (for testing/setup)
    function setIslandSize(uint256 tokenId, IIslandStorage.IslandSize size) external onlyAdmin {
        islands[tokenId] = Island(size, defaultCapacities[size]);
    }
}
