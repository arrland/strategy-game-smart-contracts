// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";


contract ActivityStats is AuthorizationModifiers {
    uint256 public currentActivityPeriod;
    uint256 public lastActivityBlock;
    uint256 public BLOCKS_28_DAYS;
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
            BLOCKS_28_DAYS = 41890 * 28;
        } else {
            BLOCKS_28_DAYS = _blocks28Days;
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
}