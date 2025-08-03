import { ethers } from 'ethers';
import { testnetConfig } from './deploy-config';
import limitOrderProtocolContract from '../artifacts/contracts/1inch/limited_order/contracts/LimitOrderProtocol.sol/LimitOrderProtocol.json';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function verifyContract(contractAddress: string, constructorArgs: any[], networkName: string) {
    console.log(`Verifying contract at ${contractAddress}...`);

    const argsString = constructorArgs.map(arg => `"${arg}"`).join(' ');
    const networkFlag = networkName.toLowerCase().includes('arbitrum')
        ? '--network arbitrumSepolia'
        : networkName.toLowerCase().includes('sepolia')
        ? '--network sepolia'
        : '';

    const command = `npx hardhat verify ${networkFlag} ${contractAddress} ${argsString}`;

    console.log(`Running: ${command}`);

    try {
        const { stdout, stderr } = await execAsync(command);
        if (stdout) console.log('Verification output:', stdout);
        if (stderr) console.log('Verification stderr:', stderr);

        if (stdout.includes('Successfully verified') || stdout.includes('Already verified')) {
            console.log('✅ Contract verified successfully on block explorer');
        } else {
            console.log('⚠️ Verification may have failed - check output above');
        }
    } catch (error: any) {
        if (error.message.includes('Already verified')) {
            console.log('✅ Contract already verified on block explorer');
        } else {
            throw error;
        }
    }
}

async function deployLimitOrderProtocol(chainName: keyof typeof testnetConfig.chains) {
    const chainConfig = testnetConfig.chains[chainName];

    if (!chainConfig) {
        throw new Error(`Chain configuration not found for: ${chainName}`);
    }

    console.log(`\n=== Deploying LimitOrderProtocol on ${chainConfig.name} ===`);
    console.log(`Chain ID: ${chainConfig.chainId}`);
    console.log(`RPC URL: ${chainConfig.rpcUrl}`);

    // Setup provider and signer
    const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    const deployer = new ethers.Wallet(testnetConfig.deployerPrivateKey, provider);

    console.log(`Deployer address: ${deployer.address}`);

    // Check deployer balance
    const balance = await provider.getBalance(deployer.address);
    console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.01')) {
        throw new Error('Insufficient balance for deployment. Need at least 0.01 ETH');
    }

    // Deploy LimitOrderProtocol with WETH parameter
    const deployParams = [
        chainConfig.wrappedNative, // WETH address
    ];

    console.log(`\nDeploying with parameters:`);
    console.log(`- WETH address: ${deployParams[0]}`);

    const factory = new ethers.ContractFactory(limitOrderProtocolContract.abi, limitOrderProtocolContract.bytecode, deployer);

    console.log(`\nDeploying LimitOrderProtocol contract...`);
    const limitOrderProtocol = await factory.deploy(...deployParams);

    console.log(`Transaction hash: ${limitOrderProtocol.deploymentTransaction()?.hash}`);
    console.log(`Waiting for deployment confirmation...`);

    await limitOrderProtocol.waitForDeployment();

    const address = await limitOrderProtocol.getAddress();
    console.log(`\n✅ LimitOrderProtocol deployed to: ${address}`);

    // Verify deployment by calling a view function
    try {
        const contract = limitOrderProtocol as any;
        const domainSeparator = await contract.DOMAIN_SEPARATOR();
        console.log(`✅ Contract verification successful - Domain Separator: ${domainSeparator}`);
    } catch (error) {
        console.warn(`⚠️ Contract verification failed:`, error);
    }

    // Verify contract on block explorer
    if (process.env.VERIFY_CONTRACT !== 'false') {
        console.log(`\n🔍 Verifying contract on block explorer...`);
        try {
            await verifyContract(address, deployParams, chainConfig.name);
        } catch (error) {
            console.warn(`⚠️ Block explorer verification failed:`, error);
        }
    } else {
        console.log(`\n⏭️ Skipping contract verification (VERIFY_CONTRACT=false)`);
    }

    // Save deployment info
    const deploymentInfo = {
        network: chainConfig.name,
        chainId: chainConfig.chainId,
        contractName: 'LimitOrderProtocol',
        address: address,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        constructorArgs: deployParams,
        transactionHash: limitOrderProtocol.deploymentTransaction()?.hash,
    };

    console.log(`\nDeployment Summary:`);
    console.log(JSON.stringify(deploymentInfo, null, 2));

    return deploymentInfo;
}

// Main execution
async function main() {
    const chainName = (process.env.CHAIN_NAME || process.argv[2]) as keyof typeof testnetConfig.chains;

    if (!chainName) {
        console.log('Usage: CHAIN_NAME=<chainName> ts-node scripts/deploy-lop.ts');
        console.log('Available chains:', Object.keys(testnetConfig.chains).join(', '));
        console.log('\nExample:');
        console.log('  CHAIN_NAME=sepolia ts-node scripts/deploy-lop.ts');
        console.log('  CHAIN_NAME=arbTestnet ts-node scripts/deploy-lop.ts');
        console.log('\nOr use yarn scripts:');
        console.log('  yarn deploy:lop:sepolia');
        console.log('  yarn deploy:lop:arbitrum');
        process.exit(1);
    }

    if (!testnetConfig.chains[chainName]) {
        console.error(`Invalid chain name: ${chainName}`);
        console.log('Available chains:', Object.keys(testnetConfig.chains).join(', '));
        process.exit(1);
    }

    try {
        await deployLimitOrderProtocol(chainName);
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(error);
        process.exit(1);
    });
}

export { deployLimitOrderProtocol };
