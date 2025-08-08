import 'dotenv/config';
import { Signature, ethers } from 'ethers';
import { testnetConfig, ChainDeployConfig } from './deploy-config';
import * as Sdk from '@1inch/cross-chain-sdk'; // modified sdk.

import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils';

import { Wallet } from '../scripts/wallet';
import { EscrowFactory } from '../scripts/escrow-factory';
import { Resolver } from '../scripts/resolver';

import { parseEther, JsonRpcProvider, MaxUint256, randomBytes, parseUnits, Interface } from 'ethers';

const { Address } = Sdk;
/**
 *
 * Check list:
 * 1. make sure resolver in sepolia and arbitrum sepolia have enough native token (eth)
 * 2. User at least have 1000 mockUSDC  approve 1000 mockUSDC for LOP in sepolia and
 * 3. resolverContract in arbitrum sepolia should have at least 1 mockWETH and approve 1 mockweth for escrowFactory in arbitrum
 *
 */

/**
 *
 * reference: https://1inch.io/assets/1inch-fusion-plus.pdf
 *
 * phase1:
 *      The maker signs and issues a 1inch Fusion atomic or-
 *       der and secret hash to the 1inch Network, signaling
 *       their intent to make a cross-chain swap
 *       relayers share the order. for below scripts, resolver directly get the order and secret
 *
 * phase2: Deposit phase (for below scripts, resolver as the taker)
 *             The resolver deposits the maker’s tokens into the
 *             source chain escrow contract. The escrow incorporates
 *             the secret hash, token type and amount, target address,
 *             and timelock specifications for both chains.
 *
 *              4. The resolver deposits the taker amount into the escrow
 *             contract on the destination chain, employing the same
 *             secret hash and providing relevant escrow details.
 *
 *
 * Phase 3: Withdrawal Phase
 *
 *        Utilizing the secret, the resolver unlocks their assets on
 *         the source chain, simultaneously revealing the secret to
 *         the public.
 *
 *          The resolver then uses the same secret to unlock the as-
 *         sets for the maker from the destination chain’s escrow,
 *         thereby finalizing the swap.
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

        const resolverInterface = new Interface(['function arbitraryCalls(address[] calldata targets, bytes[] calldata arguments)']);
        const erc20Interface = new Interface(['function approve(address spender, uint256 amount)']);

        const arbitraryCallsData = resolverInterface.encodeFunctionData('arbitraryCalls', [
            [testnetConfig.chains.arbTestnet.mockWETH], // targets array
            [erc20Interface.encodeFunctionData('approve', [this.dstChainConfig.escrowFactory, ethers.MaxUint256])], // arguments array
        ]);
        // Send the transaction
        await this.dstChainResolver.send({
            to: this.dstChainConfig.resolver,
            data: arbitraryCallsData,
        });
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
    // console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

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

    console.log(`[${srcChainId}]`, `srcDeployBlock ${srcDeployBlock} Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`);

    return;
    // The following is under developing and testing
    // Doing check time confirmaiton in desinaiton
    // const srcDeployBlock = '0x339d81004681b2e6b21c2f5b0f28025a6b90db6a7c082cb39c17f7e53f543ac7';
    const srcEscrowEvent = await crossChainSwap.srcEscrowFactory.getSrcDeployEvent(srcDeployBlock);

    const dstImmutables = srcEscrowEvent[0].withComplement(srcEscrowEvent[1]).withTaker(new Address(resolverContract.dstAddress));

    console.log(`[${dstChainId}]`, `Depositing ${dstImmutables.amount} for order ${orderHash}`);
    const { txHash: dstDepositHash, blockTimestamp: dstDeployedAt } = await crossChainSwap.dstChainResolver.send(
        resolverContract.deployDst(dstImmutables)
    );
    console.log(`[${dstChainId}]`, `Created dst deposit for order ${orderHash} in tx ${dstDepositHash}`);

    const ESCROW_SRC_IMPLEMENTATION = await crossChainSwap.srcEscrowFactory.getSourceImpl();
    const ESCROW_DST_IMPLEMENTATION = await crossChainSwap.dstEscrowFactory.getDestinationImpl();

    const srcEscrowAddress = new Sdk.EscrowFactory(new Address(crossChainSwap.srcChainConfig.escrowFactory)).getSrcEscrowAddress(
        srcEscrowEvent[0],
        ESCROW_SRC_IMPLEMENTATION
    );

    const dstEscrowAddress = new Sdk.EscrowFactory(new Address(crossChainSwap.dstChainConfig.escrowFactory)).getDstEscrowAddress(
        srcEscrowEvent[0],
        srcEscrowEvent[1],
        dstDeployedAt,
        new Address(resolverContract.dstAddress),
        ESCROW_DST_IMPLEMENTATION
    );

    // User shares key after validation of dst escrow deployment
    console.log(`[${dstChainId}]`, `Withdrawing funds for user from ${dstEscrowAddress}`);
}

// Run the test if this file is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { CrossChainSwapTest };
