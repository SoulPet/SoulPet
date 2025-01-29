'use client';

import { NFTListingCard } from '@/components/marketplace/nft-listing-card';
import { useBlockchain } from '@/components/providers/blockchain-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { NFTListing } from '@/lib/marketplace';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function MarketplacePage() {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [listings, setListings] = useState<NFTListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'price' | 'date'>('date');
    const [filterBy, setFilterBy] = useState<'all' | 'mine'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadListings();
    }, [filterBy]);

    const loadListings = async () => {
        try {
            setIsLoading(true);
            let fetchedListings: NFTListing[];

            if (filterBy === 'mine' && wallet.publicKey) {
                fetchedListings = await service.marketplace.getListingsBySeller(
                    wallet.publicKey.toString()
                );
            } else {
                fetchedListings = await service.marketplace.getActiveListings();
            }

            setListings(fetchedListings);
        } catch (error) {
            console.error('Failed to load listings:', error);
            toast.error('Failed to load marketplace listings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuy = async (listingId: string) => {
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            const signature = await service.marketplace.buyNFT(wallet, listingId);
            toast.success('NFT purchased successfully', {
                description: `Transaction signature: ${signature}`,
            });
            loadListings();
        } catch (error) {
            console.error('Failed to buy NFT:', error);
            toast.error('Failed to complete purchase');
        }
    };

    const handleCancel = async (listingId: string) => {
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            await service.marketplace.cancelListing(wallet, listingId);
            toast.success('Listing cancelled successfully');
            loadListings();
        } catch (error) {
            console.error('Failed to cancel listing:', error);
            toast.error('Failed to cancel listing');
        }
    };

    const filteredListings = listings
        .filter((listing) =>
            listing.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'price') {
                return b.price - a.price;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    if (isLoading) {
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
            <div className="mb-8">
                <h1 className="text-3xl font-bold">NFT Marketplace</h1>
                <p className="text-muted-foreground">
                    Browse and trade NFTs from the community
                </p>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-center mb-8">
                <div className="flex-1">
                    <Input
                        placeholder="Search NFTs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <Select
                        value={sortBy}
                        onValueChange={(value: any) => setSortBy(value)}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="date">Latest</SelectItem>
                            <SelectItem value="price">Price: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={filterBy}
                        onValueChange={(value: any) => setFilterBy(value)}
                    >
                        <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Filter by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Listings</SelectItem>
                            <SelectItem value="mine">My Listings</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {filteredListings.length === 0 ? (
                <div className="text-center py-12">
                    <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                    <p className="text-muted-foreground">
                        {filterBy === 'mine'
                            ? "You haven't listed any NFTs yet"
                            : 'No NFTs are currently listed for sale'}
                    </p>
                    {filterBy === 'mine' && (
                        <Button className="mt-4" asChild>
                            <Link to="/nfts">List an NFT</Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredListings.map((listing) => (
                        <NFTListingCard
                            key={listing.id}
                            listing={listing}
                            onBuy={() => handleBuy(listing.id)}
                            onCancel={() => handleCancel(listing.id)}
                            isOwner={wallet.publicKey?.toString() === listing.sellerAddress}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
