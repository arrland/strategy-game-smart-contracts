// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "./FeeManagement.sol";
import "./ActivityStats.sol";
import "./interfaces/IFeeManagement.sol";
import "./interfaces/IActivityStats.sol";


contract DailyCheckin is AuthorizationModifiers {

    event Checkin(address indexed user, uint256 dayCount);

    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IDailyCheckin")) {        
    }

    function getFeeManagement() internal view returns (IFeeManagement) {
        return IFeeManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IFeeManagement")));
    }

    function getActivityStats() internal view returns (IActivityStats) {
        return IActivityStats(centralAuthorizationRegistry.getContractAddress(keccak256("IActivityStats")));
    }

    function checkin() public {
        address user = msg.sender;

        IFeeManagement feeManagement = getFeeManagement();
        IActivityStats activityStats = getActivityStats();

        // Charge 1 RUM token
        feeManagement.useRum(user, feeManagement.rumFeePerDay());

        // Call addActivity
        activityStats.addActivity(user);

        emit Checkin(user, 1);
    }
}