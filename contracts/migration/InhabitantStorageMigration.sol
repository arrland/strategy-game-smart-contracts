// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "./BaseStorageMigration.sol";

contract InhabitantStorageMigration is BaseStorageMigration {
    constructor(
        address _centralAuthorizationRegistry,
        address _oldInhabitantStorage,
        address _newInhabitantStorage
    ) BaseStorageMigration(
        _centralAuthorizationRegistry,
        _oldInhabitantStorage,
        _newInhabitantStorage,
        keccak256("IInhabitantStorageMigration")
    ) {}
}
