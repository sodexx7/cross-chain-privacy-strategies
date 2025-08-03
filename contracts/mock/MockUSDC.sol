// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing cross-chain swaps
 * This contract mimics USDC with 6 decimal places
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals;

    constructor() ERC20('Mock USD Coin', 'USDC') Ownable(msg.sender) {
        _decimals = 6; // USDC has 6 decimal places
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * Overrides the default 18 decimals to match USDC's 6 decimals.
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to a specified address
     * Only the owner can mint tokens
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in wei, considering 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
