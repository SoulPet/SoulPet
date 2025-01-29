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

export function NFTTransferForm() {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [mintAddress, setMintAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            setIsTransferring(true);
            const signature = await service.transferNFT(
                wallet,
                mintAddress,
                toAddress
            );
            toast.success('NFT transferred successfully', {
                description: `Transaction signature: ${signature}`,
            });
        } catch (error) {
            console.error('Failed to transfer NFT:', error);
            toast.error('Failed to transfer NFT', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transfer NFT</CardTitle>
                <CardDescription>
                    Transfer your NFT to another wallet address. This operation is
                    irreversible, please verify the recipient address carefully.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mintAddress">NFT Address</Label>
                        <Input
                            id="mintAddress"
                            placeholder="Enter NFT's mint address"
                            value={mintAddress}
                            onChange={(e) => setMintAddress(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="toAddress">Recipient Address</Label>
                        <Input
                            id="toAddress"
                            placeholder="Enter recipient's wallet address"
                            value={toAddress}
                            onChange={(e) => setToAddress(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={isTransferring || !wallet.publicKey}>
                        {isTransferring ? 'Transferring...' : 'Transfer NFT'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
