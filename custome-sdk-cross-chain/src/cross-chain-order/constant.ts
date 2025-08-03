import {testnetConfig} from '../deploy-config'

export const ZX = '0x'

export enum NetworkEnum {
    ETHEREUM = 1,
    POLYGON = 137,
    ZKSYNC = 324,
    BINANCE = 56,
    ARBITRUM = 42161,
    AVALANCHE = 43114,
    OPTIMISM = 10,
    FANTOM = 250,
    GNOSIS = 100,
    COINBASE = 8453,
    LINEA = 59144,
    SONIC = 146,
    UNICHAIN = 130,

    ETHEREUM_SEPOLIA = testnetConfig.chains.sepolia.chainId,
    ARBITRUM_SEPOLIA = testnetConfig.chains.arbTestnet.chainId
}

// Add testnet chain IDs
export enum TestnetChainId {}

// Default limit order protocol address (mainnet)
export const ONE_INCH_LIMIT_ORDER_V4 =
    testnetConfig.chains.sepolia.limitOrderProtocol

// Check if chain is supported
export const isSupportedChain = (chainId: number): boolean => {
    return Object.values(NetworkEnum).includes(chainId)
}

export const UINT_160_MAX: bigint = 2n ** 160n - 1n
export const UINT_16_MAX: bigint = 2n ** 16n - 1n
export const UINT_80_MAX: bigint = 2n ** 80n - 1n
export const UINT_40_MAX: bigint = 2n ** 40n - 1n
export const UINT_32_MAX: bigint = 2n ** 32n - 1n
export const UINT_24_MAX: bigint = 2n ** 24n - 1n
export const UINT_256_MAX: bigint = 2n ** 256n - 1n
