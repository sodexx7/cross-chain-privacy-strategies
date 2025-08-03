import 'dotenv/config';
export interface ChainDeployConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    limitOrderProtocol: string;
    escrowFactory: string;
    resolver: string;
    wrappedNative: string;
    mockUSDC: string;
    mockWETH: string;
}
export declare const testnetConfig: {
    deployerPrivateKey: string;
    userPrivateKey: string;
    resolverPrivateKey: string;
    chains: {
        sepolia: ChainDeployConfig;
        arbTestnet: ChainDeployConfig;
    };
};
