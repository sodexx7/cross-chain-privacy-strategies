// This file should keep sync with local environment
import 'dotenv/config'
import {z} from 'zod'

const ConfigSchema = z.object({
    DEPLOYER_PRIVATE_KEY: z.string().min(1),
    USER_PRIVATE_KEY: z.string().min(1),
    RESOLVER_PRIVATE_KEY: z.string().min(1),
    ETHEREUM_SEPOLIA_RPC_URL: z.string().url(),
    ARBITRUM_SEPOLIA_RPC_URL: z.string().url()
})

const fromEnv = ConfigSchema.parse(process.env)

export interface ChainDeployConfig {
    chainId: number
    name: string
    rpcUrl: string
    limitOrderProtocol: string
    escrowFactory: string
    resolver: string
    wrappedNative: string
    mockUSDC: string
    mockWETH: string
}

export const testnetConfig = {
    deployerPrivateKey: fromEnv.DEPLOYER_PRIVATE_KEY,
    userPrivateKey: fromEnv.USER_PRIVATE_KEY,
    resolverPrivateKey: fromEnv.RESOLVER_PRIVATE_KEY,

    chains: {
        sepolia: {
            chainId: 11155111,
            name: 'Ethereum Sepolia',
            rpcUrl: fromEnv.ETHEREUM_SEPOLIA_RPC_URL,
            limitOrderProtocol: '0xC04dADf6F30586bD15ecA92C5e8Bf7604e35C63E',
            escrowFactory: '0x8A613AE9898979616FDE4f6e70B9372E0C88834b',
            resolver: '0x8785E6Fb819cae9b59A38781aeb0ec76458Bd082', // Sepolia
            wrappedNative: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // WETH on Sepolia
            mockUSDC: '0xE6B9EeFbb9665293f1dbF0449B7c645DC39De549'
        } as ChainDeployConfig,

        arbTestnet: {
            chainId: 421614,
            name: 'Arbitrum Sepolia',
            rpcUrl: fromEnv.ARBITRUM_SEPOLIA_RPC_URL,
            limitOrderProtocol: '0xe9E8D21385686809c81A245B4cfC278362323DF2',
            escrowFactory: '0xF6abe8D656CED251FA03E29C865BB2dEb9E9A203',
            resolver: '0x1A328ddC7FaE7B25F7DBe4f56D6591BabA4a6DE7', // Arbitrum Sepolia
            wrappedNative: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // WETH on Arbitrum Sepolia
            mockWETH: '0x522BBb1450d0e41EcEC8C9BC53b9c0fc1F3F9c87'
        } as ChainDeployConfig
    }
}
