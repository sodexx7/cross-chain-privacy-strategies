import 'dotenv/config';
import { ethers } from 'ethers';
import { testnetConfig } from './deploy-config';

import MockUSDCArtifact from '../artifacts/contracts/mock/MockUSDC.sol/MockUSDC.json';
import MockWETHArtifact from '../artifacts/contracts/mock/MockWETH.sol/MockWETH.json';

/**
 * Mint Mock Tokens Script
 * Mint MockUSDC to user and MockWETH to resolver for cross-chain swap testing
 */

class MockTokenMinter {
    private srcProvider: ethers.JsonRpcProvider;
    private dstProvider: ethers.JsonRpcProvider;
    private srcChainConfig: any;
    private dstChainConfig: any;

    // Wallet instances
    private deployerWallet!: ethers.Wallet;
    private userWallet!: ethers.Wallet;
    private resolverWallet!: ethers.Wallet;
    private srcDeployerWallet!: ethers.Wallet;
    private dstDeployerWallet!: ethers.Wallet;

    // Token contract addresses (from config)
    private srcUSDCAddress!: string;
    private dstWETHAddress!: string;

    constructor() {
        // Initialize providers for Sepolia (src) and Arbitrum (dst)
        this.srcChainConfig = testnetConfig.chains.sepolia;
        this.dstChainConfig = testnetConfig.chains.arbTestnet;

        // Get token addresses from config
        this.srcUSDCAddress = this.srcChainConfig.mockUSDC;
        this.dstWETHAddress = this.dstChainConfig.mockWETH;

        if (!this.srcUSDCAddress || !this.dstWETHAddress) {
            throw new Error("Mock token addresses not found in config. Please run 'yarn setup:mock-tokens' first.");
        }

        this.srcProvider = new ethers.JsonRpcProvider(this.srcChainConfig.rpcUrl);
        this.dstProvider = new ethers.JsonRpcProvider(this.dstChainConfig.rpcUrl);

        // Setup wallets
        this.setupWallets();
    }

    private setupWallets(): void {
        const deployerPrivateKey = testnetConfig.deployerPrivateKey; // Contract owner (can mint)
        const userPrivateKey = testnetConfig.userPrivateKey; // User who will receive USDC
        const resolverPrivateKey = testnetConfig.resolverPrivateKey; // Resolver who will receive WETH

        this.deployerWallet = new ethers.Wallet(deployerPrivateKey);
        this.userWallet = new ethers.Wallet(userPrivateKey);
        this.resolverWallet = new ethers.Wallet(resolverPrivateKey);

        this.srcDeployerWallet = this.deployerWallet.connect(this.srcProvider);
        this.dstDeployerWallet = this.deployerWallet.connect(this.dstProvider);
    }

