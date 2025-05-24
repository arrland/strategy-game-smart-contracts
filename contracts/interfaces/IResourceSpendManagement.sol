// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IResourceSpendManagement {
    function getResourceRequirements(string memory resource) external view returns (ResourceRequirement memory);

    function setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) external;
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

    function setActionResourceRequirements(string memory action, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) external;
    function getActionResourceRequirements(string memory action) external view returns (ResourceRequirement memory);
    function doesActionRequireBurning(string memory action) external view returns (bool);
    function getOptionalActionResourceRate(string memory action, string memory resourceName) external view returns (uint256 rateWei, CalculationMethod method);
    function handleActionResourceBurning(
        string memory action,
        address storageContract,
        uint256 tokenId,
        address user,
        uint256 daysCount,
        uint256 totalCrew,
        uint256 itemsToCraftOrProcess,
        string[] memory resourcesToBurn
    ) external;

    function getResourceRequirementAmounts(string memory resource, uint256 daysCount, uint256 resourcesProduced) external view returns (ResourceRequirementAmount[] memory);

    function calculateTotalFoodAmountForAction(
        string calldata actionName,
        string calldata foodChoice,
        uint256 totalCrew,
        uint256 travelDays
    ) external view returns (uint256 totalAmount);

    // New function for batch burning mission start foods
    function burnMissionStartFoods(
        address storageContract,
        uint256 tokenId,
        address user,
        uint256 daysCount,
        uint256 totalCrew,
        string calldata primaryFoodChoice,
        string calldata rationFoodChoice
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

struct ResourceRequirementAmount {
    string resourceName;
    uint256 amount;
    bool isMandatory;
}

enum CalculationMethod { PerDay, Divide }
