// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

library InterfaceIdentifiers {
    // This will resolve to a specific bytes32 value at compile time.
    // Based on latest errors, Solidity's keccak256(bytes("ICooldownManager")) is 0x4707400087184020f37ac7ca602e94869be306e1fe65ff85039d8ce7cd5a7ef6
    bytes32 constant COOLDOWN_MANAGER_KEY = keccak256("ICooldownManager");
    string constant COOLDOWN_MANAGER_NAME = "ICooldownManager";

    bytes32 constant MISSION_FACTORY_KEY = keccak256("IMissionFactory");
    string constant MISSION_FACTORY_NAME = "IMissionFactory";

    // Added based on project structure and utils
    bytes32 constant FEE_MANAGEMENT_KEY = keccak256("IFeeManagement");
    string constant FEE_MANAGEMENT_NAME = "IFeeManagement";

    bytes32 constant ISLAND_STORAGE_KEY = keccak256("IIslandStorage");
    string constant ISLAND_STORAGE_NAME = "IIslandStorage";

    bytes32 constant PIRATE_STORAGE_KEY = keccak256("IPirateStorage");
    string constant PIRATE_STORAGE_NAME = "IPirateStorage";

    bytes32 constant INHABITANT_STORAGE_KEY = keccak256("IInhabitantStorage");
    string constant INHABITANT_STORAGE_NAME = "IInhabitantStorage";

    bytes32 constant SHIP_STORAGE_KEY = keccak256("IShipStorage");
    string constant SHIP_STORAGE_NAME = "IShipStorage";

    bytes32 constant STORAGE_MANAGEMENT_KEY = keccak256("IStorageManagement");
    string constant STORAGE_MANAGEMENT_NAME = "IStorageManagement";

    bytes32 constant RESOURCE_TYPE_MANAGER_KEY = keccak256("IResourceTypeManager");
    string constant RESOURCE_TYPE_MANAGER_NAME = "IResourceTypeManager";

    bytes32 constant RESOURCE_MANAGEMENT_KEY = keccak256("IResourceManagement");
    string constant RESOURCE_MANAGEMENT_NAME = "IResourceManagement";

    bytes32 constant BUILDING_STORAGE_KEY = keccak256("IBuildingStorage");
    string constant BUILDING_STORAGE_NAME = "IBuildingStorage";

    bytes32 constant RESOURCE_SPEND_MANAGEMENT_KEY = keccak256("IResourceSpendManagement");
    string constant RESOURCE_SPEND_MANAGEMENT_NAME = "IResourceSpendManagement";

    bytes32 constant CREW_TYPE_MANAGER_KEY = keccak256("ICrewTypeManager");
    string constant CREW_TYPE_MANAGER_NAME = "ICrewTypeManager";

    bytes32 constant CREW_MANAGEMENT_KEY = keccak256("ICrewManagement");
    string constant CREW_MANAGEMENT_NAME = "ICrewManagement";

    bytes32 constant PIRATE_SKILLS_KEY = keccak256("IPirateSkills");
    string constant PIRATE_SKILLS_NAME = "IPirateSkills";

    bytes32 constant PIRATE_SKILLS_READER_KEY = keccak256("IPirateSkillsReader");
    string constant PIRATE_SKILLS_READER_NAME = "IPirateSkillsReader";

    bytes32 constant SHIP_METADATA_KEY = keccak256("IShipMetadata");
    string constant SHIP_METADATA_NAME = "IShipMetadata";

    bytes32 constant DOCKING_MANAGEMENT_KEY = keccak256("IDockingManagement");
    string constant DOCKING_MANAGEMENT_NAME = "IDockingManagement";

    bytes32 constant SHIP_AND_PIRATE_STAKING_KEY = keccak256("IShipAndPirateStaking");
    string constant SHIP_AND_PIRATE_STAKING_NAME = "IShipAndPirateStaking";

    bytes32 constant TRAVEL_TIME_CALCULATOR_KEY = keccak256("ITravelTimeCalculator");
    string constant TRAVEL_TIME_CALCULATOR_NAME = "ITravelTimeCalculator";

    bytes32 constant MISSION_TRAVEL_CALCULATOR_KEY = keccak256("IMissionTravelCalculator");
    string constant MISSION_TRAVEL_CALCULATOR_NAME = "IMissionTravelCalculator";

    bytes32 constant MISSION_VALIDATOR_KEY = keccak256("IMissionValidator");
    string constant MISSION_VALIDATOR_NAME = "IMissionValidator";

    bytes32 constant MISSIONS_STORAGE_KEY = keccak256("IMissionsStorage");
    string constant MISSIONS_STORAGE_NAME = "IMissionsStorage";

    bytes32 constant MISSION_REQUIREMENTS_KEY = keccak256("IMissionRequirements"); // As seen in utils
    string constant MISSION_REQUIREMENTS_NAME = "IMissionRequirements";

    bytes32 constant ISLAND_REGION_MANAGEMENT_KEY = keccak256("IIslandRegionManagement");
    string constant ISLAND_REGION_MANAGEMENT_NAME = "IIslandRegionManagement";

    bytes32 constant SHIP_NFT_KEY = keccak256("IShipNFT");
    string constant SHIP_NFT_NAME = "IShipNFT";

    bytes32 constant ISLAND_NFT_KEY = keccak256("IIslandNFT");
    string constant ISLAND_NFT_NAME = "IIslandNFT";

    bytes32 constant PIRATE_MANAGEMENT_KEY = keccak256("IPirateManagement");
    string constant PIRATE_MANAGEMENT_NAME = "IPirateManagement";

    bytes32 constant CAPITAL_ISLAND_MANAGEMENT_KEY = keccak256("ICapitalIslandManagement");
    string constant CAPITAL_ISLAND_MANAGEMENT_NAME = "ICapitalIslandManagement";
    
    bytes32 constant GAME_REWARDS_KEY = keccak256("IGameRewards");
    string constant GAME_REWARDS_NAME = "IGameRewards";

    bytes32 constant ARRC_DISTRIBUTION_KEY = keccak256("IARRCDistribution");
    string constant ARRC_DISTRIBUTION_NAME = "IARRCDistribution";

    bytes32 constant MISSION_REGISTRATION_KEY = keccak256("IMissionRegistration");
    string constant MISSION_REGISTRATION_NAME = "IMissionRegistration";

    bytes32 constant RESOURCE_TRANSFER_MISSION_KEY = keccak256("IResourceTransferMission");
    string constant RESOURCE_TRANSFER_MISSION_NAME = "IResourceTransferMission";

    bytes32 constant MARKETPLACE_STORAGE_KEY = keccak256("IMarketPlaceStorage");
    string constant MARKETPLACE_STORAGE_NAME = "IMarketPlaceStorage";

    bytes32 constant TRADE_MISSION_KEY = keccak256("ITradeMission");
    string constant TRADE_MISSION_NAME = "ITradeMission";

    bytes32 constant ARRC_LOCKING_KEY = keccak256("IArrcLocking");
    string constant ARRC_LOCKING_NAME = "IArrcLocking";

    bytes32 constant ARRC_TOKEN_KEY = keccak256("IArrcToken");
    string constant ARRC_TOKEN_NAME = "IArrcToken";

    bytes32 constant TRADE_MANAGER_KEY = keccak256("ITradeManager");
    string constant TRADE_MANAGER_NAME = "ITradeManager";

    bytes32 constant MISSIONS_MANAGER_KEY = keccak256("IMissionsManager");
    string constant MISSIONS_MANAGER_NAME = "IMissionsManager";

    function getInterfaceNameById(bytes32 interfaceId) internal pure returns (bool success, string memory name) {
        if (interfaceId == COOLDOWN_MANAGER_KEY) return (true, COOLDOWN_MANAGER_NAME);
        if (interfaceId == MISSION_FACTORY_KEY) return (true, MISSION_FACTORY_NAME);
        if (interfaceId == FEE_MANAGEMENT_KEY) return (true, FEE_MANAGEMENT_NAME);
        if (interfaceId == ISLAND_STORAGE_KEY) return (true, ISLAND_STORAGE_NAME);
        if (interfaceId == PIRATE_STORAGE_KEY) return (true, PIRATE_STORAGE_NAME);
        if (interfaceId == INHABITANT_STORAGE_KEY) return (true, INHABITANT_STORAGE_NAME);
        if (interfaceId == SHIP_STORAGE_KEY) return (true, SHIP_STORAGE_NAME);
        if (interfaceId == STORAGE_MANAGEMENT_KEY) return (true, STORAGE_MANAGEMENT_NAME);
        if (interfaceId == RESOURCE_TYPE_MANAGER_KEY) return (true, RESOURCE_TYPE_MANAGER_NAME);
        if (interfaceId == RESOURCE_MANAGEMENT_KEY) return (true, RESOURCE_MANAGEMENT_NAME);
        if (interfaceId == BUILDING_STORAGE_KEY) return (true, BUILDING_STORAGE_NAME);
        if (interfaceId == RESOURCE_SPEND_MANAGEMENT_KEY) return (true, RESOURCE_SPEND_MANAGEMENT_NAME);
        if (interfaceId == CREW_TYPE_MANAGER_KEY) return (true, CREW_TYPE_MANAGER_NAME);
        if (interfaceId == CREW_MANAGEMENT_KEY) return (true, CREW_MANAGEMENT_NAME);
        if (interfaceId == PIRATE_SKILLS_KEY) return (true, PIRATE_SKILLS_NAME);
        if (interfaceId == PIRATE_SKILLS_READER_KEY) return (true, PIRATE_SKILLS_READER_NAME);
        if (interfaceId == SHIP_METADATA_KEY) return (true, SHIP_METADATA_NAME);
        if (interfaceId == DOCKING_MANAGEMENT_KEY) return (true, DOCKING_MANAGEMENT_NAME);
        if (interfaceId == SHIP_AND_PIRATE_STAKING_KEY) return (true, SHIP_AND_PIRATE_STAKING_NAME);
        if (interfaceId == TRAVEL_TIME_CALCULATOR_KEY) return (true, TRAVEL_TIME_CALCULATOR_NAME);
        if (interfaceId == MISSION_TRAVEL_CALCULATOR_KEY) return (true, MISSION_TRAVEL_CALCULATOR_NAME);
        if (interfaceId == MISSION_VALIDATOR_KEY) return (true, MISSION_VALIDATOR_NAME);
        if (interfaceId == MISSIONS_STORAGE_KEY) return (true, MISSIONS_STORAGE_NAME);
        if (interfaceId == MISSION_REQUIREMENTS_KEY) return (true, MISSION_REQUIREMENTS_NAME);
        if (interfaceId == ISLAND_REGION_MANAGEMENT_KEY) return (true, ISLAND_REGION_MANAGEMENT_NAME);
        if (interfaceId == SHIP_NFT_KEY) return (true, SHIP_NFT_NAME);
        if (interfaceId == ISLAND_NFT_KEY) return (true, ISLAND_NFT_NAME);
        if (interfaceId == PIRATE_MANAGEMENT_KEY) return (true, PIRATE_MANAGEMENT_NAME);
        if (interfaceId == CAPITAL_ISLAND_MANAGEMENT_KEY) return (true, CAPITAL_ISLAND_MANAGEMENT_NAME);
        if (interfaceId == GAME_REWARDS_KEY) return (true, GAME_REWARDS_NAME);
        if (interfaceId == ARRC_DISTRIBUTION_KEY) return (true, ARRC_DISTRIBUTION_NAME);
        if (interfaceId == MISSION_REGISTRATION_KEY) return (true, MISSION_REGISTRATION_NAME);
        if (interfaceId == RESOURCE_TRANSFER_MISSION_KEY) return (true, RESOURCE_TRANSFER_MISSION_NAME);
        if (interfaceId == MARKETPLACE_STORAGE_KEY) return (true, MARKETPLACE_STORAGE_NAME);
        if (interfaceId == TRADE_MISSION_KEY) return (true, TRADE_MISSION_NAME);
        if (interfaceId == ARRC_LOCKING_KEY) return (true, ARRC_LOCKING_NAME);
        if (interfaceId == ARRC_TOKEN_KEY) return (true, ARRC_TOKEN_NAME);
        if (interfaceId == TRADE_MANAGER_KEY) return (true, TRADE_MANAGER_NAME);
        if (interfaceId == MISSIONS_MANAGER_KEY) return (true, MISSIONS_MANAGER_NAME);

        return (false, ""); // ID not found among predefined constants
    }
}