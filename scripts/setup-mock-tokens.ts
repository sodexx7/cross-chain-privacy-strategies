import "dotenv/config";
import { ethers } from "ethers";
import { testnetConfig } from "./deploy-config";
import { exec } from "child_process";
import { promisify } from "util";

import MockUSDCArtifact from "../artifacts/contracts/mock/MockUSDC.sol/MockUSDC.json";
import MockWETHArtifact from "../artifacts/contracts/mock/MockWETH.sol/MockWETH.json";

const execAsync = promisify(exec);

/**
 * Setup Mock Tokens Script
 * Deploy and mint mock USDC and WETH tokens for cross-chain swap testing
 */

class MockTokenSetup {
  private srcProvider: ethers.JsonRpcProvider;
  private dstProvider: ethers.JsonRpcProvider;
  private srcChainConfig: any;
  private dstChainConfig: any;

  // Wallet instances
  private deployerWallet!: ethers.Wallet;
  private srcDeployerWallet!: ethers.Wallet;
  private dstDeployerWallet!: ethers.Wallet;

  // Token contract addresses (to be deployed)
  public srcUSDCAddress!: string;
  public dstWETHAddress!: string;

  constructor() {
    // Initialize providers for Sepolia (src) and Arbitrum (dst)
    this.srcChainConfig = testnetConfig.chains.sepolia;
    this.dstChainConfig = testnetConfig.chains.arbTestnet;

    this.srcProvider = new ethers.JsonRpcProvider(this.srcChainConfig.rpcUrl);
    this.dstProvider = new ethers.JsonRpcProvider(this.dstChainConfig.rpcUrl);

    // Setup wallets
    this.setupWallets();
  }

  private setupWallets(): void {
    const deployerPrivateKey = testnetConfig.deployerPrivateKey;

    this.deployerWallet = new ethers.Wallet(deployerPrivateKey);

    this.srcDeployerWallet = this.deployerWallet.connect(this.srcProvider);
    this.dstDeployerWallet = this.deployerWallet.connect(this.dstProvider);
  }

  /**
   * Verify contract on block explorer
   */
  private async verifyContract(
    contractAddress: string,
    constructorArgs: any[],
    networkName: string,
    contractName: string
  ): Promise<void> {
    console.log(
      `  🔍 Verifying ${contractName} contract at ${contractAddress}...`
    );

    const argsString = constructorArgs.map((arg) => `"${arg}"`).join(" ");

    let networkFlag = "";
    let apiKeyEnv = "";

    if (networkName.toLowerCase().includes("arbitrum")) {
      networkFlag = "--network arbitrumSepolia";
      apiKeyEnv = `ARBISCAN_API_KEY=${process.env.ARBISCAN_API_KEY}`;
    } else if (networkName.toLowerCase().includes("sepolia")) {
      networkFlag = "--network sepolia";
      apiKeyEnv = `ETHERSCAN_API_KEY=${process.env.ETHERSCAN_API_KEY}`;
    }

    const command = `${apiKeyEnv} npx hardhat verify ${networkFlag} ${contractAddress} ${argsString}`;

    console.log(`  📝 Running: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);
      if (stdout) console.log("  📄 Verification output:", stdout);
      if (stderr) console.log("  📄 Verification stderr:", stderr);

      if (
        stdout.includes("Successfully verified") ||
        stdout.includes("Already verified")
      ) {
        console.log(
          `  ✅ ${contractName} verified successfully on block explorer`
        );
      } else {
        console.log(
          `  ⚠️ ${contractName} verification may have failed - check output above`
        );
      }
    } catch (error: any) {
      if (error.message.includes("Already verified")) {
        console.log(`  ✅ ${contractName} already verified on block explorer`);
      } else {
        console.warn(
          `  ⚠️ ${contractName} verification failed:`,
          error.message
        );
        console.log(`  📝 You can verify manually later using:`);
        console.log(`     ${command}`);
      }
    }
  }

  /**
   * Deploy mock USDC on source chain (Sepolia)
   */
  async deployMockUSDC(): Promise<string> {
    console.log("\n💰 Deploying mock USDC on Sepolia...");

    try {
      console.log("  📋 Deploying MockUSDC contract...");
      console.log(`  📍 Deployer: ${this.srcDeployerWallet.address}`);

      // Create contract factory
      const MockUSDCFactory = new ethers.ContractFactory(
        MockUSDCArtifact.abi,
        MockUSDCArtifact.bytecode,
        this.srcDeployerWallet
      );

      // Deploy contract
      console.log("  ⏳ Deploying contract...");
      const mockUSDC = await MockUSDCFactory.deploy();
      await mockUSDC.waitForDeployment();

      this.srcUSDCAddress = await mockUSDC.getAddress();

      console.log(`  ✅ MockUSDC deployed at: ${this.srcUSDCAddress}`);
      console.log(
        `  � View on Etherscan: https://sepolia.etherscan.io/address/${this.srcUSDCAddress}`
      );

      // Verify contract on Etherscan
      await this.verifyContract(this.srcUSDCAddress, [], "sepolia", "MockUSDC");

      return this.srcUSDCAddress;
    } catch (error) {
      console.error("❌ Failed to deploy mock USDC:", error);
      throw error;
    }
  }

  /**
   * Deploy mock WETH on destination chain (Arbitrum)
   */
  async deployMockWETH(): Promise<string> {
    console.log("\n🔗 Deploying mock WETH on Arbitrum...");

    try {
      console.log("  📋 Deploying MockWETH contract...");
      console.log(`  📍 Deployer: ${this.dstDeployerWallet.address}`);

      // Create contract factory
      const MockWETHFactory = new ethers.ContractFactory(
        MockWETHArtifact.abi,
        MockWETHArtifact.bytecode,
        this.dstDeployerWallet
      );

      // Deploy contract
      console.log("  ⏳ Deploying contract...");
      const mockWETH = await MockWETHFactory.deploy();
      await mockWETH.waitForDeployment();

      this.dstWETHAddress = await mockWETH.getAddress();

      console.log(`  ✅ MockWETH deployed at: ${this.dstWETHAddress}`);
      console.log(
        `  � View on Arbiscan: https://sepolia.arbiscan.io/address/${this.dstWETHAddress}`
      );

      // Verify contract on Arbiscan
      await this.verifyContract(
        this.dstWETHAddress,
        [],
        "arbTestnet",
        "MockWETH"
      );
      return this.dstWETHAddress;
    } catch (error) {
      console.error("❌ Failed to deploy mock WETH:", error);
      throw error;
    }
  }

  /**
   * Run complete token setup process
   */
  async runSetup(): Promise<void> {
    try {
      await this.deployMockUSDC();
      await this.deployMockWETH();
    } catch (error) {
      console.error("🚨 Mock token setup failed:", error);
      process.exit(1);
    }
  }

  /**
   * Get token addresses for use in other scripts
   */
  getTokenAddresses(): { srcUSDC: string; dstWETH: string } {
    return {
      srcUSDC: this.srcUSDCAddress,
      dstWETH: this.dstWETHAddress,
    };
  }
}

// Main execution
async function main() {
  const tokenSetup = new MockTokenSetup();
  await tokenSetup.runSetup();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export { MockTokenSetup };
