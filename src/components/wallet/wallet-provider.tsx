'use client'

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import {
    ConnectionProvider,
    WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { clusterApiUrl } from '@solana/web3.js'
import { useMemo } from 'react'

interface WalletProviderProps {
    children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
    const network = WalletAdapterNetwork.Devnet
    const endpoint = useMemo(() => clusterApiUrl(network), [network])
    const wallets = useMemo(
        () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
        []
    )

    return (
        <ConnectionProvider endpoint={endpoint}>
            <SolanaWalletProvider wallets={wallets} autoConnect>
                {children}
            </SolanaWalletProvider>
        </ConnectionProvider>
    )
} 