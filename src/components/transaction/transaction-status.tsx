'use client'

import { useTransaction } from '@/components/providers/transaction-provider'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface TransactionStatusProps {
    signature: string
    onSuccess?: () => void
    onError?: (error: Error) => void
}

export function TransactionStatus({
    signature,
    onSuccess,
    onError,
}: TransactionStatusProps) {
    const { service } = useTransaction()
    const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending')
    const [confirmations, setConfirmations] = useState(0)

    useEffect(() => {
        let unsubscribe: (() => void) | undefined

        const subscribeToTransaction = async () => {
            try {
                unsubscribe = service.connection.onSignatureWithOptions(
                    signature,
                    (signatureResult, context) => {
                        if (signatureResult.err) {
                            setStatus('error')
                            onError?.(new Error('Transaction failed'))
                            toast.error('Transaction failed')
                        } else {
                            setConfirmations(context.slot)
                            if (context.confirmations && context.confirmations >= 1) {
                                setStatus('success')
                                onSuccess?.()
                                toast.success('Transaction confirmed')
                            }
                        }
                    },
                    {
                        commitment: 'confirmed',
                    }
                )
            } catch (error: any) {
                setStatus('error')
                onError?.(error)
                toast.error(error.message || 'Failed to subscribe to transaction')
            }
        }

        subscribeToTransaction()
        return () => {
            unsubscribe?.()
        }
    }, [signature, service, onSuccess, onError])

    return (
        <Dialog open={status === 'pending'}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transaction Status</DialogTitle>
                    <DialogDescription>
                        Please wait while your transaction is being processed
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center justify-center">
                        {status === 'pending' ? (
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
                        ) : status === 'success' ? (
                            <div className="text-green-500">
                                <svg
                                    className="h-12 w-12"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        ) : (
                            <div className="text-red-500">
                                <svg
                                    className="h-12 w-12"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className="text-center">
                        <p className="text-sm text-gray-500">
                            {status === 'pending'
                                ? `Confirming transaction... (${confirmations} confirmations)`
                                : status === 'success'
                                    ? 'Transaction confirmed!'
                                    : 'Transaction failed'}
                        </p>
                    </div>

                    <div className="text-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                window.open(
                                    `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
                                    '_blank'
                                )
                            }
                        >
                            View on Explorer
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
} 