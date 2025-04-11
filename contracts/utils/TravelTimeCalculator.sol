// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/ICentralAuthorizationRegistry.sol";
import "../interfaces/storage/IShipStorage.sol";
import "../interfaces/IPirateSkillsReader.sol";
import "../interfaces/ships/IShipAndPirateStaking.sol";
import "../interfaces/ITravelTimeCalculator.sol";
import "../AuthorizationModifiers.sol";
import "../interfaces/ships/IShipMetadata.sol";
import "../interfaces/islands/IIslandRegionManagement.sol";

/**
 * @title TravelTimeCalculator
 * @notice Utility contract for calculating travel times between islands
 * @dev This contract centralizes travel time calculation logic for use by mission contracts
 */
contract TravelTimeCalculator is ITravelTimeCalculator, AuthorizationModifiers {
    // Constants (private versions)
    uint256 private constant _SECONDS_IN_DAY = 24 * 60 * 60;
    uint256 private _MIN_TRAVEL_DURATION = 1 * 60 * 60; // 1 hour minimum travel time
    uint256 private _BASE_SPEED = 10; // Base ship speed for calculations
    
    // Interface getters for constants
    function SECONDS_IN_DAY() external pure override returns (uint256) {
        return _SECONDS_IN_DAY;
    }
    
    function MIN_TRAVEL_DURATION() external view override returns (uint256) {
        return _MIN_TRAVEL_DURATION;
    }
    
    function BASE_SPEED() external view override returns (uint256) {
        return _BASE_SPEED;
    }
        
    // Cache for travel times between island pairs
    mapping(bytes32 => uint256) private travelTimeCache;
    
    // Event for cache invalidation
    event CacheInvalidated(uint256 islandId);
    event SpecificCacheInvalidated(uint256 fromIslandId, uint256 toIslandId);
    
    /**
     * @notice Constructor
     * @param _centralAuthorizationRegistry Address of the central authorization registry
     */
    constructor(address _centralAuthorizationRegistry) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ITravelTimeCalculator")) {        
    }
    
    /**
     * @notice Get the PirateSkillsReader contract
     * @return IPirateSkillsReader interface
     */
    function getPirateSkillsReader() internal view returns (IPirateSkillsReader) {
        return IPirateSkillsReader(
            centralAuthorizationRegistry.getContractAddress(keccak256("IPirateSkillsReader"))
        );
    }
    
    /**
     * @notice Get the ShipAndPirateStaking contract
     * @return IShipAndPirateStaking interface
     */
    function getShipAndPirateStaking() internal view returns (IShipAndPirateStaking) {
        return IShipAndPirateStaking(
            centralAuthorizationRegistry.getContractAddress(keccak256("IShipAndPirateStaking"))
        );
    }
    
    /**
     * @notice Create a cache key from two island IDs and captain skills
     * @dev Creates a key that includes origin, destination, ship, captain and skills
     * @param islandA First island ID
     * @param islandB Second island ID
     * @param shipId Ship ID
     * @param captainId Captain ID
     * @param wisdomSkill The captain's wisdom skill level
     * @param navigationSkill The captain's navigation skill level
     * @return key Bytes32 cache key
     */
    function _createCacheKey(
        uint256 islandA, 
        uint256 islandB, 
        uint256 shipId, 
        uint256 captainId, 
        uint256 wisdomSkill, 
        uint256 navigationSkill
    ) internal pure returns (bytes32) {
        // Sort island IDs to ensure symmetry (smaller ID first)
        (uint256 smallerId, uint256 largerId) = islandA < islandB 
            ? (islandA, islandB) 
            : (islandB, islandA);
            
        return keccak256(abi.encodePacked(smallerId, largerId, shipId, captainId, wisdomSkill, navigationSkill));
    }
    
    function calculateTravelTime(
        uint256 fromIslandId, 
        uint256 toIslandId, 
        uint256 shipId, 
        bool useCache
    ) public view override returns (uint256) {
        // Get ship speed directly from ShipMetadata
        IShipMetadata shipMetadata = IShipMetadata(
            centralAuthorizationRegistry.getContractAddress(keccak256("IShipMetadata"))
        );
        IShipMetadata.ShipAttributes memory shipAttrs = shipMetadata.getShipMetadata(shipId);
        require(shipAttrs.speed > 0, "Ship speed must be greater than 0");
        uint256 shipSpeed = shipAttrs.speed;
        
        // Get captain's skills for the ship (fetch only once)
        uint256 wisdomSkill = 0;
        uint256 navigationSkill = 0;
        uint256 captainId = 0;
        address captainCollection;
        
        // Get the ship's captain
        IShipAndPirateStaking shipStaking = getShipAndPirateStaking();
        captainId = shipStaking.shipToCaptain(shipId);
        
        // If ship has a captain, get their skills
        if (captainId > 0) {
            IPirateSkillsReader skillsReader = getPirateSkillsReader();
            // Get captain collection first
            (captainId, captainCollection) = shipStaking.getShipCaptainAndCollection(shipId);
            wisdomSkill = skillsReader.getWisdomSkillForCollection(captainCollection, captainId);
            navigationSkill = skillsReader.getNavigationSkillForCollection(captainCollection, captainId);
        }
        
        // Check cache if enabled
        if (useCache) {
            bytes32 cacheKey = _createCacheKey(fromIslandId, toIslandId, shipId, captainId, wisdomSkill, navigationSkill);
            uint256 cachedTime = travelTimeCache[cacheKey];
            if (cachedTime > 0) {
                return cachedTime;
            }
        }
        
        // Calculate base travel time (without considering ship speed)
        uint256 baseDuration = calculateBaseTravelTime(fromIslandId, toIslandId);
        
        // Calculate adjusted duration with ship speed: baseDuration / shipSpeed
        uint256 adjustedDuration = baseDuration / shipSpeed;
        
        // Apply captain's skill bonuses
        uint256 finalDuration = adjustedDuration;
        
        if (wisdomSkill > 0 || navigationSkill > 0) {
            // Wisdom bonus is half of the wisdom skill value
            uint256 wisdomBonus = (adjustedDuration * (wisdomSkill / 2)) / 100;
            
            // Apply wisdom bonus first
            if (wisdomBonus >= finalDuration) {
                finalDuration = _MIN_TRAVEL_DURATION;
            } else {
                finalDuration = finalDuration - wisdomBonus;
            }
            
            // Each navigation point reduces travel time by 1%
            uint256 navigationBonus = (adjustedDuration * navigationSkill) / 100;
            
            // Apply navigation bonus
            if (navigationBonus >= finalDuration) {
                finalDuration = _MIN_TRAVEL_DURATION;
            } else {
                finalDuration = finalDuration - navigationBonus;
                if (finalDuration < _MIN_TRAVEL_DURATION) {
                    finalDuration = _MIN_TRAVEL_DURATION;
                }
            }
        }
        return finalDuration;
    }
        
    /**
     * @notice Calculate travel time between islands (without considering ship speed)
     * @param fromIslandId Origin island ID
     * @param toIslandId Destination island ID     
     * @return travelTime Time in seconds (base duration without ship speed adjustment)
     */
    function calculateBaseTravelTime(
        uint256 fromIslandId, 
        uint256 toIslandId
    ) public view override returns (uint256) {
        // Get region management contract using the interface
        IIslandRegionManagement regionManagement = IIslandRegionManagement(
            centralAuthorizationRegistry.getContractAddress(keccak256("IIslandRegionManagement"))
        );
        
        // Get distance enum value (0 = Short, 1 = Medium, 2 = Long)
        IIslandRegionManagement.Distance distance = regionManagement.calculateDistance(fromIslandId, toIslandId);
        
        // Calculate base duration based on distance type
        uint256 duration;
        if (distance == IIslandRegionManagement.Distance.Short) {
            duration = _SECONDS_IN_DAY; // 1 day for short distance
        } else if (distance == IIslandRegionManagement.Distance.Medium) {
            duration = 5 * _SECONDS_IN_DAY; // 5 days for medium distance
        } else {
            duration = 9 * _SECONDS_IN_DAY; // 9 days for long distance
        }
        
        return duration;
    }
            
    function calculateRoundTripTravelTime(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId,
        bool useCache
    ) external view override returns (uint256, uint256) {
        // Since travel is symmetrical, both journey times are the same
        uint256 journeyTime = calculateTravelTime(fromIslandId, toIslandId, shipId, useCache);
        return (journeyTime, journeyTime);
    }

    /**
     * @notice Update the cached travel time between two islands
     * @param fromIslandId First island ID
     * @param toIslandId Second island ID
     * @param shipId Ship ID
     * @dev This function needs to be called separately to update the cache
     */
    function updateTravelTimeCache(uint256 fromIslandId, uint256 toIslandId, uint256 shipId) external override onlyAuthorized {
        // Get captain's skills for the ship (fetch only once)
        uint256 wisdomSkill = 0;
        uint256 navigationSkill = 0;
        uint256 captainId = 0;
        
        // Get the ship's captain
        IShipAndPirateStaking shipStaking = getShipAndPirateStaking();
        captainId = shipStaking.shipToCaptain(shipId);
        
        // If ship has a captain, get their skills
        if (captainId > 0) {
            IPirateSkillsReader skillsReader = getPirateSkillsReader();
            // Get captain collection first
            address captainCollection = shipStaking.getPirateCollection(captainId);
            wisdomSkill = skillsReader.getWisdomSkillForCollection(captainCollection, captainId);
            navigationSkill = skillsReader.getNavigationSkillForCollection(captainCollection, captainId);
        }
        
        // Create cache key with skills included
        bytes32 cacheKey = _createCacheKey(fromIslandId, toIslandId, shipId, captainId, wisdomSkill, navigationSkill);
        
        // Calculate travel time without using cache
        uint256 travelTime = calculateTravelTime(fromIslandId, toIslandId, shipId, false);
        
        // Update cache
        travelTimeCache[cacheKey] = travelTime;
    }

    /**
     * @notice Invalidate the cached travel time between two islands for a specific ship and captain
     * @param fromIslandId First island ID
     * @param toIslandId Second island ID
     * @param shipId Ship ID
     * @param captainId Captain ID
     * @param wisdomSkill Captain's wisdom skill
     * @param navigationSkill Captain's navigation skill
     * @dev This function removes the specific cache entry for the given parameters
     */
    function invalidateTravelTimeCache(
        uint256 fromIslandId,
        uint256 toIslandId,
        uint256 shipId,
        uint256 captainId,
        uint256 wisdomSkill,
        uint256 navigationSkill
    ) external override onlyAuthorized {
        // Create cache key with the provided parameters
        bytes32 cacheKey = _createCacheKey(fromIslandId, toIslandId, shipId, captainId, wisdomSkill, navigationSkill);
        
        // Delete the cache entry
        delete travelTimeCache[cacheKey];
    }
    
    /**
     * @notice Set the base speed for travel time calculations
     * @param newBaseSpeed The new base speed value
     * @dev This function allows authorized contracts to update the base speed
     */
    function setBaseSpeed(uint256 newBaseSpeed) external onlyAdmin() {
        require(newBaseSpeed > 0, "Base speed must be greater than 0");
        _BASE_SPEED = newBaseSpeed;
    }
    
    /**
     * @notice Set the minimum travel duration
     * @param newMinTravelDuration The new minimum travel duration in seconds
     * @dev This function allows authorized contracts to update the minimum travel time
     */
    function setMinTravelDuration(uint256 newMinTravelDuration) external onlyAdmin() {
        require(newMinTravelDuration > 0, "Minimum travel duration must be greater than 0");
        _MIN_TRAVEL_DURATION = newMinTravelDuration;
    }

} 