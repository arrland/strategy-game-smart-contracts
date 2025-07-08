# Travel Time Calculation Enhancement Plan

## Overview

This document outlines the implementation plan for enhancing the travel time calculation system to incorporate ship speed and captain skills (wisdom and navigation). The formula for calculating voyage duration has been updated to:

```
Voyage Duration = (baseDuration / Ship speed) - ((Wisdom/2) + Navigation%)
```

## Implementation Phases

### Phase 1: Interface Updates

We've updated the following interfaces to support the new functionality:

1. **IPirateSkillsReader.sol**
   - Added `getWisdomSkill(uint256 tokenId)` to retrieve the wisdom skill level for a pirate
   - Added `getNavigationSkill(uint256 tokenId)` to retrieve the navigation skill level for a pirate

2. **IShipAndPirateStaking.sol**
   - Added `shipToCaptain(uint256 shipId)` to get the captain assigned to a ship
   - Added `getAssignedPirates(uint256 shipId)` to get all pirates assigned to a ship

### Phase 2: TravelTimeCalculator Updates

We've modified the `TravelTimeCalculator` contract to include the following changes:

1. **New Constants**
   - `MIN_TRAVEL_DURATION`: Minimum travel time of 6 hours to prevent negative or zero travel times
   - `BASE_SPEED`: Base ship speed value (10) for standardizing calculations

2. **Helper Functions**
   - `getPirateSkillsReader()`: Function to retrieve the PirateSkillsReader contract
   - `getShipAndPirateStaking()`: Function to retrieve the ShipAndPirateStaking contract

3. **Enhanced Cache Key**
   - Updated `_createCacheKey()` to include ship ID, captain ID, wisdom skill, and navigation skill
   - Maintained backward compatibility with an overloaded function

4. **Travel Time Calculation**
   - Modified `calculateTravelTime()` to apply the new formula:
     - Get the ship's speed from ShipStorage
     - Get the captain's ID from ShipAndPirateStaking
     - Retrieve wisdom and navigation skills from PirateSkillsReader
     - Apply the formula: (baseDuration * BASE_SPEED) / shipSpeed - skillBonus
     - Enforce minimum travel duration
   
5. **Cache Management**
   - Added functions for updating and invalidating cache entries for specific ships

### Phase 3: Mission Contract Updates

We've updated the mission contracts to utilize the enhanced travel time calculations:

1. **ResourceTransferMission.sol**
   - Added an overloaded `calculateResourceTransferDuration()` that takes a ship ID
   - Updated to use the enhanced travel time calculation

2. **TradeMission.sol**
   - Added a `calculateTradeJourneyDuration()` function that uses the enhanced calculation

### Phase 4: Testing

We've created a comprehensive test suite in `TravelTimeCalculator.t.sol` that includes:

1. **Mock Contracts**
   - MockCentralAuthRegistry
   - MockIslandRegionManagement
   - MockShipStorage
   - MockPirateSkillsReader
   - MockShipAndPirateStaking

2. **Test Scenarios**
   - Base travel time calculation for different distances
   - Travel time calculation with ship speed
   - Travel time calculation with captain skills
   - Minimum travel duration enforcement
   - Round-trip travel time calculation
   - Cache key generation and invalidation

## Implementation Details

### Formula Implementation

The formula `Voyage Duration = (baseDuration / Ship speed) - ((Wisdom/2) + Navigation%)` is implemented as follows:

1. Get base duration based on distance between islands
2. Adjust for ship speed: `adjustedDuration = (baseDuration * BASE_SPEED) / shipSpeed`
3. Calculate skill bonus: `skillBonus = (Wisdom/2 + Navigation) * adjustedDuration / 100`
4. Calculate final duration: `finalDuration = adjustedDuration - skillBonus`
5. Apply minimum duration check: `finalDuration = max(finalDuration, MIN_TRAVEL_DURATION)`

### Cache Considerations

The cache system has been updated to account for:

1. Ship-specific travel times (based on speed)
2. Captain-specific travel times (based on skills)
3. Efficient invalidation mechanisms when ships or captains change

### Backward Compatibility

The implementation maintains backward compatibility by:

1. Keeping all existing function signatures
2. Adding overloaded functions for new functionality
3. Preserving the original behavior for contracts that haven't been updated

## Deployment Considerations

1. **Gas Optimization**: The new implementation slightly increases gas costs due to additional external calls to retrieve captain skills. However, this is mitigated by the caching system.

2. **Security**: Ensure proper access controls are in place for the captain skill retrieval functions.

3. **Upgrade Process**:
   - Deploy updated interfaces first
   - Update TravelTimeCalculator
   - Update mission contracts one by one to use the new functionality

## Game Balance

The new travel time calculation will significantly impact game speed and balance:

1. **Faster Travel**: Players with skilled captains will have faster travel times, up to a 75% reduction with maximum skills.

2. **Minimum Duration**: Even with maximum skills, a minimum travel time of 6 hours ensures gameplay remains balanced.

3. **Progression System**: This creates a meaningful progression system where players can invest in upgrading their captains' skills.

## Next Steps

1. **Implementation**: Implement the changes as outlined in this document.

2. **Testing**: Run the provided test suite to verify the implementation.

3. **Integration Testing**: Test the entire system with all related contracts.

4. **Monitoring**: After deployment, monitor the impact on game balance and adjust as needed.

5. **Future Enhancements**: Consider additional factors that could affect travel time, such as weather conditions or special equipment. 