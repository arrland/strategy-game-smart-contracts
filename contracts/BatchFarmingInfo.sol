// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./ResourceFarming.sol";

contract BatchFarmingInfo {

    ResourceFarming public resourceFarming;

    constructor(address _resourceFarmingAddress) {
        resourceFarming = ResourceFarming(_resourceFarmingAddress);
    }

    function batchGetFarmingInfo(address collectionAddress, uint256[] memory tokenIds) public view returns (ResourceFarming.FarmingInfoDetails[] memory) {
        ResourceFarming.FarmingInfoDetails[] memory farmingInfoDetailsArray = new ResourceFarming.FarmingInfoDetails[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            farmingInfoDetailsArray[i] = resourceFarming.getFarmingInfo(collectionAddress, tokenIds[i]);
        }

        return farmingInfoDetailsArray;
    }
}