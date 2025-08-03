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

## Development stages

1. ✅ testnets prepare

    ✅ sepolia and Arbitrum sepolia related 1inch conreact deployed

    ⚠️ Swap case testing swap usdc in sepolia to weth in arbitrum sepolia

2. 📋. Implement GhostMesh conract with 1inch cross-chain services

3. 📋. Show more complex strategies on-chian

## File structure explain

GhostMesh based on [cross-chain-resolver](https://github.com/1inch/cross-chain-resolver-example), try to deploy 1inch services in the testnets instead of forking mainnets.

-   [scripts](scripts) ghostMesh related scripts. includes on-chain development config and the scritps for deploying LOP, resolver contract,escrowFactory contract, along with the cross-chain test scripts. `yarn test:cross-chain`

-   [test](test) is the original cross-chain-resolver-example test code.

-   [custome-sdk-cross-chain](custome-sdk-cross-chain), To make the related config compitable with testnets, make some adjustmetns for developing, such as limited order address, escrowFactory... etc

-   [contracts/1inch](contracts/1inch), which includes the necessary original limited order contracts and cross-order contracts, for now, to compitable with cross-chain, only comment out the taker->maker logic in LOP. more details can see [limited order may not support cross-chain swap](https://github.com/sodexx7/cross-chain-privacy-strategies/issues/1)

-   [contracts/resolver](contracts/resolver), originated from [cross-chain-resolver](https://github.com/1inch/cross-chain-resolver-example), the logic involved with the resolver contract and escrowFactory contract in source and target chain

-   [contracts/ghostMesh](contracts/ghostMesh), the ghostMesh contract

## Latest on-chain txs

[sepolia swap 1000USDC -> 1 WETH](https://sepolia.etherscan.io/tx/0xb700c2b19354ed00b18e13bc497e1e4093ac22160d76af410efcb11fdf492374)

[sepolia.arbiscan](https://sepolia.arbiscan.io/tx/0xf72cad1036357b103f91b18ed3d0095818a3c983282a54952ad378d44608b0ee) **testing**

## HOW TO START

1. Environment

```
yarn -v 1.22.22
node v22.15.0
```

1. Deployed contracts in sepolia and Arbitrum sepolia chain

    1. [address-lop:sepolia](https://sepolia.etherscan.io/address/0xC04dADf6F30586bD15ecA92C5e8Bf7604e35C63E#code)
    2. [address-lop:arbitrum](https://sepolia.arbiscan.io/address/0xe9E8D21385686809c81A245B4cfC278362323DF2#code)
    3. [address-factory:sepolia](https://sepolia.etherscan.io/address/0x8A613AE9898979616FDE4f6e70B9372E0C88834b#code)
    4. [address-factory:arbitrum](https://sepolia.arbiscan.io/address/0xF6abe8D656CED251FA03E29C865BB2dEb9E9A203#code)
    5. [address-resolver:sepolia](https://sepolia.etherscan.io/address/0x0968bD1359E5025bF98861Df098Ea6be1A828A73#code)
    6. [address-resolver:arbitrum](https://sepolia.arbiscan.io/address/0xF81e2C3980CDbaD35DF8ce8d85BE46e238a68b17#code)
    7. [address-mockusdc:sepolia](https://sepolia.etherscan.io/address/0xE6B9EeFbb9665293f1dbF0449B7c645DC39De549)
    8. [address-mockweth:arbitrum](https://sepolia.arbiscan.io/address/0x522BBb1450d0e41EcEC8C9BC53b9c0fc1F3F9c87)

2. Deploy scripts

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
<!-- user swap 1000 mockusdc in sepolia for 1 mockweth arbitrum sepoliam, before exeucte make sure user and resolver have enough token -->
yarn test:cross-chain

```
