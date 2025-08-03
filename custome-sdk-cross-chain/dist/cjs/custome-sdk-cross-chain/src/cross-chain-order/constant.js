"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UINT_256_MAX = exports.UINT_24_MAX = exports.UINT_32_MAX = exports.UINT_40_MAX = exports.UINT_80_MAX = exports.UINT_16_MAX = exports.UINT_160_MAX = exports.isSupportedChain = exports.ONE_INCH_LIMIT_ORDER_V4 = exports.TestnetChainId = exports.NetworkEnum = exports.ZX = void 0;
const deploy_config_1 = require("./deploy-config");
exports.ZX = '0x';
var NetworkEnum;
(function (NetworkEnum) {
    NetworkEnum[NetworkEnum["ETHEREUM"] = 1] = "ETHEREUM";
    NetworkEnum[NetworkEnum["POLYGON"] = 137] = "POLYGON";
    NetworkEnum[NetworkEnum["ZKSYNC"] = 324] = "ZKSYNC";
    NetworkEnum[NetworkEnum["BINANCE"] = 56] = "BINANCE";
    NetworkEnum[NetworkEnum["ARBITRUM"] = 42161] = "ARBITRUM";
    NetworkEnum[NetworkEnum["AVALANCHE"] = 43114] = "AVALANCHE";
    NetworkEnum[NetworkEnum["OPTIMISM"] = 10] = "OPTIMISM";
    NetworkEnum[NetworkEnum["FANTOM"] = 250] = "FANTOM";
    NetworkEnum[NetworkEnum["GNOSIS"] = 100] = "GNOSIS";
    NetworkEnum[NetworkEnum["COINBASE"] = 8453] = "COINBASE";
    NetworkEnum[NetworkEnum["LINEA"] = 59144] = "LINEA";
    NetworkEnum[NetworkEnum["SONIC"] = 146] = "SONIC";
    NetworkEnum[NetworkEnum["UNICHAIN"] = 130] = "UNICHAIN";
    NetworkEnum[NetworkEnum["ETHEREUM_SEPOLIA"] = 11155111] = "ETHEREUM_SEPOLIA";
    NetworkEnum[NetworkEnum["ARBITRUM_SEPOLIA"] = 421614] = "ARBITRUM_SEPOLIA";
})(NetworkEnum || (exports.NetworkEnum = NetworkEnum = {}));
// Add testnet chain IDs
var TestnetChainId;
(function (TestnetChainId) {
})(TestnetChainId || (exports.TestnetChainId = TestnetChainId = {}));
// Default limit order protocol address (mainnet)
exports.ONE_INCH_LIMIT_ORDER_V4 = deploy_config_1.testnetConfig.chains.sepolia.limitOrderProtocol;
// Check if chain is supported
const isSupportedChain = (chainId) => {
    return Object.values(NetworkEnum).includes(chainId);
};
exports.isSupportedChain = isSupportedChain;
exports.UINT_160_MAX = 2n ** 160n - 1n;
exports.UINT_16_MAX = 2n ** 16n - 1n;
exports.UINT_80_MAX = 2n ** 80n - 1n;
exports.UINT_40_MAX = 2n ** 40n - 1n;
exports.UINT_32_MAX = 2n ** 32n - 1n;
exports.UINT_24_MAX = 2n ** 24n - 1n;
exports.UINT_256_MAX = 2n ** 256n - 1n;
//# sourceMappingURL=constant.js.map