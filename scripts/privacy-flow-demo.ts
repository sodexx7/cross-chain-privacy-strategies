import "dotenv/config";
import PrivacyClient from "./privacy-client";
import { testnetConfig } from "./deploy-config";

/**
 * Complete Privacy Flow Demo
 * 
 * This script demonstrates where your example code actually runs:
 * - Order creation happens OFF-CHAIN in this script
 * - Commitment generation happens OFF-CHAIN in this script  
 * - Only commitment hash is submitted ON-CHAIN
 * - Full order details are revealed later ON-CHAIN
 */

async function main() {
    console.log("🔐 Privacy-Enhanced Cross-Chain Trading Demo");
    console.log("=" * 60);
    
    const chainName = process.env.CHAIN_NAME as keyof typeof testnetConfig.chains || 'sepolia';
    const chainConfig = testnetConfig.chains[chainName];
    
    console.log(`🌐 Using ${chainConfig.name} (Chain ID: ${chainConfig.chainId})`);
    console.log(`🔑 Resolver Private Key: ${testnetConfig.resolverPrivateKey.slice(0, 10)}...`);

    // For demo purposes, we'll mock the privacy resolver address
    // In reality, you'd deploy it first and use the real address
    const mockPrivacyResolverAddress = "0x1234567890123456789012345678901234567890";
    
    console.log(`📍 Privacy Resolver: ${mockPrivacyResolverAddress}`);
    console.log();

    try {
        // Initialize Privacy Client
        console.log("🚀 Initializing Privacy Client...");
        const privacyClient = new PrivacyClient(
            testnetConfig.resolverPrivateKey,
            chainConfig.rpcUrl,
            mockPrivacyResolverAddress
        );
        
        console.log("✅ Privacy Client initialized");
        console.log();

        // Demonstrate where your example code runs
        await demonstrateOrderCreation(privacyClient);
        await demonstrateCommitmentGeneration(privacyClient);
        await demonstrateOnChainSubmission(privacyClient);

        console.log("\n🎯 Key Takeaways:");
        console.log("   📱 Order creation: OFF-CHAIN (in frontend/script)");
        console.log("   🔐 Commitment hash: OFF-CHAIN (in frontend/script)");
        console.log("   📤 Hash submission: ON-CHAIN (to smart contract)");
        console.log("   🎭 Order reveal: ON-CHAIN (after privacy delay)");
        console.log("   🚀 Execution: ON-CHAIN (with additional delays)");

    } catch (error: any) {
        console.error("❌ Demo failed:", error.message);
        
        if (error.code === 'NETWORK_ERROR') {
            console.log("\nℹ️  This is expected for demo - the contracts aren't deployed");
            console.log("    In real usage, deploy contracts first:");
            console.log("    yarn deploy:privacy:sepolia");
        }
    }
}

async function demonstrateOrderCreation(client: PrivacyClient) {
    console.log("📝 STEP 1: Order Creation (OFF-CHAIN)");
    console.log("-".repeat(40));
    
    console.log("This code runs in your frontend or script:");
    console.log(`
    // THIS IS WHERE YOUR EXAMPLE CODE LIVES:
    const order = {
        maker: userAddress,
        makingAmount: 1000 * 1e6,    // 1000 USDC
        takingAmount: 990 * 1e6,     // 990 USDC equivalent on dst chain
        makerAsset: USDC_ADDRESS,
        takerAsset: DST_USDC_ADDRESS
    };
    `);

    try {
        const { order, signature, immutables } = await client.createPrivateOrder(
            "1000",  // 1000 USDC
            "990",   // 990 USDC on destination  
            chainConfig.mockUSDC || "0xA0b86991c431e3e88F1e60A00f0E50c100b4e476",
            "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // Arbitrum USDC
            11155111, // Sepolia
            421614    // Arbitrum Sepolia
        );

        console.log("✅ Order created successfully OFF-CHAIN");
        console.log(`   Maker: ${order.maker}`);
        console.log(`   Amount: ${order.makingAmount.toString()} (1000 USDC)`);
        console.log(`   Target: ${order.takingAmount.toString()} (990 USDC)`);
        
    } catch (error: any) {
        console.log("ℹ️  Order creation simulated (network not available)");
    }
    
    console.log();
}

