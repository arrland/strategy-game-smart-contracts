// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITravelTimeCalculator {
    function SECONDS_IN_DAY() external pure returns (uint256);
    
    function MIN_TRAVEL_DURATION() external view returns (uint256);
    
    function BASE_SPEED() external view returns (uint256);
    
    function calculateTravelTime(
        uint256 fromIslandId, 
        uint256 toIslandId, 
        uint256 shipId, 
        bool useCache
    ) external view returns (uint256);
    
    function calculateBaseTravelTime(
        uint256 fromIslandId, 
        uint256 toIslandId
    ) external view returns (uint256);
    
    function calculateRoundTripTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId,
        bool useCache
    ) external view returns (uint256, uint256);
    
    function updateTravelTimeCache(
        uint256 fromIslandId, 
        uint256 toIslandId, 
        uint256 shipId
    ) external;
    
    function invalidateTravelTimeCache(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId,
        uint256 captainId,
        uint256 wisdomSkill,
        uint256 navigationSkill
    ) external;
}
