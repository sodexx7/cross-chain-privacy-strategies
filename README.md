# GhostMesh

## Market situation

As on-chain finance continues to grow, a diverse landscape of decentralized financial products is rapidly emerging across multiple blockchain ecosystems. Despite the inherent transparency of blockchain technology, there is a strong and rising demand—particularly from professional traders and institutional participants—for solutions that deliver greater operational convenience, robust security, and enhanced privacy.

Users are increasingly looking for ways to streamline complex on-chain operations, securely engage across multiple networks, and tap into cross-chain liquidity and protocol access without compromising the confidentiality of their strategies or exposing themselves to risks like front-running.

In response to these challenges, our protocol integrates with 1inch’s Limit Order functionality and cross-chain infrastructure, leveraging the platform’s flexibility to help users efficiently navigate on-chain opportunities across various ecosystems. By doing so, we enable seamless interaction with liquidity pools and DeFi protocols across chains, while our native privacy-preserving architecture ensures that sensitive trading behavior remains protected. This combination not only enhances user experience and execution efficiency but also strengthens the overall security and trustworthiness of professional on-chain activity.

## Project features

1. Cross-Chain Strategy Execution:
   By leveraging the flexibility of 1inch’s infrastructure, our protocol enables users to implement customized cross-chain strategies through a single, automated transaction. Beyond simple asset swaps, users can define complex workflows—such as arbitrage, rebalancing, or liquidity migration—executed seamlessly across multiple blockchains without manual intervention.

2. Privacy-Preserving Operations:
   Our built-in privacy layer ensures that every operation—whether a trade, transfer, or strategy execution—remains confidential. This protects sensitive strategy data from being exposed on-chain, helping users maintain a competitive edge and shielding them from front-running or other forms of adversarial analysis.

## how to start

1. Prepare
   deployed limited order contract and EscrowFactory to sepolia and Arbitrum sepolia chain

```
yarn deploy:lop:sepolia
yarn deploy:lop:arbitrum
yarn deploy:factory:sepolia
yarn deploy:factory:arbitrum
yarn deploy:factory:arbitrum
deploy:resolver:sepolia
deploy:resolver:arbitrum
yarn setup:mock-tokens
yarn mint:mock-tokens
<!-- user swap 1000 mockusdc in sepolia for 1 mockweht arbitrum sepoliam, before exeucte make sure
user and resolver have enough token -->
yarn test:cross-chain

```

1. [address-lop:sepolia](https://sepolia.etherscan.io/address/0xC04dADf6F30586bD15ecA92C5e8Bf7604e35C63E#code)
2. [address-lop:arbitrum](https://sepolia.arbiscan.io/address/0xe9E8D21385686809c81A245B4cfC278362323DF2#code)
3. [address-factory:sepolia](https://sepolia.etherscan.io/address/0x8A613AE9898979616FDE4f6e70B9372E0C88834b#code)
4. [address-factory:arbitrum](https://sepolia.arbiscan.io/address/0xF6abe8D656CED251FA03E29C865BB2dEb9E9A203#code)
5. [address-resolver:sepolia](https://sepolia.etherscan.io/address/0x0968bD1359E5025bF98861Df098Ea6be1A828A73#code)
6. [address-resolver:arbitrum](https://sepolia.arbiscan.io/address/0xF81e2C3980CDbaD35DF8ce8d85BE46e238a68b17#code)
7. [address-mockusdc:sepolia](https://sepolia.etherscan.io/address/0xE6B9EeFbb9665293f1dbF0449B7c645DC39De549)
8. [address-mockweth:arbitrum](https://sepolia.arbiscan.io/address/0x522BBb1450d0e41EcEC8C9BC53b9c0fc1F3F9c87)

```
yarn -v 1.22.22
node v22.15.0


```

```
yarn install
yarn test
```

Based on [cross-chain-resolver](https://github.com/1inch/cross-chain-resolver-example)
