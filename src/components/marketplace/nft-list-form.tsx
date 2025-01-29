'use client';

import { useBlockchain } from '@/components/providers/blockchain-provider';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@solana/wallet-adapter-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface NFTListFormProps {
    mintAddress: string;
    onSuccess?: () => void;
}

/**
 * Form component for listing an NFT in the marketplace
 */
export function NFTListForm({ mintAddress, onSuccess }: NFTListFormProps) {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [price, setPrice] = useState('');
    const [isListing, setIsListing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!price || parseFloat(price) <= 0) {
            toast.error('Please enter a valid price');
            return;
        }

        try {
            setIsListing(true);
            const listingId = await service.marketplace.listNFT(
                wallet,
                mintAddress,
                parseFloat(price)
            );
            toast.success('NFT listed successfully', {
                description: `Listing ID: ${listingId}`,
            });
            onSuccess?.();
        } catch (error) {
            console.error('Failed to list NFT:', error);
            toast.error('Failed to list NFT', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsListing(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>List NFT for Sale</CardTitle>
                <CardDescription>
                    Set a price for your NFT and list it on the marketplace.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="price">Price (SOL)</Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.000000001"
                            min="0"
                            placeholder="Enter price in SOL"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={isListing || !wallet.publicKey}>
                        {isListing ? 'Listing...' : 'List for Sale'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
