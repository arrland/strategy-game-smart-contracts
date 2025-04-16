// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IMissionTravelCalculator {
    function calculateTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId
    ) external view returns (uint256 travelTime);
    
    function calculateRoundTripTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId
    ) external view returns (uint256 outboundTime, uint256 inboundTime);

    function calculateLoadTime(
        uint256 resourceAmount,
        uint256 crewCount,
        uint256 portLevel
    ) external view returns (uint256 loadTime);
} 