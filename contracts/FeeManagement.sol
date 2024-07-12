// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./AuthorizationModifiers.sol";

contract FeeManagement is AuthorizationModifiers {
    ERC20Burnable public immutable rumToken;
    uint256 public rumFeePerDay;
    uint256 public maticFeePerDay;
    address public maticFeeRecipient;

    event RumUsed(address indexed user, uint256 amount);
    event MaticUsed(address indexed user, uint256 amount);
    event RumFeePerDayUpdated(uint256 newFee);
    event MaticFeePerDayUpdated(uint256 newFee);
    event MaticFeeRecipientUpdated(address newRecipient);

    constructor(address _rumTokenAddress, address _centralAuthorizationRegistry, address _maticFeeRecipient) 
    
    AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IFeeManagement")) {
        require(_rumTokenAddress != address(0), "Invalid token address");
        require(_maticFeeRecipient != address(0), "Invalid recipient address");
        rumToken = ERC20Burnable(_rumTokenAddress);
        rumFeePerDay = 1 * 10**18;
        maticFeePerDay = 50000000000000000; // 0.05 MATIC in wei
        maticFeeRecipient = _maticFeeRecipient;
    }

    function useRum(address user, uint256 days_count) external onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(days_count > 0, "Days must be greater than zero");

        uint256 amount = calculateRumFee(days_count);
        require(rumToken.balanceOf(user) >= amount, "Insufficient RUM balance");

        rumToken.burnFrom(user, amount);
        emit RumUsed(user, amount);
    }

    function calculateRumFee(uint256 days_count) public view returns (uint256) {
        return days_count * rumFeePerDay;
    }

    function calculateMaticFee(uint256 days_count) public view returns (uint256) {
        return days_count * maticFeePerDay;
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

    function setMaticFeeRecipient(address newRecipient) external onlyAdmin {
        require(newRecipient != address(0), "Invalid recipient address");
        maticFeeRecipient = newRecipient;
        emit MaticFeeRecipientUpdated(newRecipient);
    }

    function getAllFees() external view returns (uint256 rumFee, uint256 maticFee) {
        return (rumFeePerDay, maticFeePerDay);
    }
}