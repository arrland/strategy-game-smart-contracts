// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IResourceTypeManager {
    struct ResourceType {
        string name;
        bool canBeCarriedBetweenStorages;
        bool canBeTransferredToGlobalMarketplace;
    }

    event ResourceTypeAdded(string name, bool canBeCarriedBetweenStorages, bool canBeTransferredToGlobalMarketplace);
    event ResourceTypeUpdated(string name, bool canBeCarriedBetweenStorages, bool canBeTransferredToGlobalMarketplace);
    event ResourceTypeRemoved(string name);

    function addResourceType(
        string memory name,
        bool canBeCarriedBetweenStorages,
        bool canBeTransferredToGlobalMarketplace
    ) external;

    function updateResourceType(
        string memory name,
        bool canBeCarriedBetweenStorages,
        bool canBeTransferredToGlobalMarketplace
    ) external;

    function removeResourceType(string memory name) external;

    function getResourceTypes() external view returns (ResourceType[] memory);

    function isValidResourceType(string memory name) external view returns (bool);

    function getResourceTypeNames() external view returns (string[] memory);
}
