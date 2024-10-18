// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "./interfaces/IResourceManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IResourceTypeManager.sol";
import "./interfaces/IStorageManagement.sol";


contract ResourceSpendManagement is AuthorizationModifiers {
    using Strings for string;

    uint256 constant ONE_ETHER = 10**18;

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
        higherFoodResources[0] = ResourceTuple("fish", ONE_ETHER, CalculationMethod.PerDay);
        higherFoodResources[1] = ResourceTuple("coconut", 2 * ONE_ETHER, CalculationMethod.PerDay);
        higherFoodResources[2] = ResourceTuple("meat", ONE_ETHER / 2, CalculationMethod.PerDay); // 0.5 * ONE_ETHER
        higherFoodResources[3] = ResourceTuple("barrel-packed fish", ONE_ETHER / 100, CalculationMethod.PerDay); // 0.01 * ONE_ETHER
        higherFoodResources[4] = ResourceTuple("barrel-packed meat", ONE_ETHER / 200, CalculationMethod.PerDay); // 0.005 * ONE_ETHER

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


        _setResourceRequirements("planks", _createResourceAmounts(higherFoodResources), _createResourceAmounts(planksMandatoryResources));

        _setResourceRequirements("wood", _createResourceAmounts(higherFoodResources), new ResourceAmount[](0));

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
            return (resourcesProduced * ONE_ETHER) / resourceAmount.amount;
        }
    }

    function _burnRequiredResources(address storageContract, uint256 tokenId, address user, string memory resource, string[] memory resourcesToBurn, uint256 daysCount, uint256 resourcesProduced) internal {
        
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
        
        ResourceRequirement memory requirement = resourceRequirements[resource];
        
        // Burn mandatory resources
        for (uint256 i = 0; i < requirement.mandatoryResources.length; i++) {
            ResourceAmount memory resourceToSpend = requirement.mandatoryResources[i];
            uint256 requiredAmount = _calculateRequiredAmount(resourceToSpend, daysCount, resourcesProduced);
            uint256 userResourceBalance = storageManagement.getResourceBalance(storageCollectionAddress, storageTokenId, resourceToSpend.resource);
            require(userResourceBalance >= requiredAmount, string(abi.encodePacked("Insufficient resource balance for ", resourceToSpend.resource)));            
            resourceManagement.burnResource(storageContractOrExternal, storageTokenId, user, resourceToSpend.resource, requiredAmount);
        }

        // Burn optional resources
        bool burnedOptional = false;
        for (uint256 i = 0; i < resourcesToBurn.length; i++) {
            for (uint256 j = 0; j < requirement.optionalResources.length; j++) {
                if (keccak256(bytes(resourcesToBurn[i])) == keccak256(bytes(requirement.optionalResources[j].resource))) {
                    ResourceAmount memory resourceToSpend = requirement.optionalResources[j];
                    uint256 requiredAmount = _calculateRequiredAmount(resourceToSpend, daysCount, resourcesProduced);
                    uint256 userResourceBalance = storageManagement.getResourceBalance(storageCollectionAddress, storageTokenId, resourceToSpend.resource);
                    require(userResourceBalance >= requiredAmount, string(abi.encodePacked("Insufficient resource balance for ", resourceToSpend.resource)));
                    resourceManagement.burnResource(storageContractOrExternal, storageTokenId, user, resourceToSpend.resource, requiredAmount);
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