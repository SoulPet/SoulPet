'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { TransactionHistory } from '@/lib/transaction'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface TransactionHistoryDialogProps {
    transactions: TransactionHistory[]
    isLoading?: boolean
    onRefresh?: () => void
    trigger?: React.ReactNode
}

export function TransactionHistoryDialog({
    transactions,
    isLoading,
    onRefresh,
    trigger,
}: TransactionHistoryDialogProps) {
    const [isOpen, setIsOpen] = useState(false)

    const getStatusColor = (status: 'success' | 'failure') => {
        return status === 'success' ? 'text-green-600' : 'text-red-600'
    }

    const getTypeLabel = (type: 'mint' | 'transfer' | 'burn' | 'unknown') => {
        switch (type) {
            case 'mint':
                return 'Mint'
            case 'transfer':
                return 'Transfer'
            case 'burn':
                return 'Burn'
            default:
                return 'Unknown'
        }
    }

    const getTypeColor = (type: 'mint' | 'transfer' | 'burn' | 'unknown') => {
        switch (type) {
            case 'mint':
                return 'text-green-600'
            case 'transfer':
                return 'text-blue-600'
            case 'burn':
                return 'text-red-600'
            default:
                return 'text-gray-600'
        }
    }

    const shortenAddress = (address?: string) => {
        if (!address) return ''
        return `${address.slice(0, 4)}...${address.slice(-4)}`
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        Transaction History
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                    <DialogDescription>
                        View your recent NFT transactions
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>NFT</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.signature}>
                                        <TableCell>
                                            {formatDistanceToNow(tx.timestamp, {
                                                addSuffix: true,
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`font-medium ${getTypeColor(
                                                    tx.type
                                                )}`}
                                            >
                                                {getTypeLabel(tx.type)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {tx.from ? (
                                                <a
                                                    href={`https://explorer.solana.com/address/${tx.from}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    {shortenAddress(tx.from)}
                                                </a>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tx.to ? (
                                                <a
                                                    href={`https://explorer.solana.com/address/${tx.to}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    {shortenAddress(tx.to)}
                                                </a>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tx.mintAddress ? (
                                                <a
                                                    href={`https://explorer.solana.com/address/${tx.mintAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    {shortenAddress(tx.mintAddress)}
                                                </a>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`font-medium ${getStatusColor(
                                                    tx.status
                                                )}`}
                                            >
                                                {tx.status === 'success'
                                                    ? 'Success'
                                                    : 'Failed'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <a
                                                href={`https://explorer.solana.com/tx/${tx.signature}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline"
                                            >
                                                View
                                            </a>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center py-4"
                                        >
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
} 