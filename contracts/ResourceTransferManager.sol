// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IStorageManagement.sol";
import "./interfaces/IResourceManagement.sol";
import "./interfaces/IResourceFarming.sol";
import "./interfaces/IStorageUpgrade.sol";
import "./interfaces/IFeeManagement.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ResourceTransferManager is AuthorizationModifiers, Pausable {
    using Strings for string;

    IERC721 public shipNftContract;
    
    // Mapping for fee-exempt addresses
    mapping(address => bool) public feeExemptAddresses;
    
    // Mapping for addresses authorized to call setBatchFeeExemption
    mapping(address => bool) public authorizedBatchExemptionCallers;
    
    // Resource transfer fee in ARRC (per transfer)
    uint256 public resourceTransferFee;

    // Events
    event ResourceTransferredBetweenNFTs(
        address indexed user,
        address indexed sourceCollection,
        uint256 indexed sourceTokenId,
        address destinationCollection,
        uint256 destinationTokenId,
        string resource,
        uint256 amount,
        uint256 feePaid
    );
    event FeeExemptionUpdated(address indexed user, bool exempt);
    event ResourceTransferFeeUpdated(uint256 newFee);
    event ShipNftContractUpdated(address indexed newContract);
    event BatchExemptionCallerAuthorized(address indexed caller, bool authorized);

    constructor(address _centralAuthorizationRegistryContract) AuthorizationModifiers(_centralAuthorizationRegistryContract, keccak256("IResourceTransferManagerV2")) {
        resourceTransferFee = 1 * 10**17; // 0.1 ARRC default fee
    }

    function getStorageManagement() internal view returns (IStorageManagement) {
        return IStorageManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageManagement")));
    }

    function getResourceManagement() internal view returns (IResourceManagement) {
        return IResourceManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceManagement")));
    }

    function getFeeManagement() internal view returns (IFeeManagement) {
        return IFeeManagement(centralAuthorizationRegistry.getContractAddress(keccak256("IFeeManagement")));
    }

    function getResourceFarming() internal view returns (IResourceFarming) {
        return IResourceFarming(centralAuthorizationRegistry.getContractAddress(keccak256("IResourceFarming")));
    }

    function getStorageUpgrade() internal view returns (IStorageUpgrade) {
        return IStorageUpgrade(centralAuthorizationRegistry.getContractAddress(keccak256("IStorageUpgrade")));
    }

    /**
     * @dev Internal function to check if a pirate is staked by an owner in StorageUpgrade.
     */
    function isPirateStakedByOwnerInStorageUpgrade(address collectionContract, uint256 tokenId, address owner) internal view returns (bool) {
        IStorageUpgrade storageUpgrade = getStorageUpgrade();
        IStorageUpgrade.StakingInfo memory stakingInfo = storageUpgrade.stakingInfo(collectionContract, tokenId);
        
        return (stakingInfo.owner == owner && 
                stakingInfo.endTime > 0 && 
                block.timestamp < stakingInfo.endTime && 
                !stakingInfo.claimed);
    }

    function _isERC1155(address collectionAddress) internal view returns (bool) {
        return IERC165(collectionAddress).supportsInterface(type(IERC1155).interfaceId);
    }

    function isERC1155(address collectionAddress) external view returns (bool) {
        return _isERC1155(collectionAddress);
    }

    function _isERC721(address collectionAddress) internal view returns (bool) {
        return IERC165(collectionAddress).supportsInterface(type(IERC721).interfaceId);
    }

    function isERC721(address collectionAddress) external view returns (bool) {
        return _isERC721(collectionAddress);
    }

    /**
     * @dev Transfers a single resource from a source NFT (pirate or island) to a destination NFT (pirate or island).
     *      User must own at least one ship NFT in their wallet to use this function.
     *      A fee in ARRC is charged unless the user is fee-exempt.
     * @param sourceCollectionContract The contract address of the source NFT (pirate or island).
     * @param sourceTokenId The token ID of the source NFT.
     * @param destinationCollectionContract The contract address of the destination NFT (pirate or island).
     * @param destinationTokenId The token ID of the destination NFT.
     * @param destinationOwner The owner of the destination NFT.
     * @param resource The resource name to transfer.
     * @param amount The amount of resource to transfer.
     */
    function transferResourcesToDestination(
        address sourceCollectionContract,
        uint256 sourceTokenId,
        address destinationCollectionContract,
        uint256 destinationTokenId,
        address destinationOwner,
        string memory resource,
        uint256 amount
    ) external whenNotPaused {
        address user = msg.sender;
        
        // User must own at least one ship NFT in their wallet to use this function
        require(_userOwnsShip(user), "User must own a ship NFT to use this function");

        // Verify user owns the source NFT
        _verifySourceOwnership(user, sourceCollectionContract, sourceTokenId);
        
        // Verify destination ownership
        _verifyDestinationOwnership(destinationOwner, destinationCollectionContract, destinationTokenId);

        IStorageManagement storageManagement = getStorageManagement();

        // Check storage balance and limit
        require(
            storageManagement.getResourceBalance(sourceCollectionContract, sourceTokenId, resource) >= amount,
            "Not enough resources in source storage"
        );
        require(
            storageManagement.checkStorageLimit(destinationCollectionContract, destinationTokenId, amount),
            "Insufficient storage capacity in destination"
        );

        // Handle fee payment if user is not exempt
        uint256 feePaid = 0;
        if (!feeExemptAddresses[user] && resourceTransferFee > 0) {
            IFeeManagement feeManagement = getFeeManagement();
            feeManagement.burnArrc(user, resourceTransferFee, "ResourceTransfer");
            feePaid = resourceTransferFee;
        }

        // Transfer resource
        storageManagement.transferResource(
            sourceCollectionContract,
            sourceTokenId,
            user,
            destinationCollectionContract,
            destinationTokenId,
            destinationOwner,
            resource,
            amount
        );

        emit ResourceTransferredBetweenNFTs(
            user,
            sourceCollectionContract,
            sourceTokenId,
            destinationCollectionContract,
            destinationTokenId,
            resource,
            amount,
            feePaid
        );
    }

    /**
     * @dev Internal function to verify NFT ownership.
     * @param owner The address that should own the token.
     * @param collectionContract The contract address of the NFT collection.
     * @param tokenId The token ID to verify ownership for.
     * @param errorPrefix The prefix for error messages (e.g., "User", "Destination owner").
     */
    function _verifyTokenOwnership(address owner, address collectionContract, uint256 tokenId, string memory errorPrefix) internal view {
        // Check for pirate ownership using the same pattern as IslandManagement
        // This handles both direct ownership and staking scenarios
        IResourceFarming resourceFarming = getResourceFarming();
        
        bool ownsToken = false;
        
        if (_isERC1155(collectionContract)) {
            ownsToken = IERC1155(collectionContract).balanceOf(owner, tokenId) > 0;
        } else if (_isERC721(collectionContract)) {
            ownsToken = IERC721(collectionContract).ownerOf(tokenId) == owner;
        }
        
        // If user doesn't directly own the token, check if it's staked
        if (!ownsToken) {
            bool isStakedInResourceFarming = resourceFarming.isPirateStakedByOwner(collectionContract, tokenId, owner);
            bool isStakedInStorageUpgrade = isPirateStakedByOwnerInStorageUpgrade(collectionContract, tokenId, owner);
            ownsToken = isStakedInResourceFarming || isStakedInStorageUpgrade;
        }
        
        require(
            ownsToken,
            string(abi.encodePacked(errorPrefix, " does not own the pirate token"))
        );
    }

    /**
     * @dev Internal function to verify source NFT ownership.
     */
    function _verifySourceOwnership(address user, address sourceCollectionContract, uint256 sourceTokenId) internal view {
        _verifyTokenOwnership(user, sourceCollectionContract, sourceTokenId, "User");
    }

    /**
     * @dev Internal function to verify destination NFT ownership.
     */
    function _verifyDestinationOwnership(address destinationOwner, address destinationCollectionContract, uint256 destinationTokenId) internal view {
        _verifyTokenOwnership(destinationOwner, destinationCollectionContract, destinationTokenId, "Destination owner");
    }

    /**
     * @dev Internal function to check if a user owns at least one ship NFT.
     */
    function _userOwnsShip(address user) internal view returns (bool) {
        if (address(shipNftContract) == address(0)) {
            return true; // If ship contract not set, allow transfers
        }
        return shipNftContract.balanceOf(user) > 0;
    }

    // Admin functions for fee management
    
    /**
     * @dev Sets the ship NFT contract address.
     * @param _shipNftContract The address of the ship NFT contract.
     */
    function setShipNftContract(address _shipNftContract) external onlyAdmin {
        require(_shipNftContract != address(0), "Invalid ship NFT contract address");
        shipNftContract = IERC721(_shipNftContract);
        emit ShipNftContractUpdated(_shipNftContract);
    }

    /**
     * @dev Sets the resource transfer fee.
     * @param _newFee The new fee amount in wei.
     */
    function setResourceTransferFee(uint256 _newFee) external onlyAdmin {
        resourceTransferFee = _newFee;
        emit ResourceTransferFeeUpdated(_newFee);
    }

    /**
     * @dev Updates fee exemption status for an address.
     * @param _user The user address to update.
     * @param _exempt True to exempt from fees, false otherwise.
     */
    function setFeeExemption(address _user, bool _exempt) external onlyAdmin {
        require(_user != address(0), "Invalid user address");
        feeExemptAddresses[_user] = _exempt;
        emit FeeExemptionUpdated(_user, _exempt);
    }

    /**
     * @dev Authorizes or revokes authorization for an address to call setBatchFeeExemption.
     * @param _caller The address to authorize or revoke.
     * @param _authorized True to authorize, false to revoke.
     */
    function setBatchExemptionCaller(address _caller, bool _authorized) external onlyAdmin {
        require(_caller != address(0), "Invalid caller address");
        authorizedBatchExemptionCallers[_caller] = _authorized;
        emit BatchExemptionCallerAuthorized(_caller, _authorized);
    }

    /**
     * @dev Updates fee exemption status for multiple addresses.
     * @param _users Array of user addresses to update.
     * @param _exempt True to exempt from fees, false otherwise.
     */
    function setBatchFeeExemption(address[] memory _users, bool _exempt) external {
        require(
            authorizedBatchExemptionCallers[msg.sender] || centralAuthorizationRegistry.isAdmin(msg.sender),
            "Not authorized to call setBatchFeeExemption"
        );
        
        for (uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid user address");
            feeExemptAddresses[_users[i]] = _exempt;
            emit FeeExemptionUpdated(_users[i], _exempt);
        }
    }

    /**
     * @dev Pauses the contract, preventing resource transfers.
     * @dev Only callable by an admin.
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpauses the contract, allowing resource transfers.
     * @dev Only callable by an admin.
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    // View functions
    
    /**
     * @dev Checks if an address is exempt from fees.
     * @param _user The user address to check.
     * @return True if exempt, false otherwise.
     */
    function isFeeExempt(address _user) external view returns (bool) {
        return feeExemptAddresses[_user];
    }

    /**
     * @dev Gets the current resource transfer fee.
     * @return The fee amount in wei.
     */
    function getResourceTransferFee() external view returns (uint256) {
        return resourceTransferFee;
    }

    /**
     * @dev Checks if an address is authorized to call setBatchFeeExemption.
     * @param _caller The address to check.
     * @return True if authorized, false otherwise.
     */
    function isBatchExemptionCaller(address _caller) external view returns (bool) {
        return authorizedBatchExemptionCallers[_caller];
    }
}