async function demonstrateCommitmentGeneration(client: PrivacyClient) {
    console.log("🔐 STEP 2: Commitment Generation (OFF-CHAIN)");
    console.log("-".repeat(40));
    
    console.log("This code runs in your frontend or script:");
    console.log(`
    // YOUR EXAMPLE CODE:
    const nonce = generateSecureRandom();
    const commitHash = keccak256(abi.encodePacked(
        abi.encode(order, signature, amount, takerTraits, args),
        nonce,
        msg.sender
    ));
    `);

    try {
        // Create a mock order for demo
        const mockOrder = {
            maker: "0x1234567890123456789012345678901234567890",
            makingAmount: 1000000000n, // 1000 USDC
            takingAmount: 990000000n,  // 990 USDC
            makerAsset: "0xA0b86991c431e3e88F1e60A00f0E50c100b4e476",
            takerAsset: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
            salt: 12345n,
            receiver: "0x0000000000000000000000000000000000000000",
            allowedSender: "0x0000000000000000000000000000000000000000",
            interactions: "0x",
            makerTraits: 0n
        };

        const mockSignature = "0x1234567890abcdef";
        const mockImmutables = {
            orderHash: "0xabcdef1234567890",
            hashlock: "0x9876543210fedcba",
            maker: mockOrder.maker,
            taker: mockOrder.maker,
            token: mockOrder.makerAsset,
            amount: mockOrder.makingAmount,
            safetyDeposit: 1000000000000000n,
            timelocks: 1234567890n
        };

        const commitment = await client.generateCommitment(
            mockOrder,
            mockSignature,
            mockImmutables,
            mockOrder.makingAmount
        );

        console.log("✅ Commitment hash generated OFF-CHAIN");
        console.log(`   Hash: ${commitment.commitHash.slice(0, 20)}...`);
        console.log(`   Nonce: ${commitment.nonce.toString().slice(0, 10)}...`);
        console.log(`   🔒 All order details are now hidden in this hash`);
        
    } catch (error: any) {
        console.log("ℹ️  Commitment generation simulated");
        console.log("   Hash: 0x1a2b3c4d5e6f7890abcdef1234567890...");
        console.log("   🔒 All order details hidden in cryptographic hash");
    }
    
    console.log();
}

async function demonstrateOnChainSubmission(client: PrivacyClient) {
    console.log("📤 STEP 3: On-Chain Submission");
    console.log("-".repeat(40));
    
    console.log("This calls the smart contract:");
    console.log(`
    // YOUR EXAMPLE CODE:
    privacyResolver.commitOrder(commitHash, 15 minutes);
    `);

    try {
        const mockCommitment = {
            commitHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
            nonce: 123456789012345678901234567890n,
            orderData: "0xabcdef1234567890",
            revealAfter: Math.floor(Date.now() / 1000) + 900,
            expireAfter: Math.floor(Date.now() / 1000) + 4500
        };

        await client.submitCommitment(mockCommitment, 15);
        
    } catch (error: any) {
        console.log("ℹ️  On-chain submission simulated (contract not deployed)");
        console.log("   Transaction: 0xabcdef1234567890abcdef1234567890abcdef12");
        console.log("   ✅ Only commitment hash visible on-chain");
        console.log("   🔒 Order details remain hidden for 15 minutes");
        console.log("   🎭 Observers cannot see what will be executed");
    }
    
    console.log();
}

// Additional demo: Show the difference between traditional and private orders
async function showPrivacyComparison() {
    console.log("📊 PRIVACY COMPARISON");
    console.log("=" * 60);
    
    console.log("🔓 TRADITIONAL ORDER (Transparent):");
    console.log("   ❌ Order details immediately visible");
    console.log("   ❌ Amount: 1000 USDC (visible to front-runners)");
    console.log("   ❌ Assets: USDC → ARB USDC (strategy revealed)");
    console.log("   ❌ Execution: Immediate (predictable timing)");
    console.log("   ❌ Result: Front-run, sandwiched, copied");
    
    console.log();
    
    console.log("🔐 PRIVACY-ENHANCED ORDER:");
    console.log("   ✅ Commitment: 0x1a2b3c4d... (order details hidden)");
    console.log("   ✅ Amount: Unknown for 15 minutes");
    console.log("   ✅ Assets: Unknown for 15 minutes"); 
    console.log("   ✅ Execution: Random delay after reveal");
    console.log("   ✅ Result: Protected from MEV attacks");
    
    console.log();
}

// Run the complete demo
main()
    .then(() => {
        console.log("\n🎉 Privacy Demo Completed!");
        console.log("\n📁 Code Location Summary:");
        console.log("   📄 scripts/privacy-client.ts - Order creation & commitment (OFF-CHAIN)");
        console.log("   📄 contracts/resolver/PrivacyResolver.sol - Smart contract (ON-CHAIN)");
        console.log("   📄 scripts/privacy-flow-demo.ts - This demo script");
        
        return showPrivacyComparison();
    })
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Demo failed:", error);
        process.exit(1);
    });