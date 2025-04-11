// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface ICrewManagement {
    /**
     * @dev Adds crew members to a pirate
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId Token ID of the pirate
     * @param owner Owner of the pirate
     * @param crewType Type of crew member to add
     * @param amount Number of crew members to add
     */
    function addCrew(
        address pirateCollection,
        uint256 pirateId,
        address owner,
        string memory crewType,
        uint256 amount
    ) external;

    /**
     * @dev Transfers crew members between pirates
     * @param fromPirateCollection Source pirate collection address
     * @param fromPirateId Source pirate token ID
     * @param fromOwner Owner of source pirate
     * @param toPirateCollection Destination pirate collection address
     * @param toPirateId Destination pirate token ID
     * @param toOwner Owner of destination pirate
     * @param crewType Type of crew member to transfer
     * @param amount Number of crew members to transfer
     */
    function transferCrew(
        address fromPirateCollection,
        uint256 fromPirateId,
        address fromOwner,
        address toPirateCollection,
        uint256 toPirateId,
        address toOwner,
        string memory crewType,
        uint256 amount
    ) external;

    /**
     * @dev Removes crew members from a pirate
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId Token ID of the pirate
     * @param owner Owner of the pirate
     * @param crewType Type of crew member to remove
     * @param amount Number of crew members to remove
     */
    function removeCrew(
        address pirateCollection,
        uint256 pirateId,
        address owner,
        string memory crewType,
        uint256 amount
    ) external;

    /**
     * @dev Gets all crew counts for a pirate
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId Token ID of the pirate     
     * @return Array of crew types and their corresponding counts
     */
    function getAllCrewCounts(
        address pirateCollection,
        uint256 pirateId
    ) external view returns (string[] memory, uint256[] memory);

    /**
     * @dev Gets all crew counts that can be ship crew for a pirate
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId Token ID of the pirate
     * @return Array of crew types and their corresponding counts
     */
    function getAllCrewCountsForShip(
        address pirateCollection,
        uint256 pirateId
    ) external view returns (string[] memory, uint256[] memory);

    /**
     * @dev Gets the total crew count for a pirate
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId Token ID of the pirate
     * @return Total number of crew members
     */
    function getTotalCrewCount(
        address pirateCollection,
        uint256 pirateId
    ) external view returns (uint256);

    /**
     * @dev Emitted when crew members are added to a pirate
     */
    event CrewAdded(address indexed pirateCollection, uint256 indexed pirateId, address indexed owner, string crewType, uint256 amount);

    /**
     * @dev Emitted when crew members are transferred between pirates
     */
    event CrewTransferred(
        address indexed fromPirateCollection,
        uint256 indexed fromPirateId,
        address indexed fromOwner,
        address toPirateCollection,
        uint256 toPirateId,
        address toOwner,
        string crewType,
        uint256 amount
    );

    /**
     * @dev Emitted when crew members are removed from a pirate
     */
    event CrewRemoved(address indexed pirateCollection, uint256 indexed pirateId, address indexed owner, string crewType, uint256 amount);

    /**
     * @notice Level up a crew member with specified options
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId Token ID of the pirate
     * @param owner Owner of the pirate
     * @param crewType Type of crew member to level up
     * @param levels Number of levels to gain (if eligible)
     * @param options Array of options for each level:
     *        For level 1, 5, 9, 15, 20, 25, 30: 0-8 = Specialization type (LAND_DEFENSE to FARMING)
     *        For other levels: 0 = Crew Score, 1 = Respect, 2 = Chance for Inhabitant Pirate NFT
     * @return levelsGained Number of levels actually gained
     */
    function levelUp(
        address pirateCollection,
        uint256 pirateId,
        address owner,
        string memory crewType,
        uint256 levels,
        uint8[] calldata options
    ) external returns (uint256 levelsGained);
}
