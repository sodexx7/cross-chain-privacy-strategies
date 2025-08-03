import {NetworkEnum} from './cross-chain-order/constant'

import {TupleToUnion} from './type-utils'

export const SupportedChains = [
    NetworkEnum.ETHEREUM,
    NetworkEnum.POLYGON,
    NetworkEnum.BINANCE,
    NetworkEnum.OPTIMISM,
    NetworkEnum.ARBITRUM,
    NetworkEnum.AVALANCHE,
    NetworkEnum.GNOSIS,
    NetworkEnum.COINBASE,
    NetworkEnum.ZKSYNC,
    NetworkEnum.LINEA,
    NetworkEnum.SONIC,
    NetworkEnum.UNICHAIN,

    // Testnet chains
    NetworkEnum.ETHEREUM_SEPOLIA,
    NetworkEnum.ARBITRUM_SEPOLIA
] as const

export type SupportedChain = TupleToUnion<typeof SupportedChains>

export const isSupportedChain = (chain: unknown): chain is SupportedChain =>
    SupportedChains.includes(chain as number)

export const isMainnetChain = (chainId: number): boolean => {
    return Object.values(NetworkEnum).includes(chainId as NetworkEnum)
}
