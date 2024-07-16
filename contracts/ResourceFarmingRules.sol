// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IPirateManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./AuthorizationModifiers.sol";
import "hardhat/console.sol";


contract ResourceFarmingRules is AuthorizationModifiers {
    using Strings for string;

    constructor(address _centralAuthorizationRegistryContract) AuthorizationModifiers(_centralAuthorizationRegistryContract, keccak256("IResourceFarmingRules")) {}
    
    function calculateResourceOutput(
        IPirateManagement.PirateSkills memory pirate,
        string memory resource,
        uint256 durationSeconds
    ) public pure returns (uint256) {
        uint256 output;
        
        if (resource.equal("coconut")) {
            output = (pirate.characterSkills.agility + pirate.specialSkills.fruitPicking) * durationSeconds/ 1 days;
        } else if (resource.equal("citrus")) {
            output = (pirate.characterSkills.agility + pirate.specialSkills.fruitPicking) * durationSeconds/ 1 days;
        } else if (resource.equal("fish")) {
            output = (((pirate.characterSkills.swimming + pirate.characterSkills.luck)/2) + pirate.specialSkills.fishing) * durationSeconds/ 1 days;
        } else if (resource.equal("tobacco")) {
            output = (((pirate.characterSkills.stamina + pirate.toolsSkills.harvest + pirate.toolsSkills.cultivation + 7 ether)/15) * durationSeconds / 1 days);
        } else if (resource.equal("cotton")) {
            output = (((pirate.characterSkills.stamina * 8) + pirate.toolsSkills.cultivation)/20) * durationSeconds / 1 days;
        } else if (resource.equal("pig")) {
            if (pirate.toolsSkills.husbandry > 0) {
                output = ((((pirate.characterSkills.stamina*2) + pirate.toolsSkills.husbandry) / 30) * durationSeconds / 1 days);
            } else {
                output = (((pirate.characterSkills.stamina*2)/30) * durationSeconds / 1 days);
            }
        } else if (resource.equal("wood")) {
            require(pirate.toolsSkills.woodcutting > 0, "Pirate does not have woodcutting tool");
            output = (((pirate.characterSkills.melee + pirate.toolsSkills.woodcutting) /10 ) * durationSeconds / 1 days);
        } else if (resource.equal("sugarcane")) {
            require(pirate.toolsSkills.harvest > 0, "Pirate does not have harvesting tool");
            output = (((((pirate.characterSkills.stamina/1e18 * pirate.toolsSkills.harvest/1e18)*10**18) + pirate.toolsSkills.cultivation)/30) * durationSeconds / 1 days);
        } else if (resource.equal("grain")) {
            require(pirate.toolsSkills.harvest > 0, "Pirate does not have harvesting tool");
            output = (((((pirate.characterSkills.stamina/1e18 * pirate.toolsSkills.harvest/1e18)*10**18) + pirate.toolsSkills.cultivation)/20) * durationSeconds / 1 days);
        } else if (resource.equal("planks")) {
            require(pirate.toolsSkills.woodcutting >= 4 ether, "Pirate does not have woodcutting tool");
            output = (((pirate.characterSkills.agility + pirate.characterSkills.strength) /10) * durationSeconds / 1 days);
        } else {
            revert("Invalid resource type");
        }

        return output;
    }
}