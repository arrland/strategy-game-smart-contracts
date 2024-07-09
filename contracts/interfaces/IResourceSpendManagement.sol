// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IResourceSpendManagement {
    function resourceRequirements(string memory resource) external view returns (ResourceRequirement memory);

    function setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) external;
    function getResourceRequirements(string memory resource) external view returns (ResourceRequirement memory);
    function doesResourceRequireBurning(string memory resource) external view returns (bool);
    function handleResourceBurning(
        address storageContract,
        uint256 tokenId,
        address user,
        string memory resource,
        uint256 daysCount,
        uint256 resourcesProduced,
        string[] memory resourcesToBurn
    ) external;
}

struct ResourceAmount {
    string resource;
    uint256 amount;
    CalculationMethod method;
}

struct ResourceRequirement {
    ResourceAmount[] optionalResources;
    ResourceAmount[] mandatoryResources;
}

enum CalculationMethod { PerDay, Divide }
