// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../interfaces/IFeeManagement.sol";
import "../AuthorizationModifiers.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Basic ABSTRACT mock for IFeeManagement
abstract contract MockFeeManagement is IFeeManagement, AuthorizationModifiers {
    uint256 public rumBalance; // Simplified tracking
    address public arrcTokenAddress; // To check transfers
    uint256 public stakePirateArrcFee;
    uint256 public shipRebaseArrcFee;

    constructor(address _car) AuthorizationModifiers(_car, keccak256("IFeeManagement")) {}

    // --- Mock Control Functions ---
    function setRumBalance(uint256 balance) external {
        rumBalance = balance;
    }

    function setArrcTokenAddress(address tokenAddr) external {
        arrcTokenAddress = tokenAddr;
    }
    
    function setStakePirateFee(uint256 fee) external {
        stakePirateArrcFee = fee;
    }

    // Internal function for setting the fee
    function _setShipRebaseArrcFee(uint256 newFee) internal {
        shipRebaseArrcFee = newFee;
        emit ShipRebaseArrcFeeUpdated(newFee);
    }

    // --- IFeeManagement Interface Implementation ---
    function useRum(address user, uint256 amount) external override onlyAuthorized {
        require(rumBalance >= amount, "MockFeeManagement: insufficient RUM");
        rumBalance -= amount;
        emit RumUsed(user, amount);
    }

    function burnArrc(address user, uint256 amount, string calldata action) external override onlyAuthorized {
        emit ArrcBurned(user, amount, action);
        if (arrcTokenAddress != address(0)) {
            // Simulate transfer/burn if needed
        }
    }

    function calculateStakingArrcFee(uint256 pirateCount) external view override returns (uint256) {
        return stakePirateArrcFee * pirateCount;
    }

    function getShipRebaseArrcFee() external view override returns (uint256) {
        return shipRebaseArrcFee;
    }
    
    // Public admin function required by interface
    function setShipRebaseArrcFee(uint256 newFee) external override onlyAdmin {
         _setShipRebaseArrcFee(newFee);
    }

} 