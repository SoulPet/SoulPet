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
import { zodResolver } from '@hookform/resolvers/zod'
import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const formSchema = z.object({
    toAddress: z
        .string()
        .min(1, 'Recipient address is required')
        .refine(
            (address) => {
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

interface TransferDialogProps {
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

export function TransferDialog({ nft, onSuccess, trigger }: TransferDialogProps) {
    const { service } = useNFT()
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [signature, setSignature] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    })

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!service) {
            toast.error('Service not initialized')
            return
        }

        try {
            setIsLoading(true)
            const result = await service.transferNFT(
                nft.address.toString(),
                data.toAddress
            )
            setSignature(result.response.signature)
        } catch (error: any) {
            toast.error(error.message || 'Failed to transfer NFT')
            setIsLoading(false)
        }
    }

    const handleSuccess = () => {
        setIsLoading(false)
        setIsOpen(false)
        form.reset()
        onSuccess?.()
        toast.success('NFT transferred successfully')
    }

    const handleError = () => {
        setIsLoading(false)
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    {trigger || (
                        <Button variant="outline" size="sm">
                            Transfer
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Transfer NFT</DialogTitle>
                        <DialogDescription>
                            Send this NFT to another wallet address
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

                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit(onSubmit)}
                                className="space-y-4"
                            >
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
                                                The wallet address that will receive this NFT
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Transferring...' : 'Transfer NFT'}
                                </Button>
                            </form>
                        </Form>
                    </div>
                </DialogContent>
            </Dialog>

            {signature && (
                <TransactionStatus
                    signature={signature}
                    onSuccess={handleSuccess}
                    onError={handleError}
                />
            )}
        </>
    )
} 