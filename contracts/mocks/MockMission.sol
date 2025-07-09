// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IMission.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMissionAuthorization.sol";
import "../AuthorizationModifiers.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "hardhat/console.sol";

/**
 * @title MockMission
 * @notice Mock implementation of IMission for testing purposes.
 */
contract MockMission is IMission, IMissionAuthorization, IERC165, AuthorizationModifiers {
    uint256 public fixedDuration = 600; // Default 10 minutes
    address public lastCaller;
    uint256 public lastShipId;
    bytes public lastMissionData;

    // Event to track calls to startMission for testing purposes
    event MissionInstanceStarted(uint256 shipId, bytes data, uint256 returnedDuration);
    event MissionInstanceCompleted(uint256 missionId);

    mapping(uint256 => bytes) public missionDataStore;
    mapping(uint256 => bool) public completedMissions;

    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("MockMission")) {}

    function getMissionsStorage() internal view returns (IMissionsStorage) {
        return IMissionsStorage(
            centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IMissionsStorage")))
        );
    }

    /**
     * @notice Simulates starting a mission, stores data, returns the missionId from mission data.
     * @param shipId ID of the ship (unused in mock).
     * @param data Encoded mission data, expected to contain missionId.
     * @return missionId The mission ID decoded from the mission data.
     */
    function startMission(uint256 shipId, bytes calldata data) external override returns (uint256 missionId) {
        lastCaller = msg.sender;
        lastShipId = shipId;
        lastMissionData = data;
        
        // Decode missionId from the mission data (first 32 bytes)
        // MissionsManager prepends missionId to the mission data
        require(data.length >= 32, "Mission data too short");
        missionId = abi.decode(data[:32], (uint256));
        
        // Simulate calling MissionsStorage.startMission like real mission contracts do
        IMissionsStorage missionsStorage = getMissionsStorage();
        missionsStorage.startMission(
            shipId,
            missionId,
            1, // missionType (using 1 for mock)
            fixedDuration,
            data[32:] // remaining mission data after missionId
        );
        
        emit MissionInstanceStarted(shipId, data, fixedDuration);
        return missionId;
    }

    /**
     * @notice Marks a mission as complete.
     * @param missionId ID of the mission to complete.
     */
    function completeMission(uint256 missionId) external override returns (bool isFullyComplete) {
        completedMissions[missionId] = true;
        emit MissionInstanceCompleted(missionId);
        return true; // Mock missions are always fully complete
    }

    /**
     * @notice Retrieves stored mission data.
     * @param missionId ID of the mission.
     * @return Stored mission data.
     */
    function getMissionDetails(uint256 missionId) external view override returns (bytes memory) {
        // This is a simple mock; actual mission contracts would handle data storage and retrieval.
        // For this mock, returning lastMissionData or data from missionDataStore if populated.
        return missionDataStore[missionId];
    }

    /**
     * @notice Standard ERC165 supportsInterface.
     * @param interfaceId Interface ID to check.
     * @return True if IMission interface is supported.
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IMission).interfaceId || interfaceId == type(IERC165).interfaceId;
    }

    /**
     * @notice Allows setting a custom fixed duration for testing.
     * @param _duration New fixed duration in seconds.
     */
    function setFixedDuration(uint256 _duration) external {
        fixedDuration = _duration;
    }

    function setMissionDataForId(uint256 missionId, bytes calldata data) external {
        missionDataStore[missionId] = data;
    }

    /**
     * @notice Check if caller is authorized to complete this mission
     * @param missionId Mission identifier  
     * @param caller Address of the caller
     * @return isAuthorized Whether the caller can complete this mission
     */
    function isAuthorizedToComplete(uint256 missionId, address caller) external view override returns (bool isAuthorized) {
        // For mock missions, any caller is authorized (for testing flexibility)
        return true;
    }
}
