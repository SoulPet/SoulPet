'use client'

import { MintForm } from '@/components/nft/mint-form'
import { useWallet } from '@/hooks/use-wallet'
import { mintNFT, uploadMetadata } from '@/lib/nft'
import { useConnection } from '@solana/wallet-adapter-react'

export default function MintPage() {
    const { publicKey } = useWallet()
    const { connection } = useConnection()

    const handleSubmit = async (formData: FormData) => {
        if (!publicKey) throw new Error('Wallet not connected')

        const image = formData.get('image') as File
        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const attributes = formData.get('attributes') as string

        const parsedAttributes = attributes
            ? JSON.parse(attributes)
            : []

        const uri = await uploadMetadata({
            image,
            name,
            description,
            attributes: parsedAttributes,
        })

        const nft = await mintNFT(connection, publicKey, uri, name)
        console.log('NFT minted:', nft)
    }

    return (
        <div className="mx-auto max-w-2xl space-y-8 py-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Mint NFT</h1>
                <p className="text-muted-foreground">
                    Create your own unique NFT by uploading an image and filling out the details below.
                </p>
            </div>
            <MintForm onSubmit={handleSubmit} />
        </div>
    )
} 