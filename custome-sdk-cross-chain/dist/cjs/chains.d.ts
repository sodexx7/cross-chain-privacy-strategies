import { NetworkEnum } from './cross-chain-order/constant';
import { TupleToUnion } from './type-utils';
export declare const SupportedChains: readonly [NetworkEnum.ETHEREUM, NetworkEnum.POLYGON, NetworkEnum.BINANCE, NetworkEnum.OPTIMISM, NetworkEnum.ARBITRUM, NetworkEnum.AVALANCHE, NetworkEnum.GNOSIS, NetworkEnum.COINBASE, NetworkEnum.ZKSYNC, NetworkEnum.LINEA, NetworkEnum.SONIC, NetworkEnum.UNICHAIN, NetworkEnum.ETHEREUM_SEPOLIA, NetworkEnum.ARBITRUM_SEPOLIA];
export type SupportedChain = TupleToUnion<typeof SupportedChains>;
export declare const isSupportedChain: (chain: unknown) => chain is SupportedChain;
export declare const isMainnetChain: (chainId: number) => boolean;
