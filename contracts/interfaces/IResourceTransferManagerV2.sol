// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IResourceTransferManagerV2 {
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

    // Main transfer function
    function transferResourcesToDestination(
        address sourceCollectionContract,
        uint256 sourceTokenId,
        address destinationCollectionContract,
        uint256 destinationTokenId,
        address destinationOwner,
        string memory resource,
        uint256 amount
    ) external;

    // Admin functions
    function setShipNftContract(address _shipNftContract) external;
    function setResourceTransferFee(uint256 _newFee) external;
    function setFeeExemption(address _user, bool _exempt) external;
    function setBatchFeeExemption(address[] memory _users, bool _exempt) external;
    function pause() external;
    function unpause() external;

    // View functions
    function isFeeExempt(address _user) external view returns (bool);
    function getResourceTransferFee() external view returns (uint256);
    function isERC1155(address collectionAddress) external view returns (bool);
    function isERC721(address collectionAddress) external view returns (bool);
    function shipNftContract() external view returns (address);
    function feeExemptAddresses(address user) external view returns (bool);
}