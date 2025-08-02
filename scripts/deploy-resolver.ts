import 'dotenv/config';
import { ethers, computeAddress } from 'ethers';
import { testnetConfig } from './deploy-config';
import resolverContract from '../artifacts/contracts/resolver/Resolver.sol/Resolver.json';

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Private key for the resolver owner from environment variables
const resolverOwnerPk = process.env.RESOLVER_PRIVATE_KEY;

if (!resolverOwnerPk) {
    throw new Error('RESOLVER_PRIVATE_KEY environment variable is required');
}

// Ensure private key has 0x prefix
const formattedResolverOwnerPk = resolverOwnerPk.startsWith('0x') ? resolverOwnerPk : `0x${resolverOwnerPk}`;

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

async function deployResolver(chainName: keyof typeof testnetConfig.chains) {
    const chainConfig = testnetConfig.chains[chainName];

    if (!chainConfig) {
        throw new Error(`Chain configuration not found for: ${chainName}`);
    }

    console.log(`\n=== Deploying Resolver on ${chainConfig.name} ===`);
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

    // Get the known EscrowFactory and LimitOrderProtocol addresses
    const escrowFactoryAddress = getEscrowFactoryAddress(chainName);
    const limitOrderProtocolAddress = getLimitOrderProtocolAddress(chainName);

    // Compute resolver owner address from private key
    const resolverOwnerAddress = computeAddress(formattedResolverOwnerPk);

    // Deploy Resolver with required parameters
    const deployParams = [
        escrowFactoryAddress, // escrowFactory
        limitOrderProtocolAddress, // limitOrderProtocol
        resolverOwnerAddress, // owner (resolver address)
    ];

    console.log(`\nDeploying with parameters:`);
    console.log(`- EscrowFactory address: ${deployParams[0]}`);
    console.log(`- LimitOrderProtocol address: ${deployParams[1]}`);
    console.log(`- Resolver owner address: ${deployParams[2]}`);

    const factory = new ethers.ContractFactory(resolverContract.abi, resolverContract.bytecode, deployer);

    console.log(`\nDeploying Resolver contract...`);
    const resolver = await factory.deploy(...deployParams);

    console.log(`Transaction hash: ${resolver.deploymentTransaction()?.hash}`);
    console.log(`Waiting for deployment confirmation...`);

    await resolver.waitForDeployment();

    const address = await resolver.getAddress();
    console.log(`\n✅ Resolver deployed to: ${address}`);

    // Verify deployment by calling a view function
    try {
        const contract = resolver as any;
        const owner = await contract.owner();
        console.log(`✅ Contract verification successful - Owner: ${owner}`);

        const escrowFactory = await contract.escrowFactory();
        const limitOrderProtocol = await contract.limitOrderProtocol();
        console.log(`✅ EscrowFactory set to: ${escrowFactory}`);
        console.log(`✅ LimitOrderProtocol set to: ${limitOrderProtocol}`);
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
        contractName: 'Resolver',
        address: address,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        constructorArgs: deployParams,
        transactionHash: resolver.deploymentTransaction()?.hash,
    };

    console.log(`\nDeployment Summary:`);
    console.log(JSON.stringify(deploymentInfo, null, 2));

    return deploymentInfo;
}

function getEscrowFactoryAddress(chainName: keyof typeof testnetConfig.chains): string {
    const addresses = {
        sepolia: '0xa3D3ec93ec51Ee02AD04ae176ED9d0b32e469491',
        arbTestnet: '0xBF5F3c3aB8c9B9102EDD73C535ddAaCce3191B34',
    };

    const address = addresses[chainName];
    if (!address) {
        throw new Error(`EscrowFactory address not found for chain: ${chainName}`);
    }

    return address;
}

function getLimitOrderProtocolAddress(chainName: keyof typeof testnetConfig.chains): string {
    const addresses = {
        sepolia: '0x5E3CE1C16004d5b70305191C4bdCc61f151B40e5',
        arbTestnet: '0xB6A11d4b7Ede8aB816277B5080615DCC52Cc1B3F',
    };

    const address = addresses[chainName];
    if (!address) {
        throw new Error(`LimitOrderProtocol address not found for chain: ${chainName}`);
    }

    return address;
}

// Main execution
async function main() {
    const chainName = (process.env.CHAIN_NAME || process.argv[2]) as keyof typeof testnetConfig.chains;

    if (!chainName) {
        console.log('Usage: CHAIN_NAME=<chainName> ts-node scripts/deploy-resolver.ts');
        console.log('Available chains:', Object.keys(testnetConfig.chains).join(', '));
        console.log('\nExample:');
        console.log('  CHAIN_NAME=sepolia ts-node scripts/deploy-resolver.ts');
        console.log('  CHAIN_NAME=arbTestnet ts-node scripts/deploy-resolver.ts');
        console.log('\nOr use yarn scripts:');
        console.log('  yarn deploy:resolver:sepolia');
        console.log('  yarn deploy:resolver:arbitrum');
        process.exit(1);
    }

    if (!testnetConfig.chains[chainName]) {
        console.error(`Invalid chain name: ${chainName}`);
        console.log('Available chains:', Object.keys(testnetConfig.chains).join(', '));
        process.exit(1);
    }

    try {
        await deployResolver(chainName);
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

export { deployResolver };
