// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./IPirateManagement.sol";

interface IResourceFarmingRules {
    // Define the ResourceInfo struct in the interface
    struct ResourceInfo {
        string name;
        SkillRequirement[][] requirements;
    }

    // Define the SkillRequirement struct needed by ResourceInfo
    struct SkillRequirement {
        string skillName;
        uint256 value;
        bool exactMatch;
    }

    function calculateResourceOutput(
        IPirateManagement.PirateSkills memory pirateSkills,
        string memory resource,
        uint256 durationSeconds
    ) external pure returns (uint256);

    // Update the return type to match the implementation
    function getFarmableResourcesForPirate(
        address collectionAddress, 
        uint256 pirateTokenId
    ) external view returns (ResourceInfo[] memory farmable, ResourceInfo[] memory unfarmable);
}