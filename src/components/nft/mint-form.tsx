'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useWallet } from '@/hooks/use-wallet'
import { useState } from 'react'
import { toast } from 'sonner'

interface MintFormProps {
    onSubmit: (data: FormData) => Promise<void>
}

export function MintForm({ onSubmit }: MintFormProps) {
    const { connected } = useWallet()
    const [isLoading, setIsLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file')
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!connected) {
            toast.error('Please connect your wallet first')
            return
        }

        try {
            setIsLoading(true)
            const formData = new FormData(e.currentTarget)
            await onSubmit(formData)
            e.currentTarget.reset()
            setImagePreview(null)
            toast.success('NFT minted successfully')
        } catch (error) {
            toast.error('Failed to mint NFT')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <div className="flex items-center gap-4">
                    <Input
                        id="image"
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        required
                        disabled={isLoading}
                    />
                    {imagePreview && (
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="h-20 w-20 rounded-lg object-cover"
                        />
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="Enter NFT name"
                    required
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter NFT description"
                    required
                    disabled={isLoading}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="attributes">Attributes (Optional)</Label>
                <Textarea
                    id="attributes"
                    name="attributes"
                    placeholder="Enter attributes in JSON format"
                    disabled={isLoading}
                />
            </div>

            <Button type="submit" disabled={isLoading || !connected}>
                {isLoading ? 'Minting...' : 'Mint NFT'}
            </Button>
        </form>
    )
} 