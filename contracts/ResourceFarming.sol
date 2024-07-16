// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./interfaces/IResourceManagement.sol";
import "./interfaces/IFeeManagement.sol";
import "./interfaces/IPirateManagement.sol";
import "./interfaces/IStorageManagement.sol";
import "./interfaces/IResourceSpendManagement.sol";
import "./interfaces/IResourceTypeManager.sol";
import "./interfaces/IResourceFarmingRules.sol";
import "./CentralAuthorizationRegistry.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract ResourceFarming is IERC1155Receiver, ReentrancyGuard {

    using Strings for string;

    CentralAuthorizationRegistry public centralAuthorizationRegistry;

    uint256 constant SECONDS_IN_30_DAYS = 30 * 24 * 60 * 60;
    uint256 constant SECONDS_IN_1_DAY = 24 * 60 * 60;
    //uint256 constant SECONDS_IN_1_DAY = 5*60;
    struct FarmingInfo {
        address owner;
        address collectionAddress;
        uint256 tokenId;
        uint256 startTime;
        uint256 endTime;
        string resource;
        bool useRum;
        uint256 days_count;
        string resourceToBurn;
    }

    struct RestakeParams {
        string resource;
        uint256 days_count;
        bool useRum;
        string resourceToBurn;
        bool isSet; // To check if the struct is set
    }

    mapping(address => mapping(uint256 => FarmingInfo)) public farmingInfo;
    mapping(address => mapping(address => uint256[])) public workingPirates; // Updated mapping

    event ResourceFarmed(
        address indexed user,
        address indexed collectionAddress,
        uint256 indexed tokenId,
        string resource,
        uint256 startTime,
        uint256 endTime,
        bool useRum,
        uint256 daysCount,
        string resourceToBurn
    );

    modifier validPirateCollection(address collectionAddress) {
        require(address(centralAuthorizationRegistry.getPirateNftContract(collectionAddress)) != address(0), "Invalid collection address");
        _;
    }

    constructor(address _centralAuthorizationRegistryAddress) {
        centralAuthorizationRegistry = CentralAuthorizationRegistry(_centralAuthorizationRegistryAddress);
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }

    function getResourceSpendManagement() internal view returns (IResourceSpendManagement) {
        return IResourceSpendManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceSpendManagement")));
    }

    function getFeeManagement() internal view returns (IFeeManagement) {
        return IFeeManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IFeeManagement")));
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }

    function getResourceTypeManager() internal view returns (IResourceTypeManager) {
        return IResourceTypeManager(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceTypeManager")));
    }

    function getResourceFarmingRules() internal view returns (IResourceFarmingRules) {
        return IResourceFarmingRules(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceFarmingRules")));
    }

    function getPirateManagement() internal view returns (IPirateManagement) {
        return IPirateManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IPirateManagement")));
    }

    function stakePirate(address collectionAddress, uint256 tokenId) internal nonReentrant {
        require(farmingInfo[collectionAddress][tokenId].tokenId == 0, "Pirate is already staked");
        IERC1155 nftContract = centralAuthorizationRegistry.getPirateNftContract(collectionAddress);
        require(nftContract.balanceOf(msg.sender, tokenId) > 0, "You do not own this pirate");
        nftContract.safeTransferFrom(msg.sender, address(this), tokenId, 1, "");        
    }

    function unstakePirate(address collectionAddress, uint256 tokenId) internal {
        FarmingInfo memory info = farmingInfo[collectionAddress][tokenId];
        require(info.tokenId == tokenId, "This pirate is not staked by you");
        require(block.timestamp >= info.endTime, "Staking period not yet completed");

        // Transfer the pirate NFT back to the owner
        IERC1155 nftContract = centralAuthorizationRegistry.getPirateNftContract(collectionAddress);
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId, 1, "");

        // Clear the staking information
        delete farmingInfo[collectionAddress][tokenId];

        // Remove from working pirates
        removeWorkingPirate(msg.sender, collectionAddress, tokenId);
    }

    function farmResource(
        address collectionAddress,
        uint256 tokenId,
        string memory resource,
        uint256 days_count,
        bool useRum,
        string memory resourceToBurn,
        bool isRestake
    ) public payable validPirateCollection(collectionAddress) {
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (days_count * SECONDS_IN_1_DAY);
        require(getResourceTypeManager().isValidResourceType(resource), "Invalid resource name");
        require(days_count <= 28, "Exceeds maximum allowed farming days");
        require(days_count >= 1, "Minimum staking period is 1 day");

        if (!isRestake) {
            // Stake the pirate
            stakePirate(collectionAddress, tokenId);
        } else {
            // Verify that the token ID is already staked on this contract
            require(farmingInfo[collectionAddress][tokenId].tokenId == tokenId, "This pirate is not staked on this contract");
            IERC1155 nftContract = centralAuthorizationRegistry.getPirateNftContract(collectionAddress);
            require(nftContract.balanceOf(address(this), tokenId) > 0, "This pirate is not staked on this contract");
            // Check if the previous pirate work has ended
            require(block.timestamp >= farmingInfo[collectionAddress][tokenId].endTime, "Previous pirate work has not ended yet");
        }

        // Verify pirate's storage capacity
        uint256 output = calculateResourceOutput(collectionAddress, tokenId, resource, startTime, endTime);
        require(getStorageManagement().checkStorageLimit(collectionAddress, tokenId, output), "Storage limit reached");

        // Store farming information
        farmingInfo[collectionAddress][tokenId] = FarmingInfo({
            owner: msg.sender,
            collectionAddress: collectionAddress,
            tokenId: tokenId,
            startTime: startTime,
            endTime: endTime,
            resource: resource,
            useRum: useRum,
            days_count: days_count,
            resourceToBurn: resourceToBurn
        });

        if (!isRestake) {
            // Add to working pirates
            workingPirates[msg.sender][collectionAddress].push(tokenId);
        }

        // Handle resource burning
        address storageContract = getStorageManagement().getStorageByCollection(collectionAddress);
        IResourceSpendManagement resourceSpendManagement = getResourceSpendManagement();

        if (resourceSpendManagement.doesResourceRequireBurning(resource)) {
            require(useRum, "RUM must be used for resource burning");
            string[] memory resourcesToBurnArray = new string[](1);
            resourcesToBurnArray[0] = resourceToBurn;            
            resourceSpendManagement.handleResourceBurning(storageContract, tokenId, msg.sender, resource, days_count, output, resourcesToBurnArray);
            getFeeManagement().useRum(msg.sender, days_count);
        } else {
            if (useRum) {                
                getFeeManagement().useRum(msg.sender, days_count);
            } else {                
                uint256 fee = getFeeManagement().calculateMaticFee(days_count);
                require(msg.value >= fee, "Insufficient Matic sent");

                // Transfer MATIC directly to the maticFeeRecipient
                address maticFeeRecipient = getFeeManagement().maticFeeRecipient();
                (bool success, ) = maticFeeRecipient.call{value: fee}("");
                require(success, "Transfer failed");
            }
        }

        // Emit the ResourceFarmed event
        emit ResourceFarmed(
            msg.sender,
            collectionAddress,
            tokenId,
            resource,
            startTime,
            endTime,
            useRum,
            days_count,
            resourceToBurn
        );
    }

    function calculateResourceOutput(
        address collectionAddress,
        uint256 tokenId,
        string memory resource,
        uint256 startTime,
        uint256 endTime
    ) internal view returns (uint256) {
        IPirateManagement.PirateSkills memory pirateSkills = getPirateManagement().getPirateSkills(collectionAddress, tokenId);

        uint256 durationSeconds = endTime - startTime;

        return getResourceFarmingRules().calculateResourceOutput(pirateSkills, resource, durationSeconds);
    }

    function claimResourcePirate(address collectionAddress, uint256 tokenId, RestakeParams memory restakeParams) public payable validPirateCollection(collectionAddress) nonReentrant {
        FarmingInfo memory info = farmingInfo[collectionAddress][tokenId];
        require(info.tokenId != 0, "This pirate is not staked");
        require(block.timestamp > info.endTime, "Farming period not yet completed");
        require(info.owner == msg.sender, "You do not own this pirate");

        // Calculate resource output
        uint256 output = calculateResourceOutput(collectionAddress, tokenId, info.resource, info.startTime, info.endTime);

        // Get current storage and storage limit
        uint256 currentStorage = getStorageManagement().getTotalResourcesInStorage(collectionAddress, tokenId);
        uint256 storageLimit = getStorageManagement().getStorageCapacity(collectionAddress, tokenId);
        address storageContract = getStorageManagement().getStorageByCollection(collectionAddress);

        // Calculate the amount that can be added without exceeding the storage limit
        uint256 availableStorage = storageLimit - currentStorage;
        uint256 amountToAdd = output > availableStorage ? availableStorage : output;

        // Add resources to pirate's storage
        getResourceManagement().addResource(storageContract, tokenId, msg.sender, info.resource, amountToAdd);

        // Unstake the pirate
        if (!restakeParams.isSet) {
            unstakePirate(collectionAddress, tokenId);
            delete farmingInfo[collectionAddress][tokenId];
        } else {
            _restakePirate(collectionAddress, tokenId, restakeParams, info);
        }
    }

    function _restakePirate(
        address collectionAddress,
        uint256 tokenId,
        RestakeParams memory restakeParams,
        FarmingInfo memory info
    ) internal {
        string memory resource = restakeParams.isSet && bytes(restakeParams.resource).length > 0 ? restakeParams.resource : info.resource;
        uint256 days_count = restakeParams.isSet && restakeParams.days_count > 0 ? restakeParams.days_count : info.days_count;
        bool useRum = restakeParams.isSet ? restakeParams.useRum : info.useRum;
        string memory resourceToBurn = restakeParams.isSet && bytes(restakeParams.resourceToBurn).length > 0 ? restakeParams.resourceToBurn : info.resourceToBurn;
        farmResource(collectionAddress, tokenId, resource, days_count, useRum, resourceToBurn, true);
    }

    function claimAllResources(address collectionAddress) public validPirateCollection(collectionAddress) nonReentrant {
        uint256[] memory pirates = workingPirates[msg.sender][collectionAddress];
        require(pirates.length > 0, "User has no working pirates");

        for (uint256 i = 0; i < pirates.length; i++) {
            FarmingInfo memory info = farmingInfo[collectionAddress][pirates[i]];
            if (block.timestamp >= info.endTime) {
                claimResourcePirate(collectionAddress, pirates[i], RestakeParams("", 0, false, "", false));
            }
        }
    }

    function getCurrentProduction(address collectionAddress, uint256 tokenId) public view returns (uint256) {
        FarmingInfo memory info = farmingInfo[collectionAddress][tokenId];
        require(info.startTime != 0, "Pirate is not farming");

        uint256 elapsedTime = block.timestamp - info.startTime;

        return calculateResourceOutput(collectionAddress, tokenId, info.resource, info.startTime, info.startTime + elapsedTime);
    }

    function getTotalToClaim(address collectionAddress, uint256 tokenId) public view returns (uint256) {
        FarmingInfo memory info = farmingInfo[collectionAddress][tokenId];
        if (info.startTime == 0) {
            return 0;
        }

        return calculateResourceOutput(collectionAddress, tokenId, info.resource, info.startTime, info.endTime);
    }

    struct FarmingInfoDetails {
        uint256 totalToClaim;
        uint256 currentProduction;
        uint256 startTime;
        uint256 endTime;
        string resource;
        bool useRum;
        uint256 days_count;
        string resourceToBurn;
    }

    function getFarmingInfo(address collectionAddress, uint256 tokenId) public view returns (FarmingInfoDetails memory) {
        FarmingInfo memory info = farmingInfo[collectionAddress][tokenId];
        
        FarmingInfoDetails memory details;
        details.totalToClaim = getTotalToClaim(collectionAddress, tokenId);
        details.currentProduction = getCurrentProduction(collectionAddress, tokenId);
        details.startTime = info.startTime;
        details.endTime = info.endTime;
        details.resource = info.resource;
        details.useRum = info.useRum;
        details.days_count = info.days_count;
        details.resourceToBurn = info.resourceToBurn;

        return details;
    }

    function getWorkingPirates(address owner, address collectionAddress) public view returns (uint256[] memory) {
        uint256[] memory pirates = workingPirates[owner][collectionAddress];
        uint256 count = 0;

        // First pass to count active pirates
        for (uint256 i = 0; i < pirates.length; i++) {
            if (isPirateWorking(collectionAddress, pirates[i])) {
                count++;
            }
        }

        // Allocate memory for active pirates
        uint256[] memory activePirates = new uint256[](count);
        uint256 index = 0;

        // Second pass to populate active pirates
        for (uint256 i = 0; i < pirates.length; i++) {
            if (isPirateWorking(collectionAddress, pirates[i])) {
                activePirates[index] = pirates[i];
                index++;
            }
        }

        return activePirates;
    }

    function getPirates(address owner, address collectionAddress) public view returns (uint256[] memory, uint256[] memory, uint256[] memory) {
        uint256[] memory totalPirates = workingPirates[owner][collectionAddress];
        uint256 workingCount = 0;
        uint256 finishedCount = 0;

        // First pass to count working and finished pirates
        for (uint256 i = 0; i < totalPirates.length; i++) {
            if (isPirateWorking(collectionAddress, totalPirates[i])) {
                workingCount++;
            } else {
                finishedCount++;
            }
        }

        // Allocate memory for working and finished pirates
        uint256[] memory workingPiratesList = new uint256[](workingCount);
        uint256[] memory finishedPiratesList = new uint256[](finishedCount);
        uint256 workingIndex = 0;
        uint256 finishedIndex = 0;

        // Second pass to populate working and finished pirates
        for (uint256 i = 0; i < totalPirates.length; i++) {
            if (isPirateWorking(collectionAddress, totalPirates[i])) {
                workingPiratesList[workingIndex] = totalPirates[i];
                workingIndex++;
            } else {
                finishedPiratesList[finishedIndex] = totalPirates[i];
                finishedIndex++;
            }
        }

        return (totalPirates, workingPiratesList, finishedPiratesList);
    }

    function isPirateWorking(address collectionAddress, uint256 tokenId) internal view returns (bool) {
        FarmingInfo memory info = farmingInfo[collectionAddress][tokenId];
        return block.timestamp < info.endTime;
    }

    function removeWorkingPirate(address owner, address collectionAddress, uint256 tokenId) internal {
        uint256[] memory newWorkingPirates = new uint256[](workingPirates[owner][collectionAddress].length - 1);
        uint256 j = 0;
        for (uint256 i = 0; i < workingPirates[owner][collectionAddress].length; i++) {
            if (workingPirates[owner][collectionAddress][i] != tokenId) {
                newWorkingPirates[j] = workingPirates[owner][collectionAddress][i];
                j++;
            }
        }
        workingPirates[owner][collectionAddress] = newWorkingPirates;
    }

    // New function to simulate resource production
    function simulateResourceProduction(
        address collectionAddress,
        uint256 tokenId,
        string memory resource,
        uint256 days_count
    ) public view returns (uint256) {
        require(getResourceTypeManager().isValidResourceType(resource), "Invalid resource name");
        require(days_count >= 1 && days_count <= 28, "Invalid days count");

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + (days_count * SECONDS_IN_1_DAY);

        return calculateResourceOutput(collectionAddress, tokenId, resource, startTime, endTime);
    }

    // IERC1155Receiver implementation
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data) public returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) public returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}