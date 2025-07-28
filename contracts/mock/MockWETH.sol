// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWETH
 * @dev Mock WETH token for testing cross-chain swaps
 * This contract mimics WETH with 18 decimal places
 */
contract MockWETH is ERC20, Ownable {
    constructor() ERC20("Mock Wrapped Ether", "WETH") Ownable(msg.sender) {
        // 18 decimals by default from ERC20
    }

    /**
     * @dev Mint WETH tokens to a specified address (for testing)
     * Only the owner can mint tokens
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in wei)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
