'use client'

import { getWallets } from '@/lib/wallet-config'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
    ConnectionProvider,
    WalletProvider as SolanaWalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { useMemo } from 'react'

require('@solana/wallet-adapter-react-ui/styles.css')

interface WalletProviderProps {
    children: React.ReactNode
    network?: WalletAdapterNetwork
}

export function WalletProvider({
    children,
    network = WalletAdapterNetwork.Devnet,
}: WalletProviderProps) {
    const endpoint = useMemo(() => clusterApiUrl(network), [network])
    const wallets = useMemo(() => getWallets(network), [network])

    return (
        <ConnectionProvider endpoint={endpoint}>
            <SolanaWalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </SolanaWalletProvider>
        </ConnectionProvider>
    )
} 