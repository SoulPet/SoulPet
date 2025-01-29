'use client'

import { useTransaction } from '@/components/providers/transaction-provider'
import { useWallet } from '@/components/providers/wallet-provider'
import { NFTService } from '@/lib/nft'
import { createContext, useContext, useEffect, useMemo } from 'react'

interface NFTContextType {
    service: NFTService | null
}

const NFTContext = createContext<NFTContextType>({
    service: null,
})

export function NFTProvider({ children }: { children: React.ReactNode }) {
    const { service: transactionService } = useTransaction()
    const { wallet } = useWallet()

    const nftService = useMemo(
        () => new NFTService(transactionService.connection),
        [transactionService]
    )

    useEffect(() => {
        if (wallet) {
            nftService.setWallet(wallet)
        }
    }, [wallet, nftService])

    return (
        <NFTContext.Provider value={{ service: nftService }}>
            {children}
        </NFTContext.Provider>
    )
}

export function useNFT() {
    return useContext(NFTContext)
} 