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
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useWallet } from '@solana/wallet-adapter-react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function TokenCreateForm() {
    const { service } = useBlockchain();
    const wallet = useWallet();
    const [decimals, setDecimals] = useState('9');
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.publicKey) {
            toast.error('Please connect your wallet first');
            return;
        }

        try {
            setIsSubmitting(true);
            const mintAddress = await service.createToken(
                wallet,
                parseInt(decimals),
                { commitment: 'confirmed' }
            );
            toast.success('Token created successfully', {
                description: `Mint address: ${mintAddress}`,
            });
        } catch (error) {
            console.error('Failed to create token:', error);
            toast.error('Token creation failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Create New Token</CardTitle>
                <CardDescription>
                    Create a new SPL token. The precision represents the smallest unit of
                    the token, for example, a precision of 9 means 1 token can be divided
                    into 10^9 smallest units.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form onSubmit={handleSubmit} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Token Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter token name" {...field} />
                                </FormControl>
                                <FormDescription>The name of your token</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="symbol"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Token Symbol</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter token symbol" {...field} />
                                </FormControl>
                                <FormDescription>
                                    A short identifier for your token (e.g. BTC, ETH)
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="decimals"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Decimals</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="Enter decimal places"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Number of decimal places for token amounts
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="initialSupply"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Initial Supply</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="Enter initial supply"
                                        {...field}
                                    />
                                </FormControl>
                                <FormDescription>
                                    The initial amount of tokens to mint
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" disabled={isSubmitting || !wallet.publicKey}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Token'
                        )}
                    </Button>
                </Form>
            </CardContent>
        </Card>
    );
}
