// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

interface IBaseStorage {
    // Events for storage management
    event StorageCapacityUpdated(uint256 indexed tokenId, uint256 newCapacity);
    
    // Events for resource locking
    event ResourcesLocked(uint256 indexed tokenId, uint256 startTime, uint256 endTime, uint256 missionId);
    event ResourcesUnlocked(uint256 indexed tokenId);
    event ResourcesCaptured(uint256 indexed targetId, address attacker, string resource, uint256 amount);
    event ResourceTransferred(address indexed fromStorage, uint256 fromId, address indexed toStorage, uint256 toId, string resourceType, uint256 amount);
    
    // View functions for collection details
    function nftCollection721() external view returns (IERC721);
    function nftCollection1155() external view returns (IERC1155);
    function nftCollectionAddress() external view returns (address);
    function isNft721() external view returns (bool);
    function requiredStorage() external view returns (bool);
    function requiredStorageContract() external view returns (address);
    function storageCapacities(uint256 tokenId) external view returns (uint256);
    function primaryToStorage(address primaryCollection, uint256 primaryTokenId) external view returns (uint256);

    // Storage configuration
    function setRequiredStorage(bool _requiredStorage, address _requiredStorageContract) external;
    function getRequiredStorageContract() external view returns (address);
    function requiresOtherNFTForStorage() external view returns (bool);
    
    // Storage assignment
    function assignStorageToPrimary(address primaryCollection, uint256 primaryTokenId, uint256 storageTokenId) external;
    function unassignStorageFromPrimary(address primaryCollection, uint256 primaryTokenId) external;
    function isRequiredStorageAssigned(address primaryCollection, uint256 primaryTokenId) external view returns (bool);
    function getAssignedStorage(address primaryCollection, uint256 primaryTokenId) external view returns (uint256);
    
    // Resource management
    function getTotalResourcesInStorage(uint256 tokenId) external view returns (uint256);
    function getResourceBalance(uint256 tokenId, string memory resource) external view returns (uint256);
    function addResource(uint256 tokenId, address user, string memory resource, uint256 amount) external;
    function dumpResource(uint256 tokenId, address owner, string memory resource, uint256 amount) external;
    function transferResource(
        uint256 fromTokenId,
        address fromOwner,
        uint256 toTokenId,
        address toOwner,
        address toStorageContract,
        string memory resource,
        uint256 amount
    ) external;
    function getAllResourceBalances(uint256 tokenId) external view returns (string[] memory, uint256[] memory);
    
    // Storage capacity
    function getStorageCapacity(uint256 tokenId) external view returns (uint256);
    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external;
    
    // Collection utilities
    function isERC1155(address collectionAddress) external view returns (bool);
    function isERC721(address collectionAddress) external view returns (bool);
    function checkUserOwnsRequiredStorageNFT(address user, uint256 requiredStorageTokenId) external view returns (bool);
    function getPrimaryTokensForStorage(uint256 storageTokenId) external view returns (uint256[] memory);
    function isStorageAssignedToPrimary(address primaryCollection, uint256 primaryTokenId) external view returns (bool);
    
    // Resource locking functions
    /**
     * @notice Lock resources for a mission or other activity
     * @param tokenId The token ID to lock resources for
     * @param duration Duration of the lock in seconds
     * @param missionId Optional mission ID to associate with this lock
     */
    function lockResources(uint256 tokenId, uint256 duration, uint256 missionId) external;
    
    /**
     * @notice Unlock resources after a mission or activity
     * @param tokenId The token ID to unlock resources for
     */
    function unlockResources(uint256 tokenId) external;
    
    /**
     * @notice Check if resources are locked
     * @param tokenId The token ID to check
     * @return Whether the resources are locked
     */
    function isResourceLocked(uint256 tokenId) external view returns (bool);
    
    function getLockInfo(uint256 tokenId) external view returns (
        uint256 startTime,
        uint256 endTime,
        bool locked,
        address attacker,
        uint256 missionId
    );
    
    /**
     * @notice Capture resources from a locked token (for battle/pirate mechanics)
     * @param targetId The target token ID to capture resources from
     * @param attackerId The attacker's token ID
     * @param resourceType The type of resource to capture
     * @param amount The amount of resource to capture
     */
    function captureLockedResources(
        uint256 targetId,
        uint256 attackerId,
        string memory resourceType,
        uint256 amount
    ) external;
    
    /**
     * @notice Transfer resources between storage contracts
     * @param fromStorage Source storage contract address
     * @param fromId Source token ID
     * @param toStorage Destination storage contract address
     * @param toId Destination token ID
     * @param resourceType Type of resource to transfer
     * @param amount Amount of resource to transfer
     */
    function transferResourceBetweenStorages(
        address fromStorage,
        uint256 fromId,
        address toStorage, 
        uint256 toId,
        string memory resourceType,
        uint256 amount
    ) external;
    
    /**
     * @notice Check if a token has available capacity for additional resources
     * @param tokenId Token ID to check
     * @param additionalAmount Additional amount to check for
     * @return True if the token has enough capacity
     */
    function hasAvailableCapacity(uint256 tokenId, uint256 additionalAmount) external view returns (bool);
    
    /**
     * @notice Get available storage capacity for a token
     * @param tokenId Token ID to check
     * @return availableCapacity Amount of unused capacity
     */
    function getAvailableCapacity(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get the owner of a token in this storage contract
     * @param tokenId Token ID to check
     * @return Owner address
     */
    function getOwner(uint256 tokenId) external view returns (address);
}