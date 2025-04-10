// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title IShipMetadata
 * @notice Interface for ship metadata management
 */
interface IShipMetadata {
    // Structs
    struct ShipAttributes {
        string class;
        uint256 durability;
        uint256 speed;
        uint256 agility;
        uint256 viewingRange;
        uint256 cannonsCapacity;
        uint256 armor;
        uint256 ramming;
        uint256 crewMin;
        uint256 crewMax;
        uint256 cargoBay;
        bool oars;
        bool shallowWaters;
        bool deepWaters;
        string shipType;
    }

    // Events
    event ShipMetadataUpdated(uint256 indexed shipId, ShipAttributes attributes);

    // Functions
    function getShipMetadata(uint256 shipId) external view returns (ShipAttributes memory);
    function updateShipMetadata(uint256 shipId, ShipAttributes calldata attributes) external;
} 