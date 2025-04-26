// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

interface IFeeManagement {
    
    event RumUsed(address indexed user, uint256 amount);

    
    event ArrcBurned(address indexed user, uint256 amount, string action);

    
    event RumFeePerDayUpdated(uint256 newFee);

    
    event MaticFeePerDayUpdated(uint256 newFee);

    
    event StakePirateArrcFeeUpdated(uint256 newFee);

    
    event MaticFeeRecipientUpdated(address indexed newRecipient);

    /**
     * @notice Emitted when the ship rebasing ARRC fee is updated by an admin.
     * @param newFee The new fee amount in wei.
     */
    event ShipRebaseArrcFeeUpdated(uint256 newFee);

    
    function calculateStakingArrcFee(uint256 pirateCount) external view returns (uint256);

    
    function burnArrc(address user, uint256 amount, string calldata action) external;

    
    function stakePirateArrcFee() external view returns (uint256);

    
    function rumToken() external view returns (address);

    
    function arrcToken() external view returns (address);

    
    function rumFeePerDay() external view returns (uint256);

    
    function maticFeePerDay() external view returns (uint256);

    
    function maticFeeRecipient() external view returns (address);    

    
    function calculateRumFee(uint256 days_count) external view returns (uint256);

    
    function calculateMaticFee(uint256 days_count) external view returns (uint256);

    
    function getPirateBoardingCost(uint256 pirateCount) external view returns (uint256);

    
    function getAllFees() external view returns (uint256 rumFee, uint256 maticFee);

    
    function useRum(address user, uint256 days_count) external;

    
    function setStakePirateArrcFee(uint256 _newFee) external;

    
    function setRumFeePerDay(uint256 newFee) external;

    
    function setMaticFeePerDay(uint256 newFee) external;

    
    function setMaticFeeRecipient(address newRecipient) external;

    /**
     * @notice Gets the ARRC fee required to rebase a ship's home island.
     * @return The fee amount in wei.
     */
    function getShipRebaseArrcFee() external view returns (uint256);

    /**
     * @notice Sets the ARRC fee required to rebase a ship's home island.
     * @dev Only callable by an admin.
     * @param newFee The new fee amount in wei.
     */
    function setShipRebaseArrcFee(uint256 newFee) external;
}
