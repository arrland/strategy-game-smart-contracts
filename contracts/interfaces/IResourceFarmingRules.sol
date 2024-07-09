// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IPirateManagement.sol";

interface IResourceFarmingRules {
    function calculateResourceOutput(
        IPirateManagement.PirateSkills memory pirateSkills,
        string memory resource,
        uint256 durationSeconds
    ) external pure returns (uint256);
}
