// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMissionFactory.sol";
import "../interfaces/IMission.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MissionFactory
 * @notice Factory contract for mission implementations
 * @dev Uses the Factory pattern to support adding new mission types without modifying existing code
 */
contract MissionFactory is IMissionFactory, AuthorizationModifiers, ReentrancyGuard {
    // Mapping from mission type to contract address
    mapping(uint256 => address) public missionContracts;

    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionFactory")) {}

    /**
     * @notice Register a mission contract for a specific mission type
     * @param missionType The type of mission
     * @param contractAddress The address of the mission contract
     */
    function registerMissionContract(uint256 missionType, address contractAddress) external override onlyAdmin {
        require(contractAddress != address(0), "Contract address cannot be zero");
        require(missionContracts[missionType] == address(0), "Mission type already registered");
        
        // Check if the contract implements IMission interface
        IMission missionContract = IMission(contractAddress);
        require(address(missionContract) != address(0), "Invalid mission contract");
        
        missionContracts[missionType] = contractAddress;
    }
    
    /**
     * @notice Update a mission contract for a specific mission type
     * @param missionType The type of mission
     * @param contractAddress The new address of the mission contract
     */
    function updateMissionContract(uint256 missionType, address contractAddress) external override onlyAdmin {
        require(contractAddress != address(0), "Contract address cannot be zero");
        require(missionContracts[missionType] != address(0), "Mission type not registered");
        
        // Check if the contract implements IMission interface
        IMission missionContract = IMission(contractAddress);
        require(address(missionContract) != address(0), "Invalid mission contract");
        
        missionContracts[missionType] = contractAddress;
    }
    
    /**
     * @notice Check if a mission type has a registered contract
     * @param missionType The type of mission
     * @return True if the mission type is registered
     */
    function isMissionTypeRegistered(uint256 missionType) external view override returns (bool) {
        return missionContracts[missionType] != address(0);
    }
    
    /**
     * @notice Get mission contract for a specific mission type
     * @param missionType The type of mission
     * @return The address of the mission contract
     */
    function getMissionContract(uint256 missionType) external view override returns (address) {
        address contractAddress = missionContracts[missionType];
        require(contractAddress != address(0), "No contract for mission type");
        return contractAddress;
    }
    
    /**
     * @notice Start a mission of a specific type
     * @param shipId The ID of the ship going on the mission
     * @param missionType The type of mission
     * @param missionData Encoded mission parameters
     * @return The ID of the new mission
     */
    function startMission(
        uint256 shipId,
        uint256 missionType,
        bytes calldata missionData
    ) external override nonReentrant onlyAuthorized returns (uint256) {
        address contractAddress = missionContracts[missionType];
        require(contractAddress != address(0), "No contract for mission type");
        
        IMission missionContract = IMission(contractAddress);
        uint256 duration = missionContract.startMission(shipId, missionData);
        
        return duration;
    }
    
    /**
     * @notice Complete a mission of a specific type
     * @param missionId The ID of the mission
     * @param missionType The type of mission
     */
    function completeMission(
        uint256 missionId,
        uint256 missionType
    ) external override nonReentrant onlyAuthorized {
        address contractAddress = missionContracts[missionType];
        require(contractAddress != address(0), "No contract for mission type");
        
        IMission missionContract = IMission(contractAddress);
        missionContract.completeMission(missionId);
    }
}
