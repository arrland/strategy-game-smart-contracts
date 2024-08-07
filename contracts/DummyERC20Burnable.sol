// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DummyERC20Burnable is ERC20, ERC20Burnable, Ownable {
    constructor(string memory name, string memory symbol) 
    ERC20(name, symbol) 
    Ownable(msg.sender) 
    {
        _mint(msg.sender, 1000*10**18);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}