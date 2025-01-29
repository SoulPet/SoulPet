'use client';

import { useBlockchain } from '@/components/providers/blockchain-provider';
import { TokenTransferForm } from '@/components/token/token-transfer-form';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { TokenInfo } from '@/lib/token';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function TokensPage() {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [solBalance, setSolBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (wallet.publicKey) {
            loadBalances();
        }
    }, [wallet.publicKey]);

    const loadBalances = async () => {
        if (!wallet.publicKey) return;
        try {
            setIsLoading(true);
            const [tokenBalances, sol] = await Promise.all([
                service.token.getTokenBalances(wallet.publicKey.toString()),
                service.token.getSOLBalance(wallet.publicKey.toString()),
            ]);
            setTokens(tokenBalances);
            setSolBalance(sol);
        } catch (error) {
            console.error('Failed to load balances:', error);
            toast.error('Failed to load token balances');
        } finally {
            setIsLoading(false);
        }
    };

    if (!wallet.publicKey) {
        return (
            <div className="container py-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-3xl font-bold mb-4">Tokens</h1>
                    <p className="text-muted-foreground mb-8">
                        Connect your wallet to view and manage your tokens
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container py-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h1 className="text-3xl font-bold mb-4">Loading...</h1>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold">Tokens</h1>
                    <p className="text-muted-foreground">
                        View and manage your token balances
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Balances</CardTitle>
                                <CardDescription>Your current token balances</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                                        <div>
                                            <div className="font-medium">SOL</div>
                                            <div className="text-sm text-muted-foreground">
                                                Native token
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">
                                                {solBalance.toFixed(6)} SOL
                                            </div>
                                        </div>
                                    </div>

                                    {tokens.map((token) => (
                                        <div
                                            key={token.address}
                                            className="flex justify-between items-center p-3 bg-muted rounded-lg"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {token.symbol || 'Unknown Token'}
                                                </div>
                                                <div className="text-sm text-muted-foreground font-mono">
                                                    {token.address.slice(0, 4)}...
                                                    {token.address.slice(-4)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-medium">
                                                    {token.balance.toFixed(6)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {tokens.length === 0 && (
                                        <div className="text-center py-6 text-muted-foreground">
                                            No tokens found
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Button variant="outline" className="w-full" onClick={loadBalances}>
                            Refresh Balances
                        </Button>
                    </div>

                    <div>
                        <TokenTransferForm />
                    </div>
                </div>
            </div>
        </div>
    );
}
