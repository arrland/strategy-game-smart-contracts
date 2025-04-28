
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;
import "../AuthorizationModifiers.sol";
import "../interfaces/ICooldownManager.sol";

contract MockCaller is AuthorizationModifiers {
    constructor(address _registry) AuthorizationModifiers(_registry, bytes32(0)) {}

    function callSetCooldown(address target, bytes32 key, uint256 duration, string calldata context) external {
        ICooldownManager(target).setCooldown(key, duration, context);
    }
}
