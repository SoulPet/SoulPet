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

export function TokenBurnForm() {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [mintAddress, setMintAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [isBurning, setIsBurning] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            setIsBurning(true);
            const signature = await service.burnToken(
                wallet,
                mintAddress,
                parseFloat(amount),
                { commitment: 'confirmed' }
            );
            toast.success('Token burned successfully', {
                description: `Transaction signature: ${signature}`,
            });
        } catch (error) {
            console.error('Failed to burn token:', error);
            toast.error('Failed to burn token', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsBurning(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Burn Token</CardTitle>
                <CardDescription>
                    Burn a specified amount of tokens. This operation is irreversible,
                    please proceed with caution.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="mintAddress">Token Address</Label>
                        <Input
                            id="mintAddress"
                            placeholder="Enter token's mint address"
                            value={mintAddress}
                            onChange={(e) => setMintAddress(e.target.value)}
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
                            placeholder="Enter amount to burn"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isBurning || !wallet.publicKey}
                        variant="destructive"
                    >
                        {isBurning ? 'Burning...' : 'Burn Token'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
