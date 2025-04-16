// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/ITravelTimeCalculator.sol";

contract MissionTravelCalculator is AuthorizationModifiers {
    // Constants
    uint256 public constant SECONDS_IN_DAY = 24 * 60 * 60;

    constructor(
        address _centralAuthorizationRegistry
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IMissionTravelCalculator")) {}

    function calculateTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId
    ) external view returns (uint256 travelTime) {
        // If same island, no travel time
        if (fromIslandId == toIslandId) {
            return 0;
        }
        
        ITravelTimeCalculator travelCalculator = getTravelTimeCalculator();
        
        // Calculate time using the core calculator
        // We use the implementation with cache=true for better performance
        travelTime = travelCalculator.calculateTravelTime(
            fromIslandId,
            toIslandId,
            shipId,
            true // use cache
        );
        
        return travelTime;
    }
    
    function calculateRoundTripTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId
    ) external view returns (uint256 outboundTime, uint256 inboundTime) {
        ITravelTimeCalculator travelCalculator = getTravelTimeCalculator();
        return travelCalculator.calculateRoundTripTravelTime(
            fromIslandId,
            toIslandId,
            shipId,
            true // use cache
        );
    }
    
    /**
     * @notice Calculate load/unload time for a mission
     * @param resourceAmount Amount of resources to load/unload
     * @param crewCount Total crew on the ship
     * @param portLevel Level of the port (each level = 1% speedup)
     * @return loadTime Time in seconds
     */
    function calculateLoadTime(uint256 resourceAmount, uint256 crewCount, uint256 portLevel) public pure returns (uint256 loadTime) {
        if (crewCount == 0) return type(uint256).max; // Prevent division by zero
        uint256 baseLoadTime = resourceAmount / crewCount;
        uint256 speedup = 100 - portLevel; // Each level = 1% faster
        loadTime = (baseLoadTime * speedup) / 100;
    }
    
    // Internal contract access functions
    function getTravelTimeCalculator() internal view returns (ITravelTimeCalculator) {
        return ITravelTimeCalculator(
            centralAuthorizationRegistry.getContractAddress(keccak256("ITravelTimeCalculator"))
        );
    }
} 