// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMission.sol";
import "../interfaces/IMissionValidator.sol";
import "../interfaces/IMissionTravelCalculator.sol";
import "../interfaces/IMissionResourceHandler.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

abstract contract BaseMission is IMission, AuthorizationModifiers, ReentrancyGuard {
    using Strings for uint256;

    // Constants
    uint256 public constant SECONDS_IN_DAY = 24 * 60 * 60;

    // Immutable state variables
    bytes32 public immutable MISSION_TYPE_ID;

    // Events
    event MissionStarted(
        uint256 indexed shipId,
        uint256 missionType
    );

    event MissionCompleted(
        uint256 indexed shipId,
        uint256 missionType
    );

    struct MissionDetails {
        uint256 shipId;
        uint256 missionType;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        bool readyForClaim;
        uint256 timeRemaining;
        uint256 fromIslandId;
        uint256 toIslandId;
        bytes32 missionDataHash;
    }

    string public missionType;

    constructor(
        address _centralAuthorizationRegistry,
        bytes32 _contractId,
        string memory _missionType
    ) AuthorizationModifiers(_centralAuthorizationRegistry, _contractId) {
        MISSION_TYPE_ID = _contractId;
        missionType = _missionType;
    }

    modifier onlyMissionsManager() {
        require(
            msg.sender == centralAuthorizationRegistry.getContractAddress(keccak256("IMissionsManager")),
            "Only MissionsManager can call"
        );
        _;
    }

    function getMissionsStorage() internal view returns (IMissionsStorage) {
        return IMissionsStorage(
            centralAuthorizationRegistry.getContractAddress(keccak256("IMissionsStorage"))
        );
    }

    function getMissionValidator() internal view returns (IMissionValidator) {
        return IMissionValidator(
            centralAuthorizationRegistry.getContractAddress(keccak256("IMissionValidator"))
        );
    }

    function getMissionTravelCalculator() internal view returns (IMissionTravelCalculator) {
        return IMissionTravelCalculator(
            centralAuthorizationRegistry.getContractAddress(keccak256("IMissionTravelCalculator"))
        );
    }

    function getMissionResourceHandler() internal view returns (IMissionResourceHandler) {
        return IMissionResourceHandler(
            centralAuthorizationRegistry.getContractAddress(keccak256("IMissionResourceHandler"))
        );
    }

    function validateBaseMissionRequirements(uint256 shipId) internal view {
        getMissionValidator().validateShipRequirements(shipId);
    }

    function isMissionReadyForClaim(uint256 shipId) internal view virtual returns (bool) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        IMissionsStorage.MissionInfo memory info = missionsStorage.getMissionInfo(shipId);
        
        // Check if mission is active and completed time-wise
        if (!info.isActive || block.timestamp < info.endTime) {
            return false;
        }
        
        // Since different mission types have different storage layouts,
        // we'll implement mission-specific claim checks in the derived
        // mission contracts. Base missions are always claimable once
        // the time requirement is met.
        return true;
    }

    function getMissionDetails(uint256 missionId) external view virtual returns (bytes memory) {
        // This is a base implementation that should be overridden by derived contracts
        // Get ship ID (for many missions, missionId = shipId)
        uint256 shipId = missionId;
        
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        IMissionsStorage.MissionBasicInfo memory info = missionsStorage.getMissionBasicInfo(shipId);
        
        uint256 timeRemaining = 0;
        if (info.endTime > block.timestamp) {
            timeRemaining = info.endTime - block.timestamp;
        }
        
        // Return the encoded details compatible with all mission types
        return abi.encode(
            shipId,
            info.missionType,
            info.startTime,
            info.endTime,
            info.isActive,
            block.timestamp >= info.endTime, // ready for claim
            timeRemaining
        );
    }
    
    function getMissionDetailsInternal(uint256 shipId) internal view returns (MissionDetails memory details) {
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        IMissionsStorage.MissionBasicInfo memory info = missionsStorage.getMissionBasicInfo(shipId);
        
        uint256 timeRemaining = 0;
        if (info.endTime > block.timestamp) {
            timeRemaining = info.endTime - block.timestamp;
        }
        
        return MissionDetails({
            shipId: shipId,
            missionType: info.missionType,
            startTime: info.startTime,
            endTime: info.endTime,
            isActive: info.isActive,
            readyForClaim: info.isActive && block.timestamp >= info.endTime,
            timeRemaining: timeRemaining,
            fromIslandId: 0, // These would need to be retrieved from specialized storage
            toIslandId: 0,
            missionDataHash: bytes32(0)
        });
    }

    function calculateTravelTime(
        uint256 fromIslandId, 
        uint256 toIslandId, 
        uint256 shipId
    ) internal view returns (uint256 travelTime) {
        return getMissionTravelCalculator().calculateTravelTime(fromIslandId, toIslandId, shipId);
    }

    function calculateRoundTripTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId
    ) internal view returns (uint256 outboundTime, uint256 inboundTime) {
        return getMissionTravelCalculator().calculateRoundTripTravelTime(fromIslandId, toIslandId, shipId);
    }

    function lockShipForMission(uint256 shipId, uint256 missionId) internal {
        // Use a default duration of 4 days as safety margin
        lockShipForMission(shipId, missionId, 4 * SECONDS_IN_DAY);
    }

    function lockShipForMission(uint256 shipId, uint256 missionId, uint256 duration) internal {
        getMissionResourceHandler().lockShipForMission(shipId, missionId, duration);
    }

    function unlockShipAfterMission(uint256 shipId) internal {
        getMissionResourceHandler().unlockShipAfterMission(shipId);
    }

    function isShipLocked(uint256 shipId) internal view returns (bool) {
        return getMissionValidator().isShipLocked(shipId);
    }

    function validateIslandRequirements(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 missionTypeId
    ) internal view {
        getMissionValidator().validateIslandRequirements(fromIslandId, toIslandId, missionTypeId);
    }

    function isIslandOwner(uint256 islandId, address user) internal view returns (bool) {
        return getMissionValidator().isIslandOwner(islandId, user);
    }

    function validateShipCapacity(uint256 shipId, uint256 amount) internal view virtual returns (bool) {
        return getMissionValidator().validateShipCapacity(shipId, amount);
    }

    function transferResourceFromIslandToShip(
        uint256 fromIslandId,
        uint256 toShipId,
        string memory resourceType,
        uint256 amount
    ) internal {
        getMissionResourceHandler().transferResourceFromIslandToShip(
            fromIslandId,
            toShipId,
            resourceType,
            amount
        );
    }

    function transferResourceFromShipToIsland(
        uint256 fromShipId,
        uint256 toIslandId,
        string memory resourceType,
        uint256 amount
    ) internal {
        getMissionResourceHandler().transferResourceFromShipToIsland(
            fromShipId,
            toIslandId,
            resourceType,
            amount
        );
    }

    // Abstract functions to be implemented by derived contracts
    function getMissionType() public view virtual returns (uint256);
}
