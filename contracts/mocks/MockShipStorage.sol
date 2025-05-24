// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/storage/IShipStorage.sol";
import "../AuthorizationModifiers.sol";

/**
 * @title MockShipStorage
 * @notice Mock contract for testing ship storage functionality
 */
// Inherit IShipStorage (includes IBaseStorage) and Modifiers
contract MockShipStorage is IShipStorage, AuthorizationModifiers {
    // State variables for MOCKING functions needed by MissionValidator
    mapping(uint256 => bool) private _mock_isLocked;
    mapping(uint256 => uint256) private _mock_storageCapacity;
    mapping(uint256 => uint256) private _mock_currentCargo;   
    
    // Constructor for AuthorizationModifiers
    constructor(address _car)
        AuthorizationModifiers(_car, keccak256("IShipStorage"))
    {}

    // --- Mock Control Functions ---
    function setResourceLocked(uint256 shipId, bool locked) external {
        _mock_isLocked[shipId] = locked;
    }
    function setStorageCapacity(uint256 shipId, uint256 capacity) external {
        _mock_storageCapacity[shipId] = capacity;
    }
    function setCurrentCargo(uint256 shipId, uint256 cargo) external {
        _mock_currentCargo[shipId] = cargo;
    }

    // --- Implement IShipStorage / IBaseStorage --- 

    // Functions explicitly mocked for MissionValidator
    function isResourceLocked(uint256 shipId) external view override returns (bool) {
        return _mock_isLocked[shipId];
    }
    
    function hasAvailableCapacity(uint256 shipId, uint256 amount) external view override returns (bool) {
        uint256 capacity = _mock_storageCapacity[shipId];
        uint256 currentCargo = _mock_currentCargo[shipId];
        if (capacity == 0) return false;
        if (currentCargo > capacity) return false; 
        return (capacity - currentCargo) >= amount;
    }
    
     function getStorageCapacity(uint256 shipId) external view override returns (uint256) {
        return _mock_storageCapacity[shipId];
    }
    
    function getOwner(uint256 /*shipId*/) external view override returns (address) {
        return address(0); // Dummy
    }

    // --- Dummy Implementations for Remaining IBaseStorage Functions ---
    function nftCollection721() external view override returns (IERC721) { return IERC721(address(0)); }
    function nftCollection1155() external view override returns (IERC1155) { return IERC1155(address(0)); }
    function nftCollectionAddress() external view override returns (address) { return address(0); }
    function isNft721() external view override returns (bool) { return true; } // Assume true for ShipStorage mock context
    function requiredStorage() external view override returns (bool) { return false; }
    function requiredStorageContract() external view override returns (address) { return address(0); }
    function storageCapacities(uint256 /*tokenId*/) external view override returns (uint256) { return 0; }
    function primaryToStorage(address /*primaryCollection*/, uint256 /*primaryTokenId*/) external view override returns (uint256) { return 0; }
    function setRequiredStorage(bool /*_requiredStorage*/, address /*_requiredStorageContract*/) external override onlyAdmin {}
    function getRequiredStorageContract() external view override returns (address) { return address(0); }
    function requiresOtherNFTForStorage() external view override returns (bool) { return false; }
    function assignStorageToPrimary(address /*primaryCollection*/, uint256 /*primaryTokenId*/, uint256 /*storageTokenId*/) external override onlyAuthorized {}
    function unassignStorageFromPrimary(address /*primaryCollection*/, uint256 /*primaryTokenId*/) external override onlyAuthorized {}
    function isRequiredStorageAssigned(address /*primaryCollection*/, uint256 /*primaryTokenId*/) external view override returns (bool) { return false; }
    function getAssignedStorage(address /*primaryCollection*/, uint256 /*primaryTokenId*/) external view override returns (uint256) { return 0; }
    function getTotalResourcesInStorage(uint256 tokenId) external view override returns (uint256) { return _mock_currentCargo[tokenId]; } // Use mock
    function getResourceBalance(uint256 /*tokenId*/, string memory /*resource*/) external view override returns (uint256) { return 0; }
    function addResource(uint256 /*tokenId*/, address /*user*/, string memory /*resource*/, uint256 /*amount*/) external override onlyAuthorized {}
    function dumpResource(uint256 /*tokenId*/, address /*owner*/, string memory /*resource*/, uint256 /*amount*/) external override onlyAuthorized {}
    function transferResource(uint256, address, uint256, address, address, string memory, uint256) external override onlyAuthorized {}
    function getAllResourceBalances(uint256 /*tokenId*/) external view override returns (string[] memory, uint256[] memory) { string[] memory s = new string[](0); uint256[] memory u = new uint256[](0); return (s,u); }
    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external override onlyAuthorized { _mock_storageCapacity[tokenId] = newCapacity; } // Use mock
    function isERC1155(address /*collectionAddress*/) external view override returns (bool) { return false; }
    function isERC721(address /*collectionAddress*/) external view override returns (bool) { return true; }
    function checkUserOwnsRequiredStorageNFT(address /*user*/, uint256 /*requiredStorageTokenId*/) external view override returns (bool) { return true; }
    function getPrimaryTokensForStorage(uint256 /*storageTokenId*/) external view override returns (uint256[] memory) { uint256[] memory u = new uint256[](0); return u; }
    function isStorageAssignedToPrimary(address /*primaryCollection*/, uint256 /*primaryTokenId*/) external view override returns (bool) { return false; }
    function lockResources(uint256 /*tokenId*/, uint256 /*duration*/, uint256 /*missionId*/) external override onlyAuthorized {}
    function unlockResources(uint256 /*tokenId*/) external override onlyAuthorized {}
    function getLockInfo(uint256 /*tokenId*/) external view override returns (uint256, uint256, bool, address, uint256) { return (0,0,false,address(0),0); }
    function captureLockedResources(uint256, uint256, string memory, uint256) external override onlyAuthorized {}
    function transferResourceBetweenStorages(address, uint256, address, uint256, string memory, uint256) external override onlyAuthorized {}
    function getAvailableCapacity(uint256 tokenId) external view override returns (uint256 availableCapacity) {
        uint256 capacity = _mock_storageCapacity[tokenId];
        uint256 currentCargo = _mock_currentCargo[tokenId];
        if (currentCargo >= capacity) return 0;
        return capacity - currentCargo;
    }

    // Function defined in ShipStorage, not in interfaces
    function initializeStorage(uint256 /*shipId*/) external onlyAuthorized {
        // No-op for mock
    }

} 