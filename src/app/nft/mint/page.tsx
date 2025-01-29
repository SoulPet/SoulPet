'use client'

import { useNFT } from '@/components/providers/nft-provider'
import { useWallet } from '@/components/providers/wallet-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    symbol: z.string().min(1, 'Symbol is required').max(10, 'Symbol must be 10 characters or less'),
    description: z.string().min(1, 'Description is required'),
    image: z.instanceof(File, { message: 'Image is required' }),
})

export default function MintNFTPage() {
    const router = useRouter()
    const { wallet } = useWallet()
    const { service } = useNFT()
    const [isLoading, setIsLoading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    })

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!service || !wallet?.publicKey) {
            toast.error('Please connect your wallet first')
            return
        }

        try {
            setIsLoading(true)

            // Upload metadata
            const metadataUri = await service.uploadMetadata({
                name: data.name,
                symbol: data.symbol,
                description: data.description,
                image: data.image,
            })

            // Mint NFT
            const nft = await service.mintNFT(metadataUri)

            toast.success('NFT minted successfully!')
            router.push(`/nft/${nft.address.toString()}`)
        } catch (error: any) {
            toast.error(error.message || 'Failed to mint NFT')
        } finally {
            setIsLoading(false)
        }
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview image
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)

        // Set form value
        form.setValue('image', file)
    }

    if (!wallet?.publicKey) {
        return (
            <div className="container mx-auto py-8">
                <Card className="p-6 text-center">
                    <h2 className="text-xl font-semibold mb-4">Wallet Not Connected</h2>
                    <p className="text-gray-500 mb-4">
                        Please connect your wallet to mint NFTs
                    </p>
                    <Button onClick={() => router.push('/')}>
                        Go to Home
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8">Mint New NFT</h1>

            <Card className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter NFT name" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        The name of your NFT
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="symbol"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Symbol</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter NFT symbol"
                                            maxLength={10}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        A short symbol for your NFT (max 10 characters)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter NFT description"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        A detailed description of your NFT
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="image"
                            render={() => (
                                <FormItem>
                                    <FormLabel>Image</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Upload an image for your NFT
                                    </FormDescription>
                                    <FormMessage />
                                    {previewUrl && (
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="mt-2 rounded-lg max-h-64 object-contain"
                                        />
                                    )}
                                </FormItem>
                            )}
                        />

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Minting...' : 'Mint NFT'}
                        </Button>
                    </form>
                </Form>
            </Card>
        </div>
    )
} 