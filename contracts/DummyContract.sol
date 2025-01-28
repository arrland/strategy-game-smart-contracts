// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./AuthorizationModifiers.sol";

contract DummyContract is AuthorizationModifiers {
    constructor(address _centralAuthorizationRegistry) 
        AuthorizationModifiers(_centralAuthorizationRegistry, keccak256("IDummyContract")) 
    {}
}

