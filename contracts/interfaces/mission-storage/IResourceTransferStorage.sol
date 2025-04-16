// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IMissionTypeStorage.sol";

interface IResourceTransferStorage is IMissionTypeStorage {
    function getResourcesClaimed(uint256 shipId) external view returns (bool);
    
    function getOriginIslandId(uint256 shipId) external view returns (uint256);
    
    function getTargetIslandId(uint256 shipId) external view returns (uint256);
    
    function getResourceInfo(uint256 shipId) external view returns (
        string memory resourceType,
        uint256 amount
    );
    
    function isReturnFromTradeMission(uint256 shipId) external view returns (bool);
} 