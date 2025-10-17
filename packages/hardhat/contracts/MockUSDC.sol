// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing purposes
 * @notice This is a test token that mimics USDC functionality including permit
 */
contract MockUSDC is ERC20, ERC20Permit, Ownable {
    uint8 private _decimals;
    
    // Track faucet usage per address
    mapping(address => uint256) private _faucetUsed;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        address initialOwner
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(initialOwner) {
        _decimals = decimals_;
        // Mint initial supply to owner for testing
        _mint(initialOwner, 1000000 * 10**decimals_); // 1M tokens
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to any address (for testing purposes)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Faucet function for easy testing - anyone can mint small amounts
     * @param amount Amount of tokens to mint (max 10000 USDC total per address)
     */
    function faucet(uint256 amount) external {
        uint256 newTotal = _faucetUsed[msg.sender] + amount;
        require(newTotal <= 10000 * 10**_decimals, "MockUSDC: faucet limit exceeded");
        _faucetUsed[msg.sender] = newTotal;
        _mint(msg.sender, amount);
    }

    /**
     * @dev Quick faucet function - gives 1000 USDC to any address
     */
    function quickFaucet() external {
        uint256 amount = 1000 * 10**_decimals; // 1000 USDC
        uint256 newTotal = _faucetUsed[msg.sender] + amount;
        require(newTotal <= 10000 * 10**_decimals, "MockUSDC: faucet limit exceeded");
        _faucetUsed[msg.sender] = newTotal;
        _mint(msg.sender, amount);
    }
    
    /**
     * @dev Get faucet usage for an address
     */
    function getFaucetUsed(address account) external view returns (uint256) {
        return _faucetUsed[account];
    }
}
