// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface ICrewStats {
    function getCrewBaseStats(uint256 crewId) external view returns (uint256);
}
