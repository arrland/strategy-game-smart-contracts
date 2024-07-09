// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract CapitalIslandManagement {
    IERC721 public islandNftContract;

    // Mapping to store the capital island for each user
    mapping(address => uint256) private userCapitalIslands;

    // Array to store all users who have set their capital island
    address[] private usersWithCapitalIslands;

    // Mapping to check if a user is already in the usersWithCapitalIslands array
    mapping(address => bool) private isUserInList;

    // Events
    event CapitalIslandSet(address indexed owner, uint256 indexed islandId);

    constructor(address _islandNftContract) {
        islandNftContract = IERC721(_islandNftContract);
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

    // Function to get the list of all users who have set their capital island
    function getUsersWithCapitalIslands() external view returns (address[] memory) {
        return usersWithCapitalIslands;
    }

    function getAllCapitalIslands() external view returns (uint256[] memory) {
        uint256[] memory capitalIslands = new uint256[](usersWithCapitalIslands.length);
        for (uint256 i = 0; i < usersWithCapitalIslands.length; i++) {
            capitalIslands[i] = userCapitalIslands[usersWithCapitalIslands[i]];
        }
        return capitalIslands;
    }
}