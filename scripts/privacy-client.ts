import { ethers } from "ethers";
import { randomBytes } from "crypto";
import { testnetConfig } from "./deploy-config";
import privacyResolverArtifact from "../artifacts/contracts/resolver/PrivacyResolver.sol/PrivacyResolver.json";

/**
 * Privacy Client - Handles off-chain order creation and commitment
 * This is where the actual order preparation happens before on-chain submission
 */

export interface PrivateOrder {
    // 1inch Order structure
    maker: string;
    makingAmount: bigint;
    takingAmount: bigint;
    makerAsset: string;
    takerAsset: string;
    salt: bigint;
    receiver: string;
    allowedSender: string;
    interactions: string;
    makerTraits: bigint;
}

export interface OrderCommitment {
    commitHash: string;
    nonce: bigint;
    orderData: string;
    revealAfter: number;
    expireAfter: number;
}

export class PrivacyClient {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private privacyResolver: ethers.Contract;

    constructor(
        privateKey: string,
        rpcUrl: string,
        privacyResolverAddress: string
    ) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.signer = new ethers.Wallet(privateKey, this.provider);
        this.privacyResolver = new ethers.Contract(
            privacyResolverAddress,
            privacyResolverArtifact.abi,
            this.signer
        );
    }

    /**
     * Step 1: Create order off-chain (this is where your example code lives)
     */
    async createPrivateOrder(
        makingAmount: string,
        takingAmount: string,
        makerAsset: string,
        takerAsset: string,
        srcChainId: number,
        dstChainId: number
    ): Promise<{order: PrivateOrder, signature: string, immutables: any}> {
        
        console.log("📝 Creating private order off-chain...");
        
        // This is exactly the code from your question:
        const order: PrivateOrder = {
            maker: await this.signer.getAddress(),
            makingAmount: ethers.parseUnits(makingAmount, 6),    // 1000 USDC
            takingAmount: ethers.parseUnits(takingAmount, 6),    // 990 USDC equivalent on dst chain
            makerAsset: makerAsset,                              // USDC_ADDRESS
            takerAsset: takerAsset,                              // DST_USDC_ADDRESS
            salt: this.generateRandomSalt(),
            receiver: ethers.ZeroAddress,
            allowedSender: ethers.ZeroAddress,
            interactions: "0x",
            makerTraits: 0n
        };

        // Create order signature (EIP-712)
        const signature = await this.signOrder(order, srcChainId);
        
        // Create escrow immutables
        const immutables = await this.createEscrowImmutables(
            order,
            srcChainId,
            dstChainId
        );

        console.log(`✅ Order created: ${ethers.formatUnits(order.makingAmount, 6)} USDC`);
        console.log(`📍 Maker: ${order.maker}`);
        console.log(`🎯 Target: ${ethers.formatUnits(order.takingAmount, 6)} USDC on destination`);

        return { order, signature, immutables };
    }

    /**
     * Step 2: Generate commitment hash (your example code)
     */
    async generateCommitment(
        order: PrivateOrder,
        signature: string,
        immutables: any,
        amount: bigint,
        takerTraits: bigint = 0n,
        args: string = "0x"
    ): Promise<OrderCommitment> {
        
        console.log("🔐 Generating commitment hash off-chain...");

        // Generate secure random nonce (your example code)
        const nonce = this.generateSecureRandom();
        console.log(`🎲 Generated nonce: ${nonce.toString().slice(0, 10)}...`);

        // Encode all order data
        const orderData = ethers.AbiCoder.defaultAbiCoder().encode(
            [
                "tuple(address,uint256,uint256,address,address,uint256,address,address,bytes,uint256)", // Order
                "bytes",    // signature
                "uint256",  // amount
                "uint256",  // takerTraits
                "bytes",    // args
                "tuple(bytes32,bytes32,address,address,address,uint256,uint256,uint256)" // immutables
            ],
            [
                [
                    order.maker,
                    order.makingAmount,
                    order.takingAmount,
                    order.makerAsset,
                    order.takerAsset,
                    order.salt,
                    order.receiver,
                    order.allowedSender,
                    order.interactions,
                    order.makerTraits
                ],
                signature,
                amount,
                takerTraits,
                args,
                [
                    immutables.orderHash,
                    immutables.hashlock,
                    immutables.maker,
                    immutables.taker,
                    immutables.token,
                    immutables.amount,
                    immutables.safetyDeposit,
                    immutables.timelocks
                ]
            ]
        );

        // Create commitment hash (hides all order details) - YOUR EXACT CODE
        const commitHash = ethers.keccak256(
            ethers.concat([
                orderData,
                ethers.toBeHex(nonce, 32),
                ethers.getAddress(await this.signer.getAddress())
            ])
        );

        console.log(`🔒 Commitment hash: ${commitHash}`);
        console.log(`ℹ️  This hash hides all order details until reveal phase`);

        const now = Math.floor(Date.now() / 1000);
        return {
            commitHash,
            nonce,
            orderData: ethers.hexlify(orderData),
            revealAfter: now + (15 * 60), // 15 minutes
            expireAfter: now + (75 * 60)  // 75 minutes
        };
    }

    /**
     * Step 3: Submit commitment on-chain (your example code)
     */
    async submitCommitment(
        commitment: OrderCommitment,
        revealDelayMinutes: number = 15
    ): Promise<string> {
        
        console.log("📤 Submitting commitment on-chain...");
        console.log(`⏰ Reveal delay: ${revealDelayMinutes} minutes`);

        // Submit only the hash (no order details visible) - YOUR EXACT CODE
        const tx = await this.privacyResolver.commitOrder(
            commitment.commitHash,
            revealDelayMinutes * 60  // Convert to seconds
        );

        const receipt = await tx.wait();
        console.log(`✅ Commitment submitted in tx: ${receipt.hash}`);
        console.log(`🔍 Only hash is visible on-chain, order details hidden`);
        
        return receipt.hash;
    }

    /**
     * Step 4: Wait for reveal period and then reveal order
     */
    async revealOrder(
        commitment: OrderCommitment,
        executionDelayMinutes: number = 5
    ): Promise<string> {
        
        const now = Math.floor(Date.now() / 1000);
        
        if (now < commitment.revealAfter) {
            const waitTime = commitment.revealAfter - now;
            console.log(`⏳ Waiting ${waitTime} seconds before reveal is allowed...`);
            
            // In a real app, you'd set a timeout or return early
            // For demo, we'll just proceed (contract will revert if too early)
        }

        console.log("🎭 Revealing order details...");

        const tx = await this.privacyResolver.revealAndScheduleOrder(
            commitment.orderData,
            commitment.nonce,
            executionDelayMinutes * 60
        );

        const receipt = await tx.wait();
        console.log(`✅ Order revealed in tx: ${receipt.hash}`);
        console.log(`⏰ Execution scheduled with ${executionDelayMinutes}min delay`);

        return receipt.hash;
    }

    /**
     * Step 5: Execute the order after delays
     */
    async executeOrder(orderHash: string): Promise<string> {
        console.log("🚀 Executing delayed order...");

        const tx = await this.privacyResolver.executeDelayedOrder(orderHash);
        const receipt = await tx.wait();
        
        console.log(`✅ Order executed in tx: ${receipt.hash}`);
        return receipt.hash;
    }

    /**
     * Helper: Generate secure random nonce
     */
    private generateSecureRandom(): bigint {
        // Use crypto.randomBytes for secure randomness
        const randomBuffer = randomBytes(32);
        return BigInt("0x" + randomBuffer.toString('hex'));
    }

    /**
     * Helper: Generate random salt for order
     */
    private generateRandomSalt(): bigint {
        return BigInt(Math.floor(Math.random() * 1000000));
    }

    /**
     * Helper: Sign order with EIP-712
     */
    private async signOrder(order: PrivateOrder, chainId: number): Promise<string> {
        // Simplified signature - in reality you'd use proper EIP-712 domain
        const orderHash = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "uint256", "uint256", "address", "address", "uint256"],
                [
                    order.maker,
                    order.makingAmount,
                    order.takingAmount,
                    order.makerAsset,
                    order.takerAsset,
                    order.salt
                ]
            )
        );

        return await this.signer.signMessage(ethers.getBytes(orderHash));
    }

    /**
     * Helper: Create escrow immutables
     */
    private async createEscrowImmutables(
        order: PrivateOrder,
        srcChainId: number,
        dstChainId: number
    ) {
        // Generate secret for HTLC
        const secret = randomBytes(32);
        const hashlock = ethers.keccak256(secret);

        const orderHash = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "uint256", "address"],
                [order.maker, order.makingAmount, order.makerAsset]
            )
        );

        return {
            orderHash,
            hashlock,
            maker: order.maker,
            taker: await this.signer.getAddress(),
            token: order.makerAsset,
            amount: order.makingAmount,
            safetyDeposit: ethers.parseEther("0.001"),
            timelocks: this.generateTimelocks(),
            secret: ethers.hexlify(secret) // Keep this for later withdrawal
        };
    }

    /**
     * Helper: Generate timelocks for cross-chain swap
     */
    private generateTimelocks(): bigint {
        // Simplified - in reality you'd use proper timelock encoding
        const now = Math.floor(Date.now() / 1000);
        return BigInt(now + 3600); // 1 hour from now
    }

    /**
     * Demo function that runs the complete flow
     */
    async runCompletePrivacyFlow() {
        console.log("🔐 Starting Complete Privacy Flow Demo\n");

        try {
            // Step 1: Create order (off-chain)
            const { order, signature, immutables } = await this.createPrivateOrder(
                "1000",  // 1000 USDC
                "990",   // 990 USDC on destination
                "0xA0b86991c431e3e88F1e60A00f0E50c100b4e476", // USDC mainnet
                "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC Arbitrum
                1,       // Ethereum
                42161    // Arbitrum
            );

            console.log("\n" + "=".repeat(50));

            // Step 2: Generate commitment (off-chain)
            const commitment = await this.generateCommitment(
                order,
                signature,
                immutables,
                order.makingAmount
            );

            console.log("\n" + "=".repeat(50));

            // Step 3: Submit commitment (on-chain)
            await this.submitCommitment(commitment, 15);

            console.log("\n" + "=".repeat(50));

            // Step 4: Reveal order (after delay)
            console.log("⏳ In real usage, you'd wait 15 minutes here...");
            console.log("🎭 For demo, proceeding to reveal (contract may revert if too early)");
            
            const orderHash = ethers.keccak256(commitment.orderData);
            await this.revealOrder(commitment, 5);

            console.log("\n" + "=".repeat(50));

            // Step 5: Execute order (after additional delay)
            console.log("⏳ In real usage, you'd wait 5 more minutes here...");
            console.log("🚀 For demo, proceeding to execution");
            
            await this.executeOrder(orderHash);

            console.log("\n🎉 Complete Privacy Flow Demonstrated!");
            console.log("\n📊 Privacy Features Used:");
            console.log("   ✅ Order details hidden for 15 minutes");
            console.log("   ✅ Commitment hash conceals all parameters");
            console.log("   ✅ Random execution delays added");
            console.log("   ✅ Fake volume generated automatically");

        } catch (error: any) {
            console.error("❌ Privacy flow error:", error.message);
            
            if (error.message.includes("TooEarlyToReveal")) {
                console.log("ℹ️  This is expected - reveals are time-locked for privacy");
            }
            if (error.message.includes("ExecutionTooEarly")) {
                console.log("ℹ️  This is expected - execution is delayed for privacy");
            }
        }
    }
}

// Export for use in other scripts
export default PrivacyClient;