import 'dotenv/config';
import { Signature, ethers } from 'ethers';
import { testnetConfig, ChainDeployConfig } from './deploy-config';
import * as Sdk from '../sdk-custom/dist/cjs'; // modified sdk.

import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils';

import { Wallet } from '../scripts/wallet';
import { EscrowFactory } from '../test/resolver/escrow-factory';
import { Resolver } from '../scripts/resolver';

import { parseEther, JsonRpcProvider, MaxUint256, randomBytes, parseUnits, TypedDataDomain } from 'ethers';

const { Address } = Sdk;
/**
 *
 * Check list:
 * 1. make sure resolver in sepolia and arbitrum sepolia have enough native token (eth)
 * 2. User at least have 1000 mockUSDC  approve 1000 mockUSDC for LOP in sepolia and
 * 3. resolverContract in arbitrum sepolia should have at least 1 mockWETH and approve 1 mockweth for escrowFactory in arbitrum
 *
 *
 * Doing:
 *
 * user approve 1000 mockUSDC for lop in sepolia
 * resolverContract in arbitrum sepolia  should get 1 mockWETH and approve escrowFactory
 *
 *
 */

/**
 * Step-by-Step Cross-Chain Swap Test Script
 * Swaps MockUSDC (Sepolia) -> MockWETH (Arbitrum) at 1000:1 rate
 * Actually executes on-chain contract calls based on main.spec.ts patterns
 */

/**
 * 
 * ?? when to share the secret?
 * 
 * 
 * phase1: 
 *      The maker signs and issues a 1inch Fusion atomic or-
 *       der and secret hash to the 1inch Network, signaling
 *       their intent to make a cross-chain swap
 *       relayers share the order. for below scripts, resolver directly get the order and secret
 *
 *
 * 
 * phase2: Deposit phase (for below scripts, resolver as the taker)
              The resolver deposits the maker’s tokens into the
              source chain escrow contract. The escrow incorporates
              the secret hash, token type and amount, target address,
              and timelock specifications for both chains.

              4. The resolver deposits the taker amount into the escrow
              contract on the destination chain, employing the same
              secret hash and providing relevant escrow details.
 *    
 *    
 * Phase 3: Withdrawal Phase
 *        
 *        Utilizing the secret, the resolver unlocks their assets on
          the source chain, simultaneously revealing the secret to
          the public.

           The resolver then uses the same secret to unlock the as-
          sets for the maker from the destination chain’s escrow,
          thereby finalizing the swap.
 *          
 * 
 * 
 * 
 */

class CrossChainSwapTest {
    srcChainConfig: ChainDeployConfig;
    dstChainConfig: ChainDeployConfig;

    srcChainUser: Wallet;
    dstChainUser: Wallet;
    srcChainResolver: Wallet;
    dstChainResolver: Wallet;

    srcEscrowFactory: EscrowFactory;
    dstEscrowFactory: EscrowFactory;

    srcResolverContract!: Wallet;
    dstResolverContract!: Wallet;

    srcProvider: JsonRpcProvider;
    dstProvider: JsonRpcProvider;

    constructor() {
        this.srcChainConfig = testnetConfig.chains.sepolia;
        this.dstChainConfig = testnetConfig.chains.arbTestnet;

        this.srcProvider = new ethers.JsonRpcProvider(testnetConfig.chains.sepolia.rpcUrl);

        this.dstProvider = new ethers.JsonRpcProvider(testnetConfig.chains.arbTestnet.rpcUrl);

        this.srcChainUser = new Wallet(testnetConfig.userPrivateKey, this.srcProvider);

        this.dstChainUser = new Wallet(testnetConfig.userPrivateKey, this.dstProvider);

        this.srcChainResolver = new Wallet(testnetConfig.resolverPrivateKey, this.srcProvider);

        this.dstChainResolver = new Wallet(testnetConfig.resolverPrivateKey, this.dstProvider);

        this.srcEscrowFactory = new EscrowFactory(this.srcProvider, this.srcChainConfig.escrowFactory);
        this.dstEscrowFactory = new EscrowFactory(this.dstProvider, this.dstChainConfig.escrowFactory);
    }

    async initResolverContractWallet(): Promise<void> {
        this.srcResolverContract = await Wallet.contractWithSigner(this.srcChainConfig.resolver, testnetConfig.resolverPrivateKey, this.srcProvider);
        this.dstResolverContract = await Wallet.contractWithSigner(this.dstChainConfig.resolver, testnetConfig.resolverPrivateKey, this.dstProvider);
    }

