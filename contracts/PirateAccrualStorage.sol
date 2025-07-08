// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";

contract PirateAccrualStorage is AuthorizationModifiers {
    // Mapping for each collection's token accrual values
    mapping(uint256 => mapping(uint256 => uint256)) private tokenAccruals; // collectionId => tokenId => accrualValue
    
    // Events
    event AccrualValueSet(uint256 indexed collectionId, uint256 indexed tokenId, uint256 value);
    event BatchAccrualValuesSet(uint256 indexed collectionId, uint256[] tokenIds, uint256[] values);

    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IPirateAccrualStorage")) {}

    /**
     * @dev Sets the accrual value for a single token
     * @param collectionId 1 for Genesis, 2 for Inhabitants
     * @param tokenId The NFT token ID
     * @param value The accrual value to set
     */
    function setAccrualValue(
        uint256 collectionId,
        uint256 tokenId,
        uint256 value
    ) external onlyAdmin {
        require(collectionId == 1 || collectionId == 2, "Invalid collection ID");
        tokenAccruals[collectionId][tokenId] = value;
        emit AccrualValueSet(collectionId, tokenId, value);
    }

    /**
     * @dev Batch sets accrual values for multiple tokens
     * @param collectionId 1 for Genesis, 2 for Inhabitants
     * @param tokenIds Array of token IDs
     * @param values Array of corresponding accrual values
     */
    function batchSetAccrualValues(
        uint256 collectionId,
        uint256[] calldata tokenIds,
        uint256[] calldata values
    ) external onlyAdmin {
        require(collectionId == 1 || collectionId == 2, "Invalid collection ID");
        require(tokenIds.length == values.length, "Array lengths must match");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenAccruals[collectionId][tokenIds[i]] = values[i];
        }
        
        emit BatchAccrualValuesSet(collectionId, tokenIds, values);
    }

    /**
     * @dev Gets the accrual value for a specific token
     * @param collectionId 1 for Genesis, 2 for Inhabitants
     * @param tokenId The NFT token ID
     * @return The accrual value for the token
     */
    function getAccrualValue(
        uint256 collectionId,
        uint256 tokenId
    ) external view returns (uint256) {
        require(collectionId == 1 || collectionId == 2, "Invalid collection ID");
        return tokenAccruals[collectionId][tokenId];
    }
}