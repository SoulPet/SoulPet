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

export function TokenMintForm() {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [mintAddress, setMintAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [isMinting, setIsMinting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            setIsMinting(true);
            const signature = await service.mintToken(
                wallet,
                mintAddress,
                toAddress,
                parseFloat(amount),
                { commitment: 'confirmed' }
            );
            toast.success('Token minted successfully', {
                description: `Transaction signature: ${signature}`,
            });
        } catch (error) {
            console.error('Failed to mint token:', error);
            toast.error('Failed to mint token', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsMinting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Mint Token</CardTitle>
                <CardDescription>
                    Mint new tokens to a target address for a specified token.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mintAddress">Token Address</Label>
                        <Input
                            id="mintAddress"
                            placeholder="Enter the Mint address of the token"
                            value={mintAddress}
                            onChange={(e) => setMintAddress(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="toAddress">To Address</Label>
                        <Input
                            id="toAddress"
                            placeholder="Enter the wallet address to receive the tokens"
                            value={toAddress}
                            onChange={(e) => setToAddress(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Enter the amount to mint"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <Button type="submit" disabled={isMinting || !wallet.publicKey}>
                        {isMinting ? 'Minting...' : 'Mint Token'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
