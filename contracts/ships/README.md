# Ships Module

This directory contains contracts related to ship management in the game.

## Contracts

### ShipMetadata.sol
Manages ship attributes and metadata including:
- Cargo bay capacity
- Speed
- Maneuverability
- Durability
- Cannons
- Armor
- Ramming capability

### ShipAndPirateStaking.sol
Handles the staking mechanics for ships and pirates:
- Ship staking/unstaking
- Pirate assignment to ships
- Active ship tracking
- Ownership management

## Integration
These contracts integrate with other modules through the Central Authorization Registry and are primarily used by:
- Mission system for ship validation
- Resource system for cargo management
- Battle system for combat stats 