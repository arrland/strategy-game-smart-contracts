// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/IMission.sol";
import "../interfaces/IMissionValidator.sol";
import "../interfaces/IMissionTravelCalculator.sol";
import "../interfaces/IMissionResourceHandler.sol";
import "../interfaces/ships/IShipAndPirateStaking.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

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
        console.log("BaseMission: Constructor called for missionType:", _missionType);
        MISSION_TYPE_ID = _contractId;
        missionType = _missionType;
    }

    modifier onlyMissionsManager() {
        console.log("BaseMission: onlyMissionsManager modifier checked for sender:", msg.sender);
        require(
            msg.sender == centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IMissionsManager"))),
            "Only MissionsManager can call"
        );
        _;
    }

    function getMissionsStorage() internal view returns (IMissionsStorage) {
        console.log("BaseMission: getMissionsStorage called");
        return IMissionsStorage(
            centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IMissionsStorage")))
        );
    }

    function getMissionValidator() internal view returns (IMissionValidator) {
        console.log("BaseMission: getMissionValidator called");
        return IMissionValidator(
            centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IMissionValidator")))
        );
    }

    function getMissionTravelCalculator() internal view returns (IMissionTravelCalculator) {
        console.log("BaseMission: getMissionTravelCalculator called");
        return IMissionTravelCalculator(
            centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IMissionTravelCalculator")))
        );
    }

    function getMissionResourceHandler() internal view returns (IMissionResourceHandler) {
        console.log("BaseMission: getMissionResourceHandler called");
        return IMissionResourceHandler(
            centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IMissionResourceHandler")))
        );
    }

    function getShipAndPirateStaking() internal view returns (IShipAndPirateStaking) {
        return IShipAndPirateStaking(
            centralAuthorizationRegistry.getContractAddress(keccak256(abi.encodePacked("IShipAndPirateStaking")))
        );
    }

    function getShipOwner(uint256 shipId) internal view returns (address) {
        return getShipAndPirateStaking().getShipOwner(shipId);
    }

    function validateBaseMissionRequirements(uint256 shipId) internal view {
        console.log("BaseMission: validateBaseMissionRequirements called for shipId:", shipId);
        getMissionValidator().validateShipRequirements(shipId);
    }

    function isMissionReadyForClaim(uint256 shipId) internal view virtual returns (bool) {
        console.log("BaseMission: isMissionReadyForClaim called for shipId:", shipId);
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        
        IMissionsStorage.MissionInfo memory info = missionsStorage.getMissionInfo(shipId);
        
        if (!info.isActive || block.timestamp < info.endTime) {
            return false;
        }
        return true;
    }

    function getMissionDetails(uint256 missionId) external view virtual returns (bytes memory) {
        console.log("BaseMission: getMissionDetails (base) called for missionId:", missionId);
        uint256 shipId = missionId;
        IMissionsStorage missionsStorage = getMissionsStorage();
        require(missionsStorage.isOnMission(shipId), "Ship not on mission");
        IMissionsStorage.MissionBasicInfo memory info = missionsStorage.getMissionBasicInfo(shipId);
        uint256 timeRemaining = 0;
        if (info.endTime > block.timestamp) {
            timeRemaining = info.endTime - block.timestamp;
        }
        return abi.encode(
            shipId,
            info.missionType,
            info.startTime,
            info.endTime,
            info.isActive,
            block.timestamp >= info.endTime, 
            timeRemaining
        );
    }
    
    function getMissionDetailsInternal(uint256 shipId) internal view returns (MissionDetails memory details) {
        console.log("BaseMission: getMissionDetailsInternal called for shipId:", shipId);
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
            fromIslandId: 0,
            toIslandId: 0,
            missionDataHash: bytes32(0)
        });
    }

    function calculateTravelTime(
        uint256 fromIslandId, 
        uint256 toIslandId, 
        uint256 shipId
    ) internal view returns (uint256 travelTime) {
        console.log("BaseMission: calculateTravelTime called.");
        console.log("BaseMission: - fromIslandId:", fromIslandId);
        console.log("BaseMission: - toIslandId:", toIslandId);
        console.log("BaseMission: - shipId:", shipId);
        return getMissionTravelCalculator().calculateTravelTime(fromIslandId, toIslandId, shipId);
    }

    function calculateRoundTripTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId
    ) internal view returns (uint256 outboundTime, uint256 inboundTime) {
        console.log("BaseMission: calculateRoundTripTravelTime called.");
        console.log("BaseMission: - fromIslandId:", fromIslandId);
        console.log("BaseMission: - toIslandId:", toIslandId);
        console.log("BaseMission: - shipId:", shipId);
        return getMissionTravelCalculator().calculateRoundTripTravelTime(fromIslandId, toIslandId, shipId);
    }

    function lockShipForMission(uint256 shipId, uint256 missionId) internal {
        console.log("BaseMission: lockShipForMission (2 args) called for shipId:", shipId, "missionId:", missionId);
        lockShipForMission(shipId, missionId, 4 * SECONDS_IN_DAY);
    }

    function lockShipForMission(uint256 shipId, uint256 missionId, uint256 duration) internal {
        console.log("BaseMission: lockShipForMission (3 args) called.");
        console.log("BaseMission: - shipId:", shipId);
        console.log("BaseMission: - missionId:", missionId);
        console.log("BaseMission: - duration:", duration);
        getMissionResourceHandler().lockShipForMission(shipId, missionId, duration);
    }

    function unlockShipAfterMission(uint256 shipId) internal {
        console.log("BaseMission: unlockShipAfterMission called for shipId:", shipId);
        getMissionResourceHandler().unlockShipAfterMission(shipId);
    }

    function isShipLocked(uint256 shipId) internal view returns (bool) {
        console.log("BaseMission: isShipLocked called for shipId:", shipId);
        return getMissionValidator().isShipLocked(shipId);
    }

    function validateIslandRequirements(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 missionTypeId
    ) internal view {
        console.log("BaseMission: validateIslandRequirements called.");
        console.log("BaseMission: - fromIslandId:", fromIslandId);
        console.log("BaseMission: - toIslandId:", toIslandId);
        console.log("BaseMission: - missionTypeId:", missionTypeId);
        getMissionValidator().validateIslandRequirements(fromIslandId, toIslandId, missionTypeId);
    }

    function isIslandOwner(uint256 islandId, address user) internal view returns (bool) {
        console.log("BaseMission: isIslandOwner called for islandId:", islandId, "user:", user);
        return getMissionValidator().isIslandOwner(islandId, user);
    }

    function validateShipCapacity(
        uint256 shipId, 
        uint256 amount,
        uint256 travelDays,
        string memory foodChoice,
        string memory foodRationChoice
    ) internal view virtual returns (bool) {
        return getMissionValidator().validateShipCapacity(shipId, amount, travelDays, foodChoice, foodRationChoice);
    }

    function transferResourceFromIslandToShip(
        uint256 fromIslandId,
        uint256 toShipId,
        string memory resourceType,
        uint256 amount
    ) internal {
        console.log("BaseMission: transferResourceFromIslandToShip called.");
        console.log("BaseMission: - fromIslandId:", fromIslandId);
        console.log("BaseMission: - toShipId:", toShipId);
        console.log("BaseMission: - resourceType:", resourceType);
        console.log("BaseMission: - amount:", amount);
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
        console.log("BaseMission: transferResourceFromShipToIsland called.");
        console.log("BaseMission: - fromShipId:", fromShipId);
        console.log("BaseMission: - toIslandId:", toIslandId);
        console.log("BaseMission: - resourceType:", resourceType);
        console.log("BaseMission: - amount:", amount);
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
