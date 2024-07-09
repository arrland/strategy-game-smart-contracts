// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

contract UniswapV3PriceFetcher {
    IQuoter public quoter;
    address public factory;
    uint24 public constant DEFAULT_FEE = 10000; // 1% fee

    constructor() {
        quoter = IQuoter(0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6);
        factory = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    }

    function getTokenPrice(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        address pool = IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, DEFAULT_FEE);
        require(pool != address(0), "Pool does not exist");

        amountOut = quoter.quoteExactInputSingle(tokenIn, tokenOut, DEFAULT_FEE, amountIn, 0);
    }
}