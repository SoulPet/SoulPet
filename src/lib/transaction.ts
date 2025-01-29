import {
    Connection,
    LAMPORTS_PER_SOL,
    ParsedTransactionWithMeta,
    PublicKey,
    SendOptions,
    SystemProgram,
    Transaction,
} from '@solana/web3.js'
import { TransactionError } from './error'
import { WalletAdapter, WalletNotConnectedError } from './wallet'

export interface TransactionOptions extends SendOptions {
    commitment?: 'processed' | 'confirmed' | 'finalized'
}

export interface TransactionHistory {
    signature: string
    timestamp: number
    type: 'mint' | 'transfer' | 'burn' | 'unknown'
    status: 'success' | 'failure'
    from?: string
    to?: string
    mintAddress?: string
    error?: string
}

export class TransactionService {
    private connection: Connection

    constructor(endpoint: string) {
        this.connection = new Connection(endpoint)
    }

    async getBalance(publicKey: PublicKey): Promise<number> {
        const balance = await this.connection.getBalance(publicKey)
        return balance / LAMPORTS_PER_SOL
    }

    async transfer(
        wallet: WalletAdapter,
        to: string,
        amount: number,
        options?: TransactionOptions
    ): Promise<string> {
        if (!wallet.publicKey) {
            throw new WalletNotConnectedError()
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: new PublicKey(to),
                lamports: amount * LAMPORTS_PER_SOL,
            })
        )

        try {
            const { blockhash } = await this.connection.getLatestBlockhash()
            transaction.recentBlockhash = blockhash
            transaction.feePayer = wallet.publicKey

            const signedTx = await wallet.signTransaction(transaction)
            const signature = await this.connection.sendRawTransaction(
                signedTx.serialize(),
                options
            )

            if (options?.commitment) {
                await this.connection.confirmTransaction(signature, options.commitment)
            }

            return signature
        } catch (error: any) {
            throw new Error(`Failed to send transaction: ${error?.message}`)
        }
    }

    async getTransaction(signature: string) {
        try {
            return await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
            })
        } catch (error: any) {
            throw new Error(`Failed to get transaction: ${error?.message}`)
        }
    }

    async getRecentTransactions(publicKey: PublicKey, limit = 10) {
        try {
            const signatures = await this.connection.getSignaturesForAddress(
                publicKey,
                { limit }
            )
            return Promise.all(
                signatures.map((sig) => this.getTransaction(sig.signature))
            )
        } catch (error: any) {
            throw new Error(`Failed to get recent transactions: ${error?.message}`)
        }
    }

    async requestAirdrop(
        publicKey: PublicKey,
        amount: number,
        options?: TransactionOptions
    ): Promise<string> {
        try {
            const signature = await this.connection.requestAirdrop(
                publicKey,
                amount * LAMPORTS_PER_SOL
            )

            if (options?.commitment) {
                await this.connection.confirmTransaction(signature, options.commitment)
            }

            return signature
        } catch (error: any) {
            throw new Error(`Failed to request airdrop: ${error?.message}`)
        }
    }

    async getTransactionHistory(
        address: string,
        limit: number = 50
    ): Promise<TransactionHistory[]> {
        try {
            const publicKey = new PublicKey(address)
            const signatures = await this.connection.getSignaturesForAddress(
                publicKey,
                { limit }
            )

            const transactions = await Promise.all(
                signatures.map(async (sig) => {
                    try {
                        const tx = await this.connection.getParsedTransaction(
                            sig.signature
                        )
                        return this.parseTransaction(tx, sig.signature)
                    } catch (error) {
                        console.error(
                            `Failed to fetch transaction ${sig.signature}:`,
                            error
                        )
                        return null
                    }
                })
            )

            return transactions.filter(
                (tx): tx is TransactionHistory => tx !== null
            )
        } catch (error: any) {
            throw new TransactionError(
                `Failed to fetch transaction history: ${error.message}`,
                'fetch-failed'
            )
        }
    }

    private parseTransaction(
        tx: ParsedTransactionWithMeta | null,
        signature: string
    ): TransactionHistory | null {
        if (!tx || !tx.meta) return null

        const timestamp = tx.blockTime ? tx.blockTime * 1000 : Date.now()
        const status = tx.meta.err ? 'failure' : 'success'
        const error = tx.meta.err ? JSON.stringify(tx.meta.err) : undefined

        // Try to determine transaction type and extract relevant information
        const history: TransactionHistory = {
            signature,
            timestamp,
            type: 'unknown',
            status,
            error,
        }

        if (!tx.meta.postTokenBalances || !tx.meta.preTokenBalances) {
            return history
        }

        // Check for token transfers
        const tokenChanges = tx.meta.postTokenBalances.filter((post) => {
            const pre = tx.meta!.preTokenBalances.find(
                (p) => p.accountIndex === post.accountIndex
            )
            return pre && pre.owner !== post.owner
        })

        if (tokenChanges.length > 0) {
            const change = tokenChanges[0]
            const pre = tx.meta.preTokenBalances.find(
                (p) => p.accountIndex === change.accountIndex
            )

            history.type = 'transfer'
            history.from = pre?.owner
            history.to = change.owner
            history.mintAddress = change.mint
        }

        // Check for mints (new token account with no previous balance)
        const mints = tx.meta.postTokenBalances.filter(
            (post) =>
                !tx.meta!.preTokenBalances.some(
                    (pre) => pre.accountIndex === post.accountIndex
                )
        )

        if (mints.length > 0) {
            history.type = 'mint'
            history.to = mints[0].owner
            history.mintAddress = mints[0].mint
        }

        // Check for burns (token account with no post balance)
        const burns = tx.meta.preTokenBalances.filter(
            (pre) =>
                !tx.meta!.postTokenBalances.some(
                    (post) => post.accountIndex === pre.accountIndex
                )
        )

        if (burns.length > 0) {
            history.type = 'burn'
            history.from = burns[0].owner
            history.mintAddress = burns[0].mint
        }

        return history
    }
} 