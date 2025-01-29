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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { TokenInfo } from '@/lib/token';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Form component for transferring tokens
 */
export function TokenTransferForm() {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [selectedToken, setSelectedToken] = useState<string>('SOL');
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);
    const [balance, setBalance] = useState<number>(0);

    useEffect(() => {
        if (wallet.publicKey) {
            loadTokens();
        }
    }, [wallet.publicKey]);

    useEffect(() => {
        if (wallet.publicKey) {
            loadBalance();
        }
    }, [wallet.publicKey, selectedToken]);

    const loadTokens = async () => {
        if (!wallet.publicKey) return;
        try {
            const tokenBalances = await service.token.getTokenBalances(
                wallet.publicKey.toString()
            );
            setTokens(tokenBalances);
        } catch (error) {
            console.error('Failed to load tokens:', error);
        }
    };

    const loadBalance = async () => {
        if (!wallet.publicKey) return;
        try {
            if (selectedToken === 'SOL') {
                const solBalance = await service.token.getSOLBalance(
                    wallet.publicKey.toString()
                );
                setBalance(solBalance);
            } else {
                const tokenBalance = await service.token.getTokenBalance(
                    wallet.publicKey.toString(),
                    selectedToken
                );
                setBalance(tokenBalance);
            }
        } catch (error) {
            console.error('Failed to load balance:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        if (!toAddress) {
            toast.error('Please enter a recipient address');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (parseFloat(amount) > balance) {
            toast.error('Insufficient balance');
            return;
        }

        try {
            setIsTransferring(true);
            let signature: string;

            if (selectedToken === 'SOL') {
                signature = await service.token.transferSOL(
                    wallet,
                    toAddress,
                    parseFloat(amount)
                );
            } else {
                signature = await service.token.transferToken(
                    wallet,
                    selectedToken,
                    toAddress,
                    parseFloat(amount)
                );
            }

            toast.success('Transfer successful', {
                description: `Transaction signature: ${signature}`,
            });

            // Reset form
            setToAddress('');
            setAmount('');
            loadBalance();
        } catch (error) {
            console.error('Failed to transfer:', error);
            toast.error('Transfer failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transfer Tokens</CardTitle>
                <CardDescription>
                    Send tokens or SOL to another wallet address
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Token</Label>
                        <Select value={selectedToken} onValueChange={setSelectedToken}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SOL">SOL</SelectItem>
                                {tokens.map((token) => (
                                    <SelectItem key={token.address} value={token.address}>
                                        {token.symbol || token.address}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Balance: {balance.toFixed(6)}{' '}
                            {selectedToken === 'SOL'
                                ? 'SOL'
                                : tokens.find((t) => t.address === selectedToken)?.symbol ||
                                'tokens'}
                        </p>
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

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.000000001"
                            min="0"
                            placeholder="Enter amount to transfer"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={isTransferring || !wallet.publicKey}
                        className="w-full"
                    >
                        {isTransferring ? 'Transferring...' : 'Transfer'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
