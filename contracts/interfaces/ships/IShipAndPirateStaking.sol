// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IShipAndPirateStaking {
    struct StakingData {
        uint256 shipId;
        uint256 captainId;
        address captainCollection;
        uint256[] genesisPirateIds;
        uint256[] inhabitantIds;
    }

    // Events (from ShipAndPirateStaking implementation)
    event ShipStaked(uint256 indexed shipId, address indexed owner, uint256 timestamp);
    event ShipUnstaked(uint256 indexed shipId, address indexed owner, uint256 timestamp);
    event PirateStaked(uint256 indexed pirateId, uint256 indexed shipId, bool isCaptain, uint256 timestamp, address collection);
    event PirateUnstaked(uint256 indexed pirateId, uint256 indexed shipId, bool wasCaptain, uint256 timestamp, address collection);
    event CrewUpdated(uint256 indexed shipId, uint256 captainId, uint256[] pirates, uint256 timestamp);
    event EssentialCrewValidated(uint256 indexed shipId, uint256 essentialCrewCount, uint256 minRequired, uint256 maxAllowed);



    // View functions
    function isShipStaked(uint256 shipId) external view returns (bool);
    function getShipOwner(uint256 shipId) external view returns (address);
    function getUserActiveShips(address user) external view returns (uint256[] memory);
    function getShipStakedPirates(uint256 shipId) external view returns (uint256[] memory);
    function getAssignedPirates(uint256 shipId) external view returns (uint256[] memory);
    function shipToCaptain(uint256 shipId) external view returns (uint256);
    function getPirateCollection(uint256 pirateId) external view returns (address);
    function getPirateShip(uint256 pirateId) external view returns (uint256);
    function isPirateCaptain(uint256 pirateId) external view returns (bool);
    function getMissionsStorageAddress() external view returns (address);
    function getShipInfo(uint256 shipId) external view returns (
        address owner,
        bool isStaked,
        uint256 captainId,
        uint256[] memory crewIds,
        uint256 stakingTime
    );
    function getShipCaptainAndCollection(uint256 shipId) external view returns (uint256, address);
    function getStakedPiratesByCollection(address owner, address collection) external view returns (
        uint256[] memory stakedPirates,
        uint256[] memory assignedShips,
        bool[] memory isCaptain
    );
    function getShipCrewDetails(uint256 shipId) external view returns (
        uint256 captain,
        address captainCollection,
        uint256[] memory genesisCrew,
        uint256[] memory inhabitantsCrew
    );
    function getGenesisPiratesAddress() external view returns (address);
    function getInhabitantsAddress() external view returns (address);

    // State-changing functions
    function stakeShipWithPirates(StakingData memory stakingData, uint256 homeIslandId, string memory shipClass) external;    
    function stakePirate(uint256 shipId, uint256 pirateId, address collectionAddress) external;
    function unstakeShip(uint256 shipId) external;
    function unstakePirate(uint256 shipId, uint256 pirateId) external;
    function unstakeShipAndPirates(uint256 shipId, string memory shipClass) external;
    function batchStakeShips(StakingData[] calldata stakingDataArray, uint256[] calldata homeIslandIds, string[] calldata shipClasses) external;
    function batchUnstakeShips(uint256[] calldata shipIds) external;
    function rebaseShipHomeIsland(uint256 shipId, uint256 newIslandId, string memory shipClass) external;
}