    async checkNativeTokenBalance(provider: JsonRpcProvider, resolverContract: String): Promise<bigint> {
        return await provider.getBalance(resolverContract.toString());
    }

    /**
     * prepare
     * 1. srcChainUser approve MaxUint256 mockusdc to LOP in Ethereum Sepolia
     * 2. dstResolverContract apprive mockWETH for escrowFactory in Arbitrum Sepolia
     */
    async prepare(): Promise<void> {
        await this.srcChainUser.approveToken(this.srcChainConfig.mockUSDC, this.srcChainConfig.limitOrderProtocol, MaxUint256);

        // resolver transfer 0.01 eth to resolver contract in target chain
        const resolverContractBalance = await this.dstProvider.getBalance(this.dstChainConfig.resolver);

        const minRequiredBalance = parseEther('0.01');
        if (resolverContractBalance < minRequiredBalance) {
            console.log(
                `💸 Resolver contract in target chain has insufficient ETH (${ethers.formatEther(resolverContractBalance)} < 0.01), transferring...`
            );
            await this.dstChainResolver.transfer(this.dstChainConfig.resolver, parseEther('0.01'));
        }

        // dstResolverContract approve mockWETH for escrowFactory
        await this.dstResolverContract.unlimitedApprove(this.dstChainConfig.mockWETH, this.dstChainConfig.escrowFactory);
    }

    async getBalances(
        srcToken: string,
        dstToken: string
    ): Promise<{
        src: { user: bigint; resolver: bigint };
        dst: { user: bigint; resolver: bigint };
    }> {
        return {
            src: {
                user: await this.srcChainUser.tokenBalance(srcToken),
                resolver: await this.srcResolverContract.tokenBalance(srcToken),
            },
            dst: {
                user: await this.dstChainUser.tokenBalance(dstToken),
                resolver: await this.dstResolverContract.tokenBalance(dstToken),
            },
        };
    }
}

type BalanceInfo = {
    src: { user: bigint; resolver: bigint };
    dst: { user: bigint; resolver: bigint };
};

async function printBalance(crossChainSwap: CrossChainSwapTest, initialBalances: BalanceInfo) {
    console.log(
        'srcResoverlContract eth balance:',
        await crossChainSwap.checkNativeTokenBalance(crossChainSwap.srcProvider, crossChainSwap.srcChainConfig.resolver)
    );

    console.log(
        'dstResoverlContract eth balance:',
        await crossChainSwap.checkNativeTokenBalance(crossChainSwap.dstProvider, crossChainSwap.dstChainConfig.resolver)
    );

    console.log('💰 Initial Balances Before Swap:');
    console.log('================================');
    console.log('📍 Source Chain (Sepolia):');
    console.log(`  User MockUSDC: ${ethers.formatUnits(initialBalances.src.user, 6)} USDC`);
    console.log(`  Resolver MockUSDC: ${ethers.formatUnits(initialBalances.src.resolver, 6)} USDC`);
    console.log('📍 Destination Chain (Arbitrum):');
    console.log(`  User MockWETH: ${ethers.formatEther(initialBalances.dst.user)} WETH`);
}

/**
 * Main function to run the cross-chain swap test
 */
