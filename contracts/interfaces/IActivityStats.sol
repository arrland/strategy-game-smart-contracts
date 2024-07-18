// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IActivityStats {
    function currentActivityPeriod() external view returns (uint256);
    function lastActivityBlock() external view returns (uint256);
    function participantsInPeriod(uint256 period) external view returns (address[] memory);
    function participantInPeriod(address user, uint256 period) external view returns (bool);
    function userActivityCounts(uint256 period, address user) external view returns (uint256);

    function addActivity(address user) external;
    function getUsersFromPrevPeriod() external view returns (address[] memory);
    function isUserInPeriod(address user) external view returns (bool);
}
