'use client';

import { useBlockchain } from '@/components/providers/blockchain-provider';
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
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TokenInfoProps {
    mintAddress: string;
}

export function TokenInfo({ mintAddress }: TokenInfoProps) {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [tokenInfo, setTokenInfo] = useState<{
        decimals: number;
        supply: string;
        authority: string;
        balance?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadTokenInfo = async () => {
            if (!mintAddress) return;

            try {
                setIsLoading(true);
                const info = await service.getTokenInfo(mintAddress);
                let balance;
                if (wallet.publicKey) {
                    const balanceInfo = await service.getTokenBalance(
                        wallet.publicKey.toBase58(),
                        mintAddress
                    );
                    balance = (
                        Number(balanceInfo.amount) / Math.pow(10, balanceInfo.decimals)
                    ).toString();
                }

                setTokenInfo({
                    decimals: info.decimals,
                    supply: (
                        Number(info.supply) / Math.pow(10, info.decimals)
                    ).toString(),
                    authority: info.authority,
                    balance,
                });
            } catch (error) {
                console.error('Failed to load token info:', error);
                toast.error('Failed to load token info', {
                    description: error instanceof Error ? error.message : 'Unknown error',
                });
            } finally {
                setIsLoading(false);
            }
        };

        if (wallet.publicKey) {
            loadTokenInfo();
        }
    }, [mintAddress, service, wallet.publicKey]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Token Info</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!tokenInfo) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Token Info</CardTitle>
                    <CardDescription>Token not found</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Token Info</CardTitle>
                <CardDescription>
                    View basic token information and balance.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Token Address</Label>
                    <Input value={mintAddress} readOnly />
                </div>
                <div className="space-y-2">
                    <Label>Decimals</Label>
                    <Input value={tokenInfo.decimals} readOnly />
                </div>
                <div className="space-y-2">
                    <Label>Total Supply</Label>
                    <Input value={tokenInfo.supply} readOnly />
                </div>
                <div className="space-y-2">
                    <Label>Mint Authority</Label>
                    <Input value={tokenInfo.authority} readOnly />
                </div>
                {tokenInfo.balance && (
                    <div className="space-y-2">
                        <Label>Current Balance</Label>
                        <Input value={tokenInfo.balance} readOnly />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
