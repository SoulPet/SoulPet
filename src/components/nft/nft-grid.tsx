'use client'

import { LoadingSpinner } from '@/components/loading-spinner'
import { NFTCard } from '@/components/nft/nft-card'
import { NFTDisplay } from '@/lib/nft'

interface NFTGridProps {
    nfts: NFTDisplay[]
    isLoading?: boolean
    onTransfer?: (mintAddress: string) => void
    onBurn?: (mintAddress: string) => void
    selectedNFTs?: Set<string>
    onSelect?: (mintAddress: string, selected: boolean) => void
}

export function NFTGrid({
    nfts,
    isLoading,
    onTransfer,
    onBurn,
    selectedNFTs,
    onSelect,
}: NFTGridProps) {
    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (nfts.length === 0) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3">
                <div className="text-center">
                    <h3 className="text-lg font-semibold">No NFTs found</h3>
                    <p className="text-muted-foreground">
                        You don&apos;t have any NFTs in your wallet yet.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {nfts.map((nft) => (
                <NFTCard
                    key={nft.mintAddress}
                    nft={nft}
                    onTransfer={onTransfer}
                    onBurn={onBurn}
                    isSelected={selectedNFTs?.has(nft.mintAddress)}
                    onSelect={onSelect}
                />
            ))}
        </div>
    )
} 