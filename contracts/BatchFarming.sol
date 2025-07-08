// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./ResourceFarming.sol";

contract BatchFarming {
    ResourceFarming public resourceFarming;

    struct FarmResourceParams {
        uint256 tokenId;
        string resource;
        uint256 daysCount;
        string resourceToBurn;
    }

    constructor(address _resourceFarmingAddress) {
        resourceFarming = ResourceFarming(_resourceFarmingAddress);
    }

    function batchFarmResource(
        address collectionAddress,
        FarmResourceParams[] memory params,
        bool useRum
    ) public payable {
        uint256 valuePerCall = useRum ? 0 : msg.value / params.length;

        for (uint256 i = 0; i < params.length; i++) {
            resourceFarming.farmResource{value: valuePerCall}(
                collectionAddress,
                params[i].tokenId,
                params[i].resource,
                params[i].daysCount,
                useRum,
                params[i].resourceToBurn,
                false
            );
        }
    }
}
