// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

import "../AuthorizationModifiers.sol";
import "../interfaces/IResourceManagement.sol";
import "../interfaces/IStorageManagement.sol";

abstract contract BaseStorage is AuthorizationModifiers {
    IERC721 public nftCollection721;
    IERC1155 public nftCollection1155;
    address public nftCollectionAddress;
    bool public isNft721;

    // Mapping from token ID to storage capacity
    mapping(uint256 => uint256) public storageCapacities;

    event StorageCapacityUpdated(uint256 indexed tokenId, uint256 newCapacity);

    constructor(address _centralAuthorizationRegistry, address _nftCollectionAddress, bool _isNft721, bytes32 _interfaceId) AuthorizationModifiers(_centralAuthorizationRegistry, _interfaceId) {        

        nftCollectionAddress = _nftCollectionAddress;
        isNft721 = _isNft721;
        if (isNft721) {
            nftCollection721 = IERC721(_nftCollectionAddress);
        } else {
            nftCollection1155 = IERC1155(_nftCollectionAddress);
        }
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }

    function getTotalResourcesInStorage(uint256 tokenId) external view virtual returns (uint256) {
        IResourceManagement resourceManagement = getResourceManagement();
        uint256 totalResources = resourceManagement.getTotalResourcesInStorage(address(this), tokenId);
        return totalResources;
    }

    function getResourceBalance(uint256 tokenId, string memory resource) external view virtual returns (uint256) {
        IResourceManagement resourceManagement = getResourceManagement();
        uint256 resourceBalance = resourceManagement.getResourceBalance(address(this), tokenId, resource);
        return resourceBalance;
    }

    function addResource(uint256 tokenId, address user, string memory resource, uint256 amount) external virtual onlyAuthorized(){
        IResourceManagement resourceManagement = getResourceManagement();
        resourceManagement.addResource(address(this), tokenId, user, resource, amount);
    }

    function dumpResource(uint256 tokenId, address owner, string memory resource, uint256 amount) external virtual onlyAuthorized {
        if (isNft721) {            
            require(nftCollection721.ownerOf(tokenId) == owner, "Caller does not own the 721 token");
        } else {            
            require(nftCollection1155.balanceOf(owner, tokenId) > 0, "Caller does not own the 1155 token");
        }
        IResourceManagement resourceManagement = getResourceManagement();
        resourceManagement.burnResource(address(this), tokenId, msg.sender, resource, amount);
    }

    function getAllResourceBalances(uint256 tokenId) external view virtual returns (string[] memory, uint256[] memory) {
        IResourceManagement resourceManagement = getResourceManagement();
        (string[] memory resourceNames, uint256[] memory resourceBalances) = resourceManagement.getAllResourceBalances(address(this), tokenId);
        return (resourceNames, resourceBalances);
    }
    

    function getStorageCapacity(uint256 tokenId) public view virtual returns (uint256) {
        return storageCapacities[tokenId];
    }

    function updateStorageCapacity(uint256 tokenId, uint256 newCapacity) external virtual onlyAuthorized {
        storageCapacities[tokenId] = newCapacity;
        emit StorageCapacityUpdated(tokenId, newCapacity);
    }
}