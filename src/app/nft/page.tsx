'use client';

import { ErrorBoundary } from '@/components/error/error-boundary';
import { BatchOperationsDialog } from '@/components/nft/batch-operations-dialog';
import { useNFT } from '@/components/providers/nft-provider';
import { useWallet } from '@/components/providers/wallet-provider';
import { TransactionHistoryDialog } from '@/components/transaction/transaction-history';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { formatError, retryWithBackoff } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function NFTListPage() {
    const { wallet } = useWallet();
    const { service } = useNFT();
    const [nfts, setNfts] = useState<any[]>([]);
    const [selectedNfts, setSelectedNfts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasRetried, setHasRetried] = useState(false);

    const loadNFTs = useCallback(async () => {
        if (!service || !wallet?.publicKey) return;

        try {
            setIsLoading(true);
            const userNfts = await retryWithBackoff(
                () => service.getNFTsByOwner(wallet.publicKey!),
                3,
                1000
            );
            setNfts(userNfts);
        } catch (error: any) {
            toast.error(formatError(error));
            setIsRetrying(true);
            // Auto retry once
            if (!hasRetried) {
                setHasRetried(true);
                try {
                    await sleep(2000);
                    const userNfts = await service.getNFTsByOwner(wallet.publicKey);
                    setNfts(userNfts);
                    setIsRetrying(false);
                } catch (retryError: any) {
                    toast.error('Failed to load NFTs after retry');
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [service, wallet?.publicKey, hasRetried]);

    const loadTransactions = useCallback(async () => {
        if (!service || !wallet?.publicKey) return;

        try {
            setIsLoadingTransactions(true);
            const history = await retryWithBackoff(
                () => service.getTransactionHistory(wallet.publicKey!.toString()),
                3,
                1000
            );
            setTransactions(history);
        } catch (error: any) {
            toast.error(formatError(error));
        } finally {
            setIsLoadingTransactions(false);
        }
    }, [service, wallet?.publicKey]);

    useEffect(() => {
        loadNFTs();
        loadTransactions();
    }, [loadNFTs, loadTransactions]);

    useEffect(() => {
        // Auto retry once
        if (error && !hasRetried) {
            setHasRetried(true);
            loadNFTs();
        }
    }, [error, hasRetried, loadNFTs]);

    const filteredNfts = nfts.filter((nft) => {
        const searchLower = searchQuery.toLowerCase();
        return (
            nft.json?.name?.toLowerCase().includes(searchLower) ||
            nft.json?.symbol?.toLowerCase().includes(searchLower) ||
            nft.address.toString().toLowerCase().includes(searchLower)
        );
    });

    const handleSelectNft = (nft: any) => {
        if (selectedNfts.some((n) => n.address.equals(nft.address))) {
            setSelectedNfts(
                selectedNfts.filter((n) => !n.address.equals(nft.address))
            );
        } else {
            setSelectedNfts([...selectedNfts, nft]);
        }
    };

    const handleSelectAll = () => {
        if (selectedNfts.length === filteredNfts.length) {
            setSelectedNfts([]);
        } else {
            setSelectedNfts(filteredNfts);
        }
    };

    if (!wallet?.publicKey) {
        return (
            <div className="container mx-auto py-8">
                <Card className="p-6 text-center">
                    <h2 className="text-xl font-semibold mb-4">
                        Connect your wallet to view NFTs
                    </h2>
                    <p className="text-gray-500">
                        You need to connect a wallet to view and manage your NFTs
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold">My NFTs</h1>
                        {(isLoading || isRetrying) && (
                            <LoadingSpinner size="sm" className="ml-2" />
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <TransactionHistoryDialog
                            transactions={transactions}
                            isLoading={isLoadingTransactions}
                            onRefresh={loadTransactions}
                        />
                        {selectedNfts.length > 0 && (
                            <BatchOperationsDialog
                                nfts={selectedNfts}
                                onSuccess={() => {
                                    loadNFTs();
                                    setSelectedNfts([]);
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="mb-6">
                    <Input
                        placeholder="Search NFTs..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setSearchQuery(e.target.value)
                        }
                        className="max-w-md"
                    />
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Card key={i} className="p-4">
                                <div className="relative">
                                    <Skeleton className="aspect-square rounded-lg mb-4" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <LoadingSpinner size="lg" className="opacity-50" />
                                    </div>
                                </div>
                                <Skeleton className="h-4 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </Card>
                        ))}
                    </div>
                ) : filteredNfts.length > 0 ? (
                    <>
                        <div className="mb-4">
                            <label className="flex items-center space-x-2">
                                <Checkbox
                                    checked={selectedNfts.length === filteredNfts.length}
                                    onCheckedChange={handleSelectAll}
                                />
                                <span>Select All</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredNfts.map((nft) => (
                                <Card
                                    key={nft.address.toString()}
                                    className="p-4 relative group hover:shadow-lg transition-shadow"
                                >
                                    <div className="absolute top-2 left-2 z-10">
                                        <Checkbox
                                            checked={selectedNfts.some((n) =>
                                                n.address.equals(nft.address)
                                            )}
                                            onCheckedChange={() => handleSelectNft(nft)}
                                        />
                                    </div>
                                    <div className="relative">
                                        <img
                                            src={nft.json?.image || ''}
                                            alt={nft.json?.name || 'NFT'}
                                            className="w-full aspect-square object-cover rounded-lg mb-4"
                                            onError={(e) => {
                                                e.currentTarget.src = '/placeholder.png';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg" />
                                    </div>
                                    <h3 className="font-semibold mb-1 truncate">
                                        {nft.json?.name || 'Unnamed NFT'}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate">
                                        {nft.json?.symbol || 'No Symbol'}
                                    </p>
                                    <div className="mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() =>
                                                (window.location.href = `/nft/${nft.address}`)
                                            }
                                        >
                                            View Details
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </>
                ) : (
                    <Card className="p-6 text-center">
                        <h2 className="text-xl font-semibold mb-4">No NFTs Found</h2>
                        <p className="text-gray-500">
                            {searchQuery
                                ? 'No NFTs match your search criteria'
                                : "You don't have any NFTs yet"}
                        </p>
                    </Card>
                )}
            </div>
        </ErrorBoundary>
    );
}
