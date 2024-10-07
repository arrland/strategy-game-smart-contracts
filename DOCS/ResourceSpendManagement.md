# ResourceSpendManagement.sol

## Overview

The `ResourceSpendManagement` contract manages resource requirements and burning within the system. It extends `AuthorizationModifiers` to ensure only authorized entities can interact with its functions.

## Prerequisites

- Solidity version: ^0.8.25
- Dependencies:
  - `AuthorizationModifiers.sol`
  - `IResourceManagement.sol`
  - `Strings.sol` from OpenZeppelin
  - `IResourceTypeManager.sol`

## Contract Details

### Enums

- `CalculationMethod`: Defines resource amount calculation method.
  - `PerDay`: Based on a per-day rate.
  - `Divide`: Based on division of produced resources.

### Structs

- `ResourceAmount`: Represents a resource amount.
  - `string resource`: Resource name.
  - `uint256 amount`: Resource amount.
  - `CalculationMethod method`: Calculation method.

- `ResourceRequirement`: Represents resource requirements.
  - `ResourceAmount[] optionalResources`: Optional resources.
  - `ResourceAmount[] mandatoryResources`: Mandatory resources.

- `ResourceRequirementAmount`: Represents required resource amount.
  - `string resourceName`: Resource name.
  - `uint256 amount`: Required amount.
  - `bool isMandatory`: Mandatory flag.

### State Variables

- `mapping(string => ResourceRequirement) internal resourceRequirements`: Stores resource requirements.
- `mapping(string => bool) public resourcesRequiringBurn`: Indicates if a resource requires burning.

### Constructor

- `constructor(address _centralAuthorizationRegistry)`: Initializes the contract.

### Internal Functions

- `getResourceTypeManager() internal view returns (IResourceTypeManager)`: Gets resource type manager contract.
- `_setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) internal validResourceName(resource)`: Sets resource requirements.
- `_calculateRequiredAmount(ResourceAmount memory resourceAmount, uint256 daysCount, uint256 resourcesProduced) internal pure returns (uint256)`: Calculates required resource amount.
- `_burnRequiredResources(address storageContract, uint256 tokenId, address user, string memory resource, string[] memory resourcesToBurn, uint256 daysCount, uint256 resourcesProduced) internal`: Burns required resources.

### Modifiers

- `validResourceName(string memory resource)`: Ensures valid resource name.

### Public Functions

- `setResourceRequirements(string memory resource, ResourceAmount[] memory optionalResources, ResourceAmount[] memory mandatoryResources) public onlyAdmin validResourceName(resource)`: Sets resource requirements.
- `getResourceRequirements(string memory resource) public view returns (ResourceRequirement memory)`: Gets resource requirements.
- `getResourceRequirementAmounts(string memory resource, uint256 daysCount, uint256 resourcesProduced) public view returns (ResourceRequirementAmount[] memory)`: Gets required resource amounts.
- `doesResourceRequireBurning(string memory resource) public view returns (bool)`: Checks if resource requires burning.
- `handleResourceBurning(address storageContract, uint256 tokenId, address user, string memory resource, uint256 daysCount, uint256 resourcesProduced, string[] memory resourcesToBurn) external onlyAuthorized()`: Handles resource burning.

## Resource Spend Rules

1. Planks
   - Optional: Higher Food Resources
   - Mandatory: Wood: 2 ONE_ETHER (Divide)

2. Wood
   - Optional: Higher Food Resources
   - Mandatory: None

3. Crates
   - Optional: Lower Food Resources
   - Mandatory: Planks: 2 ONE_ETHER (Divide)

4. Barrels
   - Optional: Lower Food Resources
   - Mandatory: Planks: 4 ONE_ETHER (Divide)

5. Bags
   - Optional: Lower Food Resources
   - Mandatory: Cotton: 1 ONE_ETHER (Divide)

6. Bag-packed Tobacco
   - Optional: Lower Food Resources
   - Mandatory:
     - Tobacco: 0.01 ONE_ETHER (Divide)
     - Bags: 1 ONE_ETHER (Divide)

7. Bag-packed Grain
   - Optional: Lower Food Resources
   - Mandatory:
     - Grain: 0.01 ONE_ETHER (Divide)
     - Bags: 1 ONE_ETHER (Divide)

8. Bag-packed Cotton
   - Optional: Lower Food Resources
   - Mandatory:
     - Cotton: 0.01 ONE_ETHER (Divide)
     - Bags: 1 ONE_ETHER (Divide)

9. Bag-packed Sugarcane
   - Optional: Lower Food Resources
   - Mandatory:
     - Sugarcane: 0.01 ONE_ETHER (Divide)
     - Bags: 1 ONE_ETHER (Divide)

10. Pig
    - Optional: None
    - Mandatory: Bag-packed grain: 0.001 ONE_ETHER (PerDay)

11. Wild Game
    - Optional: Lower Food Resources
    - Mandatory: Bag-packed tobacco: 0.01 ONE_ETHER (PerDay)

12. Coconut Liquor
    - Optional: Lower Food Resources
    - Mandatory:
      - Bag-packed sugarcane: 25 ONE_ETHER (Divide)
      - Bag-packed coconut: 100 ONE_ETHER (Divide)

13. Meat
    - Optional: None
    - Mandatory:
      - Pig: 0.02 ONE_ETHER (Divide)
      - Wild game: 0.02 ONE_ETHER (Divide)

14. Barrel-packed Fish
    - Optional: None
    - Mandatory:
      - Barrels: 1 ONE_ETHER (Divide)
      - Fish: 0.01 ONE_ETHER (Divide)
      - Crate-packed citrus: 10 ONE_ETHER (Divide)

15. Barrel-packed Meat
    - Optional: None
    - Mandatory:
      - Barrels: 1 ONE_ETHER (Divide)
      - Meat: 0.01 ONE_ETHER (Divide)
      - Crate-packed citrus: 10 ONE_ETHER (Divide)

16. Crate-packed Citrus
    - Optional: None
    - Mandatory:
      - Crates: 1 ONE_ETHER (Divide)
      - Citrus: 0.02 ONE_ETHER (Divide)

17. Crate-packed Coconuts
    - Optional: None
    - Mandatory:
      - Crates: 1 ONE_ETHER (Divide)
      - Coconut: 0.04 ONE_ETHER (Divide)

### Food Resources

Higher Food Resources:
- Fish: 1 ONE_ETHER (PerDay)
- Coconut: 2 ONE_ETHER (PerDay)
- Meat: 0.5 ONE_ETHER (PerDay)
- Barrel-packed fish: 0.01 ONE_ETHER (PerDay)
- Barrel-packed meat: 0.005 ONE_ETHER (PerDay)

Lower Food Resources:
- Coconut: 1 ONE_ETHER (PerDay)
- Fish: 0.5 ONE_ETHER (PerDay)
- Meat: 0.25 ONE_ETHER (PerDay)
- Barrel-packed fish: 0.005 ONE_ETHER (PerDay)
- Barrel-packed meat: 0.0001 ONE_ETHER (PerDay)

These rules define the resources required to produce each type, with some being optional and others mandatory.
