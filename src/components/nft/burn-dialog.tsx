'use client'

import { useNFT } from '@/components/providers/nft-provider'
import { TransactionStatus } from '@/components/transaction/transaction-status'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { toast } from 'sonner'

interface BurnDialogProps {
    nft: {
        address: PublicKey
        json?: {
            name?: string
            image?: string
        }
    }
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function BurnDialog({ nft, onSuccess, trigger }: BurnDialogProps) {
    const { service } = useNFT()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [signature, setSignature] = useState<string | null>(null)

    const handleBurn = async () => {
        if (!service) {
            toast.error('Service not initialized')
            return
        }

        try {
            setIsLoading(true)
            await service.burnNFT(nft.address.toString())
            // Since burn doesn't return a signature, we'll just simulate success
            handleSuccess()
        } catch (error: any) {
            toast.error(error.message || 'Failed to burn NFT')
            setIsLoading(false)
        }
    }

    const handleSuccess = () => {
        setIsLoading(false)
        setIsOpen(false)
        onSuccess?.()
        toast.success('NFT burned successfully')
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="destructive" size="sm">
                            Burn
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Burn NFT</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The NFT will be permanently destroyed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* NFT Preview */}
                        <div className="flex items-center space-x-4">
                            <div className="h-16 w-16 rounded-lg overflow-hidden">
                                <img
                                    src={nft.json?.image || ''}
                                    alt={nft.json?.name || 'NFT'}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    {nft.json?.name || 'Unnamed NFT'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {nft.address.toString()}
                                </p>
                            </div>
                        </div>

                        <div className="bg-red-50 p-4 rounded-lg">
                            <p className="text-sm text-red-800">
                                Warning: Burning an NFT is irreversible. The NFT and all its
                                metadata will be permanently deleted from the blockchain.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBurn}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Burning...' : 'Burn NFT'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {signature && (
                <TransactionStatus
                    signature={signature}
                    onSuccess={handleSuccess}
                    onError={() => setIsLoading(false)}
                />
            )}
        </>
    )
} 