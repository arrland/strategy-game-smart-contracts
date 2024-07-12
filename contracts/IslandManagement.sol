// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./interfaces/IStorageManagement.sol";
import "./interfaces/IResourceManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract IslandManagement is AuthorizationModifiers {
    using Strings for string;

    IERC721 public islandNftContract;

    // Mapping to store the capital island for each user
    mapping(address => uint256) private userCapitalIslands;

    // Array to store all users who have set their capital island
    address[] private usersWithCapitalIslands;

    // Mapping to check if a user is already in the usersWithCapitalIslands array
    mapping(address => bool) private isUserInList;

    // Events
    event CapitalIslandSet(address indexed owner, uint256 indexed islandId);
    event ResourceTransferredToIsland(address indexed user, uint256 indexed islandId, string resource, uint256 amount);
    event ResourceTransferredToCapital(address indexed user, uint256 indexed islandId, string resource, uint256 amount);

    constructor(address _centralAuthorizationRegistryContract, address _islandNftContract) AuthorizationModifiers(_centralAuthorizationRegistryContract, keccak256("IIslandManagement")) {
        islandNftContract = IERC721(_islandNftContract);        
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }

    // Function to get the storage capacity of an island
    function getIslandStorageCapacity(address owner, uint256 islandId) external view returns (uint256) {
        IStorageManagement storageManagement = getStorageManagement();
        return storageManagement.getStorageCapacity(address(islandNftContract), islandId);
    }

    // Function to verify if an island has enough storage capacity
    function verifyIslandStorage(address owner, uint256 islandId, uint256 amount) external view returns (bool) {
        IStorageManagement storageManagement = getStorageManagement();
        return storageManagement.checkStorageLimit(address(islandNftContract), islandId, amount);
    }

    // Function to set the capital island for a user
    function setCapitalIsland(uint256 islandId) external {
        require(islandNftContract.ownerOf(islandId) == msg.sender, "User does not own this island");
        userCapitalIslands[msg.sender] = islandId;

        if (!isUserInList[msg.sender]) {
            usersWithCapitalIslands.push(msg.sender);
            isUserInList[msg.sender] = true;
        }

        emit CapitalIslandSet(msg.sender, islandId);
    }

    // Function to get the capital island of a user
    function getCapitalIsland(address owner) external view returns (uint256) {
        return userCapitalIslands[owner];
    }

    // Function to transfer resources to a specific island
    function transferResourceToIsland(address user, address pirateCollectionContract, uint256 pirateTokenId, uint256 islandId, string memory resource, uint256 amount) internal {
        require(islandNftContract.ownerOf(islandId) == user, "User does not own this island");
        IStorageManagement storageManagement = getStorageManagement();
        // Verify storage capacity
        require(storageManagement.checkStorageLimit(address(islandNftContract), islandId, amount), "Insufficient storage capacity in island");

        // Transfer resources (this would interact with the Resource Management Contract)
        IResourceManagement resourceManagement = getResourceManagement();
        address pirateStorageContract = storageManagement.getStorageByCollection(pirateCollectionContract);
        address islandStorageContract = storageManagement.getStorageByCollection(address(islandNftContract));

        // Validate if pirateStorage has enough amount to transfer
        require(storageManagement.checkStorageLimit(pirateCollectionContract, pirateTokenId, amount), "Insufficient resources in pirate storage");
        resourceManagement.transferResource(
            pirateStorageContract, 
            pirateTokenId, 
            user, // fromOwner
            islandStorageContract, 
            islandId, 
            user, // toOwner
            resource, 
            amount
        );
        emit ResourceTransferredToIsland(user, islandId, resource, amount);
    }

    // Function to transfer resources to the capital island
    function transferResourceToCapital(address pirateCollectionContract, uint256 pirateTokenId, string memory resource, uint256 amount) external {
        address user = msg.sender;
        uint256 capitalIslandId = userCapitalIslands[user];
        require(capitalIslandId != 0, "No capital island set for user");

        // Verify that user is the owner of pirateTokenId
        IERC1155 pirateCollection = IERC1155(pirateCollectionContract);
        require(pirateCollection.balanceOf(user, pirateTokenId) > 0, "User does not own this pirate token");

        // Transfer resources (this would interact with the Resource Management Contract)
        transferResourceToIsland(user, pirateCollectionContract, pirateTokenId, capitalIslandId, resource, amount);
        emit ResourceTransferredToCapital(user, capitalIslandId, resource, amount);
    }

    // Function to get the list of all users who have set their capital island
    function getUsersWithCapitalIslands() external view returns (address[] memory) {
        return usersWithCapitalIslands;
    }

    // Function to get all capital islands
    function getAllCapitalIslands() external view returns (uint256[] memory) {
        uint256[] memory capitalIslands = new uint256[](usersWithCapitalIslands.length);
        for (uint256 i = 0; i < usersWithCapitalIslands.length; i++) {
            capitalIslands[i] = userCapitalIslands[usersWithCapitalIslands[i]];
        }
        return capitalIslands;
    }
}