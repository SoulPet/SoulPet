'use client'

import { useNFT } from '@/components/providers/nft-provider'
import { TransactionStatus } from '@/components/transaction/transaction-status'
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
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const formSchema = z.object({
    operation: z.enum(['transfer', 'burn']),
    toAddress: z.string().optional().refine(
        (address) => {
            if (!address) return true
            try {
                new PublicKey(address)
                return true
            } catch {
                return false
            }
        },
        {
            message: 'Invalid Solana address',
        }
    ),
})

interface BatchOperationsDialogProps {
    nfts: Array<{
        address: PublicKey
        json?: {
            name?: string
            image?: string
        }
    }>
    onSuccess?: () => void
    trigger?: React.ReactNode
}

export function BatchOperationsDialog({
    nfts,
    onSuccess,
    trigger,
}: BatchOperationsDialogProps) {
    const { service } = useNFT()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [signature, setSignature] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            operation: 'transfer',
        },
    })

    const operation = form.watch('operation')

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!service) {
            toast.error('Service not initialized')
            return
        }

        try {
            setIsLoading(true)
            if (data.operation === 'transfer' && data.toAddress) {
                const transfers = nfts.map((nft) => ({
                    mintAddress: nft.address.toString(),
                    toAddress: data.toAddress,
                }))
                await service.batchTransferNFTs(transfers)
                toast.success('NFTs transferred successfully')
            } else if (data.operation === 'burn') {
                const mintAddresses = nfts.map((nft) => nft.address.toString())
                await service.batchBurnNFTs(mintAddresses)
                toast.success('NFTs burned successfully')
            }
            setIsOpen(false)
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Operation failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        Batch Operations
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Batch Operations</DialogTitle>
                    <DialogDescription>
                        Perform operations on multiple NFTs at once
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Selected NFTs Preview */}
                    <div className="grid grid-cols-4 gap-2">
                        {nfts.map((nft) => (
                            <div
                                key={nft.address.toString()}
                                className="relative aspect-square rounded-lg overflow-hidden"
                            >
                                <img
                                    src={nft.json?.image || ''}
                                    alt={nft.json?.name || 'NFT'}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="operation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Operation</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select operation" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="transfer">
                                                    Transfer
                                                </SelectItem>
                                                <SelectItem value="burn">
                                                    Burn
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {operation === 'transfer' && (
                                <FormField
                                    control={form.control}
                                    name="toAddress"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Recipient Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Enter Solana wallet address"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                The wallet address that will receive these NFTs
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {operation === 'burn' && (
                                <div className="bg-red-50 p-4 rounded-lg">
                                    <p className="text-sm text-red-800">
                                        Warning: Burning NFTs is irreversible. The NFTs and
                                        all their metadata will be permanently deleted from
                                        the blockchain.
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                                variant={operation === 'burn' ? 'destructive' : 'default'}
                            >
                                {isLoading
                                    ? operation === 'transfer'
                                        ? 'Transferring...'
                                        : 'Burning...'
                                    : operation === 'transfer'
                                        ? 'Transfer NFTs'
                                        : 'Burn NFTs'}
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>

            {signature && (
                <TransactionStatus
                    signature={signature}
                    onSuccess={() => {
                        setIsLoading(false)
                        setIsOpen(false)
                        form.reset()
                        onSuccess?.()
                    }}
                    onError={() => setIsLoading(false)}
                />
            )}
        </Dialog>
    )
} 