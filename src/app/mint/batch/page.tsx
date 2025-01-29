'use client';

import { NFTBatchUpload } from '@/components/nft/nft-batch-upload';
import { Button } from '@/components/ui/button';
import { NFTMetadata, NFTService, uploadMetadata } from '@/lib/nft';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function BatchMintPage() {
    const router = useRouter();
    const wallet = useWallet();
    const { connection } = useConnection();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleUpload = async (items: NFTMetadata[]) => {
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            setIsProcessing(true);
            const nftService = new NFTService(connection);
            nftService.setWallet(wallet);

            // 1. Upload metadata
            const metadataUris = await Promise.all(
                items.map(async (item) => {
                    const uri = await uploadMetadata(item);
                    return uri;
                })
            );

            // 2. Batch mint NFTs
            await nftService.batchMintNFTs(metadataUris);

            toast.success('NFTs minted successfully');
            router.push('/nfts');
        } catch (error: any) {
            console.error('Failed to mint NFTs:', error);
            toast.error(
                error.message ||
                'Minting failed, please check wallet balance or network connection'
            );
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-8 py-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold">Batch Mint NFTs</h1>
                    <p className="text-muted-foreground">
                        Upload and mint multiple NFTs at once.
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <Link href="/nfts">Back</Link>
                </Button>
            </div>

            {!wallet.publicKey ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold">
                            Connect Wallet to Continue
                        </h3>
                        <p className="text-muted-foreground">
                            Please connect your wallet to start minting NFTs.
                        </p>
                    </div>
                </div>
            ) : (
                <NFTBatchUpload onUpload={handleUpload} />
            )}
        </div>
    );
}
