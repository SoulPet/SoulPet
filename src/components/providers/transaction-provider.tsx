'use client'

import { TransactionService } from '@/lib/transaction'
import { createContext, useContext, useMemo } from 'react'

const SOLANA_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

interface TransactionContextType {
    service: TransactionService
}

const TransactionContext = createContext<TransactionContextType>({
    service: new TransactionService(SOLANA_ENDPOINT),
})

export function TransactionProvider({ children }: { children: React.ReactNode }) {
    const service = useMemo(() => new TransactionService(SOLANA_ENDPOINT), [])

    return (
        <TransactionContext.Provider value={{ service }}>
            {children}
        </TransactionContext.Provider>
    )
}

export function useTransaction() {
    return useContext(TransactionContext)
} 