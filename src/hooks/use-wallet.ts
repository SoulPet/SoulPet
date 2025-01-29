import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'

export function useWallet() {
    const {
        publicKey,
        connected,
        connecting,
        disconnecting,
        select,
        disconnect,
        wallets,
    } = useSolanaWallet()

    const connect = async (name: string) => {
        const adapter = wallets.find((w) => w.adapter.name === name)
        if (!adapter) {
            throw new Error(`Wallet ${name} not found`)
        }

        select(adapter.adapter.name)
        await adapter.adapter.connect()
    }

    return {
        publicKey,
        connected,
        connecting,
        disconnecting,
        connect,
        disconnect,
    }
} 