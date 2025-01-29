'use client'

import { useTransaction } from '@/components/providers/transaction-provider'
import { useWallet } from '@/components/providers/wallet-provider'
import { TransactionDetails } from '@/components/transaction/transaction-details'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

interface TransactionWithMeta extends ParsedTransactionWithMeta {
    signature: string
}

export default function TransactionsPage() {
    const router = useRouter()
    const { wallet } = useWallet()
    const { service } = useTransaction()
    const [isLoading, setIsLoading] = useState(false)
    const [transactions, setTransactions] = useState<TransactionWithMeta[]>([])
    const [searchQuery, setSearchQuery] = useState('')

    const loadTransactions = useCallback(async () => {
        if (!wallet?.publicKey) return

        try {
            setIsLoading(true)
            const signatures = await service.connection.getSignaturesForAddress(
                wallet.publicKey,
                { limit: 20 }
            )

            const txs = await Promise.all(
                signatures.map(async (sig) => {
                    const tx = await service.getTransaction(sig.signature)
                    return tx ? { ...tx, signature: sig.signature } : null
                })
            )

            setTransactions(txs.filter((tx): tx is TransactionWithMeta => tx !== null))
        } catch (error: any) {
            toast.error(error.message || 'Failed to load transactions')
        } finally {
            setIsLoading(false)
        }
    }, [wallet?.publicKey, service])

    useEffect(() => {
        loadTransactions()
    }, [loadTransactions])

    const filteredTransactions = transactions.filter((tx) =>
        tx.signature.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!wallet?.publicKey) {
        return (
            <div className="container mx-auto py-8">
                <Card className="p-6 text-center">
                    <h2 className="text-xl font-semibold mb-4">Wallet Not Connected</h2>
                    <p className="text-gray-500 mb-4">
                        Please connect your wallet to view transaction history
                    </p>
                    <Button onClick={() => router.push('/')}>
                        Go to Home
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Transaction History</h1>
                <Button
                    onClick={loadTransactions}
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading...' : 'Refresh'}
                </Button>
            </div>

            <Input
                placeholder="Search by transaction signature..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
            />

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Signature</TableHead>
                            <TableHead>Block Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Fee (SOL)</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.map((tx) => (
                            <TableRow key={tx.signature}>
                                <TableCell className="font-mono">
                                    {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                                </TableCell>
                                <TableCell>
                                    {tx.blockTime
                                        ? new Date(tx.blockTime * 1000).toLocaleString()
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`px-2 py-1 rounded text-sm ${tx.meta?.err
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-green-100 text-green-800'
                                            }`}
                                    >
                                        {tx.meta?.err ? 'Failed' : 'Success'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {tx.meta?.fee
                                        ? (tx.meta.fee / 1e9).toFixed(6)
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    <TransactionDetails
                                        transaction={tx}
                                        trigger={
                                            <Button variant="ghost" size="sm">
                                                Details
                                            </Button>
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredTransactions.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center text-gray-500 py-4"
                                >
                                    {isLoading
                                        ? 'Loading transactions...'
                                        : 'No transactions found'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
} 