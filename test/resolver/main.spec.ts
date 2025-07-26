import "dotenv/config";
// Using Mocha/Chai instead of Jest
import { expect } from "chai";

import { createServer, CreateServerReturnType } from "prool";
import { anvil } from "prool/instances";

import * as Sdk from "@1inch/cross-chain-sdk";
import {
  computeAddress,
  ContractFactory,
  JsonRpcProvider,
  MaxUint256,
  parseEther,
  parseUnits,
  randomBytes,
  Wallet as SignerWallet,
} from "ethers";
import { uint8ArrayToHex, UINT_40_MAX } from "@1inch/byte-utils";
import assert from "node:assert";
import { ChainConfig, config } from "./config";
import { Wallet } from "./wallet";
import { Resolver } from "./resolver";
import { EscrowFactory } from "./escrow-factory";
import factoryContract from "../../artifacts/contracts/resolver/TestEscrowFactory.sol/TestEscrowFactory.json";
import resolverContract from "../../artifacts/contracts/resolver/Resolver.sol/Resolver.json";

const { Address } = Sdk;

// Remove Jest timeout - use Mocha timeout instead

const userPk =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const resolverPk =
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

// eslint-disable-next-line max-lines-per-function
describe("Resolving example", () => {
  const srcChainId = config.chain.source.chainId;
  const dstChainId = config.chain.destination.chainId;

  type Chain = {
    node?: CreateServerReturnType | undefined;
    provider: JsonRpcProvider;
    escrowFactory: string;
    resolver: string;
  };

  let src: Chain;
  let dst: Chain;

  let srcChainUser: Wallet;
  let dstChainUser: Wallet;
  let srcChainResolver: Wallet;
  let dstChainResolver: Wallet;

  let srcFactory: EscrowFactory;
  let dstFactory: EscrowFactory;
  let srcResolverContract: Wallet;
  let dstResolverContract: Wallet;

  let srcTimestamp: bigint;

  async function increaseTime(t: number): Promise<void> {
    await Promise.all(
      [src, dst].map((chain) => chain.provider.send("evm_increaseTime", [t]))
    );
  }

  before(async function () {
    this.timeout(60000); // 60 second timeout for setup
    [src, dst] = await Promise.all([
      initChain(config.chain.source),
      initChain(config.chain.destination),
    ]);

    srcChainUser = new Wallet(userPk, src.provider);
    dstChainUser = new Wallet(userPk, dst.provider);
    srcChainResolver = new Wallet(resolverPk, src.provider);
    dstChainResolver = new Wallet(resolverPk, dst.provider);

    // Fund resolver accounts with ETH for gas and safety deposits using anvil
    await src.provider.send("anvil_setBalance", [
      await srcChainResolver.getAddress(),
      "0x56BC75E2D630E000",
    ]); // 100 ETH
    await dst.provider.send("anvil_setBalance", [
      await dstChainResolver.getAddress(),
      "0x56BC75E2D630E000",
    ]); // 100 ETH

    srcFactory = new EscrowFactory(src.provider, src.escrowFactory);
    dstFactory = new EscrowFactory(dst.provider, dst.escrowFactory);
    // get 1000 USDC for user in SRC chain and approve to LOP
    await srcChainUser.topUpFromDonor(
      config.chain.source.tokens.USDC.address,
      config.chain.source.tokens.USDC.donor,
      parseUnits("1000", 6)
    );
    await srcChainUser.approveToken(
      config.chain.source.tokens.USDC.address,
      config.chain.source.limitOrderProtocol,
      MaxUint256
    );

    // get 2000 USDC for resolver in DST chain
    srcResolverContract = await Wallet.fromAddress(src.resolver, src.provider);
    dstResolverContract = await Wallet.fromAddress(dst.resolver, dst.provider);
    await dstResolverContract.topUpFromDonor(
      config.chain.destination.tokens.USDC.address,
      config.chain.destination.tokens.USDC.donor,
      parseUnits("2000", 6)
    );
    // top up contract for approve
    await dstChainResolver.transfer(dst.resolver, parseEther("1"));
    await dstResolverContract.unlimitedApprove(
      config.chain.destination.tokens.USDC.address,
      dst.escrowFactory
    );

    srcTimestamp = BigInt((await src.provider.getBlock("latest"))!.timestamp);
  });

  async function getBalances(
    srcToken: string,
    dstToken: string
  ): Promise<{
    src: { user: bigint; resolver: bigint };
    dst: { user: bigint; resolver: bigint };
  }> {
    return {
      src: {
        user: await srcChainUser.tokenBalance(srcToken),
        resolver: await srcResolverContract.tokenBalance(srcToken),
      },
      dst: {
        user: await dstChainUser.tokenBalance(dstToken),
        resolver: await dstResolverContract.tokenBalance(dstToken),
      },
    };
  }

  after(async () => {
    if (src?.provider) {
      src.provider.destroy();
    }
    if (dst?.provider) {
      dst.provider.destroy();
    }
    await Promise.all([src?.node?.stop(), dst?.node?.stop()].filter(Boolean));
  });

  // eslint-disable-next-line max-lines-per-function
  describe("Fill", () => {
    it("should swap Ethereum USDC -> Bsc USDC. Single fill only", async function () {
      this.timeout(120000); // 2 minute timeout
      const initialBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      // User creates order
      const secret = uint8ArrayToHex(randomBytes(32)); // note: use crypto secure random number in real world
      const order = Sdk.CrossChainOrder.new(
        new Address(src.escrowFactory),
        {
          salt: Sdk.randBigInt(1000n),
          maker: new Address(await srcChainUser.getAddress()),
          makingAmount: parseUnits("100", 6),
          takingAmount: parseUnits("99", 6),
          makerAsset: new Address(config.chain.source.tokens.USDC.address),
          takerAsset: new Address(config.chain.destination.tokens.USDC.address),
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
          srcSafetyDeposit: parseEther("0.001"),
          dstSafetyDeposit: parseEther("0.001"),
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
              address: new Address(src.resolver),
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

      const signature = await srcChainUser.signOrder(srcChainId, order);
      const orderHash = order.getOrderHash(srcChainId);
      // Resolver fills order
      const resolverContract = new Resolver(src.resolver, dst.resolver);

      console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

      const fillAmount = order.makingAmount;
      const { txHash: orderFillHash, blockHash: srcDeployBlock } =
        await srcChainResolver.send(
          resolverContract.deploySrc(
            srcChainId,
            order,
            signature,
            Sdk.TakerTraits.default()
              .setExtension(order.extension)
              .setAmountMode(Sdk.AmountMode.maker)
              .setAmountThreshold(order.takingAmount),
            fillAmount
          )
        );

      console.log(
        `[${srcChainId}]`,
        `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`
      );

      const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock);

      const dstImmutables = srcEscrowEvent[0]
        .withComplement(srcEscrowEvent[1])
        .withTaker(new Address(resolverContract.dstAddress));

      console.log(
        `[${dstChainId}]`,
        `Depositing ${dstImmutables.amount} for order ${orderHash}`
      );
      const { txHash: dstDepositHash, blockTimestamp: dstDeployedAt } =
        await dstChainResolver.send(resolverContract.deployDst(dstImmutables));
      console.log(
        `[${dstChainId}]`,
        `Created dst deposit for order ${orderHash} in tx ${dstDepositHash}`
      );

      const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl();
      const ESCROW_DST_IMPLEMENTATION = await dstFactory.getDestinationImpl();

      const srcEscrowAddress = new Sdk.EscrowFactory(
        new Address(src.escrowFactory)
      ).getSrcEscrowAddress(srcEscrowEvent[0], ESCROW_SRC_IMPLEMENTATION);

      const dstEscrowAddress = new Sdk.EscrowFactory(
        new Address(dst.escrowFactory)
      ).getDstEscrowAddress(
        srcEscrowEvent[0],
        srcEscrowEvent[1],
        dstDeployedAt,
        new Address(resolverContract.dstAddress),
        ESCROW_DST_IMPLEMENTATION
      );

      await increaseTime(11);
      // User shares key after validation of dst escrow deployment
      console.log(
        `[${dstChainId}]`,
        `Withdrawing funds for user from ${dstEscrowAddress}`
      );
      await dstChainResolver.send(
        resolverContract.withdraw(
          "dst",
          dstEscrowAddress,
          secret,
          dstImmutables.withDeployedAt(dstDeployedAt)
        )
      );

      console.log(
        `[${srcChainId}]`,
        `Withdrawing funds for resolver from ${srcEscrowAddress}`
      );
      const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
        resolverContract.withdraw(
          "src",
          srcEscrowAddress,
          secret,
          srcEscrowEvent[0]
        )
      );
      console.log(
        `[${srcChainId}]`,
        `Withdrew funds for resolver from ${srcEscrowAddress} to ${src.resolver} in tx ${resolverWithdrawHash}`
      );

      const resultBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      // user transferred funds to resolver on source chain
      expect(initialBalances.src.user - resultBalances.src.user).to.equal(
        order.makingAmount
      );
      expect(
        resultBalances.src.resolver - initialBalances.src.resolver
      ).to.equal(order.makingAmount);
      // resolver transferred funds to user on destination chain
      expect(resultBalances.dst.user - initialBalances.dst.user).to.equal(
        order.takingAmount
      );
      expect(
        initialBalances.dst.resolver - resultBalances.dst.resolver
      ).to.equal(order.takingAmount);
    });

    it("should swap Ethereum USDC -> Bsc USDC. Multiple fills. Fill 100%", async function () {
      this.timeout(120000); // 2 minute timeout
      const initialBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      // User creates order
      // 11 secrets
      const secrets = Array.from({ length: 11 }).map(() =>
        uint8ArrayToHex(randomBytes(32))
      ); // note: use crypto secure random number in the real world
      const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s));
      const leaves = Sdk.HashLock.getMerkleLeaves(secrets);
      const order = Sdk.CrossChainOrder.new(
        new Address(src.escrowFactory),
        {
          salt: Sdk.randBigInt(1000n),
          maker: new Address(await srcChainUser.getAddress()),
          makingAmount: parseUnits("100", 6),
          takingAmount: parseUnits("99", 6),
          makerAsset: new Address(config.chain.source.tokens.USDC.address),
          takerAsset: new Address(config.chain.destination.tokens.USDC.address),
        },
        {
          hashLock: Sdk.HashLock.forMultipleFills(leaves),
          timeLocks: Sdk.TimeLocks.new({
            srcWithdrawal: 10n, // 10s finality lock for test
            srcPublicWithdrawal: 120n, // 2m for private withdrawal
            srcCancellation: 121n, // 1sec public withdrawal
            srcPublicCancellation: 122n, // 1sec private cancellation
            dstWithdrawal: 10n, // 10s finality lock for test
            dstPublicWithdrawal: 100n, // 100sec private withdrawal
            dstCancellation: 101n, // 1sec public withdrawal
          }),
          srcChainId,
          dstChainId,
          srcSafetyDeposit: parseEther("0.001"),
          dstSafetyDeposit: parseEther("0.001"),
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
              address: new Address(src.resolver),
              allowFrom: 0n,
            },
          ],
          resolvingStartTime: 0n,
        },
        {
          nonce: Sdk.randBigInt(UINT_40_MAX),
          allowPartialFills: true,
          allowMultipleFills: true,
        }
      );

      const signature = await srcChainUser.signOrder(srcChainId, order);
      const orderHash = order.getOrderHash(srcChainId);
      // Resolver fills order
      const resolverContract = new Resolver(src.resolver, dst.resolver);

      console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

      const fillAmount = order.makingAmount;
      const idx = secrets.length - 1; // last index to fulfill
      // Number((BigInt(secrets.length - 1) * (fillAmount - 1n)) / order.makingAmount)

      const { txHash: orderFillHash, blockHash: srcDeployBlock } =
        await srcChainResolver.send(
          resolverContract.deploySrc(
            srcChainId,
            order,
            signature,
            Sdk.TakerTraits.default()
              .setExtension(order.extension)
              .setInteraction(
                new Sdk.EscrowFactory(
                  new Address(src.escrowFactory)
                ).getMultipleFillInteraction(
                  Sdk.HashLock.getProof(leaves, idx),
                  idx,
                  secretHashes[idx]
                )
              )
              .setAmountMode(Sdk.AmountMode.maker)
              .setAmountThreshold(order.takingAmount),
            fillAmount,
            Sdk.HashLock.fromString(secretHashes[idx])
          )
        );

      console.log(
        `[${srcChainId}]`,
        `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`
      );

      const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock);

      const dstImmutables = srcEscrowEvent[0]
        .withComplement(srcEscrowEvent[1])
        .withTaker(new Address(resolverContract.dstAddress));

      console.log(
        `[${dstChainId}]`,
        `Depositing ${dstImmutables.amount} for order ${orderHash}`
      );
      const { txHash: dstDepositHash, blockTimestamp: dstDeployedAt } =
        await dstChainResolver.send(resolverContract.deployDst(dstImmutables));
      console.log(
        `[${dstChainId}]`,
        `Created dst deposit for order ${orderHash} in tx ${dstDepositHash}`
      );

      const secret = secrets[idx];

      const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl();
      const ESCROW_DST_IMPLEMENTATION = await dstFactory.getDestinationImpl();

      const srcEscrowAddress = new Sdk.EscrowFactory(
        new Address(src.escrowFactory)
      ).getSrcEscrowAddress(srcEscrowEvent[0], ESCROW_SRC_IMPLEMENTATION);

      const dstEscrowAddress = new Sdk.EscrowFactory(
        new Address(dst.escrowFactory)
      ).getDstEscrowAddress(
        srcEscrowEvent[0],
        srcEscrowEvent[1],
        dstDeployedAt,
        new Address(resolverContract.dstAddress),
        ESCROW_DST_IMPLEMENTATION
      );

      await increaseTime(11); // finality lock passed
      // User shares key after validation of dst escrow deployment
      console.log(
        `[${dstChainId}]`,
        `Withdrawing funds for user from ${dstEscrowAddress}`
      );
      await dstChainResolver.send(
        resolverContract.withdraw(
          "dst",
          dstEscrowAddress,
          secret,
          dstImmutables.withDeployedAt(dstDeployedAt)
        )
      );

      console.log(
        `[${srcChainId}]`,
        `Withdrawing funds for resolver from ${srcEscrowAddress}`
      );
      const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
        resolverContract.withdraw(
          "src",
          srcEscrowAddress,
          secret,
          srcEscrowEvent[0]
        )
      );
      console.log(
        `[${srcChainId}]`,
        `Withdrew funds for resolver from ${srcEscrowAddress} to ${src.resolver} in tx ${resolverWithdrawHash}`
      );

      const resultBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      // user transferred funds to resolver on the source chain
      expect(initialBalances.src.user - resultBalances.src.user).to.equal(
        order.makingAmount
      );
      expect(
        resultBalances.src.resolver - initialBalances.src.resolver
      ).to.equal(order.makingAmount);
      // resolver transferred funds to user on the destination chain
      expect(resultBalances.dst.user - initialBalances.dst.user).to.equal(
        order.takingAmount
      );
      expect(
        initialBalances.dst.resolver - resultBalances.dst.resolver
      ).to.equal(order.takingAmount);
    });

    it("should swap Ethereum USDC -> Bsc USDC. Multiple fills. Fill 50%", async function () {
      this.timeout(120000); // 2 minute timeout
      const initialBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      // User creates order
      // 11 secrets
      const secrets = Array.from({ length: 11 }).map(() =>
        uint8ArrayToHex(randomBytes(32))
      ); // note: use crypto secure random number in the real world
      const secretHashes = secrets.map((s) => Sdk.HashLock.hashSecret(s));
      const leaves = Sdk.HashLock.getMerkleLeaves(secrets);
      const order = Sdk.CrossChainOrder.new(
        new Address(src.escrowFactory),
        {
          salt: Sdk.randBigInt(1000n),
          maker: new Address(await srcChainUser.getAddress()),
          makingAmount: parseUnits("100", 6),
          takingAmount: parseUnits("99", 6),
          makerAsset: new Address(config.chain.source.tokens.USDC.address),
          takerAsset: new Address(config.chain.destination.tokens.USDC.address),
        },
        {
          hashLock: Sdk.HashLock.forMultipleFills(leaves),
          timeLocks: Sdk.TimeLocks.new({
            srcWithdrawal: 10n, // 10s finality lock for test
            srcPublicWithdrawal: 120n, // 2m for private withdrawal
            srcCancellation: 121n, // 1sec public withdrawal
            srcPublicCancellation: 122n, // 1sec private cancellation
            dstWithdrawal: 10n, // 10s finality lock for test
            dstPublicWithdrawal: 100n, // 100sec private withdrawal
            dstCancellation: 101n, // 1sec public withdrawal
          }),
          srcChainId,
          dstChainId,
          srcSafetyDeposit: parseEther("0.001"),
          dstSafetyDeposit: parseEther("0.001"),
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
              address: new Address(src.resolver),
              allowFrom: 0n,
            },
          ],
          resolvingStartTime: 0n,
        },
        {
          nonce: Sdk.randBigInt(UINT_40_MAX),
          allowPartialFills: true,
          allowMultipleFills: true,
        }
      );

      const signature = await srcChainUser.signOrder(srcChainId, order);
      const orderHash = order.getOrderHash(srcChainId);
      // Resolver fills order
      const resolverContract = new Resolver(src.resolver, dst.resolver);

      console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

      const fillAmount = order.makingAmount / 2n;
      const idx = Number(
        (BigInt(secrets.length - 1) * (fillAmount - 1n)) / order.makingAmount
      );

      const { txHash: orderFillHash, blockHash: srcDeployBlock } =
        await srcChainResolver.send(
          resolverContract.deploySrc(
            srcChainId,
            order,
            signature,
            Sdk.TakerTraits.default()
              .setExtension(order.extension)
              .setInteraction(
                new Sdk.EscrowFactory(
                  new Address(src.escrowFactory)
                ).getMultipleFillInteraction(
                  Sdk.HashLock.getProof(leaves, idx),
                  idx,
                  secretHashes[idx]
                )
              )
              .setAmountMode(Sdk.AmountMode.maker)
              .setAmountThreshold(order.takingAmount),
            fillAmount,
            Sdk.HashLock.fromString(secretHashes[idx])
          )
        );

      console.log(
        `[${srcChainId}]`,
        `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`
      );

      const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock);

      const dstImmutables = srcEscrowEvent[0]
        .withComplement(srcEscrowEvent[1])
        .withTaker(new Address(resolverContract.dstAddress));

      console.log(
        `[${dstChainId}]`,
        `Depositing ${dstImmutables.amount} for order ${orderHash}`
      );
      const { txHash: dstDepositHash, blockTimestamp: dstDeployedAt } =
        await dstChainResolver.send(resolverContract.deployDst(dstImmutables));
      console.log(
        `[${dstChainId}]`,
        `Created dst deposit for order ${orderHash} in tx ${dstDepositHash}`
      );

      const secret = secrets[idx];

      const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl();
      const ESCROW_DST_IMPLEMENTATION = await dstFactory.getDestinationImpl();

      const srcEscrowAddress = new Sdk.EscrowFactory(
        new Address(src.escrowFactory)
      ).getSrcEscrowAddress(srcEscrowEvent[0], ESCROW_SRC_IMPLEMENTATION);

      const dstEscrowAddress = new Sdk.EscrowFactory(
        new Address(dst.escrowFactory)
      ).getDstEscrowAddress(
        srcEscrowEvent[0],
        srcEscrowEvent[1],
        dstDeployedAt,
        new Address(resolverContract.dstAddress),
        ESCROW_DST_IMPLEMENTATION
      );

      await increaseTime(11); // finality lock passed
      // User shares key after validation of dst escrow deployment
      console.log(
        `[${dstChainId}]`,
        `Withdrawing funds for user from ${dstEscrowAddress}`
      );
      await dstChainResolver.send(
        resolverContract.withdraw(
          "dst",
          dstEscrowAddress,
          secret,
          dstImmutables.withDeployedAt(dstDeployedAt)
        )
      );

      console.log(
        `[${srcChainId}]`,
        `Withdrawing funds for resolver from ${srcEscrowAddress}`
      );
      const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
        resolverContract.withdraw(
          "src",
          srcEscrowAddress,
          secret,
          srcEscrowEvent[0]
        )
      );
      console.log(
        `[${srcChainId}]`,
        `Withdrew funds for resolver from ${srcEscrowAddress} to ${src.resolver} in tx ${resolverWithdrawHash}`
      );

      const resultBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      // user transferred funds to resolver on the source chain
      expect(initialBalances.src.user - resultBalances.src.user).to.equal(
        fillAmount
      );
      expect(
        resultBalances.src.resolver - initialBalances.src.resolver
      ).to.equal(fillAmount);
      // resolver transferred funds to user on the destination chain
      const dstAmount = (order.takingAmount * fillAmount) / order.makingAmount;
      expect(resultBalances.dst.user - initialBalances.dst.user).to.equal(
        dstAmount
      );
      expect(
        initialBalances.dst.resolver - resultBalances.dst.resolver
      ).to.equal(dstAmount);
    });
  });

  describe("Cancel", () => {
    it("should cancel swap Ethereum USDC -> Bsc USDC", async function () {
      this.timeout(120000); // 2 minute timeout
      const initialBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      // User creates order
      const hashLock = Sdk.HashLock.forSingleFill(
        uint8ArrayToHex(randomBytes(32))
      ); // note: use crypto secure random number in real world
      const order = Sdk.CrossChainOrder.new(
        new Address(src.escrowFactory),
        {
          salt: Sdk.randBigInt(1000n),
          maker: new Address(await srcChainUser.getAddress()),
          makingAmount: parseUnits("100", 6),
          takingAmount: parseUnits("99", 6),
          makerAsset: new Address(config.chain.source.tokens.USDC.address),
          takerAsset: new Address(config.chain.destination.tokens.USDC.address),
        },
        {
          hashLock,
          timeLocks: Sdk.TimeLocks.new({
            srcWithdrawal: 0n, // no finality lock for test
            srcPublicWithdrawal: 120n, // 2m for private withdrawal
            srcCancellation: 121n, // 1sec public withdrawal
            srcPublicCancellation: 122n, // 1sec private cancellation
            dstWithdrawal: 0n, // no finality lock for test
            dstPublicWithdrawal: 100n, // 100sec private withdrawal
            dstCancellation: 101n, // 1sec public withdrawal
          }),
          srcChainId,
          dstChainId,
          srcSafetyDeposit: parseEther("0.001"),
          dstSafetyDeposit: parseEther("0.001"),
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
              address: new Address(src.resolver),
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

      const signature = await srcChainUser.signOrder(srcChainId, order);
      const orderHash = order.getOrderHash(srcChainId);
      // Resolver fills order
      const resolverContract = new Resolver(src.resolver, dst.resolver);

      console.log(`[${srcChainId}]`, `Filling order ${orderHash}`);

      const fillAmount = order.makingAmount;
      const { txHash: orderFillHash, blockHash: srcDeployBlock } =
        await srcChainResolver.send(
          resolverContract.deploySrc(
            srcChainId,
            order,
            signature,
            Sdk.TakerTraits.default()
              .setExtension(order.extension)
              .setAmountMode(Sdk.AmountMode.maker)
              .setAmountThreshold(order.takingAmount),
            fillAmount
          )
        );

      console.log(
        `[${srcChainId}]`,
        `Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`
      );

      const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock);

      const dstImmutables = srcEscrowEvent[0]
        .withComplement(srcEscrowEvent[1])
        .withTaker(new Address(resolverContract.dstAddress));

      console.log(
        `[${dstChainId}]`,
        `Depositing ${dstImmutables.amount} for order ${orderHash}`
      );
      const { txHash: dstDepositHash, blockTimestamp: dstDeployedAt } =
        await dstChainResolver.send(resolverContract.deployDst(dstImmutables));
      console.log(
        `[${dstChainId}]`,
        `Created dst deposit for order ${orderHash} in tx ${dstDepositHash}`
      );

      const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl();
      const ESCROW_DST_IMPLEMENTATION = await dstFactory.getDestinationImpl();

      const srcEscrowAddress = new Sdk.EscrowFactory(
        new Address(src.escrowFactory)
      ).getSrcEscrowAddress(srcEscrowEvent[0], ESCROW_SRC_IMPLEMENTATION);

      const dstEscrowAddress = new Sdk.EscrowFactory(
        new Address(dst.escrowFactory)
      ).getDstEscrowAddress(
        srcEscrowEvent[0],
        srcEscrowEvent[1],
        dstDeployedAt,
        new Address(resolverContract.dstAddress),
        ESCROW_DST_IMPLEMENTATION
      );

      await increaseTime(125);
      // user does not share secret, so cancel both escrows
      console.log(
        `[${dstChainId}]`,
        `Cancelling dst escrow ${dstEscrowAddress}`
      );
      await dstChainResolver.send(
        resolverContract.cancel(
          "dst",
          dstEscrowAddress,
          dstImmutables.withDeployedAt(dstDeployedAt)
        )
      );

      console.log(
        `[${srcChainId}]`,
        `Cancelling src escrow ${srcEscrowAddress}`
      );
      const { txHash: cancelSrcEscrow } = await srcChainResolver.send(
        resolverContract.cancel("src", srcEscrowAddress, srcEscrowEvent[0])
      );
      console.log(
        `[${srcChainId}]`,
        `Cancelled src escrow ${srcEscrowAddress} in tx ${cancelSrcEscrow}`
      );

      const resultBalances = await getBalances(
        config.chain.source.tokens.USDC.address,
        config.chain.destination.tokens.USDC.address
      );

      expect(initialBalances).to.deep.equal(resultBalances);
    });
  });
});

