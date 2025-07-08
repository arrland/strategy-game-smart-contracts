# Travel Time Calculation System

## Overview

The travel time calculation system determines how long it takes for ships to travel between islands in the game. It's a critical component that affects gameplay dynamics, strategy, and resource management. This document explains how the system works, including the formulas used and the factors that influence travel duration.

## Key Components

The travel time calculation is managed primarily by the `TravelTimeCalculator` contract, which provides a centralized system for calculating travel times consistently across different game mechanics.

### Factors Affecting Travel Time

1. **Base Distance** - The fundamental distance between islands (short, medium, long)
2. **Ship Speed** - Different ships have different speed attributes
3. **Captain's Skills** - The wisdom and navigation skills of the ship's captain
4. **Minimum Travel Duration** - A lower bound to ensure trips are never instantaneous

## Calculation Formula

The travel time between islands is calculated with the following formula:

```
Final Travel Duration = ((Base Duration / Ship Speed) - WisdomBonus - NavigationBonus) or MIN_TRAVEL_DURATION (whichever is larger)
```

Where:
- **Base Duration**: The standard time to travel between islands based solely on distance
- **Ship Speed**: The speed attribute of the ship making the journey
- **Wisdom Bonus**: (Base Duration / Ship Speed) * (WisdomSkill/2) / 100
- **Navigation Bonus**: (Base Duration / Ship Speed) * NavigationSkill / 100
- **MIN_TRAVEL_DURATION**: Hard-coded minimum travel time (6 hours)

## Step-by-Step Calculation Process

1. **Determine Base Travel Duration**:
   - Short distance: 1 day (86,400 seconds)
   - Medium distance: 2 days (172,800 seconds)
   - Long distance: 4 days (345,600 seconds)

2. **Adjust for Ship Speed**:
   - Divide the base duration by the ship's speed attribute
   - For example, a ship with speed 20 will travel twice as fast as a ship with the base speed of 10

3. **Apply Captain's Wisdom Skill Bonus**:
   - Calculate wisdom bonus: (adjustedDuration * (wisdomSkill/2)) / 100
   - Subtract this bonus from the adjusted duration
   - For example, a captain with 10 wisdom reduces travel time by 5%

4. **Apply Captain's Navigation Skill Bonus**:
   - Calculate navigation bonus: (adjustedDuration * navigationSkill) / 100
   - Subtract this bonus from the already wisdom-adjusted duration
   - For example, a captain with 10 navigation reduces travel time by 10%

5. **Apply Minimum Travel Duration**:
   - If the final calculated duration is less than MIN_TRAVEL_DURATION (6 hours), use MIN_TRAVEL_DURATION instead

## Caching Mechanism

To optimize gas usage and improve performance, the `TravelTimeCalculator` contract implements a caching system:

1. **Cache Key Generation**:
   - Creates a unique key for each journey based on:
     - Origin island ID
     - Destination island ID
     - Ship ID
     - Captain ID
     - Wisdom skill level
     - Navigation skill level

2. **Cache Usage**:
   - Before performing calculations, the system checks if the result is already cached
   - If found, it returns the cached value instead of recalculating
   - If not found, it performs the calculation and optionally stores the result in the cache

3. **Cache Invalidation**:
   - Cache can be invalidated when relevant factors change (e.g., island location changes)
   - Specific cache entries can be invalidated for specific island pairs or ships

## Round-Trip Travel Time

For missions that involve traveling to a destination and returning to the origin, the system provides convenience functions to calculate both segments of the journey:

- `calculateRoundTripTravelTime` - Calculates both outbound and return travel times in a single call
- Since travel is symmetrical by design, both journey times are identical

## Code Examples

### Basic Travel Time Calculation
```solidity
// Calculate travel time between two islands for a specific ship
uint256 travelTime = travelTimeCalculator.calculateTravelTime(
    originIslandId,
    destinationIslandId,
    shipId
);
```

### Round-Trip Travel Time Calculation
```solidity
// Calculate both outbound and return travel times
(uint256 outboundTime, uint256 returnTime) = travelTimeCalculator.calculateRoundTripTravelTime(
    originIslandId,
    destinationIslandId,
    shipId
);
```

## Practical Example

Let's walk through a practical example:

1. A ship with speed 15 travels between islands with a medium distance (2 days base duration)
2. The ship's captain has 20 wisdom and 30 navigation skills
3. Base duration: 172,800 seconds (2 days)
4. Adjusted for ship speed: 172,800 / 15 = 11,520 seconds
5. Wisdom bonus: 11,520 * (20/2) / 100 = 1,152 seconds
6. After wisdom bonus: 11,520 - 1,152 = 10,368 seconds
7. Navigation bonus: 11,520 * 30 / 100 = 3,456 seconds
8. After navigation bonus: 10,368 - 3,456 = 6,912 seconds
9. Final duration: 6,912 seconds (greater than minimum of 6 hours = 21,600 seconds)

## Conclusion

The travel time calculation system is designed to create a balanced gameplay experience where:

1. Distance between islands matters significantly
2. Ship attributes make a meaningful difference
3. Captain skills provide a strategic advantage
4. The system maintains game balance with minimum travel times
5. Gas efficiency is optimized through caching

Understanding this system is crucial for players to optimize their strategies and make informed decisions about ship selection, crew assignment, and mission planning. 