    /**
     * Mint MockUSDC to user on Sepolia
     */
    async mintUSDCToUser(): Promise<void> {
        console.log('\n💰 Minting MockUSDC to user on Sepolia...');

        try {
            console.log(`  📍 User address: ${this.userWallet.address}`);
            console.log(`  📍 MockUSDC contract: ${this.srcUSDCAddress}`);

            // Connect to MockUSDC contract
            const mockUSDCContract = new ethers.Contract(
                this.srcUSDCAddress,
                MockUSDCArtifact.abi,
                this.srcDeployerWallet // Deployer is the owner who can mint
            );

            // Mint amount (1000 USDC with 6 decimals)
            const mintAmount = ethers.parseUnits('1000', 6); // 1000 USDC

            console.log(`  💰 Minting ${ethers.formatUnits(mintAmount, 6)} USDC...`);

            // Call mint function
            const tx = await mockUSDCContract.mint(this.userWallet.address, mintAmount);
            console.log(`  ⏳ Transaction hash: ${tx.hash}`);

            await tx.wait();

            // Check balance after minting
            const balance = await mockUSDCContract.balanceOf(this.userWallet.address);
            console.log(`  ✅ Successfully minted ${ethers.formatUnits(balance, 6)} USDC to user`);
            console.log(`  🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
        } catch (error) {
            console.error('❌ Failed to mint USDC to user:', error);
            throw error;
        }
    }

    /**
     * Mint MockWETH to resolver on Arbitrum
     */
    async mintWETHToResolver(): Promise<void> {
        console.log('\n🔗 Minting MockWETH to resolver on Arbitrum...');

        try {
            console.log(`  📍 Resolver address: ${this.resolverWallet.address}`);
            console.log(`  📍 MockWETH contract: ${this.dstWETHAddress}`);

            // Connect to MockWETH contract
            const mockWETHContract = new ethers.Contract(
                this.dstWETHAddress,
                MockWETHArtifact.abi,
                this.dstDeployerWallet // Deployer is the owner who can mint
            );

            // Mint amount (100 WETH with 18 decimals)
            const mintAmount = ethers.parseEther('100'); // 100 WETH

            console.log(`  💰 Minting ${ethers.formatEther(mintAmount)} WETH...`);

            // Call mint function
            const tx = await mockWETHContract.mint(this.resolverWallet.address, mintAmount);
            console.log(`  ⏳ Transaction hash: ${tx.hash}`);

            await tx.wait();

            // Check balance after minting
            const balance = await mockWETHContract.balanceOf(this.resolverWallet.address);
            console.log(`  ✅ Successfully minted ${ethers.formatEther(balance)} WETH to resolver`);
            console.log(`  🔗 View on Arbiscan: https://sepolia.arbiscan.io/tx/${tx.hash}`);
        } catch (error) {
            console.error('❌ Failed to mint WETH to resolver:', error);
            throw error;
        }
    }

    /**
     * Check current token balances
     */
    async checkBalances(): Promise<void> {
        console.log('\n🔍 Checking current token balances...');

        try {
            // Check USDC balance
            const mockUSDCContract = new ethers.Contract(this.srcUSDCAddress, MockUSDCArtifact.abi, this.srcProvider);

            const usdcBalance = await mockUSDCContract.balanceOf(this.userWallet.address);
            console.log(`  💰 User USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);

            // Check WETH balance
            const mockWETHContract = new ethers.Contract(this.dstWETHAddress, MockWETHArtifact.abi, this.dstProvider);

            const wethBalance = await mockWETHContract.balanceOf(this.resolverWallet.address);
            console.log(`  💰 Resolver WETH balance: ${ethers.formatEther(wethBalance)} WETH`);
        } catch (error) {
            console.error('❌ Failed to check balances:', error);
            throw error;
        }
    }

    /**
     * Run complete minting process
     */
    async runMinting(): Promise<void> {
        try {
            console.log('🚀 Starting Mock Token Minting\n');
            console.log('📋 Minting Plan:');
            console.log('  - Mint 1000 USDC to user on Sepolia');
            console.log('  - Mint 100 WETH to resolver on Arbitrum');
            console.log('  - Verify final balances\n');

            await this.mintUSDCToUser();
            await this.mintWETHToResolver();
            await this.checkBalances();

            console.log('\n🎉 Mock token minting completed successfully!');
            console.log('\n📝 Summary:');
            console.log(`  👤 User (${this.userWallet.address}): 1000 USDC on Sepolia`);
            console.log(`  🔧 Resolver (${this.resolverWallet.address}): 100 WETH on Arbitrum`);
            console.log('\n📋 Next Steps:');
            console.log('  1. Run cross-chain swap test with minted tokens');
            console.log('  2. User can create orders to swap USDC for WETH');
        } catch (error) {
            console.error('🚨 Mock token minting failed:', error);
            process.exit(1);
        }
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting Mock Token Minting');
    console.log('📍 Using token addresses from config:');

    const minter = new MockTokenMinter();

    console.log(`📍 MockUSDC address: ${minter['srcUSDCAddress']}`);
    console.log(`📍 MockWETH address: ${minter['dstWETHAddress']}`);

    await minter.runMinting();
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
}

export { MockTokenMinter };
