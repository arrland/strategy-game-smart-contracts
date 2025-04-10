// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/ships/IShipMetadata.sol";

/**
 * @title ShipMetadata
 * @notice Manages ship attributes and metadata
 */
contract ShipMetadata is IShipMetadata, AuthorizationModifiers {
    // Mappings
    mapping(uint256 => ShipAttributes) private shipAttributes;
    
    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IShipMetadata")) {}

    /**
     * @notice Get ship metadata
     * @param shipId Ship identifier
     * @return attributes ShipAttributes struct containing ship attributes
     */
    function getShipMetadata(uint256 shipId) external view override returns (ShipAttributes memory attributes) {
        return shipAttributes[shipId];
    }

    /**
     * @notice Update ship metadata
     * @param shipId Ship identifier
     * @param attributes New ship attributes
     * @dev Validates ship attributes
     */
    function updateShipMetadata(
        uint256 shipId,
        ShipAttributes calldata attributes
    ) external override onlyAuthorized {
        require(bytes(attributes.class).length > 0, "Invalid ship class");
        require(attributes.durability > 0, "Invalid durability");
        require(attributes.speed > 0, "Invalid speed");
        require(attributes.agility > 0, "Invalid agility");
        require(attributes.viewingRange > 0, "Invalid viewing range");
        require(attributes.cannonsCapacity >= 0, "Invalid cannons capacity");
        require(attributes.armor >= 0, "Invalid armor");
        require(attributes.ramming >= 0, "Invalid ramming");
        require(attributes.crewMin > 0, "Invalid minimum crew");
        require(attributes.crewMax >= attributes.crewMin, "Invalid crew range");
        require(attributes.cargoBay > 0, "Invalid cargo bay capacity");
        require(bytes(attributes.shipType).length > 0, "Invalid ship type");
        
        shipAttributes[shipId] = attributes;
        
        emit ShipMetadataUpdated(shipId, attributes);
    }

    /**
     * @notice Batch update ship metadata
     * @param shipIds Array of ship identifiers
     * @param attributes Array of ship attributes
     * @dev Arrays must be of equal length
     */
    function batchSetShipMetadata(
        uint256[] calldata shipIds,
        ShipAttributes[] calldata attributes
    ) external onlyAuthorized {
        require(shipIds.length == attributes.length, "Array length mismatch");
        for (uint256 i = 0; i < shipIds.length; i++) {
            shipAttributes[shipIds[i]] = attributes[i];
            emit ShipMetadataUpdated(shipIds[i], attributes[i]);
        }
    }

    /**
     * @notice Batch get ship metadata
     * @param shipIds Array of ship identifiers
     * @return result Array of ship attributes
     */
    function batchGetShipMetadata(
        uint256[] calldata shipIds
    ) external view returns (ShipAttributes[] memory result) {
        result = new ShipAttributes[](shipIds.length);
        for (uint256 i = 0; i < shipIds.length; i++) {
            result[i] = shipAttributes[shipIds[i]];
        }
        return result;
    }

    /**
     * @notice Get minimum respect level required for a ship class
     * @param shipClass Ship class to check
     * @return level Minimum respect level required
     * @dev Returns:
     *      - 0 for Boats and Sailboats
     *      - 1 for Small Ships
     *      - 6 for Medium Ships
     *      - 9 for Large Ships
     */
    function getMinimumRespectLevel(string memory shipClass) public pure returns (uint256 level) {
        // Convert string to bytes32 for efficient comparison
        bytes32 classHash = keccak256(abi.encodePacked(shipClass));
        
        // Boats and Sailboats: No minimum respect required
        if (classHash == keccak256(abi.encodePacked("Boat")) || 
            classHash == keccak256(abi.encodePacked("Sailboat"))) {
            return 0;
        }
        
        // Small Ships: Minimum respect level 1
        if (classHash == keccak256(abi.encodePacked("Small"))) {
            return 1;
        }
        
        // Medium Ships: Minimum respect level 6
        if (classHash == keccak256(abi.encodePacked("Medium"))) {
            return 6;
        }
        
        // Large Ships: Minimum respect level 9
        if (classHash == keccak256(abi.encodePacked("Large"))) {
            return 9;
        }
        
        // Default case - if class doesn't match any known type
        revert("Invalid ship class");
    }
}