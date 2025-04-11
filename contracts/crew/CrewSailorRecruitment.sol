// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../AuthorizationModifiers.sol";
import "../interfaces/ICrewManagement.sol";
import "../interfaces/ICrewTypeManager.sol";
import "../interfaces/IFeeManagement.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

error InvalidAmount();
error NotPirateOwner();
error ExceedsCrewCapacity(uint256 currentCount, uint256 requestedAmount, uint256 maxCapacity);
error InsufficientAllowance(uint256 required, uint256 actual);
error InsufficientBalance(uint256 required, uint256 actual);
error TransferFailed();
error InvalidArrcTokenAddress();
error InvalidPirateCollectionAddress();

/**
 * @title CrewSailorRecruitment
 * @notice Handles the recruitment of sailors for pirate ships
 * @dev This contract only allows recruitment of sailors, not other crew types
 */
contract CrewSailorRecruitment is AuthorizationModifiers {
    // Constants
    IERC20 public immutable arrcToken;
    uint256 public constant RECRUITMENT_COST = 1 * 10**18; // 1 ARRC per sailor
    bytes32 public constant SAILOR_TYPE = keccak256("SAILOR");
    address public immutable genesisPiratesAddress;
    address public immutable inhabitantsAddress;

    // Events
    event SailorRecruited(
        address indexed pirateCollection,
        uint256 indexed pirateId,
        address indexed owner,
        uint256 amount
    );

    // Debug events
    event Debug(string message);
    event DebugAddress(string message, address value);
    event DebugUint(string message, uint256 value);
    event DebugBool(string message, bool value);
    event DebugString(string message, string value);

    /**
     * @notice Constructor for CrewSailorRecruitment
     * @param _centralAuthorizationRegistry Address of the central authorization registry
     * @param _arrcToken Address of the ARRC token used for payment
     * @param _genesisPiratesAddress Address of the Genesis Pirates NFT collection
     * @param _inhabitantsAddress Address of the Inhabitants NFT collection
     */
    constructor(
        address _centralAuthorizationRegistry,
        address _arrcToken,
        address _genesisPiratesAddress,
        address _inhabitantsAddress
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("ICrewSailorRecruitment")) {
        if (_arrcToken == address(0)) revert InvalidArrcTokenAddress();
        if (_genesisPiratesAddress == address(0) || _inhabitantsAddress == address(0)) 
            revert InvalidPirateCollectionAddress();
            
        arrcToken = IERC20(_arrcToken);
        genesisPiratesAddress = _genesisPiratesAddress;
        inhabitantsAddress = _inhabitantsAddress;
    }

    /**
     * @notice Get the crew management contract
     * @return ICrewManagement interface of the crew management contract
     */
    function getCrewManagement() internal view returns (ICrewManagement) {
        return ICrewManagement(centralAuthorizationRegistry.getContractAddress(keccak256(bytes("ICrewManagement"))));
    }

    /**
     * @notice Get the crew type manager contract
     * @return ICrewTypeManager interface of the crew type manager contract
     */
    function getCrewTypeManager() internal view returns (ICrewTypeManager) {
        return ICrewTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256(bytes("ICrewTypeManager"))));
    }

    /**
     * @notice Get the fee management contract
     * @return IFeeManagement interface of the fee management contract
     */
    function getFeeManagement() internal view returns (IFeeManagement) {
        return IFeeManagement(centralAuthorizationRegistry.getContractAddress(keccak256(bytes("IFeeManagement"))));
    }

    /**
     * @notice Check if the caller owns the specified pirate NFT
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId ID of the pirate NFT
     * @return true if the caller owns the pirate, false otherwise
     */
    function isPirateOwner(address pirateCollection, uint256 pirateId) internal view returns (bool) {
        if (pirateCollection == genesisPiratesAddress) {
            // Genesis Pirates is an ERC1155 collection
            IERC1155 pirateNFT = IERC1155(pirateCollection);
            return pirateNFT.balanceOf(msg.sender, pirateId) > 0;
        } else if (pirateCollection == inhabitantsAddress) {
            // Inhabitants is an ERC721 collection
            IERC721 pirateNFT = IERC721(pirateCollection);
            try pirateNFT.ownerOf(pirateId) returns (address owner) {
                return owner == msg.sender;
            } catch {
                return false;
            }
        }
        
        // Unsupported collection
        return false;
    }

    /**
     * @notice Recruit sailors for a pirate ship
     * @param pirateCollection Address of the pirate NFT collection
     * @param pirateId ID of the pirate NFT
     * @param amount Number of sailors to recruit
     */
    function recruitSailors(
        address pirateCollection,
        uint256 pirateId,
        uint256 amount
    ) external {
        if (amount == 0) {
            revert InvalidAmount();
        }

        // Check if the caller owns the pirate
        if (!isPirateOwner(pirateCollection, pirateId)) {
            revert NotPirateOwner();
        }

        // Get the sailor crew type
        ICrewTypeManager crewTypeManager = getCrewTypeManager();
        string memory sailorType = "sailor"; // Using the string representation for compatibility

        // Check if pirate has capacity for new sailors
        ICrewManagement crewManagement = getCrewManagement();
        
        uint256 currentCrewCount = crewManagement.getTotalCrewCount(pirateCollection, pirateId);
        uint256 maxCrewCapacity = crewTypeManager.getPirateCrewCapacity(pirateCollection, pirateId);
        uint256 newTotalCrewCount = currentCrewCount + amount;
        
        if (newTotalCrewCount > maxCrewCapacity) {
            revert ExceedsCrewCapacity(currentCrewCount, amount, maxCrewCapacity);
        }

        // Calculate total cost
        uint256 totalCost = amount * RECRUITMENT_COST;

        // Check ARRC allowance and balance
        uint256 allowance = arrcToken.allowance(msg.sender, address(this));
        uint256 balance = arrcToken.balanceOf(msg.sender);
        
        if (allowance < totalCost) {
            revert InsufficientAllowance(totalCost, allowance);
        }
        
        if (balance < totalCost) {
            revert InsufficientBalance(totalCost, balance);
        }

        // Transfer and burn ARRC tokens
        if (!arrcToken.transferFrom(msg.sender, address(this), totalCost)) {
            revert TransferFailed();
        }
        
        IFeeManagement feeManagement = getFeeManagement();
        arrcToken.approve(address(feeManagement), totalCost);
        feeManagement.useRum(msg.sender, 1); // Using 1 day for fee management

        // Add sailors to the pirate
        crewManagement.addCrew(pirateCollection, pirateId, msg.sender, sailorType, amount);

        emit SailorRecruited(pirateCollection, pirateId, msg.sender, amount);
    }

    /**
     * @notice Calculate the cost to recruit a given number of sailors
     * @param amount Number of sailors to recruit
     * @return Total cost in ARRC tokens
     */
    function calculateRecruitmentCost(uint256 amount) external pure returns (uint256) {
        return amount * RECRUITMENT_COST;
    }
} 