'use client';

import { NFTHistory } from '@/components/nft/nft-history';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NFTDisplay } from '@/lib/nft';
import { ExternalLink, FolderPlus, Send, Trash } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface NFTCollection {
    id: string;
    name: string;
    description: string;
    nfts: string[];
    createdAt: number;
    updatedAt: number;
}

interface NFTCardProps {
    nft: NFTDisplay;
    onTransfer?: (mintAddress: string) => void;
    onBurn?: (mintAddress: string) => void;
    isSelected?: boolean;
    onSelect?: (mintAddress: string, selected: boolean) => void;
}

export function NFTCard({
    nft,
    onTransfer,
    onBurn,
    isSelected,
    onSelect,
}: NFTCardProps) {
    const [collections, setCollections] = useState<NFTCollection[]>([]);

    useEffect(() => {
        const savedCollections = localStorage.getItem('nft-collections');
        if (savedCollections) {
            setCollections(JSON.parse(savedCollections));
        }
    }, []);

    const addToCollection = (collectionId: string) => {
        const updatedCollections = collections.map((collection) => {
            if (collection.id === collectionId) {
                if (!collection.nfts.includes(nft.mintAddress)) {
                    return {
                        ...collection,
                        nfts: [...collection.nfts, nft.mintAddress],
                        updatedAt: Date.now(),
                    };
                }
            }
            return collection;
        });
        localStorage.setItem('nft-collections', JSON.stringify(updatedCollections));
        setCollections(updatedCollections);
    };

    return (
        <Card className="group relative overflow-hidden">
            {onSelect && (
                <div className="absolute right-2 top-2 z-10">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                            onSelect(nft.mintAddress, checked as boolean)
                        }
                    />
                </div>
            )}
            <div className="relative aspect-square">
                <Image
                    src={nft.image.toString().replace('ipfs://', 'https://ipfs.io/ipfs/')}
                    alt={nft.name}
                    fill
                    className="object-cover"
                />
            </div>
            <CardHeader>
                <CardTitle className="line-clamp-1">{nft.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                    {nft.description}
                </CardDescription>
            </CardHeader>
            {nft.attributes && nft.attributes.length > 0 && (
                <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                        {nft.attributes.map((attr, index) => (
                            <div
                                key={index}
                                className="rounded-lg border bg-muted p-2 text-sm"
                            >
                                <div className="text-muted-foreground">{attr.trait_type}</div>
                                <div className="font-medium">{attr.value}</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
            <CardFooter className="grid grid-cols-5 gap-2">
                <Button variant="outline" size="icon" asChild>
                    <Link href={`/nft/${nft.mintAddress}`}>
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">View details</span>
                    </Link>
                </Button>
                {onTransfer && (
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onTransfer(nft.mintAddress)}
                    >
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Transfer NFT</span>
                    </Button>
                )}
                {onBurn && (
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onBurn(nft.mintAddress)}
                    >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Burn NFT</span>
                    </Button>
                )}
                <NFTHistory nft={nft} />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <FolderPlus className="h-4 w-4" />
                            <span className="sr-only">Add to collection</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {collections.length === 0 ? (
                            <DropdownMenuItem disabled>No collections</DropdownMenuItem>
                        ) : (
                            collections.map((collection) => {
                                const isInCollection = collection.nfts.includes(
                                    nft.mintAddress
                                );
                                return (
                                    <DropdownMenuItem
                                        key={collection.id}
                                        onClick={() => addToCollection(collection.id)}
                                    >
                                        {isInCollection
                                            ? `Added to ${collection.name}`
                                            : `Add to ${collection.name}`}
                                    </DropdownMenuItem>
                                );
                            })
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>
    );
}
