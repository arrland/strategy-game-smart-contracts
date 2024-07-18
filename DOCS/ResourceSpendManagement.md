# ResourceSpendManagement.sol

## Overview

The `ResourceSpendManagement` contract is designed to manage the requirements and burning of resources within a system. It extends the `AuthorizationModifiers` contract to ensure that only authorized entities can interact with its functions.

## Prerequisites

- Solidity version: ^0.8.25
- Dependencies:
  - `AuthorizationModifiers.sol`
  - `IResourceManagement.sol`
  - `Strings.sol` from OpenZeppelin
  - `IResourceTypeManager.sol`

## Contract Details

### Enums

- `CalculationMethod`: Defines the method of calculation for resource amounts.
  - `PerDay`: Calculation based on a per-day rate.
  - `Divide`: Calculation based on division of produced resources.

### Structs

- `ResourceAmount`: Represents an amount of a specific resource.
  - `string resource`: The name of the resource.
  - `uint256 amount`: The amount of the resource.
  - `CalculationMethod method`: The method used to calculate the resource amount.

- `ResourceRequirement`: Represents the requirements for a resource.
  - `ResourceAmount[] optionalResources`: Optional resources required.
  - `ResourceAmount[] mandatoryResources`: Mandatory resources required.

- `ResourceRequirementAmount`: Represents the amount of a resource required.
  - `string resourceName`: The name of the resource.
  - `uint256 amount`: The amount required.
  - `bool isMandatory`: Indicates if the resource is mandatory.

### State Variables

- `mapping(string => ResourceRequirement) internal resourceRequirements`: Stores the resource requirements.
- `mapping(string => bool) public resourcesRequiringBurn`: Indicates if a resource requires burning.

### Constructor

- `constructor(address _centralAuthorizationRegistry)`: Initializes the contract with the central authorization registry address and sets initial resource requirements for "wood" and "planks".

### Internal Functions

- `getResourceTypeManager() internal view returns (IResourceTypeManager)`: Retrieves the resource type manager contract.
- `_setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) internal validResourceName(resource)`: Sets the resource requirements for a given resource.
- `_calculateRequiredAmount(ResourceAmount memory resourceAmount, uint256 daysCount, uint256 resourcesProduced) internal pure returns (uint256)`: Calculates the required amount of a resource based on the calculation method.
- `_burnRequiredResources(address storageContract, uint256 tokenId, address user, string memory resource, string[] memory resourcesToBurn, uint256 daysCount, uint256 resourcesProduced) internal`: Burns the required resources for a given resource.

### Modifiers

- `validResourceName(string memory resource)`: Ensures the resource name is valid by checking with the resource type manager.

### Public Functions

- `setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) public onlyAdmin validResourceName(resource)`:
  - Description: Sets the resource requirements for a given resource.
  - Parameters:
    - `resource`: The name of the resource.
    - `optionalResources`: An array of optional resources required.
    - `mandatoryResources`: An array of mandatory resources required.

- `getResourceRequirements(string memory resource) public view returns (ResourceRequirement memory)`:
  - Description: Retrieves the resource requirements for a given resource.
  - Parameters:
    - `resource`: The name of the resource.
  - Returns: The resource requirements.

- `getResourceRequirementAmounts(string memory resource, uint256 daysCount, uint256 resourcesProduced) public view returns (ResourceRequirementAmount[] memory)`:
  - Description: Retrieves the amounts of resources required for a given resource.
  - Parameters:
    - `resource`: The name of the resource.
    - `daysCount`: The number of days.
    - `resourcesProduced`: The amount of resources produced.
  - Returns: An array of resource requirement amounts.

- `doesResourceRequireBurning(string memory resource) public view returns (bool)`:
  - Description: Checks if a resource requires burning.
  - Parameters:
    - `resource`: The name of the resource.
  - Returns: `true` if the resource requires burning, otherwise `false`.

- `handleResourceBurning(address storageContract, uint256 tokenId, address user, string memory resource, uint256 daysCount, uint256 resourcesProduced, string[] memory resourcesToBurn) external onlyAuthorized()`:
  - Description: Handles the burning of required resources for a given resource.
  - Parameters:
    - `storageContract`: The address of the storage contract.
    - `tokenId`: The token ID.
    - `user`: The address of the user.
    - `resource`: The name of the resource.
    - `daysCount`: The number of days.
    - `resourcesProduced`: The amount of resources produced.
    - `resourcesToBurn`: An array of resources to burn.

## Usage

1. **Setting Resource Requirements**: Use `setResourceRequirements` to define the optional and mandatory resources required for a specific resource.
2. **Getting Resource Requirements**: Use `getResourceRequirements` to retrieve the requirements for a specific resource.
3. **Calculating Resource Amounts**: Use `getResourceRequirementAmounts` to calculate the amounts of resources required based on the number of days and resources produced.
4. **Burning Resources**: Use `handleResourceBurning` to burn the required resources for a specific resource.

