import { ethers } from "ethers";
import { testnetConfig, ChainDeployConfig } from "./deploy-config";
import factoryContract from "../artifacts/contracts/resolver/TestEscrowFactory.sol/TestEscrowFactory.json";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function verifyContract(
  contractAddress: string,
  constructorArgs: any[],
  networkName: string
) {
  console.log(`Verifying contract at ${contractAddress}...`);

  const argsString = constructorArgs.map((arg) => `"${arg}"`).join(" ");
  const networkFlag = networkName.toLowerCase().includes("arbitrum")
    ? "--network arbitrumSepolia"
    : networkName.toLowerCase().includes("sepolia")
    ? "--network sepolia"
    : "";

  const command = `npx hardhat verify ${networkFlag} ${contractAddress} ${argsString} --contract contracts/resolver/TestEscrowFactory.sol:TestEscrowFactory`;

  console.log(`Running: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log("Verification output:", stdout);
    if (stderr) console.log("Verification stderr:", stderr);

    if (
      stdout.includes("Successfully verified") ||
      stdout.includes("Already verified")
    ) {
      console.log("✅ Contract verified successfully on block explorer");
    } else {
      console.log("⚠️ Verification may have failed - check output above");
    }
  } catch (error: any) {
    if (error.message.includes("Already verified")) {
      console.log("✅ Contract already verified on block explorer");
    } else {
      throw error;
    }
  }
}

async function deployEscrowFactory(
  chainName: keyof typeof testnetConfig.chains
) {
  const chainConfig = testnetConfig.chains[chainName];

  if (!chainConfig) {
    throw new Error(`Chain configuration not found for: ${chainName}`);
  }

  console.log(`\n=== Deploying EscrowFactory on ${chainConfig.name} ===`);
  console.log(`Chain ID: ${chainConfig.chainId}`);
  console.log(`RPC URL: ${chainConfig.rpcUrl}`);

  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  const deployer = new ethers.Wallet(
    testnetConfig.deployerPrivateKey,
    provider
  );

  console.log(`Deployer address: ${deployer.address}`);

  // Check deployer balance
  const balance = await provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  // Deploy EscrowFactory
  const deployParams = [
    chainConfig.limitOrderProtocol, // limitOrderProtocol address
    chainConfig.wrappedNative, // feeToken (wrapped native)
    "0x0000000000000000000000000000000000000000", // accessToken (zero address)
    deployer.address, // owner
    60 * 30, // src rescue delay (30 minutes)
    60 * 30, // dst rescue delay (30 minutes)
  ];

  console.log(`\nDeploying with parameters:`);
  console.log(`- limitOrderProtocol: ${deployParams[0]}`);
  console.log(`- feeToken: ${deployParams[1]}`);
  console.log(`- accessToken: ${deployParams[2]}`);
  console.log(`- owner: ${deployParams[3]}`);
  console.log(`- srcRescueDelay: ${deployParams[4]}`);
  console.log(`- dstRescueDelay: ${deployParams[5]}`);

  const factory = new ethers.ContractFactory(
    factoryContract.abi,
    factoryContract.bytecode,
    deployer
  );

  const escrowFactory = await factory.deploy(...deployParams);
  await escrowFactory.waitForDeployment();

  const address = await escrowFactory.getAddress();
  console.log(`\n✅ EscrowFactory deployed to: ${address}`);

  // Verify contract on block explorer
  if (process.env.VERIFY_CONTRACT !== "false") {
    console.log(`\n🔍 Verifying contract on block explorer...`);
    console.log(`⏳ Waiting 30 seconds for block propagation...`);
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds
    try {
      await verifyContract(address, deployParams, chainConfig.name);
    } catch (error) {
      console.warn(`⚠️ Block explorer verification failed:`, error);
    }
  } else {
    console.log(`\n⏭️ Skipping contract verification (VERIFY_CONTRACT=false)`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: chainConfig.name,
    chainId: chainConfig.chainId,
    contractName: "TestEscrowFactory",
    address: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    constructorArgs: deployParams,
  };

  console.log(`\nDeployment Summary:`);
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

// Main execution
async function main() {
  const chainName = (process.env.CHAIN_NAME ||
    process.argv[2]) as keyof typeof testnetConfig.chains;

  if (!chainName) {
    console.log(
      "Usage: CHAIN_NAME=<chainName> ts-node scripts/deploy-escrow-factory.ts"
    );
    console.log(
      "Available chains:",
      Object.keys(testnetConfig.chains).join(", ")
    );
    console.log("\nExample:");
    console.log(
      "  CHAIN_NAME=sepolia ts-node scripts/deploy-escrow-factory.ts"
    );
    console.log(
      "  CHAIN_NAME=arbTestnet ts-node scripts/deploy-escrow-factory.ts"
    );
    console.log("\nOr use yarn scripts:");
    console.log("  yarn deploy:factory:sepolia");
    console.log("  yarn deploy:factory:arbitrum");
    process.exit(1);
  }

  if (!testnetConfig.chains[chainName]) {
    console.error(`Invalid chain name: ${chainName}`);
    console.log(
      "Available chains:",
      Object.keys(testnetConfig.chains).join(", ")
    );
    process.exit(1);
  }
  try {
    await deployEscrowFactory(chainName);
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { deployEscrowFactory };
