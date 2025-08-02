import { Interface, Signature, TransactionRequest } from 'ethers';

import * as Sdk from '../sdk-custom/dist/cjs'; // modified sdk.
import ResolverArtifact from '../artifacts/contracts/resolver/Resolver.sol/Resolver.json';

export class Resolver {
    private readonly iface = new Interface(ResolverArtifact.abi);

    constructor(public readonly srcAddress: string, public readonly dstAddress: string) {}

    public deploySrc(
        chainId: number,
        order: Sdk.CrossChainOrder,
        signature: string,
        takerTraits: Sdk.TakerTraits,
        amount: bigint,
        hashLock = order.escrowExtension.hashLockInfo
    ): TransactionRequest {
        const { r, yParityAndS: vs } = Signature.from(signature);
        const { args, trait } = takerTraits.encode();
        const immutables = order.toSrcImmutables(chainId, new Sdk.Address(this.srcAddress), amount, hashLock);
        console.log('Full immutables object:');
        console.log(
            JSON.stringify(
                {
                    orderHash: immutables.orderHash,
                    hashLock: immutables.hashLock.toString(),
                    maker: immutables.maker.toString(),
                    taker: immutables.taker.toString(),
                    token: immutables.token.toString(),
                    amount: immutables.amount.toString(),
                    safetyDeposit: immutables.safetyDeposit.toString(),
                    timeLocks: immutables.timeLocks.toString(),
                },
                null,
                2
            )
        );

        return {
            to: this.srcAddress,
            data: this.iface.encodeFunctionData('deploySrc', [immutables.build(), order.build(), r, vs, amount, trait, args]),
            value: order.escrowExtension.srcSafetyDeposit,
        };
    }

    public deployDst(
        /**
         * Immutables from SrcEscrowCreated event with complement applied
         */
        immutables: Sdk.Immutables
    ): TransactionRequest {
        return {
            to: this.dstAddress,
            data: this.iface.encodeFunctionData('deployDst', [immutables.build(), immutables.timeLocks.toSrcTimeLocks().privateCancellation]),
            value: immutables.safetyDeposit,
        };
    }

    public withdraw(side: 'src' | 'dst', escrow: Sdk.Address, secret: string, immutables: Sdk.Immutables): TransactionRequest {
        return {
            to: side === 'src' ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData('withdraw', [escrow.toString(), secret, immutables.build()]),
        };
    }

    public cancel(side: 'src' | 'dst', escrow: Sdk.Address, immutables: Sdk.Immutables): TransactionRequest {
        return {
            to: side === 'src' ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData('cancel', [escrow.toString(), immutables.build()]),
        };
    }
}