async function main(): Promise<void> {
    const crossChainSwap = new CrossChainSwapTest();

    await crossChainSwap.initResolverContractWallet();

    // 1. sourceChain operation
    const initialBalances = await crossChainSwap.getBalances(crossChainSwap.srcChainConfig.mockUSDC, crossChainSwap.dstChainConfig.mockWETH);

    await crossChainSwap.prepare();
    printBalance(crossChainSwap, initialBalances);

    // User creates order
    const secret = uint8ArrayToHex(randomBytes(32)); // note: use crypto secure random number in real world
    const srcChainId = crossChainSwap.srcChainConfig.chainId;
    const dstChainId = crossChainSwap.dstChainConfig.chainId;
    const srcTimestamp = BigInt((await crossChainSwap.srcProvider.getBlock('latest'))!.timestamp);

    const order = Sdk.CrossChainOrder.new(
        new Address(crossChainSwap.srcChainConfig.escrowFactory),
        {
            salt: Sdk.randBigInt(1000n),
            maker: new Address(await crossChainSwap.srcChainUser.getAddress()),
            makingAmount: parseUnits('1000', 6), // 1000 MOCKUSDC
            takingAmount: parseUnits('1', 18), // 1WETH
            makerAsset: new Address(crossChainSwap.srcChainConfig.mockUSDC),
            takerAsset: new Address(crossChainSwap.dstChainConfig.mockWETH),
        },
        {
            hashLock: Sdk.HashLock.forSingleFill(secret),
            timeLocks: Sdk.TimeLocks.new({
                srcWithdrawal: 10n, // 10sec finality lock for test
                srcPublicWithdrawal: 120n, // 2m for private withdrawal
                srcCancellation: 121n, // 1sec public withdrawal
                srcPublicCancellation: 122n, // 1sec private cancellation
                dstWithdrawal: 10n, // 10sec finality lock for test
                dstPublicWithdrawal: 100n, // 100sec private withdrawal
                dstCancellation: 101n, // 1sec public withdrawal
            }),
            srcChainId,
            dstChainId,
            srcSafetyDeposit: parseEther('0.001'),
            dstSafetyDeposit: parseEther('0.001'),
        },
        {
            auction: new Sdk.AuctionDetails({
                initialRateBump: 0,
                points: [],
                duration: 120n,
                startTime: srcTimestamp,
            }),
            whitelist: [
                {
                    address: new Address(crossChainSwap.srcChainConfig.resolver),
                    allowFrom: 0n,
                },
            ],
            resolvingStartTime: 0n,
        },
        {
            nonce: Sdk.randBigInt(UINT_40_MAX),
            allowPartialFills: false,
            allowMultipleFills: false,
        }
    );

    const signature = await crossChainSwap.srcChainUser.signOrder(srcChainId, order);

    // should use below instead of order.order.getOrderHash, which apply the original customDoamin
    const orderHash = order.getOrderHash(srcChainId);

    // Parse signature to get r and vs components
    const sig = Signature.from(signature);
    const r = sig.r;
    const vs = sig.yParityAndS;

    // Use ECDSA.recover to extract the address
    const recoveredAddress = ethers.recoverAddress(orderHash, { r, yParityAndS: vs });
    console.log('Order Hash:', orderHash);
    console.log('Signature r:', r);
    console.log('Signature vs:', vs);
    console.log('Recovered Address:', recoveredAddress);
    console.log('Signer Address:', await crossChainSwap.srcChainUser.getAddress());

    // Log order information
    console.log('📋 Order Information');
    console.log(`  Resolver MockWETH: ${ethers.formatEther(initialBalances.dst.resolver)} WETH`);

    console.log('====================');
    console.log('Order Hash:', orderHash);
    console.log('Secret:', secret);
    console.log(
        'Order Details:',
        JSON.stringify(
            {
                salt: order.salt.toString(),
                maker: order.maker.toString(),
                receiver: order.receiver.toString(),
                makerAsset: order.makerAsset.toString(),
                takerAsset: order.takerAsset.toString(),
                makingAmount: order.makingAmount.toString(),
                takingAmount: order.takingAmount.toString(),
            },
            null,
            2
        )
    );

    console.log(
        'Signature:',
        JSON.stringify(
            {
                r: sig.r,
                vs: sig.yParityAndS,
            },
            null,
            2
        )
    );

    console.log(
        'Immutables:',
        JSON.stringify(
            {
                orderHash: orderHash,
                hashlock: order.escrowExtension.hashLockInfo.toString(),
                maker: order.maker.toString(),
                token: order.makerAsset.toString(),
                amount: order.makingAmount.toString(),
                safetyDeposit: order.escrowExtension.srcSafetyDeposit.toString(),
                timelocks: order.escrowExtension.timeLocks.toString(),
            },
            null,
            2
        )
    );

    // Resolver fills order
    const resolverContract = new Resolver(crossChainSwap.srcChainConfig.resolver, crossChainSwap.dstChainConfig.resolver);
    console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

    const fillAmount = order.makingAmount;
    const { txHash: orderFillHash, blockHash: srcDeployBlock } = await crossChainSwap.srcChainResolver.send(
        resolverContract.deploySrc(
            srcChainId,
            order,
            signature,
            Sdk.TakerTraits.default().setExtension(order.extension).setAmountMode(Sdk.AmountMode.maker).setAmountThreshold(order.takingAmount),
            fillAmount
        )
    );

    console.log(`[${srcChainId}]`, `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`);
}

// Run the test if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { CrossChainSwapTest };
