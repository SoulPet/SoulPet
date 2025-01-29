'use client'

import { blockchain } from '@/lib/blockchain'
import { useWallet } from '@solana/wallet-adapter-react'
import { createContext, useContext, useEffect } from 'react'
import { toast } from 'sonner'

interface BlockchainContextType {
    service: typeof blockchain
}

const BlockchainContext = createContext<BlockchainContextType>({
    service: blockchain,
})

export function BlockchainProvider({ children }: { children: React.ReactNode }) {
    const wallet = useWallet()

    useEffect(() => {
        if (wallet.publicKey) {
            try {
                blockchain.setWallet(wallet)
            } catch (error) {
                toast.error('Failed to initialize blockchain service')
                console.error(error)
            }
        }
    }, [wallet.publicKey])

    return (
        <BlockchainContext.Provider value={{ service: blockchain }}>
            {children}
        </BlockchainContext.Provider>
    )
}

export function useBlockchain() {
    return useContext(BlockchainContext)
} 