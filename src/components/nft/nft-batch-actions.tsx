'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NFTDisplay } from '@/lib/nft'
import { Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

interface NFTBatchActionsProps {
    selectedNFTs: NFTDisplay[]
    onBatchTransfer: (recipientAddress: string) => Promise<void>
    onBatchBurn: () => Promise<void>
}

interface BatchTransferDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (recipientAddress: string) => Promise<void>
    selectedCount: number
}

function BatchTransferDialog({
    isOpen,
    onClose,
    onConfirm,
    selectedCount,
}: BatchTransferDialogProps) {
    const [recipientAddress, setRecipientAddress] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            await onConfirm(recipientAddress)
            onClose()
        } catch (error) {
            // Error is handled by the parent component
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Batch Transfer NFTs</DialogTitle>
                    <DialogDescription>
                        Transfer {selectedCount} selected NFTs to another wallet.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="recipient">Recipient Address</Label>
                            <Input
                                id="recipient"
                                placeholder="Enter recipient's wallet address"
                                value={recipientAddress}
                                onChange={(e) =>
                                    setRecipientAddress(e.target.value)
                                }
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? 'Transferring...'
                                : `Transfer ${selectedCount} NFTs`}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

interface BatchBurnDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    selectedCount: number
}

function BatchBurnDialog({
    isOpen,
    onClose,
    onConfirm,
    selectedCount,
}: BatchBurnDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleConfirm = async () => {
        try {
            setIsLoading(true)
            await onConfirm()
            onClose()
        } catch (error) {
            // Error is handled by the parent component
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Batch Burn NFTs</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to burn {selectedCount} selected NFTs?
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? 'Burning...'
                            : `Burn ${selectedCount} NFTs`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function NFTBatchActions({
    selectedNFTs,
    onBatchTransfer,
    onBatchBurn,
}: NFTBatchActionsProps) {
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
    const [isBurnDialogOpen, setIsBurnDialogOpen] = useState(false)

    if (selectedNFTs.length === 0) return null

    return (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 space-x-2 rounded-lg border bg-background p-4 shadow-lg">
            <span className="mr-4 font-medium">
                {selectedNFTs.length} NFTs selected
            </span>
            <Button
                variant="outline"
                onClick={() => setIsTransferDialogOpen(true)}
            >
                <Upload className="mr-2 h-4 w-4" />
                Transfer
            </Button>
            <Button
                variant="outline"
                onClick={() => setIsBurnDialogOpen(true)}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Burn
            </Button>

            <BatchTransferDialog
                isOpen={isTransferDialogOpen}
                onClose={() => setIsTransferDialogOpen(false)}
                onConfirm={onBatchTransfer}
                selectedCount={selectedNFTs.length}
            />

            <BatchBurnDialog
                isOpen={isBurnDialogOpen}
                onClose={() => setIsBurnDialogOpen(false)}
                onConfirm={onBatchBurn}
                selectedCount={selectedNFTs.length}
            />
        </div>
    )
} 