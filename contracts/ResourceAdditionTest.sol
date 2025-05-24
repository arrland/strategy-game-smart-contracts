// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "./interfaces/IStorageManagement.sol";
import "./interfaces/IResourceManagement.sol";

contract ResourceAdditionTest is AuthorizationModifiers {
    constructor(address _centralAuthorizationRegistry) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IResourceAddition")) {
    }

    function addResource(
        address collectionAddress,
        uint256 tokenId,
        string memory resource,
        uint256 value
    ) external {
        // Fetch the storage contract using the collection address
        IStorageManagement storageManagement = getStorageManagement();
        IResourceManagement resourceManagement = getResourceManagement();
        address storageContract = storageManagement.getStorageByCollection(collectionAddress);

        address storageCollectionAddress;
        uint256 storageTokenId;
        address storageContractOrExternal;

        if (storageManagement.requiresOtherNFTForStorage(collectionAddress)) {            
            (storageCollectionAddress, storageTokenId) = storageManagement.getAssignedStorage(collectionAddress, tokenId);
            storageContractOrExternal = getStorageManagement().getStorageByCollection(storageCollectionAddress);
        } else {
            storageCollectionAddress = collectionAddress;
            storageTokenId = tokenId;
            storageContractOrExternal = storageContract;
        }

        resourceManagement.addResource(storageContractOrExternal, storageTokenId, msg.sender, resource, value);
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }
}