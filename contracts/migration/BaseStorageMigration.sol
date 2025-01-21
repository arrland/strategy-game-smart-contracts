// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/storage/IBaseStorage.sol";
import "../interfaces/storage/IIslandStorage.sol";
import "../storageContracts/BaseStorage.sol";
import "../AuthorizationModifiers.sol";
import "../interfaces/IStorageManagement.sol";

abstract contract BaseStorageMigration is AuthorizationModifiers {
    IBaseStorage public immutable oldStorage;
    IBaseStorage public immutable newStorage;

    bool public migrationCompleted = false;
    
    event MigrationCompleted(uint256 totalMigrated);
    event BatchMigrated(uint256 storageTokenId, uint256 batchStart, uint256 batchEnd);

    // Track progress
    mapping(uint256 => bool) public isStorageMigrated;
    mapping(uint256 => uint256) public storageAssignmentCount;
    mapping(uint256 => uint256) public storageMigratedCount;
    uint256[] public storageTokensInProgress;
    
    constructor(
        address _centralAuthorizationRegistry,
        address _oldStorage,
        address _newStorage,
        bytes32 _interfaceId
    ) AuthorizationModifiers(_centralAuthorizationRegistry, _interfaceId) {
        oldStorage = IBaseStorage(_oldStorage);
        newStorage = IBaseStorage(_newStorage);
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }

    function _getPlotNumber(uint256 storageTokenId) internal view returns (uint256) {
        address requiredStorageContract = newStorage.requiredStorageContract();
        IIslandStorage islandStorage = IIslandStorage(getStorageManagement().getStorageByCollection(requiredStorageContract));
        return islandStorage.getPlotNumber(storageTokenId);
    }

    function _getTotalAssignmentsForStorage(uint256 storageTokenId) internal view returns (uint256) {
        address[] memory storageContracts = getStorageManagement().getStorageContractsForAssignableStorage();
        
        uint256 totalAssignments = 0;
        for (uint256 i = 0; i < storageContracts.length; i++) {
            IBaseStorage storageContract = IBaseStorage(storageContracts[i]);
            uint256[] memory primaryTokens = storageContract.getPrimaryTokensForStorage(storageTokenId);
            totalAssignments += primaryTokens.length;
        }
        
        return totalAssignments;
    }

    function migrateBatch(uint256[] calldata storageTokenIds) external onlyAdmin() {
        uint256 TOTAL_BATCH_SIZE = 30; // Total assignments to process per transaction
        uint256 assignmentsProcessed = 0;

        for (uint256 i = 0; i < storageTokenIds.length && assignmentsProcessed < TOTAL_BATCH_SIZE; i++) {
            uint256 storageTokenId = storageTokenIds[i];
            
            // Get tokens once and use for both initialization and processing
            uint256[] memory primaryTokens = oldStorage.getPrimaryTokensForStorage(storageTokenId);
            
            // Get plot capacity and current assignments
            uint256 maxCapacity = _getPlotNumber(storageTokenId);
            uint256 currentAssignments = _getTotalAssignmentsForStorage(storageTokenId);
            uint256 remainingCapacity = maxCapacity > currentAssignments ? maxCapacity - currentAssignments : 0;
            
            // Initialize tracking for this storage
            if (storageAssignmentCount[storageTokenId] == 0) {
                storageTokensInProgress.push(storageTokenId);
                // Only assign up to the maximum capacity
                storageAssignmentCount[storageTokenId] = remainingCapacity < primaryTokens.length ? 
                    remainingCapacity : primaryTokens.length;
            }
            
            // Skip if no capacity remaining
            if (remainingCapacity == 0) {
                isStorageMigrated[storageTokenId] = true;
                continue;
            }
            
            // Continue from where we left off
            uint256 startIndex = storageMigratedCount[storageTokenId];
            uint256 remainingInBatch = TOTAL_BATCH_SIZE - assignmentsProcessed;
            uint256 endIndex = startIndex + remainingInBatch;
            if (endIndex > primaryTokens.length || endIndex > remainingCapacity) {
                endIndex = remainingCapacity < primaryTokens.length ? remainingCapacity : primaryTokens.length;
            }
            
            for (uint256 j = startIndex; j < endIndex; j++) {
                uint256 primaryTokenId = primaryTokens[j];
                
                if (oldStorage.isStorageAssignedToPrimary(
                    address(oldStorage.nftCollectionAddress()), 
                    primaryTokenId
                )) {
                    // Check if already assigned in new storage
                    bool isAlreadyAssigned = newStorage.isStorageAssignedToPrimary(
                        address(newStorage.nftCollectionAddress()),
                        primaryTokenId
                    );
                    
                    if (!isAlreadyAssigned) {
                        newStorage.assignStorageToPrimary(
                            address(newStorage.nftCollectionAddress()),
                            primaryTokenId,
                            storageTokenId
                        );
                    }
                    // Increment counters regardless of whether we needed to assign or not
                    storageMigratedCount[storageTokenId]++;
                    assignmentsProcessed++;
                }
            }
            
            // Mark as completed if all possible assignments are migrated
            if (storageMigratedCount[storageTokenId] == storageAssignmentCount[storageTokenId]) {
                isStorageMigrated[storageTokenId] = true;
                // Remove from in-progress array
                for (uint256 k = 0; k < storageTokensInProgress.length; k++) {
                    if (storageTokensInProgress[k] == storageTokenId) {
                        storageTokensInProgress[k] = storageTokensInProgress[storageTokensInProgress.length - 1];
                        storageTokensInProgress.pop();
                        break;
                    }
                }
            }
        }

        emit BatchMigrated(storageTokenIds[0], 0, assignmentsProcessed);
    }

    function verifyMigration(uint256 storageTokenId) external view returns (bool) {
        uint256[] memory oldPrimaryTokens = oldStorage.getPrimaryTokensForStorage(storageTokenId);
        uint256[] memory newPrimaryTokens = newStorage.getPrimaryTokensForStorage(storageTokenId);
        
        if (oldPrimaryTokens.length != newPrimaryTokens.length) {
            return false;
        }
        
        bool[] memory found = new bool[](oldPrimaryTokens.length);
        
        for (uint256 i = 0; i < oldPrimaryTokens.length; i++) {
            bool matchFound = false;
            for (uint256 j = 0; j < newPrimaryTokens.length; j++) {
                if (!found[j] && oldPrimaryTokens[i] == newPrimaryTokens[j]) {
                    found[j] = true;
                    matchFound = true;
                    break;
                }
            }
            if (!matchFound) {
                return false;
            }
        }
        
        return true;
    }

    function removeAssignment(uint256 primaryTokenId) external onlyAdmin {
        require(!migrationCompleted, "Migration has already been completed");
        newStorage.unassignStorageFromPrimary(
            address(newStorage.nftCollectionAddress()),
            primaryTokenId
        );
    }

    function addAssigment(address primaryCollection, uint256[] calldata primaryTokenIds, uint256 storageTokenId) external onlyAdmin{
        require(!migrationCompleted, "Migration has already been completed");
        for (uint256 i = 0; i < primaryTokenIds.length; i++) {
            uint256 primaryTokenId = primaryTokenIds[i];
            newStorage.assignStorageToPrimary(primaryCollection, primaryTokenId, storageTokenId);
        }
    }
        
    function updateStorageManagement() public onlyAdmin {
        require(!migrationCompleted, "Migration has already been completed");
        migrationCompleted = true;
    }

    function getStorageTokensInProgress() external view returns (uint256[] memory) {
        return storageTokensInProgress;
    }
    
    function getMigrationProgress(uint256 storageTokenId) external view returns (
        bool completed,
        uint256 totalAssignments,
        uint256 migratedAssignments,
        uint256 remainingAssignments
    ) {
        completed = isStorageMigrated[storageTokenId];
        totalAssignments = storageAssignmentCount[storageTokenId];
        migratedAssignments = storageMigratedCount[storageTokenId];
        remainingAssignments = totalAssignments - migratedAssignments;
    }
} 