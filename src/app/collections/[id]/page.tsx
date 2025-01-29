'use client';

import { NFTGrid } from '@/components/nft/nft-grid';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { NFTDisplay, NFTService } from '@/lib/nft';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NFTCollection {
    id: string;
    name: string;
    description: string;
    nfts: string[]; // NFT mint addresses
    createdAt: number;
    updatedAt: number;
}

export default function CollectionPage() {
    const params = useParams();
    const wallet = useWallet();
    const { connection } = useConnection();
    const [collection, setCollection] = useState<NFTCollection | null>(null);
    const [nfts, setNfts] = useState<NFTDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load collection data
    useEffect(() => {
        const savedCollections = localStorage.getItem(
            `collections-${wallet.publicKey?.toString()}`
        );
        if (savedCollections) {
            const collections = JSON.parse(savedCollections);
            const collection = collections.find((c: any) => c.id === params.id);
            setCollection(collection);
        }
    }, [wallet.publicKey, params.id]);

    // Load NFT data
    useEffect(() => {
        if (!wallet.publicKey) {
            setNfts([]);
            setIsLoading(false);
            return;
        }

        const fetchNFTs = async () => {
            try {
                setIsLoading(true);
                const nftService = new NFTService(connection);
                const userNFTs = await nftService.getNFTsByOwner(wallet.publicKey!);

                const nftData = await Promise.all(
                    userNFTs.map(async (nft) => {
                        const metadata = await fetch(nft.uri).then((res) => res.json());
                        return {
                            mintAddress: nft.address.toString(),
                            name: metadata.name,
                            description: metadata.description,
                            image: metadata.image,
                            attributes: metadata.attributes || [],
                        };
                    })
                );

                // Only show NFTs in the collection
                if (collection) {
                    setNfts(
                        nftData.filter((nft) => collection.nfts.includes(nft.mintAddress))
                    );
                }
            } catch (error) {
                console.error('Failed to fetch NFTs:', error);
                toast.error('Failed to fetch NFTs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNFTs();
    }, [wallet.publicKey, connection, collection]);

    if (!wallet.publicKey) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>NFT Collection</CardTitle>
                    <CardDescription>Connect wallet to view NFTs</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!collection) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Collection Not Found</CardTitle>
                    <CardDescription>
                        This collection may have been deleted.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/nfts">Go Back</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 py-8">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild className="-ml-2">
                            <Link href="/nfts">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold">{collection.name}</h1>
                    </div>
                    <p className="text-muted-foreground">{collection.description}</p>
                </div>
            </div>

            <NFTGrid nfts={nfts} isLoading={isLoading} />
        </div>
    );
}
