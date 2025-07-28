import "dotenv/config";
import { z } from "zod";

const ConfigSchema = z.object({
  DEPLOYER_PRIVATE_KEY: z.string().min(1),
  USER_PRIVATE_KEY: z.string().min(1),
  RESOLVER_PRIVATE_KEY: z.string().min(1),
  ETHEREUM_SEPOLIA_RPC_URL: z.string().url(),
  ARBITRUM_SEPOLIA_RPC_URL: z.string().url(),
});

const fromEnv = ConfigSchema.parse(process.env);

export interface ChainDeployConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  limitOrderProtocol: string;
  wrappedNative: string;
  mockUSDC?: string;
  mockWETH?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export const testnetConfig = {
  deployerPrivateKey: fromEnv.DEPLOYER_PRIVATE_KEY,
  userPrivateKey: fromEnv.USER_PRIVATE_KEY,
  resolverPrivateKey: fromEnv.RESOLVER_PRIVATE_KEY,

  chains: {
    sepolia: {
      chainId: 11155111,
      name: "Ethereum Sepolia",
      rpcUrl: fromEnv.ETHEREUM_SEPOLIA_RPC_URL,
      limitOrderProtocol: "0x5E3CE1C16004d5b70305191C4bdCc61f151B40e5",
      wrappedNative: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH on Sepolia
      mockUSDC: "0xE6B9EeFbb9665293f1dbF0449B7c645DC39De549",
    } as ChainDeployConfig,

    arbTestnet: {
      chainId: 421614,
      name: "Arbitrum Sepolia",
      rpcUrl: fromEnv.ARBITRUM_SEPOLIA_RPC_URL,
      limitOrderProtocol: "0xB6A11d4b7Ede8aB816277B5080615DCC52Cc1B3F",
      wrappedNative: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73", // WETH on Arbitrum Sepolia
      mockWETH: "0x522BBb1450d0e41EcEC8C9BC53b9c0fc1F3F9c87",
    } as ChainDeployConfig,
  },
};
