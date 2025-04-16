// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./AuthorizationModifiers.sol";

contract FeeManagement is AuthorizationModifiers {
    ERC20Burnable public immutable rumToken;
    ERC20Burnable public immutable arrcToken;
    uint256 public rumFeePerDay;
    uint256 public maticFeePerDay;
    uint256 public stakePirateArrcFee; // Fee in ARRC per pirate staked
    address public maticFeeRecipient;

    event RumUsed(address indexed user, uint256 amount);
    event MaticUsed(address indexed user, uint256 amount);
    event ArrcBurned(address indexed user, uint256 amount);
    event RumFeePerDayUpdated(uint256 newFee);
    event MaticFeePerDayUpdated(uint256 newFee);
    event StakePirateArrcFeeUpdated(uint256 newFee);
    event MaticFeeRecipientUpdated(address newRecipient);

    constructor(
        address _centralAuthorizationRegistry, 
        address _rumTokenAddress, 
        address _arrcTokenAddress,
        address _maticFeeRecipient
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IFeeManagement")) {
        require(_rumTokenAddress != address(0), "Invalid RUM token address");
        require(_arrcTokenAddress != address(0), "Invalid ARRC token address");
        require(_maticFeeRecipient != address(0), "Invalid recipient address");
        
        rumToken = ERC20Burnable(_rumTokenAddress);
        arrcToken = ERC20Burnable(_arrcTokenAddress);
        rumFeePerDay = 1 * 10**18;
        maticFeePerDay = 50000000000000000; // 0.05 MATIC in wei
        stakePirateArrcFee = 5e17; // 0.5 ARRC
        maticFeeRecipient = _maticFeeRecipient;
    }

    function useRum(address user, uint256 days_count) external onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(days_count > 0, "Days must be greater than zero");

        uint256 amount = calculateRumFee(days_count);
        require(rumToken.balanceOf(user) >= amount, "Insufficient RUM balance");

        rumToken.transferFrom(user, address(this), amount);
        rumToken.burn(amount);
        emit RumUsed(user, amount);
    }

    function burnArrcForStaking(address user, uint256 pirateCount) external onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(pirateCount > 0, "Pirate count must be greater than zero");

        uint256 amount = calculateStakingArrcFee(pirateCount);
        require(arrcToken.balanceOf(user) >= amount, "Insufficient ARRC balance");
        require(arrcToken.allowance(user, address(this)) >= amount, "Insufficient ARRC allowance");

        arrcToken.transferFrom(user, address(this), amount);
        arrcToken.burn(amount);
        emit ArrcBurned(user, amount);
    }

    function calculateRumFee(uint256 days_count) public view returns (uint256) {
        return days_count * rumFeePerDay;
    }

    function calculateMaticFee(uint256 days_count) public view returns (uint256) {
        return days_count * maticFeePerDay;
    }

    function calculateStakingArrcFee(uint256 pirateCount) public view returns (uint256) {
        return pirateCount * stakePirateArrcFee;
    }

    function getPirateBoardingCost(uint256 pirateCount) external view returns (uint256) {
        return calculateStakingArrcFee(pirateCount);
    }

    function setRumFeePerDay(uint256 newFee) external onlyAdmin {
        require(newFee > 0, "Fee must be greater than zero");
        require(newFee % 1 ether == 0, "Fee must be in wei");
        rumFeePerDay = newFee;
        emit RumFeePerDayUpdated(newFee);
    }

    function setMaticFeePerDay(uint256 newFee) external onlyAdmin {
        require(newFee > 0, "Fee must be greater than zero");
        maticFeePerDay = newFee;
        emit MaticFeePerDayUpdated(newFee);
    }

    function setStakePirateArrcFee(uint256 newFee) external onlyAdmin {
        require(newFee > 0, "Fee must be greater than zero");
        stakePirateArrcFee = newFee;
        emit StakePirateArrcFeeUpdated(newFee);
    }

    function setMaticFeeRecipient(address newRecipient) external onlyAdmin {
        require(newRecipient != address(0), "Invalid recipient address");
        maticFeeRecipient = newRecipient;
        emit MaticFeeRecipientUpdated(newRecipient);
    }

    function getAllFees() external view returns (uint256 rumFee, uint256 maticFee) {
        return (rumFeePerDay, maticFeePerDay);
    }
}