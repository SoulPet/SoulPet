'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { ParsedTransactionWithMeta } from '@solana/web3.js'
import { formatDistanceToNow } from 'date-fns'

interface TransactionDetailsProps {
    transaction: ParsedTransactionWithMeta & { signature: string }
    trigger: React.ReactNode
}

export function TransactionDetails({ transaction, trigger }: TransactionDetailsProps) {
    const { blockTime, meta, signature } = transaction

    const formatSol = (lamports: number) => (lamports / 1e9).toFixed(6)
    const getTransactionType = () => {
        if (!transaction.message.instructions.length) return 'Unknown'
        const instruction = transaction.message.instructions[0]
        if ('program' in instruction) {
            return instruction.program || 'Unknown Program'
        }
        return 'System Program'
    }

    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Transaction Details</DialogTitle>
                    <DialogDescription>
                        Detailed information about this transaction
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Status</h3>
                            <p className={`mt-1 ${meta?.err ? 'text-red-600' : 'text-green-600'}`}>
                                {meta?.err ? 'Failed' : 'Success'}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Transaction Type</h3>
                            <p className="mt-1">{getTransactionType()}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
                            <p className="mt-1">
                                {blockTime
                                    ? `${formatDistanceToNow(new Date(blockTime * 1000))} ago`
                                    : 'N/A'}
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Fee</h3>
                            <p className="mt-1">{meta?.fee ? `${formatSol(meta.fee)} SOL` : 'N/A'}</p>
                        </div>
                    </div>

                    {/* Signature */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Signature</h3>
                        <p className="mt-1 font-mono break-all">{signature}</p>
                    </div>

                    {/* Account Keys */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Accounts Involved</h3>
                        <div className="mt-1 space-y-2">
                            {transaction.message.accountKeys.map((account, index) => (
                                <div key={index} className="font-mono text-sm break-all">
                                    {account.pubkey.toString()}
                                    {account.signer && ' (Signer)'}
                                    {account.writable && ' (Writable)'}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Log Messages */}
                    {meta?.logMessages && meta.logMessages.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-gray-500">Log Messages</h3>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-sm overflow-x-auto">
                                {meta.logMessages.join('\n')}
                            </pre>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
} 