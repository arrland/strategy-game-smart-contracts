// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./AuthorizationModifiers.sol";
import "./interfaces/IFeeManagement.sol";

contract FeeManagement is IFeeManagement, AuthorizationModifiers {
    ERC20Burnable internal immutable _rumToken;
    ERC20Burnable internal immutable _arrcToken;
    
    // Make fee/recipient vars internal
    uint256 internal _rumFeePerDay;
    uint256 internal _maticFeePerDay;
    uint256 internal _stakePirateArrcFee;
    uint256 internal _shipRebaseArrcFee;
    address internal _maticFeeRecipient;

    // --- Events --- 
    // Events are defined in the IFeeManagement interface and inherited.
    // No need to redeclare them here.
    /* 
    event RumUsed(address indexed user, uint256 amount);
    event ArrcBurned(address indexed user, uint256 amount, string action);
    event RumFeePerDayUpdated(uint256 newFee);
    event MaticFeePerDayUpdated(uint256 newFee);
    event StakePirateArrcFeeUpdated(uint256 newFee); 
    event MaticFeeRecipientUpdated(address newRecipient);
    event ShipRebaseArrcFeeUpdated(uint256 newFee);
    */

    event RumCheck(address indexed user, address indexed spender, uint256 allowance, uint256 amount);

    constructor(
        address _centralAuthorizationRegistry, 
        address _rumTokenAddress, 
        address _arrcTokenAddress,
        address _maticFeeRecipientInput // Renamed input to avoid conflict
    ) AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IFeeManagement")) {
        require(_rumTokenAddress != address(0), "Invalid RUM token address");
        require(_arrcTokenAddress != address(0), "Invalid ARRC token address");
        require(_maticFeeRecipientInput != address(0), "Invalid recipient address");
        
        _rumToken = ERC20Burnable(_rumTokenAddress);
        _arrcToken = ERC20Burnable(_arrcTokenAddress);
        _rumFeePerDay = 1 * 10**18; // 1 RUM
        _maticFeePerDay = 5 * 10**16; // 0.05 MATIC
        _stakePirateArrcFee = 5 * 10**17; // 0.5 ARRC
        _shipRebaseArrcFee = 1 * 10**17; // 0.1 ARRC
        _maticFeeRecipient = _maticFeeRecipientInput;
    }

    // --- Explicit Public Getters ---
    function rumToken() external view override returns (address) {
        return address(_rumToken);
    }

    function arrcToken() external view override returns (address) {
        return address(_arrcToken);
    }
    
    function rumFeePerDay() external view override returns (uint256) {
        return _rumFeePerDay;
    }

    function maticFeePerDay() external view override returns (uint256) {
        return _maticFeePerDay;
    }

    function stakePirateArrcFee() external view override returns (uint256) {
        return _stakePirateArrcFee;
    }

    function getShipRebaseArrcFee() external view override returns (uint256) {
        return _shipRebaseArrcFee;
    }

    function maticFeeRecipient() external view override returns (address) {
        return _maticFeeRecipient;
    }
    // --- End Explicit Public Getters ---

    function useRum(address user, uint256 days_count) external override onlyAuthorized {
        require(user != address(0), "Invalid user address");
        require(days_count > 0, "Days must be greater than zero");

        uint256 amount = calculateRumFee(days_count);
        require(_rumToken.balanceOf(user) >= amount, "ERC20InsufficientBalance");
        require(_rumToken.allowance(user, address(this)) >= amount, "ERC20InsufficientAllowance");

        _rumToken.transferFrom(user, address(this), amount);
        _rumToken.burn(amount);
        emit RumUsed(user, amount);
    }

    function burnArrc(address user, uint256 amount, string calldata action) external override onlyAuthorized {
        require(user != address(0), "Invalid user address");

        require(_arrcToken.balanceOf(user) >= amount, "ERC20InsufficientBalance");
        require(_arrcToken.allowance(user, address(this)) >= amount, "ERC20InsufficientAllowance");

        if (amount > 0) {
            _arrcToken.transferFrom(user, address(this), amount);
            _arrcToken.burn(amount);
        }
        emit ArrcBurned(user, amount, action);
    }

    function calculateRumFee(uint256 days_count) public view override returns (uint256) {
        return days_count * _rumFeePerDay; // Use internal var
    }

    function calculateMaticFee(uint256 days_count) public view override returns (uint256) {
        return days_count * _maticFeePerDay; // Use internal var
    }

    function calculateStakingArrcFee(uint256 pirateCount) public view override returns (uint256) {
        return pirateCount * _stakePirateArrcFee; // Use internal var
    }

    function getPirateBoardingCost(uint256 pirateCount) external view override returns (uint256) {
        return calculateStakingArrcFee(pirateCount);
    }

    function setRumFeePerDay(uint256 newFee) external override onlyAdmin {
        require(newFee > 0, "Fee must be greater than zero");
        _rumFeePerDay = newFee; // Use internal var
        emit RumFeePerDayUpdated(newFee);
    }

    function setMaticFeePerDay(uint256 newFee) external override onlyAdmin {
        require(newFee > 0, "Fee must be greater than zero");
        _maticFeePerDay = newFee; // Use internal var
        emit MaticFeePerDayUpdated(newFee);
    }

    function setStakePirateArrcFee(uint256 newFee) external override onlyAdmin {
        require(newFee > 0, "Fee must be greater than zero");
        _stakePirateArrcFee = newFee; // Use internal var
        emit StakePirateArrcFeeUpdated(newFee);
    }

    function setShipRebaseArrcFee(uint256 newFee) external override onlyAdmin {
        require(newFee > 0, "Fee must be greater than zero");
        _shipRebaseArrcFee = newFee;
        emit ShipRebaseArrcFeeUpdated(newFee);
    }

    function setMaticFeeRecipient(address newRecipient) external override onlyAdmin {
        require(newRecipient != address(0), "Invalid recipient address");
        _maticFeeRecipient = newRecipient; // Use internal var
        emit MaticFeeRecipientUpdated(newRecipient);
    }

    function getAllFees() external view override returns (uint256 rumFee, uint256 maticFee) {
        return (_rumFeePerDay, _maticFeePerDay); // Use internal vars
    }
}