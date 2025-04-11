// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IFeeManagement {
    function rumToken() external view returns (address);
    function arrcToken() external view returns (address);
    function rumFeePerDay() external view returns (uint256);
    function maticFeePerDay() external view returns (uint256);
    function stakePirateArrcFee() external view returns (uint256);
    function maticFeeRecipient() external view returns (address);    

    function useRum(address user, uint256 days_count) external;    
    function burnArrcForStaking(address user, uint256 pirateCount) external;
    function calculateRumFee(uint256 days_count) external view returns (uint256);
    function calculateMaticFee(uint256 days_count) external view returns (uint256);
    function calculateStakingArrcFee(uint256 pirateCount) external view returns (uint256);
    function getPirateBoardingCost(uint256 pirateCount) external view returns (uint256);
    function setRumFeePerDay(uint256 newFee) external;
    function setMaticFeePerDay(uint256 newFee) external;
    function setStakePirateArrcFee(uint256 newFee) external;
    function setMaticFeeRecipient(address newRecipient) external;
    function setFeeDiscount(uint256 newDiscount) external;

    function getAllFees() external view returns (uint256 rumFee, uint256 maticFee);

    event RumUsed(address indexed user, uint256 amount);
    event MaticUsed(address indexed user, uint256 amount);
    event ArrcBurned(address indexed user, uint256 amount);
    event RumFeePerDayUpdated(uint256 newFee);
    event MaticFeePerDayUpdated(uint256 newFee);
    event StakePirateArrcFeeUpdated(uint256 newFee);
    event MaticFeeRecipientUpdated(address newRecipient);
    event FeeDiscountUpdated(uint256 newDiscount);
}
