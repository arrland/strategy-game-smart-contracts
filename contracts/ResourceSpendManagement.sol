// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "./interfaces/IResourceManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IResourceTypeManager.sol";


contract ResourceSpendManagement is AuthorizationModifiers {
    using Strings for string;

    enum CalculationMethod { PerDay, Divide }

    struct ResourceAmount {
        string resource;
        uint256 amount;
        CalculationMethod method;
    }

    struct ResourceRequirement {
        ResourceAmount[] optionalResources;
        ResourceAmount[] mandatoryResources;
    }

    mapping(string => ResourceRequirement) internal resourceRequirements;
    mapping(string => bool) public resourcesRequiringBurn;

    constructor(address _centralAuthorizationRegistry) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IResourceSpendManagement")) {    
        // Setting resource requirements for "wood"
        ResourceAmount[] memory woodOptional = new ResourceAmount[](2);
        woodOptional[0] = ResourceAmount("fish", 1*10**18, CalculationMethod.PerDay);
        woodOptional[1] = ResourceAmount("coconut", 2*10**18, CalculationMethod.PerDay);
        _setResourceRequirements("wood", woodOptional, new ResourceAmount[](0));

        // Setting resource requirements for "planks"
        ResourceAmount[] memory planksOptional = new ResourceAmount[](2);
        planksOptional[0] = ResourceAmount("fish", 1*10**18, CalculationMethod.PerDay);
        planksOptional[1] = ResourceAmount("coconut", 2*10**18, CalculationMethod.PerDay);
        ResourceAmount[] memory planksMandatory = new ResourceAmount[](1);
        planksMandatory[0] = ResourceAmount("wood", 2*10**18, CalculationMethod.Divide);
        _setResourceRequirements("planks", planksOptional, planksMandatory);
    }

    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceTypeManager")));
    }

    modifier validResourceName(string memory resource) {
        IResourceTypeManager resourceTypeManager = getResourceTypeManager();
        require(resourceTypeManager.isValidResourceType(resource), "Invalid resource name");
        _;
    }

    function _setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) internal validResourceName(resource) {
        resourceRequirements[resource] = ResourceRequirement(optionalResources, mandatoryResources);
        resourcesRequiringBurn[resource] = true;
    }

    function setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) public onlyAdmin validResourceName(resource) {
        _setResourceRequirements(resource, optionalResources, mandatoryResources);
    }

    function getResourceRequirements(string memory resource) public view returns (ResourceRequirement memory) {
        return resourceRequirements[resource];
    }

    struct ResourceRequirementAmount {
        string resourceName;
        uint256 amount;
        bool isMandatory;
    }

    function getResourceRequirementAmounts(string memory resource, uint256 daysCount, uint256 resourcesProduced) public view returns (ResourceRequirementAmount[] memory) {
        uint256 totalResources = resourceRequirements[resource].optionalResources.length + resourceRequirements[resource].mandatoryResources.length;
        ResourceRequirementAmount[] memory amounts = new ResourceRequirementAmount[](totalResources);

        uint256 index = 0;
        for (uint256 i = 0; i < resourceRequirements[resource].optionalResources.length; i++) {
            amounts[index] = ResourceRequirementAmount({
                resourceName: resourceRequirements[resource].optionalResources[i].resource,
                amount: _calculateRequiredAmount(resourceRequirements[resource].optionalResources[i], daysCount, resourcesProduced),
                isMandatory: false
            });
            index++;
        }

        for (uint256 i = 0; i < resourceRequirements[resource].mandatoryResources.length; i++) {
            amounts[index] = ResourceRequirementAmount({
                resourceName: resourceRequirements[resource].mandatoryResources[i].resource,
                amount: _calculateRequiredAmount(resourceRequirements[resource].mandatoryResources[i], daysCount, resourcesProduced),
                isMandatory: true
            });
            index++;
        }

        return amounts;
    }

    function doesResourceRequireBurning(string memory resource) public view returns (bool) {
        return resourcesRequiringBurn[resource];
    }

    function _calculateRequiredAmount(ResourceAmount memory resourceAmount, uint256 daysCount, uint256 resourcesProduced) internal pure returns (uint256) {
        if (resourceAmount.method == CalculationMethod.PerDay) {            
            return resourceAmount.amount * daysCount;
        } else {          
            return (resourcesProduced * 10**18) / resourceAmount.amount;
        }
    }

    function _burnRequiredResources(address storageContract, uint256 tokenId, address user, string memory resource, string[] memory resourcesToBurn, uint256 daysCount, uint256 resourcesProduced) internal {
        IResourceManagement resourceManagement = IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
        
        ResourceRequirement memory requirement = resourceRequirements[resource];
        
        // Burn mandatory resources
        for (uint256 i = 0; i < requirement.mandatoryResources.length; i++) {
            ResourceAmount memory resourceToSpend = requirement.mandatoryResources[i];
            uint256 requiredAmount = _calculateRequiredAmount(resourceToSpend, daysCount, resourcesProduced);
            uint256 userResourceBalance = resourceManagement.getResourceBalance(storageContract, tokenId, resourceToSpend.resource);
            require(userResourceBalance >= requiredAmount, string(abi.encodePacked("Insufficient resource balance for ", resourceToSpend.resource)));            
            resourceManagement.burnResource(storageContract, tokenId, user, resourceToSpend.resource, requiredAmount);
        }

        // Burn optional resources
        bool burnedOptional = false;
        for (uint256 i = 0; i < resourcesToBurn.length; i++) {
            for (uint256 j = 0; j < requirement.optionalResources.length; j++) {
                if (keccak256(bytes(resourcesToBurn[i])) == keccak256(bytes(requirement.optionalResources[j].resource))) {
                    ResourceAmount memory resourceToSpend = requirement.optionalResources[j];
                    uint256 requiredAmount = _calculateRequiredAmount(resourceToSpend, daysCount, resourcesProduced);
                    uint256 userResourceBalance = resourceManagement.getResourceBalance(storageContract, tokenId, resourceToSpend.resource);
                    require(userResourceBalance >= requiredAmount, string(abi.encodePacked("Insufficient resource balance for ", resourceToSpend.resource)));
                    resourceManagement.burnResource(storageContract, tokenId, user, resourceToSpend.resource, requiredAmount);
                    burnedOptional = true;
                    break;
                }
            }
            if (burnedOptional) break;
        }
        require(burnedOptional, "At least one optional resource must be burned");
    }

    function handleResourceBurning(
        address storageContract,
        uint256 tokenId,
        address user,
        string memory resource,
        uint256 daysCount,
        uint256 resourcesProduced,
        string[] memory resourcesToBurn
    ) external onlyAuthorized() { 
        require(resourcesRequiringBurn[resource], "Resource does not require burning");

        _burnRequiredResources(storageContract, tokenId, user, resource, resourcesToBurn, daysCount, resourcesProduced);
    }
}
