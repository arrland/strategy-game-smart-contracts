// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ActivityStats is AuthorizationModifiers {
    uint256 public currentActivityPeriod;
    uint256 public lastActivityBlock;
    uint256 public BLOCKS_28_DAYS;
    uint256 public BLOCKS_1_DAY;
    bool public addActivityEnabled = false;

    mapping(uint256 => address[]) public participantsInPeriod;
    mapping(address => mapping(uint256 => bool)) public participantInPeriod;
    mapping(uint256 => mapping(address => uint256)) public userActivityCounts;

    event ActivityPeriodReset(uint256 newActivityPeriod);
    event AddActivityStatusChanged(bool newStatus);

    constructor(address _centralAuthorizationRegistryAddress, uint256 _initialActivityPeriod, uint256 _initialLastActivityBlock, uint256 _blocks28Days) AuthorizationModifiers(_centralAuthorizationRegistryAddress, keccak256("IActivityStats")) {
        currentActivityPeriod = _initialActivityPeriod;
        if (_initialLastActivityBlock == 0) {
            lastActivityBlock = block.number;
        } else {
            lastActivityBlock = _initialLastActivityBlock;
        }
        if (_blocks28Days == 0) {
            BLOCKS_1_DAY = 41890;
            BLOCKS_28_DAYS = BLOCKS_1_DAY * 28;
        } else {
            BLOCKS_28_DAYS = _blocks28Days;
            BLOCKS_1_DAY = BLOCKS_28_DAYS / 28;
        }
    }

    function setAddActivityEnabled(bool _enabled) external onlyAdmin() {
        addActivityEnabled = _enabled;        
        emit AddActivityStatusChanged(_enabled);
    }

    function resetActivityPeriod() internal {
        if (block.number - lastActivityBlock >= BLOCKS_28_DAYS) {
            currentActivityPeriod++;
            lastActivityBlock = block.number;
            emit ActivityPeriodReset(currentActivityPeriod);
        }
    }

    function addActivity(address user) external onlyAuthorized {
        if (!addActivityEnabled) {
            return;
        }
        resetActivityPeriod();
        if (!participantInPeriod[user][currentActivityPeriod]) {
            participantsInPeriod[currentActivityPeriod].push(user);
            participantInPeriod[user][currentActivityPeriod] = true;
        }
        userActivityCounts[currentActivityPeriod][user]++;
    }

    function getUsersFromPrevPeriod() external view returns (address[] memory) {        
        return participantsInPeriod[currentActivityPeriod - 1];
    }

    function isUserInPrevPeriod(address user) external view returns (bool) {
        return participantInPeriod[user][currentActivityPeriod - 1];
    }

    function getActivityCountForUser(address user, uint256 period) external view returns (uint256) {
        return userActivityCounts[period][user];
    }

    function getTotalActivityCountForPeriod(uint256 period) external view returns (uint256 total) {
        address[] memory participants = participantsInPeriod[period];
        for (uint256 i = 0; i < participants.length; i++) {
            total += userActivityCounts[period][participants[i]];
        }
    }

    function getAllParticipantsInCurrentPeriod() external view returns (address[] memory) {
        return participantsInPeriod[currentActivityPeriod];
    }

    function resetActivityManually() external onlyAdmin {
        currentActivityPeriod++;
        lastActivityBlock = block.number;
        emit ActivityPeriodReset(currentActivityPeriod);
    }

    function removeActivityForUser(address user, uint256 period) external onlyAuthorized {
        if (userActivityCounts[period][user] > 0) {
            userActivityCounts[period][user]--;
            if (userActivityCounts[period][user] == 0) {
                participantInPeriod[user][period] = false;                
            }
        }
    }

    function getBlocksLeftInCurrentPeriod() external view returns (uint256) {
        uint256 blocksLeft = BLOCKS_28_DAYS - (block.number - lastActivityBlock);
        return blocksLeft;
    }

    function getActivityCountForAllUsersInCurrentPeriod() external view returns (address[] memory users, uint256[] memory counts) {
        address[] memory participants = participantsInPeriod[currentActivityPeriod];
        uint256[] memory activityCounts = new uint256[](participants.length);
        for (uint256 i = 0; i < participants.length; i++) {
            activityCounts[i] = userActivityCounts[currentActivityPeriod][participants[i]];
        }
        return (participants, activityCounts);
    }

    function getActivityPeriodDuration() external view returns (uint256) {
        return BLOCKS_28_DAYS;
    }

    function getRemainingTimeInCurrentPeriod() external view returns (uint256) {
        uint256 blocksPassed = block.number - lastActivityBlock;
        if (blocksPassed >= BLOCKS_28_DAYS) {
            return 0;
        }
        return BLOCKS_28_DAYS - blocksPassed;
    }

    function isUserInCurrentPeriod(address user) external view returns (bool) {
        return participantInPeriod[user][currentActivityPeriod];
    }

    function getAllActivityPeriods() external view returns (uint256[] memory) {
        uint256[] memory periods = new uint256[](currentActivityPeriod);
        for (uint256 i = 0; i < currentActivityPeriod; i++) {
            periods[i] = i + 1;
        }
        return periods;
    }
}