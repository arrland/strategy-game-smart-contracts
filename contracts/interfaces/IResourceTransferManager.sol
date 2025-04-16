// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IResourceTransferManager {
    // Structs
    struct ResourceTransfer {
        address sender;
        uint256 fromIslandId; 
        uint256 toIslandId;
        string resourceType;
        uint256 amount;
        uint256 shipId;
        uint256 arrivalTime;
        bool claimed;
    }

    // Events
    event ResourceTransferInitiated(
        uint256 indexed transferId,
        address indexed sender,
        uint256 fromIslandId,
        uint256 toIslandId,
        string resourceType,
        uint256 amount,
        uint256 shipId,
        uint256 arrivalTime
    );

    event ResourceTransferClaimed(
        uint256 indexed transferId,
        address indexed claimer
    );

    // Core Functions
    function initiateTransfer(
        address sender,
        uint256 shipId,
        uint256 fromIslandId,
        uint256 toIslandId,
        string memory resourceType,
        uint256 amount
    ) external;

    function completeTransfer(address sender, uint256 shipId) external;
    // View Functions
    function resourceTransfers(uint256 transferId) external view returns (ResourceTransfer memory);
    
    function userResourceTransfers(address user, uint256 index) external view returns (uint256);
}
