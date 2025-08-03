"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESCROW_FACTORY = exports.ESCROW_DST_IMPLEMENTATION = exports.ESCROW_SRC_IMPLEMENTATION = exports.TRUE_ERC20 = void 0;
const fusion_sdk_1 = require("@1inch/fusion-sdk");
const constant_1 = require("./cross-chain-order/constant");
const deploy_config_1 = require("./deploy-config");
// Below config should check
const TrueERC20 = new fusion_sdk_1.Address('0xda0000d4000015a526378bb6fafc650cea5966f8');
const ZKTrueERC20 = new fusion_sdk_1.Address('0xd66097c27eb8dee404bac235737932260edc6f3b');
exports.TRUE_ERC20 = {
    [constant_1.NetworkEnum.ETHEREUM]: TrueERC20,
    [constant_1.NetworkEnum.POLYGON]: TrueERC20,
    [constant_1.NetworkEnum.OPTIMISM]: TrueERC20,
    [constant_1.NetworkEnum.BINANCE]: TrueERC20,
    [constant_1.NetworkEnum.AVALANCHE]: TrueERC20,
    [constant_1.NetworkEnum.COINBASE]: TrueERC20,
    [constant_1.NetworkEnum.FANTOM]: TrueERC20,
    [constant_1.NetworkEnum.GNOSIS]: TrueERC20,
    [constant_1.NetworkEnum.ARBITRUM]: TrueERC20,
    [constant_1.NetworkEnum.ZKSYNC]: ZKTrueERC20,
    [constant_1.NetworkEnum.LINEA]: TrueERC20,
    [constant_1.NetworkEnum.SONIC]: TrueERC20,
    [constant_1.NetworkEnum.UNICHAIN]: TrueERC20,
    // Testnet chains
    [constant_1.NetworkEnum.ETHEREUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.sepolia.wrappedNative),
    [constant_1.NetworkEnum.ARBITRUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.arbTestnet.wrappedNative)
};
const ESCROW_FACTORY_ADDRESS = new fusion_sdk_1.Address('0xa7bcb4eac8964306f9e3764f67db6a7af6ddf99a');
const ESCROW_ZK_FACTORY_ADDRESS = new fusion_sdk_1.Address('0x584aeab186d81dbb52a8a14820c573480c3d4773');
const ESCROW_SRC_IMPLEMENTATION_ADDRESS = new fusion_sdk_1.Address('0xcd70bf33cfe59759851db21c83ea47b6b83bef6a');
const ESCROW_ZK_SRC_IMPLEMENTATION_ADDRESS = new fusion_sdk_1.Address('0xddc60c7babfc55d8030f51910b157e179f7a41fc');
const ESCROW_DST_IMPLEMENTATION_ADDRESS = new fusion_sdk_1.Address('0x9c3e06659f1c34f930ce97fcbce6e04ae88e535b');
const ESCROW_ZK_DST_IMPLEMENTATION_ADDRESS = new fusion_sdk_1.Address('0xdc4ccc2fc2475d0ed3fddd563c44f2bf6a3900c9');
exports.ESCROW_SRC_IMPLEMENTATION = {
    [constant_1.NetworkEnum.ETHEREUM]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.POLYGON]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.OPTIMISM]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.BINANCE]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.AVALANCHE]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.COINBASE]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.FANTOM]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.GNOSIS]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.ARBITRUM]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.ZKSYNC]: ESCROW_ZK_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.LINEA]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.SONIC]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.UNICHAIN]: ESCROW_SRC_IMPLEMENTATION_ADDRESS,
    // Testnet chains
    [constant_1.NetworkEnum.ETHEREUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.sepolia.resolver),
    [constant_1.NetworkEnum.ARBITRUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.arbTestnet.resolver)
};
exports.ESCROW_DST_IMPLEMENTATION = {
    [constant_1.NetworkEnum.ETHEREUM]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.POLYGON]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.OPTIMISM]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.BINANCE]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.AVALANCHE]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.COINBASE]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.FANTOM]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.GNOSIS]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.ARBITRUM]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.ZKSYNC]: ESCROW_ZK_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.LINEA]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.SONIC]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    [constant_1.NetworkEnum.UNICHAIN]: ESCROW_DST_IMPLEMENTATION_ADDRESS,
    // Testnet chains
    [constant_1.NetworkEnum.ETHEREUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.sepolia.resolver),
    [constant_1.NetworkEnum.ARBITRUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.arbTestnet.resolver)
};
exports.ESCROW_FACTORY = {
    [constant_1.NetworkEnum.ETHEREUM]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.POLYGON]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.OPTIMISM]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.BINANCE]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.AVALANCHE]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.COINBASE]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.FANTOM]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.GNOSIS]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.ARBITRUM]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.ZKSYNC]: ESCROW_ZK_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.LINEA]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.SONIC]: ESCROW_FACTORY_ADDRESS,
    [constant_1.NetworkEnum.UNICHAIN]: ESCROW_FACTORY_ADDRESS,
    // Testnet chains
    [constant_1.NetworkEnum.ETHEREUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.sepolia.escrowFactory),
    [constant_1.NetworkEnum.ARBITRUM_SEPOLIA]: new fusion_sdk_1.Address(deploy_config_1.testnetConfig.chains.arbTestnet.escrowFactory)
};
//# sourceMappingURL=deployments.js.map