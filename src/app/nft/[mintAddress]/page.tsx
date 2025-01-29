'use client';

import { NFTTransferForm } from '@/components/nft/nft-transfer-form';
import { Button } from '@/components/ui/button';
import { NFTDisplay, NFTService } from '@/lib/nft';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NFTMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
}

interface NFTDetailPageProps {
    params: {
        mintAddress: string;
    };
}

export default function NFTDetailPage({ params }: NFTDetailPageProps) {
    const router = useRouter();
    const wallet = useWallet();
    const { connection } = useConnection();
    const [nft, setNft] = useState<NFTDisplay | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTransferring, setIsTransferring] = useState(false);
    const [isBurning, setIsBurning] = useState(false);
    const [recipientAddress, setRecipientAddress] = useState('');

    const mintAddress = params.mintAddress as string;

    useEffect(() => {
        const fetchNFT = async () => {
            try {
                setIsLoading(true);
                const nftService = new NFTService(connection);
                const nftData = await nftService.getNFT(mintAddress);
                const metadata = await fetch(nftData.uri).then((res) => res.json());
                setNft({
                    mintAddress: params.mintAddress,
                    name: nftData.name,
                    description: nftData.json.description,
                    image: nftData.json.image,
                    attributes: nftData.json.attributes,
                });
            } catch (error) {
                console.error('Failed to fetch NFT:', error);
                toast.error('Failed to fetch NFT');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNFT();
    }, [connection, mintAddress]);

    const handleTransfer = async () => {
        if (!wallet.publicKey || !nft) return;
        if (!recipientAddress) {
            toast.error('Please enter a recipient address');
            return;
        }

        try {
            setIsTransferring(true);
            const nftService = new NFTService(connection);
            nftService.setWallet(wallet);
            await nftService.transferNFT(mintAddress, recipientAddress);
            toast.success('NFT transferred successfully');
            router.push('/nfts');
        } catch (error) {
            console.error('Failed to transfer NFT:', error);
            toast.error('Failed to transfer NFT');
        } finally {
            setIsTransferring(false);
        }
    };

    const handleBurn = async () => {
        if (!wallet.publicKey || !nft) return;

        try {
            setIsBurning(true);
            const nftService = new NFTService(connection);
            nftService.setWallet(wallet);
            await nftService.burnNFT(mintAddress);
            toast.success('NFT burned successfully');
            router.push('/nfts');
        } catch (error) {
            console.error('Failed to burn NFT:', error);
            toast.error('Failed to burn NFT');
        } finally {
            setIsBurning(false);
        }
    };

    if (isLoading || !nft) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-semibold">Loading...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="aspect-square rounded-lg overflow-hidden">
                        <img
                            src={nft.image}
                            alt={nft.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">{nft.name}</h1>
                        <p className="text-muted-foreground mt-2">{nft.description}</p>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Attributes</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {nft.attributes.map((attr, index) => (
                                <div key={index} className="bg-muted p-3 rounded-lg">
                                    <div className="text-sm text-muted-foreground">
                                        {attr.trait_type}
                                    </div>
                                    <div className="font-medium">{attr.value.toString()}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-muted p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-2">
                            Mint Address
                        </div>
                        <div className="font-mono break-all">{nft.mintAddress}</div>
                    </div>

                    <NFTTransferForm />

                    <div className="flex justify-end">
                        <Button variant="outline" asChild>
                            <Link href="/nfts">Back to NFTs</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
