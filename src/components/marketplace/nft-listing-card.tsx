'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { NFTListing } from '@/lib/marketplace';
import { formatDistance } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';

interface NFTListingCardProps {
    listing: NFTListing;
    onBuy?: () => void;
    onCancel?: () => void;
    isOwner?: boolean;
}

/**
 * Component for displaying an NFT listing card in the marketplace
 */
export function NFTListingCard({
    listing,
    onBuy,
    onCancel,
    isOwner = false,
}: NFTListingCardProps) {
    const timeAgo = formatDistance(new Date(listing.createdAt), new Date(), {
        addSuffix: true,
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="truncate">{listing.name}</CardTitle>
                <CardDescription>Listed {timeAgo}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-square relative rounded-lg overflow-hidden mb-4">
                    <Image
                        src={listing.image}
                        alt={listing.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-bold">{listing.price} SOL</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Seller</span>
                        <span className="font-mono text-sm truncate max-w-[200px]">
                            {listing.sellerAddress}
                        </span>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                    <Link href={`/nft/${listing.mintAddress}`}>View Details</Link>
                </Button>
                {isOwner ? (
                    <Button
                        variant="destructive"
                        onClick={onCancel}
                        disabled={listing.status !== 'active'}
                    >
                        Cancel Listing
                    </Button>
                ) : (
                    <Button onClick={onBuy} disabled={listing.status !== 'active'}>
                        Buy Now
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
