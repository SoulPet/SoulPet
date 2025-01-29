import { PublicKey, Transaction } from '@solana/web3.js'

export type WalletType = 'phantom' | 'solflare'

export interface WalletAdapter {
    connect(): Promise<void>
    disconnect(): Promise<void>
    signTransaction(transaction: Transaction): Promise<Transaction>
    signMessage(message: Uint8Array): Promise<Uint8Array>
    publicKey: PublicKey | null
    isConnected: boolean
}

export interface WalletError extends Error {
    code?: number
    details?: string
}

export class WalletNotFoundError extends Error {
    constructor(type: WalletType) {
        super(`${type} wallet not found`)
        this.name = 'WalletNotFoundError'
    }
}

export class WalletNotConnectedError extends Error {
    constructor() {
        super('Wallet not connected')
        this.name = 'WalletNotConnectedError'
    }
}

export class WalletConnectionError extends Error {
    constructor(message: string, public details?: string) {
        super(message)
        this.name = 'WalletConnectionError'
    }
}

export async function connectWallet(type: WalletType): Promise<WalletAdapter> {
    const wallet = await getWalletAdapter(type)
    try {
        await wallet.connect()
        return wallet
    } catch (error: any) {
        throw new WalletConnectionError(
            'Failed to connect wallet',
            error?.message || error?.toString()
        )
    }
}

export async function getWalletAdapter(type: WalletType): Promise<WalletAdapter> {
    switch (type) {
        case 'phantom':
            if (!window?.solana) {
                throw new WalletNotFoundError('phantom')
            }
            return window.solana

        case 'solflare':
            if (!window?.solflare) {
                throw new WalletNotFoundError('solflare')
            }
            return window.solflare

        default:
            throw new Error(`Unsupported wallet type: ${type}`)
    }
}

export async function signMessage(
    wallet: WalletAdapter,
    message: string
): Promise<string> {
    if (!wallet.isConnected || !wallet.publicKey) {
        throw new WalletNotConnectedError()
    }

    try {
        const encodedMessage = new TextEncoder().encode(message)
        const signedMessage = await wallet.signMessage(encodedMessage)
        return Buffer.from(signedMessage).toString('base64')
    } catch (error: any) {
        throw new Error(`Failed to sign message: ${error?.message || error?.toString()}`)
    }
}

export async function signAndSendTransaction(
    wallet: WalletAdapter,
    transaction: Transaction
): Promise<string> {
    if (!wallet.isConnected || !wallet.publicKey) {
        throw new WalletNotConnectedError()
    }

    try {
        const signedTx = await wallet.signTransaction(transaction)
        // TODO: Add connection and send transaction
        return 'transaction_signature'
    } catch (error: any) {
        throw new Error(`Failed to sign and send transaction: ${error?.message || error?.toString()}`)
    }
} 