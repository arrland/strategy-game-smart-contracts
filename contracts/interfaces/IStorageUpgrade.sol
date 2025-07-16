// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IStorageUpgrade {
    struct StakingInfo {
        address owner;
        uint256 startTime;
        uint256 endTime;
        uint256 nftId;
        address nftCollection;
        bool claimed;
    }

    function stakingInfo(address collectionAddress, uint256 tokenId) external view returns (StakingInfo memory);
    function getAllStakedTokens(address owner, address collectionAddress) external view returns (uint256[] memory);
}