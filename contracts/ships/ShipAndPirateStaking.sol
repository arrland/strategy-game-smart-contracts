// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/ships/IShipAndPirateStaking.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "../interfaces/IMissionsStorage.sol";
import "../interfaces/ICrewManagement.sol";
import "../interfaces/ICrewTypeManager.sol";
import "../interfaces/IShipMetadata.sol";
import "../interfaces/IFeeManagement.sol";
import "../missions/PirateSkillsReader.sol";
import "../interfaces/IDockingManagement.sol";
import "hardhat/console.sol";


/**
 * @title ShipAndPirateStaking
 * @notice Manages staking of ships and pirates
 */
contract ShipAndPirateStaking is     
    IShipAndPirateStaking,
    AuthorizationModifiers, 
    IERC1155Receiver, 
    IERC721Receiver, 
    ReentrancyGuard, 
    Pausable 
{
    // Custom errors
    error NotShipOwner();
    error NotPirateOwner();
    error ShipAlreadyStaked();
    error PirateAlreadyStaked();
    error ShipNotStaked();
    error PirateNotStaked();
    error ShipOnMission();
    error InsufficientCrew(uint256 required, uint256 provided);
    error TooManyCrew(uint256 maxAllowed, uint256 current);
    error InvalidPirateRole();
    error PirateNotOnShip(uint256 pirateId, uint256 shipId);
    error CannotRemoveCaptain();
    error InvalidShipId();
    error InvalidPirateId();
    error MissionInProgress();
    error UnauthorizedAccess();
    error InvalidCollection();
    error InsufficientCaptainRespect(uint256 required, uint256 actual);
    error InsufficientEssentialCrew(uint256 required, uint256 actual);
    error TooManyEssentialCrew(uint256 maximum, uint256 actual);

    // Optimized storage structure
    struct ShipInfo {
        address owner;
        bool isStaked;
        uint256 captainId;
        address captainCollection;
        uint256[] genesisPirateIds;
        uint256[] inhabitantIds;
        uint256 stakingTime;
        uint256 homeIslandId;
        string shipClass;
    }


    // State variables
    IERC721 public immutable shipNft;
    
    // Collection addresses
    address public genesisPiratesAddress;
    address public inhabitantsAddress;
    
    mapping(uint256 => ShipInfo) private ships;
    mapping(uint256 => uint256) private pirateToShip;
    mapping(address => uint256[]) private userActiveShips;
    mapping(uint256 => uint256) private shipToUserActiveIndex;
    
    // Track which collection a pirate belongs to
    mapping(uint256 => address) private pirateCollections;

    constructor(
        address _centralAuthorizationRegistry,
        address _shipNft,
        address _genesisPiratesAddress,
        address _inhabitantsAddress
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IShipAndPirateStaking")) {
        shipNft = IERC721(_shipNft);
        genesisPiratesAddress = _genesisPiratesAddress;
        inhabitantsAddress = _inhabitantsAddress;    
    }

    function getCrewTypeManager() internal view returns (ICrewTypeManager) {
        return ICrewTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("ICrewTypeManager")));
    }

    function getFeeManagement() internal view returns (IFeeManagement) {
        return IFeeManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IFeeManagement")));
    }

    function getMissionsStorage() internal view returns (IMissionsStorage) {
        return IMissionsStorage(centralAuthorizationRegistry.getContractAddress(keccak256("IMissionsStorage")));
    }

    function getCrewManagement() internal view returns (ICrewManagement) {
        return ICrewManagement(centralAuthorizationRegistry.getContractAddress(keccak256("ICrewManagement")));
    }

    function getShipMetadata() internal view returns (IShipMetadata) {
        return IShipMetadata(centralAuthorizationRegistry.getContractAddress(keccak256("IShipMetadata")));
    }

    function getDockingManagement() internal view returns (IDockingManagement) {
        return IDockingManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IDockingManagement")));
    }

    function validateShipRequirements(uint256 shipId, uint256 captainId, address captainCollection) internal {
        // Get ship metadata
        IShipMetadata shipMetadata = getShipMetadata();
        IShipMetadata.ShipAttributes memory shipAttributes = shipMetadata.getShipMetadata(shipId);
        
        // Get captain's respect level
        PirateSkillsReader pirateSkills = PirateSkillsReader(
            centralAuthorizationRegistry.getContractAddress(keccak256("IPirateSkillsReader"))
        );
        uint256 respectLevel = pirateSkills.getRespectSkillForCollection(captainCollection, captainId);
        
        // Validate based on ship class
        bytes32 classHash = keccak256(abi.encodePacked(shipAttributes.class));
        
        if (classHash == keccak256(abi.encodePacked("SMALL_SHIP")) && respectLevel < 1) {
            revert InsufficientCaptainRespect(1, respectLevel);
        } else if (classHash == keccak256(abi.encodePacked("MEDIUM_SHIP")) && respectLevel < 6) {
            revert InsufficientCaptainRespect(6, respectLevel);
        } else if (classHash == keccak256(abi.encodePacked("LARGE_SHIP")) && respectLevel < 9) {
            revert InsufficientCaptainRespect(9, respectLevel);
        }
    }

    function validateCrewRequirements(
        uint256 shipId, 
        uint256 captainId, 
        uint256[] memory crewIds,
        address[] memory collectionAddresses
    ) internal {
        IShipMetadata shipMetadata = getShipMetadata();
        IShipMetadata.ShipAttributes memory shipAttributes = shipMetadata.getShipMetadata(shipId);
        ICrewManagement crewManagement = getCrewManagement();
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        
        uint256 essentialCrewCount = 0;
        uint256 allCrewCount = 1; // Start with 1 for the captain
        
        // Count captain's essential crew
        string[] memory captainCrewTypes;
        uint256[] memory captainCrewCounts;
        (captainCrewTypes, captainCrewCounts) = crewManagement.getAllCrewCountsForShip(
            collectionAddresses[0], 
            captainId
        );
        
        for (uint256 i = 0; i < captainCrewTypes.length; i++) {
            if (bytes(captainCrewTypes[i]).length > 0) {
                bool canBeEssential = crewTypeManager.canBeEssentialCrew(captainCrewTypes[i]);
                
                if (canBeEssential) {
                    essentialCrewCount += captainCrewCounts[i];
                }
            }
        }
        
        // Count crew members' essential crew
        for (uint256 i = 0; i < crewIds.length; i++) {
            allCrewCount++; // Increment for each crew member
            
            (captainCrewTypes, captainCrewCounts) = crewManagement.getAllCrewCountsForShip(
                collectionAddresses[i + 1], 
                crewIds[i]
            );
            
            for (uint256 j = 0; j < captainCrewTypes.length; j++) {
                if (bytes(captainCrewTypes[j]).length > 0) {
                    bool canBeEssential = crewTypeManager.canBeEssentialCrew(captainCrewTypes[j]);
                    
                    if (canBeEssential) {
                        essentialCrewCount += captainCrewCounts[j];
                    }
                }
            }
        }
        
        // Validate essential crew requirements
        if (essentialCrewCount < shipAttributes.crewMin) {
            revert InsufficientEssentialCrew(shipAttributes.crewMin, essentialCrewCount);
        }
        if (allCrewCount > shipAttributes.crewMax) {
            revert TooManyEssentialCrew(shipAttributes.crewMax, allCrewCount);
        }

        emit EssentialCrewValidated(shipId, essentialCrewCount, shipAttributes.crewMin, shipAttributes.crewMax);
    }

    function stakeShipWithPirates(StakingData memory stakingData, uint256 homeIslandId, string memory shipClass) public nonReentrant whenNotPaused {
        console.log("[DEBUG] stakeShipWithPirates called", stakingData.shipId, homeIslandId, shipClass);
        // DEBUG: Log all registry-based contract addresses
        address dockingAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IDockingManagement"));
        console.log("[DEBUG] DockingManagement address:", dockingAddr);
        address feeAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IFeeManagement"));
        console.log("[DEBUG] FeeManagement address:", feeAddr);
        address missionsAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IMissionsStorage"));
        console.log("[DEBUG] MissionsStorage address:", missionsAddr);
        address crewAddr = centralAuthorizationRegistry.getContractAddress(keccak256("ICrewManagement"));
        console.log("[DEBUG] CrewManagement address:", crewAddr);
        address crewTypeAddr = centralAuthorizationRegistry.getContractAddress(keccak256("ICrewTypeManager"));
        console.log("[DEBUG] CrewTypeManager address:", crewTypeAddr);
        address shipMetaAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IShipMetadata"));
        console.log("[DEBUG] ShipMetadata address:", shipMetaAddr);
        address skillsReaderAddr = centralAuthorizationRegistry.getContractAddress(keccak256("IPirateSkillsReader"));
        console.log("[DEBUG] PirateSkillsReader address:", skillsReaderAddr);
        // Validate captain's collection
        if (stakingData.captainCollection != genesisPiratesAddress && stakingData.captainCollection != inhabitantsAddress) {
            revert InvalidCollection();
        }
        console.log("[DEBUG] Passed captain collection validation");
        if (ships[stakingData.shipId].isStaked) {
            revert ShipAlreadyStaked();
        }
        console.log("[DEBUG] Passed isStaked check");
        if (pirateToShip[stakingData.captainId] != 0) {
            revert PirateAlreadyStaked();
        }
        console.log("[DEBUG] Passed PirateAlreadyStaked check");
        try shipNft.ownerOf(stakingData.shipId) returns (address owner) {
            if (owner != msg.sender) {
                revert NotShipOwner();
            }
        } catch {
            revert InvalidShipId();
        }
        console.log("[DEBUG] Passed NotShipOwner check");
        // Check docking slot availability and dock
        IDockingManagement docking = getDockingManagement();
        console.log("[DEBUG] About to call getSlotRequirementForShipClass with shipClass:", shipClass);
        uint256 slotsRequired = docking.getSlotRequirementForShipClass(shipClass);
        console.log("[DEBUG] slotsRequired:", slotsRequired);

        console.log("[DEBUG] About to call canDock with homeIslandId:", homeIslandId, "slotsRequired:", slotsRequired);
        bool canDock = docking.canDock(homeIslandId, slotsRequired);
        console.log("[DEBUG] canDock returned:", canDock);

        require(canDock, "No docking slot available");

        console.log("[DEBUG] About to call dockShip");
        docking.dockShip(stakingData.shipId, homeIslandId, msg.sender, shipClass);
        console.log("[DEBUG] dockShip called successfully");
        
        // Transfer ship NFT
        shipNft.transferFrom(msg.sender, address(this), stakingData.shipId);
        
        // Validate captain
        if (stakingData.captainCollection == genesisPiratesAddress) {            
            // For Genesis Pirates (ERC1155), we can only check balanceOf
            uint256 balance = IERC1155(genesisPiratesAddress).balanceOf(msg.sender, stakingData.captainId);
            if (balance == 0) {
                revert NotPirateOwner();
            }
            
        } else {
            // For Inhabitants (ERC721)
            try IERC721(inhabitantsAddress).ownerOf(stakingData.captainId) returns (address owner) {
                if (owner != msg.sender) {
                    revert NotPirateOwner();
                }
            } catch {
                revert NotPirateOwner();
            }
        }
        
       
        // Calculate total pirates for fee
        uint256 totalPirates = 1 + stakingData.genesisPirateIds.length + stakingData.inhabitantIds.length;
        
        // --- Refactored ARRC Fee Burning ---
        IFeeManagement feeManagement = getFeeManagement();
        // Calculate staking fee (0.5 ARRC per pirate)
        uint256 stakeFee = feeManagement.calculateStakingArrcFee(totalPirates);
        // Call generic burn function with action
        feeManagement.burnArrc(msg.sender, stakeFee, "Staking");
        // --- End Refactor ---
                
        // Transfer captain NFT from either Genesis Pirates or Inhabitants collection
        if (stakingData.captainCollection == genesisPiratesAddress) {
            IERC1155(genesisPiratesAddress).safeTransferFrom(msg.sender, address(this), stakingData.captainId, 1, "");
        } else {
            // Must be inhabitantsAddress based on earlier validation
            IERC721(inhabitantsAddress).transferFrom(msg.sender, address(this), stakingData.captainId);
        }
        // Process Genesis Pirates (ERC1155)
        for (uint256 i = 0; i < stakingData.genesisPirateIds.length; i++) {
            // Validate ownership and staking status
            if (pirateToShip[stakingData.genesisPirateIds[i]] != 0) {
                revert PirateAlreadyStaked();
            }
            if (IERC1155(genesisPiratesAddress).balanceOf(msg.sender, stakingData.genesisPirateIds[i]) == 0) {
                revert NotPirateOwner();
            }
            
            IERC1155(genesisPiratesAddress).safeTransferFrom(msg.sender, address(this), stakingData.genesisPirateIds[i], 1, "");
            
            // Store pirate staking details
            pirateToShip[stakingData.genesisPirateIds[i]] = stakingData.shipId;
            pirateCollections[stakingData.genesisPirateIds[i]] = genesisPiratesAddress;
            ships[stakingData.shipId].genesisPirateIds.push(stakingData.genesisPirateIds[i]);
        }
        
        // Process Inhabitants (ERC721)
        for (uint256 i = 0; i < stakingData.inhabitantIds.length; i++) {
            uint256 pirateId = stakingData.inhabitantIds[i];
            
            // Check if pirate is already staked
            uint256 existingShip = pirateToShip[pirateId];
            
            if (existingShip != 0) {
                revert PirateAlreadyStaked();
            }
            
            // Validate ownership
            try IERC721(inhabitantsAddress).ownerOf(pirateId) returns (address owner) {
                if (owner != msg.sender) {
                    revert NotPirateOwner();
                }
            } catch {
                revert NotPirateOwner();
            }
            
            // Transfer inhabitant NFT
            IERC721(inhabitantsAddress).transferFrom(msg.sender, address(this), pirateId);
            
            // Store pirate staking details
            pirateToShip[pirateId] = stakingData.shipId;
            pirateCollections[pirateId] = inhabitantsAddress;
            ships[stakingData.shipId].inhabitantIds.push(pirateId);
        }
        
        // Combine all crew IDs
        uint256 totalCrewCount = stakingData.genesisPirateIds.length + stakingData.inhabitantIds.length;
        uint256[] memory allCrewIds = new uint256[](totalCrewCount);
        address[] memory allCollections = new address[](totalCrewCount + 1);
        
        allCollections[0] = stakingData.captainCollection;
        
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < stakingData.genesisPirateIds.length; i++) {
            allCrewIds[currentIndex] = stakingData.genesisPirateIds[i];
            allCollections[currentIndex + 1] = genesisPiratesAddress;
            currentIndex++;
        }
        
        for (uint256 i = 0; i < stakingData.inhabitantIds.length; i++) {
            allCrewIds[currentIndex] = stakingData.inhabitantIds[i];
            allCollections[currentIndex + 1] = inhabitantsAddress;
            currentIndex++;
        }
        
        // Validate crew requirements
        validateCrewRequirements(stakingData.shipId, stakingData.captainId, allCrewIds, allCollections);
        
        // Stake ship
        ships[stakingData.shipId] = ShipInfo({
            owner: msg.sender,
            isStaked: true,
            captainId: stakingData.captainId,
            captainCollection: stakingData.captainCollection,
            genesisPirateIds: stakingData.genesisPirateIds,
            inhabitantIds: stakingData.inhabitantIds,
            stakingTime: block.timestamp,
            homeIslandId: homeIslandId,
            shipClass: shipClass
        });
        
        // Update pirate mappings
        pirateToShip[stakingData.captainId] = stakingData.shipId;
        pirateCollections[stakingData.captainId] = stakingData.captainCollection;
        
        for (uint256 i = 0; i < stakingData.genesisPirateIds.length; i++) {
            pirateToShip[stakingData.genesisPirateIds[i]] = stakingData.shipId;
            pirateCollections[stakingData.genesisPirateIds[i]] = genesisPiratesAddress;
        }
        
        for (uint256 i = 0; i < stakingData.inhabitantIds.length; i++) {
            pirateToShip[stakingData.inhabitantIds[i]] = stakingData.shipId;
            pirateCollections[stakingData.inhabitantIds[i]] = inhabitantsAddress;
        }
        
        // Update user active ships
        uint256 index = userActiveShips[msg.sender].length;
        userActiveShips[msg.sender].push(stakingData.shipId);
        shipToUserActiveIndex[stakingData.shipId] = index;
        
        // Emit events
        emit ShipStaked(stakingData.shipId, msg.sender, block.timestamp);
        emit PirateStaked(stakingData.captainId, stakingData.shipId, true, block.timestamp, stakingData.captainCollection);
        
        for (uint256 i = 0; i < stakingData.genesisPirateIds.length; i++) {
            emit PirateStaked(stakingData.genesisPirateIds[i], stakingData.shipId, false, block.timestamp, genesisPiratesAddress);
        }
        
        for (uint256 i = 0; i < stakingData.inhabitantIds.length; i++) {
            emit PirateStaked(stakingData.inhabitantIds[i], stakingData.shipId, false, block.timestamp, inhabitantsAddress);
        }

        // DEBUG: Log before calling getMissionInfo
        console.log("[DEBUG] About to call getMissionInfo (pre-try/catch)");
        IMissionsStorage missionsStorage = getMissionsStorage();
        try missionsStorage.getMissionInfo(stakingData.shipId) returns (IMissionsStorage.MissionInfo memory info) {
            console.log("[DEBUG] getMissionInfo returned isActive:", info.isActive);
        } catch {
            console.log("[DEBUG] getMissionInfo reverted");
            revert("MissionsStorage.getMissionInfo reverted");
        }
    }

    function unstakeShip(uint256 shipId) external override {
        ShipInfo storage ship = ships[shipId];
        unstakeShipAndPirates(shipId, ship.shipClass);
    }

    function stakePirate(uint256 shipId, uint256 pirateId, address collectionAddress) public {
        // Validate collection
        if (collectionAddress != genesisPiratesAddress && collectionAddress != inhabitantsAddress) {
            revert InvalidCollection();
        }
        
        ShipInfo storage ship = ships[shipId];
        if (!ship.isStaked) {
            revert ShipNotStaked();
        }
        if (ship.owner != msg.sender) {
            revert NotShipOwner();
        }

        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Check if ship is on mission
        if (missionsStorage.getMissionInfo(shipId).isActive) {
            revert ShipOnMission();
        }
        
        // Validate pirate ownership and staking status
        if (collectionAddress == genesisPiratesAddress) {
            uint256 balance = IERC1155(genesisPiratesAddress).balanceOf(msg.sender, pirateId);
            if (balance == 0) revert NotPirateOwner();
        } else {
            address owner = IERC721(inhabitantsAddress).ownerOf(pirateId);
            if (owner != msg.sender) revert NotPirateOwner();
        }
        
        if (pirateToShip[pirateId] != 0) {
            revert PirateAlreadyStaked();
        }
        
        // Create arrays for validation
        uint256[] memory allCrewIds = new uint256[](ship.genesisPirateIds.length + ship.inhabitantIds.length + 1);
        address[] memory allCollections = new address[](ship.genesisPirateIds.length + ship.inhabitantIds.length + 2);
        
        // Add captain
        allCollections[0] = ship.captainCollection;
        
        // Add existing crew
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < ship.genesisPirateIds.length; i++) {
            allCrewIds[currentIndex] = ship.genesisPirateIds[i];
            allCollections[currentIndex + 1] = genesisPiratesAddress;
            currentIndex++;
        }
        
        for (uint256 i = 0; i < ship.inhabitantIds.length; i++) {
            allCrewIds[currentIndex] = ship.inhabitantIds[i];
            allCollections[currentIndex + 1] = inhabitantsAddress;
            currentIndex++;
        }
        
        // Add new pirate
        allCrewIds[currentIndex] = pirateId;
        allCollections[currentIndex + 1] = collectionAddress;
        
        // Validate crew requirements with new crew
        validateCrewRequirements(shipId, ship.captainId, allCrewIds, allCollections);

        // --- Add ARRC Fee Burning for staking individual pirate ---
        IFeeManagement feeManagement = getFeeManagement();
        uint256 stakePirateFee = feeManagement.stakePirateArrcFee(); // Get the 0.5 ARRC fee rate
        feeManagement.burnArrc(msg.sender, stakePirateFee, "StakingPirate"); // Burn the fee
        // --- End Fee Burning ---

        // Transfer the pirate NFT
        if (collectionAddress == genesisPiratesAddress) {
            IERC1155(genesisPiratesAddress).safeTransferFrom(msg.sender, address(this), pirateId, 1, "");
            ship.genesisPirateIds.push(pirateId);
        } else {
            IERC721(inhabitantsAddress).transferFrom(msg.sender, address(this), pirateId);
            ship.inhabitantIds.push(pirateId);
        }
        
        // Update pirate mapping
        pirateToShip[pirateId] = shipId;
        pirateCollections[pirateId] = collectionAddress;
        
        // Emit events
        emit CrewUpdated(shipId, ship.captainId, _getShipStakedPirates(shipId), block.timestamp);
        emit PirateStaked(pirateId, shipId, false, block.timestamp, collectionAddress);
    }

    function unstakePirate(uint256 shipId, uint256 pirateId) public {
        ShipInfo storage ship = ships[shipId];
        if (!ship.isStaked) revert ShipNotStaked();
        
        if (ship.owner != msg.sender) revert NotShipOwner();

        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Check if ship is on mission
        if (missionsStorage.getMissionInfo(shipId).isActive) revert ShipOnMission();
        
        // Check if pirate is captain
        if (ship.captainId == pirateId) revert CannotRemoveCaptain();
        
        // Get collection address before removing pirate
        address collectionAddress = pirateCollections[pirateId];
        
        // Find and remove pirate from appropriate array
        bool found = false;
        if (collectionAddress == genesisPiratesAddress) {
            for (uint256 i = 0; i < ship.genesisPirateIds.length; i++) {
                if (ship.genesisPirateIds[i] == pirateId) {
                    // Remove by swapping with last element and popping
                    if (i != ship.genesisPirateIds.length - 1) {
                        ship.genesisPirateIds[i] = ship.genesisPirateIds[ship.genesisPirateIds.length - 1];
                    }
                    ship.genesisPirateIds.pop();
                    found = true;
                    break;
                }
            }
        } else if (collectionAddress == inhabitantsAddress) {
            for (uint256 i = 0; i < ship.inhabitantIds.length; i++) {
                if (ship.inhabitantIds[i] == pirateId) {
                    // Remove by swapping with last element and popping
                    if (i != ship.inhabitantIds.length - 1) {
                        ship.inhabitantIds[i] = ship.inhabitantIds[ship.inhabitantIds.length - 1];
                    }
                    ship.inhabitantIds.pop();
                found = true;
                break;
                }
            }
        }

        if (!found) revert PirateNotOnShip(pirateId, shipId);
        
        // Create arrays for validation
        uint256[] memory allCrewIds = new uint256[](ship.genesisPirateIds.length + ship.inhabitantIds.length);
        address[] memory allCollections = new address[](ship.genesisPirateIds.length + ship.inhabitantIds.length + 1);
        
        // Add captain
        allCollections[0] = ship.captainCollection;
        
        // Add remaining crew
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < ship.genesisPirateIds.length; i++) {
            allCrewIds[currentIndex] = ship.genesisPirateIds[i];
            allCollections[currentIndex + 1] = genesisPiratesAddress;
            currentIndex++;
        }
        
        for (uint256 i = 0; i < ship.inhabitantIds.length; i++) {
            allCrewIds[currentIndex] = ship.inhabitantIds[i];
            allCollections[currentIndex + 1] = inhabitantsAddress;
            currentIndex++;
        }
        
        IShipMetadata shipMetadata = getShipMetadata();
        
        IShipMetadata.ShipAttributes memory shipAttributes = shipMetadata.getShipMetadata(shipId);
        
        ICrewManagement crewManagement = getCrewManagement();
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        
        // Getting captain's essential crew count
        string[] memory captainCrewTypes;
        uint256[] memory captainCrewCounts;
        
        (captainCrewTypes, captainCrewCounts) = crewManagement.getAllCrewCountsForShip(
            ship.captainCollection, 
            ship.captainId
        );
        
        uint256 captainEssentialCrewCount = 0;
        for (uint256 i = 0; i < captainCrewTypes.length; i++) {
            if (bytes(captainCrewTypes[i]).length > 0) {
                bool canBeEssential = crewTypeManager.canBeEssentialCrew(captainCrewTypes[i]);
                
                if (canBeEssential) {
                    captainEssentialCrewCount += captainCrewCounts[i];
                }
            }
        }
        
        // If captain alone meets minimum crew requirements, skip validation
        if (captainEssentialCrewCount >= shipAttributes.crewMin) {
        } else {
            validateCrewRequirements(shipId, ship.captainId, allCrewIds, allCollections);
        }
        
        // Update pirate mapping BEFORE transfer to avoid reentrancy issues
        delete pirateToShip[pirateId];
        delete pirateCollections[pirateId];
        
        // Return the pirate NFT
        if (collectionAddress == genesisPiratesAddress) {
            IERC1155(genesisPiratesAddress).safeTransferFrom(address(this), msg.sender, pirateId, 1, "");
        } else {
            IERC721(inhabitantsAddress).transferFrom(address(this), msg.sender, pirateId);
        }
        
        // Emit events
        emit CrewUpdated(shipId, ship.captainId, _getShipStakedPirates(shipId), block.timestamp);
        emit PirateUnstaked(pirateId, shipId, false, block.timestamp, collectionAddress);
    }

    function unstakeShipAndPirates(uint256 shipId, string memory shipClass) public {
        ShipInfo storage ship = ships[shipId];
        if (!ship.isStaked) revert ShipNotStaked();
        if (ship.owner != msg.sender) revert NotShipOwner();

        IMissionsStorage missionsStorage = getMissionsStorage();
        
        // Check if ship is on mission
        if (missionsStorage.getMissionInfo(shipId).isActive) revert ShipOnMission();
        
        // Get collection addresses before unstaking
        address captainCollection = ship.captainCollection;
        
        // Undock from island
        IDockingManagement docking = getDockingManagement();
        docking.undockShip(shipId, ship.homeIslandId, msg.sender, shipClass);
        
        // Transfer ship NFT back to owner
        shipNft.transferFrom(address(this), msg.sender, shipId);
        
        // Transfer captain NFT back to owner
        if (captainCollection == genesisPiratesAddress) {
            IERC1155(genesisPiratesAddress).safeTransferFrom(address(this), msg.sender, ship.captainId, 1, "");
        } else {
            IERC721(inhabitantsAddress).transferFrom(address(this), msg.sender, ship.captainId);
        }
        
        // Unstake captain
        delete pirateToShip[ship.captainId];
        delete pirateCollections[ship.captainId];
        
        // Transfer and unstake genesis pirates
        for (uint256 i = 0; i < ship.genesisPirateIds.length; i++) {
            uint256 crewId = ship.genesisPirateIds[i];
            IERC1155(genesisPiratesAddress).safeTransferFrom(address(this), msg.sender, crewId, 1, "");
            delete pirateToShip[crewId];
            delete pirateCollections[crewId];
            emit PirateUnstaked(crewId, shipId, false, block.timestamp, genesisPiratesAddress);
        }
        
        // Transfer and unstake inhabitants
        for (uint256 i = 0; i < ship.inhabitantIds.length; i++) {
            uint256 crewId = ship.inhabitantIds[i];
            IERC721(inhabitantsAddress).transferFrom(address(this), msg.sender, crewId);
            delete pirateToShip[crewId];
            delete pirateCollections[crewId];
            emit PirateUnstaked(crewId, shipId, false, block.timestamp, inhabitantsAddress);
        }
        
        // Remove from user active ships
        removeFromUserActiveShips(msg.sender, shipId);
        
        // Clean up ship data
        delete ships[shipId];
        
        // Emit events
        emit ShipUnstaked(shipId, msg.sender, block.timestamp);
        emit PirateUnstaked(ship.captainId, shipId, true, block.timestamp, captainCollection);
    }

    function isShipStaked(uint256 shipId) external view override returns (bool) {
        return ships[shipId].isStaked;
    }

    function getShipOwner(uint256 shipId) external view override returns (address) {
        return ships[shipId].owner;
    }

    function getUserActiveShips(address user) external view override returns (uint256[] memory) {
        return userActiveShips[user];
    }

    function _getShipStakedPirates(uint256 shipId) internal view returns (uint256[] memory) {
        ShipInfo storage ship = ships[shipId];
        if (!ship.isStaked) return new uint256[](0);
        
        // Combine captain and all crew into a single array
        uint256 totalLength = 1 + ship.genesisPirateIds.length + ship.inhabitantIds.length;
        uint256[] memory allPirates = new uint256[](totalLength);
        
        // Add captain
        allPirates[0] = ship.captainId;
        
        // Add genesis pirates
        for (uint256 i = 0; i < ship.genesisPirateIds.length; i++) {
            allPirates[i + 1] = ship.genesisPirateIds[i];
        }
        
        // Add inhabitants
        for (uint256 i = 0; i < ship.inhabitantIds.length; i++) {
            allPirates[i + 1 + ship.genesisPirateIds.length] = ship.inhabitantIds[i];
        }
        
        return allPirates;
    }

    function getShipStakedPirates(uint256 shipId) external view override returns (uint256[] memory) {
        return _getShipStakedPirates(shipId);
    }

    function getAssignedPirates(uint256 shipId) external view override returns (uint256[] memory) {
        return _getShipStakedPirates(shipId);
    }

    function shipToCaptain(uint256 shipId) external view override returns (uint256) {
        return ships[shipId].captainId;
    }

    function getShipCaptainAndCollection(uint256 shipId) external view override returns (uint256, address) {
        return (ships[shipId].captainId, ships[shipId].captainCollection);
    }

    function getPirateCollection(uint256 pirateId) external view returns (address) {
        return pirateCollections[pirateId];
    }

    function getShipInfo(uint256 shipId) external view returns (
        address owner,
        bool isStaked,
        uint256 captainId,
        uint256[] memory crewIds,
        uint256 stakingTime
    ) {
        ShipInfo storage ship = ships[shipId];
        return (
            ship.owner,
            ship.isStaked,
            ship.captainId,
            ship.genesisPirateIds.length > 0 ? ship.genesisPirateIds : ship.inhabitantIds,
            ship.stakingTime
        );
    }

    function getPirateShip(uint256 pirateId) external view returns (uint256) {
        return pirateToShip[pirateId];
    }

    function isPirateCaptain(uint256 pirateId) external view returns (bool) {
        uint256 shipId = pirateToShip[pirateId];
        if (shipId == 0) return false;
        
        return ships[shipId].captainId == pirateId;
    }

    function removeFromUserActiveShips(address user, uint256 shipId) internal {
        uint256[] storage userShips = userActiveShips[user];
        uint256 index = shipToUserActiveIndex[shipId];
        
        if (index < userShips.length && userShips[index] == shipId) {
            // If not the last element, swap with the last element
            if (index != userShips.length - 1) {
                uint256 lastShipId = userShips[userShips.length - 1];
                userShips[index] = lastShipId;
                shipToUserActiveIndex[lastShipId] = index;
            }
            
            // Remove the last element
            userShips.pop();
            delete shipToUserActiveIndex[shipId];
        }
    }

    function getMissionsStorageAddress() external view returns (address) {
        return address(getMissionsStorage());
    }

    // Add NFT receiver functions from StorageUpgrade.sol
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC721Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // Add pause functionality
    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }

    // Add batch operations
    function batchStakeShips(
        StakingData[] calldata stakingDataArray,
        uint256[] calldata homeIslandIds,
        string[] calldata shipClasses
    ) external nonReentrant whenNotPaused {
        require(
            stakingDataArray.length == homeIslandIds.length &&
            stakingDataArray.length == shipClasses.length,
            "Array length mismatch"
        );
        for (uint256 i = 0; i < stakingDataArray.length; i++) {
            stakeShipWithPirates(stakingDataArray[i], homeIslandIds[i], shipClasses[i]);
        }
    }

    function batchUnstakeShips(uint256[] calldata shipIds) external nonReentrant whenNotPaused {
        for (uint256 i = 0; i < shipIds.length; i++) {
            ShipInfo storage ship = ships[shipIds[i]];
            unstakeShipAndPirates(shipIds[i], ship.shipClass);
        }
    }

    function getStakedPiratesByCollection(
        address owner,
        address collection
    ) external view returns (
        uint256[] memory stakedPirates,
        uint256[] memory assignedShips,
        bool[] memory isCaptain
    ) {
        require(
            collection == genesisPiratesAddress || collection == inhabitantsAddress,
            "Invalid collection"
        );

        // First count the staked pirates for this owner and collection
        uint256 count = 0;
        uint256[] memory activeShips = userActiveShips[owner];
        for (uint256 i = 0; i < activeShips.length; i++) {
            ShipInfo storage ship = ships[activeShips[i]];
            if (ship.captainCollection == collection) {
                count++;
            }
            if (collection == genesisPiratesAddress) {
                count += ship.genesisPirateIds.length;
            } else {
                count += ship.inhabitantIds.length;
            }
        }

        // Initialize return arrays
        stakedPirates = new uint256[](count);
        assignedShips = new uint256[](count);
        isCaptain = new bool[](count);

        // Fill arrays
        uint256 index = 0;
        for (uint256 i = 0; i < activeShips.length; i++) {
            ShipInfo storage ship = ships[activeShips[i]];
            
            // Add captain if from the requested collection
            if (ship.captainCollection == collection) {
                stakedPirates[index] = ship.captainId;
                assignedShips[index] = activeShips[i];
                isCaptain[index] = true;
                index++;
            }

            // Add crew members
            if (collection == genesisPiratesAddress) {
                for (uint256 j = 0; j < ship.genesisPirateIds.length; j++) {
                    stakedPirates[index] = ship.genesisPirateIds[j];
                    assignedShips[index] = activeShips[i];
                    isCaptain[index] = false;
                    index++;
                }
            } else {
                for (uint256 j = 0; j < ship.inhabitantIds.length; j++) {
                    stakedPirates[index] = ship.inhabitantIds[j];
                    assignedShips[index] = activeShips[i];
                    isCaptain[index] = false;
                    index++;
                }
            }
        }

        return (stakedPirates, assignedShips, isCaptain);
    }

    function getShipCrewDetails(uint256 shipId) external view returns (
        uint256 captain,
        address captainCollection,
        uint256[] memory genesisCrew,
        uint256[] memory inhabitantsCrew
    ) {
        ShipInfo storage ship = ships[shipId];
        require(ship.isStaked, "Ship not staked");

        return (
            ship.captainId,
            ship.captainCollection,
            ship.genesisPirateIds,
            ship.inhabitantIds
        );
    }

    function getGenesisPiratesAddress() external view override returns (address) {
        return genesisPiratesAddress;
    }

    function getInhabitantsAddress() external view override returns (address) {
        return inhabitantsAddress;
    }

    function unstakeShipAndPirates(uint256 shipId) external {
        ShipInfo storage ship = ships[shipId];
        unstakeShipAndPirates(shipId, ship.shipClass);
    }

    /**
     * @notice Rebase a ship to a new home island (change base island)
     * @dev TASK-DOCK-REBASE, see PRD for details
     * @param shipId The ID of the ship to rebase
     * @param newIslandId The new island to assign as home
     * @param shipClass The class of the ship (for slot calculation)
     */
    function rebaseShipHomeIsland(uint256 shipId, uint256 newIslandId, string memory shipClass) external nonReentrant whenNotPaused override {
        ShipInfo storage ship = ships[shipId];
        if (!ship.isStaked) revert ShipNotStaked();
        if (ship.owner != msg.sender) revert NotShipOwner();

        IMissionsStorage missionsStorage = getMissionsStorage();
        if (missionsStorage.getMissionInfo(shipId).isActive) revert ShipOnMission();

        IDockingManagement docking = getDockingManagement();
        uint256 slotsRequired = docking.getSlotRequirementForShipClass(shipClass);
        require(docking.canDock(newIslandId, slotsRequired), "No docking slot available at new island");

        // Burn 0.1 ARRC per NFT pirate (captain + all pirates)
        uint256 totalPirates = 1 + ship.genesisPirateIds.length + ship.inhabitantIds.length;
        IFeeManagement feeManagement = getFeeManagement();
        // Calculate rebasing fee
        uint256 rebaseFee = totalPirates * 1 * 10**17; // 0.1 ARRC in wei
        // Call generic burn function with action
        feeManagement.burnArrc(msg.sender, rebaseFee, "Rebasing");

        // Call Docking contract to move slots
        docking.rebaseShip(shipId, ship.homeIslandId, newIslandId, msg.sender, shipClass);

        // Update homeIslandId
        ship.homeIslandId = newIslandId;
    }

}