async function initChain(cnf: ChainConfig): Promise<{
  node?: CreateServerReturnType;
  provider: JsonRpcProvider;
  escrowFactory: string;
  resolver: string;
}> {
  const { node, provider } = await getProvider(cnf);
  const deployer = new SignerWallet(cnf.ownerPrivateKey, provider);

  // deploy EscrowFactory
  const escrowFactory = await deploy(
    factoryContract,
    [
      cnf.limitOrderProtocol,
      cnf.wrappedNative, // feeToken,
      "0x0000000000000000000000000000000000000000", // accessToken,
      deployer.address, // owner
      60 * 30, // src rescue delay
      60 * 30, // dst rescue delay
    ],
    provider,
    deployer
  );
  console.log(
    `[${cnf.chainId}]`,
    `Escrow factory contract deployed to`,
    escrowFactory
  );

  // deploy Resolver contract
  const resolver = await deploy(
    resolverContract,
    [
      escrowFactory,
      cnf.limitOrderProtocol,
      computeAddress(resolverPk), // resolver as owner of contract
    ],
    provider,
    deployer
  );
  console.log(`[${cnf.chainId}]`, `Resolver contract deployed to`, resolver);

  return { node: node, provider, resolver, escrowFactory };
}

async function getProvider(
  cnf: ChainConfig
): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider }> {
  if (!cnf.createFork) {
    return {
      provider: new JsonRpcProvider(cnf.url, cnf.chainId, {
        cacheTimeout: -1,
        staticNetwork: true,
      }),
    };
  }

  const node = createServer({
    instance: anvil({ forkUrl: cnf.url, chainId: cnf.chainId }),
    limit: 1,
  });
  await node.start();

  const address = node.address();
  assert(address);

  const provider = new JsonRpcProvider(
    `http://[${address.address}]:${address.port}/1`,
    cnf.chainId,
    {
      cacheTimeout: -1,
      staticNetwork: true,
    }
  );

  return {
    provider,
    node,
  };
}

/**
 * Deploy contract and return its address
 */
async function deploy(
  json: { abi: any; bytecode: any },
  params: unknown[],
  provider: JsonRpcProvider,
  deployer: SignerWallet
): Promise<string> {
  const deployed = await new ContractFactory(
    json.abi,
    json.bytecode,
    deployer
  ).deploy(...params);
  await deployed.waitForDeployment();

  return await deployed.getAddress();
}
