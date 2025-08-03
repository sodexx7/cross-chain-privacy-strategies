"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMainnetChain = exports.isSupportedChain = exports.SupportedChains = void 0;
const constant_1 = require("./cross-chain-order/constant");
exports.SupportedChains = [
    constant_1.NetworkEnum.ETHEREUM,
    constant_1.NetworkEnum.POLYGON,
    constant_1.NetworkEnum.BINANCE,
    constant_1.NetworkEnum.OPTIMISM,
    constant_1.NetworkEnum.ARBITRUM,
    constant_1.NetworkEnum.AVALANCHE,
    constant_1.NetworkEnum.GNOSIS,
    constant_1.NetworkEnum.COINBASE,
    constant_1.NetworkEnum.ZKSYNC,
    constant_1.NetworkEnum.LINEA,
    constant_1.NetworkEnum.SONIC,
    constant_1.NetworkEnum.UNICHAIN,
    // Testnet chains
    constant_1.NetworkEnum.ETHEREUM_SEPOLIA,
    constant_1.NetworkEnum.ARBITRUM_SEPOLIA
];
const isSupportedChain = (chain) => exports.SupportedChains.includes(chain);
exports.isSupportedChain = isSupportedChain;
const isMainnetChain = (chainId) => {
    return Object.values(constant_1.NetworkEnum).includes(chainId);
};
exports.isMainnetChain = isMainnetChain;
//# sourceMappingURL=chains.js.map