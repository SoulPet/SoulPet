import {
    TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    getAssociatedTokenAddress,
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
    Connection,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
} from '@solana/web3.js';
import { TransactionError } from './error';

export interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    balance: number;
}

/**
 * Service for managing token operations
 */
export class TokenService {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Transfer tokens to another wallet
     * @param wallet Connected wallet instance
     * @param tokenAddress Token mint address
     * @param toAddress Recipient wallet address
     * @param amount Amount to transfer
     * @returns Transaction signature
     */
    async transferToken(
        wallet: WalletContextState,
        tokenAddress: string,
        toAddress: string,
        amount: number
    ): Promise<string> {
        try {
            if (!wallet.publicKey) {
                throw new Error('Wallet not connected');
            }

            const mintPubkey = new PublicKey(tokenAddress);
            const toPubkey = new PublicKey(toAddress);

            // Get source token account
            const fromTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                wallet.publicKey
            );

            // Get destination token account
            const toTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                toPubkey
            );

            // Check if destination token account exists
            const toAccountInfo =
                await this.connection.getAccountInfo(toTokenAccount);

            const transaction = new Transaction();

            // Create destination token account if it doesn't exist
            if (!toAccountInfo) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        toTokenAccount,
                        toPubkey,
                        mintPubkey
                    )
                );
            }

            // Add transfer instruction
            transaction.add(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    wallet.publicKey,
                    amount,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            // Sign and send transaction
            const signature = await wallet.sendTransaction(
                transaction,
                this.connection
            );

            // Confirm transaction
            await this.connection.confirmTransaction(signature, 'confirmed');

            return signature;
        } catch (error) {
            console.error('Failed to transfer token:', error);
            throw new TransactionError('Failed to transfer token', 'transfer-failed');
        }
    }

    /**
     * Transfer SOL to another wallet
     * @param wallet Connected wallet instance
     * @param toAddress Recipient wallet address
     * @param amount Amount in SOL
     * @returns Transaction signature
     */
    async transferSOL(
        wallet: WalletContextState,
        toAddress: string,
        amount: number
    ): Promise<string> {
        try {
            if (!wallet.publicKey) {
                throw new Error('Wallet not connected');
            }

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new PublicKey(toAddress),
                    lamports: amount * LAMPORTS_PER_SOL,
                })
            );

            const signature = await wallet.sendTransaction(
                transaction,
                this.connection
            );
            await this.connection.confirmTransaction(signature, 'confirmed');

            return signature;
        } catch (error) {
            console.error('Failed to transfer SOL:', error);
            throw new TransactionError('Failed to transfer SOL', 'transfer-failed');
        }
    }

    /**
     * Get token balance for a wallet
     * @param walletAddress Wallet address
     * @param tokenAddress Token mint address
     * @returns Token balance
     */
    async getTokenBalance(
        walletAddress: string,
        tokenAddress: string
    ): Promise<number> {
        try {
            const mintPubkey = new PublicKey(tokenAddress);
            const walletPubkey = new PublicKey(walletAddress);

            const tokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                walletPubkey
            );

            const accountInfo = await this.connection.getAccountInfo(tokenAccount);
            if (!accountInfo) {
                return 0;
            }

            const balance =
                await this.connection.getTokenAccountBalance(tokenAccount);
            return (
                Number(balance.value.amount) / Math.pow(10, balance.value.decimals)
            );
        } catch (error) {
            console.error('Failed to get token balance:', error);
            return 0;
        }
    }

    /**
     * Get SOL balance for a wallet
     * @param walletAddress Wallet address
     * @returns SOL balance
     */
    async getSOLBalance(walletAddress: string): Promise<number> {
        try {
            const balance = await this.connection.getBalance(
                new PublicKey(walletAddress)
            );
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Failed to get SOL balance:', error);
            return 0;
        }
    }

    /**
     * Get all token balances for a wallet
     * @param walletAddress Wallet address
     * @returns Array of token information
     */
    async getTokenBalances(walletAddress: string): Promise<TokenInfo[]> {
        try {
            const walletPubkey = new PublicKey(walletAddress);
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                walletPubkey,
                { programId: TOKEN_PROGRAM_ID }
            );

            return tokenAccounts.value.map((account) => {
                const { mint, tokenAmount } = account.account.data.parsed.info;
                return {
                    address: mint,
                    symbol: '', // TODO: Fetch token metadata
                    decimals: tokenAmount.decimals,
                    balance:
                        Number(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals),
                };
            });
        } catch (error) {
            console.error('Failed to get token balances:', error);
            return [];
        }
    }
}
