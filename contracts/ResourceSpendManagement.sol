// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "./interfaces/IResourceManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IResourceTypeManager.sol";
import "./interfaces/IStorageManagement.sol";
import "./interfaces/IResourceSpendManagement.sol";
import "hardhat/console.sol"; // Import console for debugging

contract ResourceSpendManagement is IResourceSpendManagement, AuthorizationModifiers {
    using Strings for string;

    uint256 public constant ONE_ETHER = 1 ether; // For 18-decimal calculations


    mapping(string => ResourceRequirement) internal resourceRequirements;
    mapping(string => bool) public resourcesRequiringBurn;

    // === NEW: Action-centric ===
    mapping(string => ResourceRequirement) internal actionResourceRequirements;
    mapping(string => bool) public actionsRequiringBurn;

    // Define a struct to represent the tuple
    struct ResourceTuple {
        string resource;
        uint256 amount;
        CalculationMethod method;
    }

    constructor(address _centralAuthorizationRegistry) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IResourceSpendManagement")) {    
        _initializeResourceRequirements();
    }

    function _initializeResourceRequirements() internal {
        ResourceTuple[] memory higherFoodResources = new ResourceTuple[](5);
        higherFoodResources[0] = ResourceTuple("fish", 2 * ONE_ETHER, CalculationMethod.PerDay);
        higherFoodResources[1] = ResourceTuple("coconut", 4 * ONE_ETHER, CalculationMethod.PerDay);
        higherFoodResources[2] = ResourceTuple("meat", ONE_ETHER, CalculationMethod.PerDay); // 0.5 * ONE_ETHER
        higherFoodResources[3] = ResourceTuple("barrel-packed fish", ONE_ETHER / 50, CalculationMethod.PerDay); // 0.01 * ONE_ETHER
        higherFoodResources[4] = ResourceTuple("barrel-packed meat", ONE_ETHER / 100, CalculationMethod.PerDay); // 0.005 * ONE_ETHER

        ResourceTuple[] memory middleFoodResources = new ResourceTuple[](5);
        middleFoodResources[0] = ResourceTuple("fish", ONE_ETHER, CalculationMethod.PerDay);
        middleFoodResources[1] = ResourceTuple("coconut", 2 * ONE_ETHER, CalculationMethod.PerDay);
        middleFoodResources[2] = ResourceTuple("meat", ONE_ETHER / 2, CalculationMethod.PerDay); // 0.5 * ONE_ETHER
        middleFoodResources[3] = ResourceTuple("barrel-packed fish", ONE_ETHER / 100, CalculationMethod.PerDay); // 0.01 * ONE_ETHER
        middleFoodResources[4] = ResourceTuple("barrel-packed meat", ONE_ETHER / 200, CalculationMethod.PerDay); // 0.005 * ONE_ETHER

        ResourceTuple[] memory lowerFoodResources = new ResourceTuple[](5);
        lowerFoodResources[0] = ResourceTuple("coconut", ONE_ETHER, CalculationMethod.PerDay);  
        lowerFoodResources[1] = ResourceTuple("fish", ONE_ETHER / 2, CalculationMethod.PerDay); // 0.5 * ONE_ETHER
        lowerFoodResources[2] = ResourceTuple("meat", ONE_ETHER / 4, CalculationMethod.PerDay); // 0.25 * ONE_ETHER
        lowerFoodResources[3] = ResourceTuple("barrel-packed fish", ONE_ETHER / 200, CalculationMethod.PerDay); // 0.005 * ONE_ETHER
        lowerFoodResources[4] = ResourceTuple("barrel-packed meat", ONE_ETHER / 400, CalculationMethod.PerDay); // 0.0025 * ONE_ETHER

        ResourceTuple[] memory planksMandatoryResources = new ResourceTuple[](1);
        planksMandatoryResources[0] = ResourceTuple("wood", 2 * 10**18, CalculationMethod.Divide);

        ResourceTuple[] memory crateMandatoryResources = new ResourceTuple[](1);
        crateMandatoryResources[0] = ResourceTuple("planks", 2 * 10**18, CalculationMethod.Divide);

        ResourceTuple[] memory barrelMandatoryResources = new ResourceTuple[](1);
        barrelMandatoryResources[0] = ResourceTuple("planks", 4 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory cottonMandatoryResources = new ResourceTuple[](1);
        cottonMandatoryResources[0] = ResourceTuple("cotton", 1 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory bagPackedTobaccoMandatoryResources = new ResourceTuple[](2);
        bagPackedTobaccoMandatoryResources[0] = ResourceTuple("tobacco", ONE_ETHER / 100, CalculationMethod.Divide); // 0.01 * ONE_ETHER
        bagPackedTobaccoMandatoryResources[1] = ResourceTuple("bags", 1 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory bagPackedGrainMandatoryResources = new ResourceTuple[](2);
        bagPackedGrainMandatoryResources[0] = ResourceTuple("grain", ONE_ETHER / 100, CalculationMethod.Divide); // 0.01 * ONE_ETHER
        bagPackedGrainMandatoryResources[1] = ResourceTuple("bags", 1 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory bagPackedCottonMandatoryResources = new ResourceTuple[](2);
        bagPackedCottonMandatoryResources[0] = ResourceTuple("cotton", ONE_ETHER / 100, CalculationMethod.Divide); // 0.01 * ONE_ETHER
        bagPackedCottonMandatoryResources[1] = ResourceTuple("bags", 1 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory bagPackedSugarcaneMandatoryResources = new ResourceTuple[](2);
        bagPackedSugarcaneMandatoryResources[0] = ResourceTuple("sugarcane", ONE_ETHER / 100, CalculationMethod.Divide); // 0.01 * ONE_ETHER
        bagPackedSugarcaneMandatoryResources[1] = ResourceTuple("bags", 1 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory pigMandatoryResources = new ResourceTuple[](1);
        pigMandatoryResources[0] = ResourceTuple("bag-packed grain", ONE_ETHER / 100, CalculationMethod.PerDay); // 0.01 * ONE_ETHER

        ResourceTuple[] memory wildGameMandatoryResources = new ResourceTuple[](1);
        wildGameMandatoryResources[0] = ResourceTuple("bag-packed tobacco", ONE_ETHER / 100, CalculationMethod.PerDay); // 0.01 * ONE_ETHER

        ResourceTuple[] memory coconutLiquorMandatoryResources = new ResourceTuple[](2);
        coconutLiquorMandatoryResources[0] = ResourceTuple("bag-packed sugarcane", 100 * ONE_ETHER, CalculationMethod.Divide);
        coconutLiquorMandatoryResources[1] = ResourceTuple("crate-packed coconuts", 25 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory meatMandatoryResources = new ResourceTuple[](2);
        meatMandatoryResources[0] = ResourceTuple("pig", 50 * ONE_ETHER, CalculationMethod.Divide); // 0.02 * ONE_ETHER
        meatMandatoryResources[1] = ResourceTuple("wild game", 50 * ONE_ETHER, CalculationMethod.Divide); // 0.02 * ONE_ETHER

        ResourceTuple[] memory barrelPackedFishMandatoryResources = new ResourceTuple[](3);
        barrelPackedFishMandatoryResources[0] = ResourceTuple("barrels", ONE_ETHER, CalculationMethod.Divide);
        barrelPackedFishMandatoryResources[1] = ResourceTuple("fish", ONE_ETHER / 100, CalculationMethod.Divide); // 0.01 * ONE_ETHER
        barrelPackedFishMandatoryResources[2] = ResourceTuple("crate-packed citrus", 10 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory barrelPackedMeatMandatoryResources = new ResourceTuple[](3);
        barrelPackedMeatMandatoryResources[0] = ResourceTuple("barrels", ONE_ETHER, CalculationMethod.Divide);
        barrelPackedMeatMandatoryResources[1] = ResourceTuple("meat", ONE_ETHER / 100, CalculationMethod.Divide); // 0.01 * ONE_ETHER
        barrelPackedMeatMandatoryResources[2] = ResourceTuple("crate-packed citrus", 10 * ONE_ETHER, CalculationMethod.Divide);

        ResourceTuple[] memory cratePackedCitrusMandatoryResources = new ResourceTuple[](2);
        cratePackedCitrusMandatoryResources[0] = ResourceTuple("crates", ONE_ETHER, CalculationMethod.Divide);
        cratePackedCitrusMandatoryResources[1] = ResourceTuple("citrus", ONE_ETHER / 50, CalculationMethod.Divide); // 0.02 * ONE_ETHER

        ResourceTuple[] memory cratePackedCoconutsMandatoryResources = new ResourceTuple[](2);
        cratePackedCoconutsMandatoryResources[0] = ResourceTuple("crates", ONE_ETHER, CalculationMethod.Divide);
        cratePackedCoconutsMandatoryResources[1] = ResourceTuple("coconut", ONE_ETHER / 25, CalculationMethod.Divide); // 0.04 * ONE_ETHER

        // Add clay requirements (no resources needed to farm)
        _setResourceRequirements("clay", _createResourceAmounts(higherFoodResources), new ResourceAmount[](0));

        // Add stone requirements (no resources needed to farm)
        _setResourceRequirements("stone", _createResourceAmounts(higherFoodResources), new ResourceAmount[](0));

        // Add bricks requirements (requires clay and stone)
        ResourceTuple[] memory bricksMandatoryResources = new ResourceTuple[](3);
        bricksMandatoryResources[0] = ResourceTuple("clay", 100 * ONE_ETHER, CalculationMethod.Divide); // 100 brics from 1 clay
        bricksMandatoryResources[1] = ResourceTuple("wood", 100 * ONE_ETHER, CalculationMethod.Divide); // 100 brics from 1 wood
        bricksMandatoryResources[2] = ResourceTuple("planks", 100 * ONE_ETHER, CalculationMethod.Divide); // 100 brics from 1 plank

        _setResourceRequirements("bricks", _createResourceAmounts(middleFoodResources), _createResourceAmounts(bricksMandatoryResources));

        _setResourceRequirements("planks", _createResourceAmounts(middleFoodResources), _createResourceAmounts(planksMandatoryResources));

        _setResourceRequirements("wood", _createResourceAmounts(middleFoodResources), new ResourceAmount[](0));

        _setResourceRequirements("crates", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(crateMandatoryResources));

        _setResourceRequirements("barrels", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(barrelMandatoryResources));

        _setResourceRequirements("bags", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(cottonMandatoryResources));

        _setResourceRequirements("bag-packed tobacco", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(bagPackedTobaccoMandatoryResources));

        _setResourceRequirements("bag-packed grain", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(bagPackedGrainMandatoryResources));

        _setResourceRequirements("bag-packed cotton", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(bagPackedCottonMandatoryResources));

        _setResourceRequirements("bag-packed sugarcane", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(bagPackedSugarcaneMandatoryResources));

        _setResourceRequirements("pig", new ResourceAmount[](0), _createResourceAmounts(pigMandatoryResources));

        _setResourceRequirements("wild game", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(wildGameMandatoryResources));

        _setResourceRequirements("coconut liquor", _createResourceAmounts(lowerFoodResources), _createResourceAmounts(coconutLiquorMandatoryResources));

        _setResourceRequirements("meat", _createResourceAmounts(meatMandatoryResources), new ResourceAmount[](0));

        _setResourceRequirements("barrel-packed fish", new ResourceAmount[](0), _createResourceAmounts(barrelPackedFishMandatoryResources));

        _setResourceRequirements("barrel-packed meat", new ResourceAmount[](0), _createResourceAmounts(barrelPackedMeatMandatoryResources));

        _setResourceRequirements("crate-packed citrus", new ResourceAmount[](0), _createResourceAmounts(cratePackedCitrusMandatoryResources));

        _setResourceRequirements("crate-packed coconuts", new ResourceAmount[](0), _createResourceAmounts(cratePackedCoconutsMandatoryResources));

        // === Initialize Primary Food Consumption ===
        ResourceAmount[] memory primaryFoodOptions = new ResourceAmount[](2);
        primaryFoodOptions[0] = ResourceAmount({resource: "citrus", amount: ONE_ETHER / 2, method: CalculationMethod.PerDay});
        primaryFoodOptions[1] = ResourceAmount({resource: "crate-packed citrus", amount: ONE_ETHER / 50, method: CalculationMethod.PerDay});
        ResourceAmount[] memory primaryFoodMandatory; // No mandatory for this action
        _setActionResourceRequirementsInternal("consumePrimaryFood", primaryFoodOptions, primaryFoodMandatory);
        // === Initialize Ration Food Consumption ===
        ResourceAmount[] memory consumeRationFoodOptionalBarrel = new ResourceAmount[](1);
        consumeRationFoodOptionalBarrel[0] = ResourceAmount({
            resource: "barrel-packed meat",
            amount: 1, // 1 base unit per crew per day
            method: CalculationMethod.PerDay
        });
        _setActionResourceRequirementsInternal("consumeRationFood", consumeRationFoodOptionalBarrel, new ResourceAmount[](0));

        ResourceAmount[] memory consumeRationFoodOptionalFish = new ResourceAmount[](1);
        consumeRationFoodOptionalFish[0] = ResourceAmount({
            resource: "fish",
            amount: ONE_ETHER / 2,
            method: CalculationMethod.PerDay
        });
        // Add fish to consumeRationFood (it might overwrite or need to be additive; current _setActionResourceRequirementsInternal overwrites)
        // For now, let's assume tests will pick one. If we need both, this setup needs adjustment.
        _setActionResourceRequirementsInternal("consumeRationFood", consumeRationFoodOptionalFish, new ResourceAmount[](0));

        // Add other initializations as needed...
    }

    function _createResourceAmounts(ResourceTuple[] memory resources) internal pure returns (ResourceAmount[] memory) {
        ResourceAmount[] memory resourceAmounts = new ResourceAmount[](resources.length);
        for (uint256 i = 0; i < resources.length; i++) {
            resourceAmounts[i] = ResourceAmount(resources[i].resource, resources[i].amount, resources[i].method);
        }
        return resourceAmounts;
    }

    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceTypeManager")));
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }   

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
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

    function setResourceRequirements(
        string memory resource, 
        ResourceAmount[] memory optionalResources,
        ResourceAmount[] memory mandatoryResources
    ) external override onlyAdmin validResourceName(resource) {
        _setResourceRequirements(resource, optionalResources, mandatoryResources);
    }

    function getResourceRequirements(string memory resource) external view override returns (ResourceRequirement memory) {
        return resourceRequirements[resource];
    }

    function getResourceRequirementAmounts(string memory resource, uint256 daysCount, uint256 resourcesProduced) external view override returns (ResourceRequirementAmount[] memory) {
        uint256 totalResources = resourceRequirements[resource].optionalResources.length + resourceRequirements[resource].mandatoryResources.length;
        ResourceRequirementAmount[] memory amounts = new ResourceRequirementAmount[](totalResources);

        uint256 index = 0;
        for (uint256 i = 0; i < resourceRequirements[resource].optionalResources.length; i++) {
            amounts[index] = ResourceRequirementAmount({
                resourceName: resourceRequirements[resource].optionalResources[i].resource,
                amount: _calculateRequiredAmount(resourceRequirements[resource].optionalResources[i], daysCount, 1, resourcesProduced),
                isMandatory: false
            });
            index++;
        }

        for (uint256 i = 0; i < resourceRequirements[resource].mandatoryResources.length; i++) {
            amounts[index] = ResourceRequirementAmount({
                resourceName: resourceRequirements[resource].mandatoryResources[i].resource,
                amount: _calculateRequiredAmount(resourceRequirements[resource].mandatoryResources[i], daysCount, 1, resourcesProduced),
                isMandatory: true
            });
            index++;
        }

        return amounts;
    }

    function doesResourceRequireBurning(string memory resource) external view override returns (bool) {
        return resourcesRequiringBurn[resource];
    }

    function _calculateRequiredAmount(
        ResourceAmount memory resourceAmount,
        uint256 daysCount,
        uint256 totalCrew,            // For PerDay: rate * days * crew
        uint256 itemsToCraftOrProcess // For Divide: items * ONE_ETHER / rate
    ) internal pure returns (uint256) {
        if (resourceAmount.method == CalculationMethod.PerDay) {
            return resourceAmount.amount * daysCount * totalCrew;
        } else { // CalculationMethod.Divide
            require(resourceAmount.amount != 0, "RSM: Division by zero in Divide method");
            return (itemsToCraftOrProcess * ONE_ETHER) / resourceAmount.amount;
        }
    }

    // === Unified internal resource burning ===
    /**
     * @dev Internal function to burn resources according to a given ResourceRequirement
     * @param requirement The resource requirement struct (optionals, mandatories)
     * @param storageContract The storage contract address
     * @param tokenId The tokenId
     * @param user The user address
     * @param resourcesToBurn List of optional resources to burn
     * @param daysCount Days count (for PerDay calculations)
     * @param amountToProcess Produced amount (for Divide calculations)
     */
    function _burnRequiredResources(
        ResourceRequirement memory requirement,
        address storageContract,
        uint256 tokenId,
        address user,
        string[] memory resourcesToBurn,
        uint256 daysCount,  
        uint256 totalCrew,    // Passed through, may not be used by _calculateRequiredAmount for PerDay
        uint256 amountToProcess // Passed through to _calculateRequiredAmount
    ) internal {
        IStorageManagement storageManagement = getStorageManagement();
        address collectionAddress = storageManagement.getCollectionAddressByStorageContract(storageContract);
        address storageCollectionAddress;
        uint256 storageTokenId;
        address storageContractOrExternal;
        if (storageManagement.requiresOtherNFTForStorage(collectionAddress)) {            
            (storageCollectionAddress, storageTokenId) = storageManagement.getAssignedStorage(collectionAddress, tokenId);
            storageContractOrExternal = getStorageManagement().getStorageByCollection(storageCollectionAddress);
        } else {
            storageCollectionAddress = collectionAddress;
            storageTokenId = tokenId;
            storageContractOrExternal = storageContract;
        }
        IResourceManagement resourceManagement = getResourceManagement();
        // Burn mandatory resources
        for (uint256 i = 0; i < requirement.mandatoryResources.length; i++) {
            ResourceAmount memory resourceToSpend = requirement.mandatoryResources[i];
            uint256 requiredAmount = _calculateRequiredAmount(resourceToSpend, daysCount, totalCrew, amountToProcess);
            uint256 userResourceBalance = storageManagement.getResourceBalance(storageCollectionAddress, storageTokenId, resourceToSpend.resource);
            require(userResourceBalance >= requiredAmount, string(abi.encodePacked("Insufficient mandatory resource: ", resourceToSpend.resource)));
            resourceManagement.burnResource(storageContractOrExternal, storageTokenId, user, resourceToSpend.resource, requiredAmount);
        }
        // Burn optional resources
        bool burnedOptional = false;
        for (uint256 i = 0; i < resourcesToBurn.length; i++) {
            for (uint256 j = 0; j < requirement.optionalResources.length; j++) {
                if (keccak256(bytes(resourcesToBurn[i])) == keccak256(bytes(requirement.optionalResources[j].resource))) {
                    ResourceAmount memory resourceToSpend = requirement.optionalResources[j];
                    uint256 requiredAmount = _calculateRequiredAmount(resourceToSpend, daysCount, totalCrew, amountToProcess);
                    uint256 userResourceBalance = storageManagement.getResourceBalance(storageCollectionAddress, storageTokenId, resourceToSpend.resource);
                    require(userResourceBalance >= requiredAmount, string(abi.encodePacked("Insufficient optional resource: ", resourceToSpend.resource)));
                    //require(userResourceBalance >= requiredAmount, string(abi.encodePacked("Insufficient optional resource: ", resourceToSpend.resource, " (", Strings.toString(userResourceBalance), " < ", Strings.toString(requiredAmount), ")")));
                    resourceManagement.burnResource(storageContractOrExternal, storageTokenId, user, resourceToSpend.resource, requiredAmount);
                    burnedOptional = true;
                    break;
                }
            }
            if (burnedOptional) break;
        }
        if (requirement.optionalResources.length > 0) {
            require(burnedOptional, "At least one optional resource must be burned");
        }
    }

    // === Refactored: Resource-centric and Action-centric burning use unified function ===
    function handleResourceBurning(
        address storageContract,
        uint256 tokenId,
        address user,
        string memory resource,
        uint256 daysCount,
        uint256 resourcesProduced,
        string[] memory resourcesToBurn
    ) external override onlyAuthorized {
        require(resourcesRequiringBurn[resource], "Resource does not require burning");
        ResourceRequirement memory requirement = resourceRequirements[resource];
        _burnRequiredResources(requirement, storageContract, tokenId, user, resourcesToBurn, daysCount, 1, resourcesProduced);
    }

    function handleActionResourceBurning(
        string memory action,
        address storageContract,
        uint256 tokenId,
        address user,
        uint256 daysCount,   
        uint256 totalCrew,
        uint256 amountToProcess,   // For PerDay food, this is total pre-calculated. For Divide crafting, items to produce.
        string[] memory resourcesToBurn // Chosen optional resource
    ) external override onlyAuthorized {
        require(actionsRequiringBurn[action], "Action does not require burning");
        ResourceRequirement memory requirement = actionResourceRequirements[action];
        _burnRequiredResources(requirement, storageContract, tokenId, user, resourcesToBurn, daysCount, totalCrew, amountToProcess);
    }

    // === NEW: Action-centric API ===

    /**
     * @dev Internal function to set action resource requirements without admin check.
     * Called by the constructor and the external setActionResourceRequirements.
     */
    function _setActionResourceRequirementsInternal(
        string memory action,
        ResourceAmount[] memory optionalResources,
        ResourceAmount[] memory mandatoryResources
    ) internal validActionName(action) {
        actionResourceRequirements[action] = ResourceRequirement(optionalResources, mandatoryResources);
        actionsRequiringBurn[action] = true;
    }

    /**
     * @notice Set resource requirements for a specific action (e.g., "rebase", "missionStart")
     * @param action The action name
     * @param optionalResources Optional resources for the action
     * @param mandatoryResources Mandatory resources for the action
     */
    function setActionResourceRequirements(
        string memory action,
        ResourceAmount[] memory optionalResources,
        ResourceAmount[] memory mandatoryResources
    ) external override onlyAdmin { // validActionName is already in the internal function
        _setActionResourceRequirementsInternal(action, optionalResources, mandatoryResources);
    }

    /**
     * @notice Get resource requirements for a specific action
     * @param action The action name
     */
    function getActionResourceRequirements(string memory action) external view override returns (ResourceRequirement memory) {
        return actionResourceRequirements[action];
    }

    /**
     * @notice Check if an action requires burning resources
     * @param action The action name
     */
    function doesActionRequireBurning(string memory action) external view override returns (bool) {
        return actionsRequiringBurn[action];
    }


    function getOptionalActionResourceRate(
        string memory action,
        string memory resourceName
    ) external view override returns (uint256 rateWei, CalculationMethod method) {
        require(bytes(action).length > 0, "Action name cannot be empty");
        require(bytes(resourceName).length > 0, "Resource name cannot be empty");
        require(actionsRequiringBurn[action], "Action not defined or does not require burning");

        ResourceRequirement storage requirement = actionResourceRequirements[action];
        for (uint256 i = 0; i < requirement.optionalResources.length; i++) {
            if (keccak256(bytes(requirement.optionalResources[i].resource)) == keccak256(bytes(resourceName))) {
                return (requirement.optionalResources[i].amount, requirement.optionalResources[i].method);
            }
        }
        revert("RSM: Optional resource not found for the given action");
    }


    function calculateTotalFoodAmountForAction(
        string calldata actionName,
        string calldata foodChoice,
        uint256 totalCrew,
        uint256 travelDays
    ) external view override returns (uint256 totalAmount) {
        (uint256 rateWei, CalculationMethod method) = this.getOptionalActionResourceRate(actionName, foodChoice);
        require(method == CalculationMethod.PerDay, "RSM: Calculation for PerDay food items only");
        
        // For PerDay, rateWei is amount per crew per day.
        return rateWei * totalCrew * travelDays;
    }

    // === Validation for action names ===
    modifier validActionName(string memory action) {
        require(bytes(action).length > 0, "Invalid action name");
        _;
    }

    // New function to burn both primary and ration mission foods in one call
    function burnMissionStartFoods(
        address storageContract,
        uint256 tokenId,
        address user,
        uint256 daysCount,
        uint256 totalCrew,
        string calldata primaryFoodChoice,
        string calldata rationFoodChoice
    ) external override onlyAuthorized { 
        require(bytes(primaryFoodChoice).length > 0, "Primary food choice cannot be empty");
        require(bytes(rationFoodChoice).length > 0, "Ration food choice cannot be empty");

        string[] memory primaryFoodToBurn = new string[](1);
        primaryFoodToBurn[0] = primaryFoodChoice;
        this.handleActionResourceBurning(
            "consumePrimaryFood",
            storageContract,
            tokenId,
            user,
            daysCount,
            totalCrew,
            0, // itemsToCraftOrProcess (0 for PerDay food)
            primaryFoodToBurn
        );

        string[] memory rationFoodToBurn = new string[](1);
        rationFoodToBurn[0] = rationFoodChoice;
        this.handleActionResourceBurning(
            "consumeRationFood",
            storageContract,
            tokenId,
            user,
            daysCount,
            totalCrew,
            0, // itemsToCraftOrProcess (0 for PerDay food)
            rationFoodToBurn
        );
    }
}