// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1155.sol";

interface IPirateStorage {
    function getStorageCapacity(uint256 tokenId) external view returns (uint256);
    function setStorageCapacity(uint256 tokenId, uint256 capacity) external;
    function increaseStorageCapacity(uint256 tokenId, uint256 amount) external;
    function decreaseStorageCapacity(uint256 tokenId, uint256 amount) external;
    function getDefaultStorageCapacity() external view returns (uint256);
    function getNftCollection721() external view returns (IERC721);
    function getNftCollection1155() external view returns (IERC1155);
}
