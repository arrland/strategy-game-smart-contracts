// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./CentralAuthorizationRegistry.sol";
import "./AuthorizationModifiers.sol";
import "./interfaces/IResourceTypeManager.sol";
import "hardhat/console.sol";


contract ResourceManagement is AuthorizationModifiers {

    // Mapping to store resources for each token ID and owner
    mapping(address => mapping(uint256 => mapping(string => uint256))) public resources;
    

    event ResourceAdded(address indexed contractAddress, uint256 indexed tokenId, address indexed owner, string resource, uint256 amount);
    event ResourceTransferred(
        address indexed fromContract,
        uint256 indexed fromTokenId,
        address indexed fromOwner,
        address toContract,
        uint256 toTokenId,
        address toOwner,
        string resource,
        uint256 amount
    );
    event ResourceBurned(address indexed contractAddress, uint256 indexed tokenId, address indexed owner, string resource, uint256 amount);    

    constructor(address _centralAuthorizationRegistry) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IResourceManagement")) {
    }

    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceTypeManager")));
    }

    function addResource(
        address contractAddress,
        uint256 tokenId,
        address owner,
        string memory resource,
        uint256 amount
    ) external onlyAuthorized {
        IResourceTypeManager resourceTypeManager = getResourceTypeManager();
        require(resourceTypeManager.isValidResourceType(resource), "Invalid resource name");
        resources[contractAddress][tokenId][resource] += amount;
        emit ResourceAdded(contractAddress, tokenId, owner, resource, amount);
    }
    function transferResource(
        address fromContract,
        uint256 fromTokenId,
        address fromOwner,
        address toContract,
        uint256 toTokenId,
        address toOwner,
        string memory resource,
        uint256 amount
    ) external onlyAuthorized {
        require(resources[fromContract][fromTokenId][resource] >= amount, "Insufficient resource balance");
        IResourceTypeManager resourceTypeManager = getResourceTypeManager();
        require(resourceTypeManager.isValidResourceType(resource), "Invalid resource name");
        resources[fromContract][fromTokenId][resource] -= amount;
        resources[toContract][toTokenId][resource] += amount;

        emit ResourceTransferred(fromContract, fromTokenId, fromOwner, toContract, toTokenId, toOwner, resource, amount);
    }

    function burnResource(
        address contractAddress,
        uint256 tokenId,
        address owner,
        string memory resource,
        uint256 amount
    ) external onlyAuthorized {
        require(resources[contractAddress][tokenId][resource] >= amount, "Insufficient resource balance");
        IResourceTypeManager resourceTypeManager = getResourceTypeManager();
        require(resourceTypeManager.isValidResourceType(resource), "Invalid resource name");
        resources[contractAddress][tokenId][resource] -= amount;
        emit ResourceBurned(contractAddress, tokenId, owner, resource, amount);
    }

    function getResourceBalance(
        address contractAddress,
        uint256 tokenId,
        string memory resource
    ) external view returns (uint256) {
        return resources[contractAddress][tokenId][resource];
    }

    function getAllResourceBalances(address contractAddress, uint256 tokenId) external view returns (string[] memory, uint256[] memory) {
        IResourceTypeManager resourceTypeManager = getResourceTypeManager();
        IResourceTypeManager.ResourceType[] memory resourceTypes = resourceTypeManager.getResourceTypes();
        string[] memory resourceNames = new string[](resourceTypes.length);
        uint256[] memory resourceBalances = new uint256[](resourceTypes.length);

        for (uint256 i = 0; i < resourceTypes.length; i++) {
            string memory resourceName = resourceTypes[i].name;
            resourceNames[i] = resourceName;
            resourceBalances[i] = resources[contractAddress][tokenId][resourceName];
        }

        return (resourceNames, resourceBalances);
    }

    function getTotalResourcesInStorage(address contractAddress, uint256 tokenId) external view returns (uint256) {
        IResourceTypeManager resourceTypeManager = getResourceTypeManager();
        IResourceTypeManager.ResourceType[] memory resourceTypes = resourceTypeManager.getResourceTypes();
        uint256 totalResources = 0;

        for (uint256 i = 0; i < resourceTypes.length; i++) {
            string memory resourceName = resourceTypes[i].name;
            uint256 resourceBalance = resources[contractAddress][tokenId][resourceName];
            totalResources += resourceBalance;
        }

        return totalResources;
    }
}

