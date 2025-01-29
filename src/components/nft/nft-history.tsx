'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { NFTDisplay } from '@/lib/nft';
import { useConnection } from '@solana/wallet-adapter-react';
import {
    Connection,
    ParsedTransactionWithMeta,
    PublicKey,
} from '@solana/web3.js';
import { History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface NFTHistoryProps {
    nft: NFTDisplay;
}

interface NFTActivity {
    signature: string;
    type: 'transfer' | 'burn';
    from: string;
    to?: string;
    timestamp: number;
}

async function getTransactionHistory(
    connection: Connection,
    mintAddress: string,
    limit = 10
): Promise<NFTActivity[]> {
    const mint = new PublicKey(mintAddress);
    const signatures = await connection.getSignaturesForAddress(mint, { limit });

    const activities: NFTActivity[] = [];
    const transactions = await connection.getParsedTransactions(
        signatures.map((sig) => sig.signature)
    );

    transactions.forEach((tx, index) => {
        if (!tx) return;

        const timestamp = signatures[index].blockTime || 0;
        const activity = parseNFTActivity(tx, mintAddress, timestamp);
        if (activity) {
            activities.push(activity);
        }
    });

    return activities;
}

function parseNFTActivity(
    tx: ParsedTransactionWithMeta,
    mintAddress: string,
    timestamp: number
): NFTActivity | null {
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
        if ('parsed' in ix && ix.parsed.type === 'transferChecked') {
            return {
                signature: tx.transaction.signatures[0],
                type: 'transfer',
                from: ix.parsed.info.authority,
                to: ix.parsed.info.destination,
                timestamp,
            };
        }
        if ('parsed' in ix && ix.parsed.type === 'burn') {
            return {
                signature: tx.transaction.signatures[0],
                type: 'burn',
                from: ix.parsed.info.authority,
                timestamp,
            };
        }
    }
    return null;
}

function formatAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
}

export function NFTHistory({ nft }: NFTHistoryProps) {
    const { connection } = useConnection();
    const [activities, setActivities] = useState<NFTActivity[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setIsLoading(true);
                const history = await getTransactionHistory(
                    connection,
                    nft.mintAddress
                );
                setActivities(history);
            } catch (error) {
                console.error('Failed to fetch NFT history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();
    }, [connection, nft.mintAddress]);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                    <History className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>NFT History</DialogTitle>
                    <DialogDescription>
                        View NFT transfer and burn history
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center text-muted-foreground">Loading...</div>
                    ) : activities.length === 0 ? (
                        <div className="text-center text-muted-foreground">
                            No history records
                        </div>
                    ) : (
                        activities.map((record) => (
                            <div
                                key={record.signature}
                                className="flex flex-col space-y-2 rounded-lg border p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <Badge
                                        variant={
                                            record.type === 'transfer' ? 'default' : 'destructive'
                                        }
                                    >
                                        {record.type === 'transfer' ? 'Transfer' : 'Burn'}
                                    </Badge>
                                    <time className="text-sm text-muted-foreground">
                                        {new Date(record.timestamp).toLocaleString()}
                                    </time>
                                </div>
                                <div className="space-y-2">
                                    <div className="space-y-1">
                                        <div className="text-sm text-muted-foreground">From</div>
                                        <div className="font-mono text-sm">
                                            {formatAddress(record.from)}
                                        </div>
                                    </div>
                                    {record.type === 'transfer' && (
                                        <div className="space-y-1">
                                            <div className="text-sm text-muted-foreground">To</div>
                                            <div className="font-mono text-sm">
                                                {record.to ? formatAddress(record.to) : 'N/A'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" className="w-full" asChild>
                                    <Link
                                        to={`https://solscan.io/tx/${record.signature}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        View Transaction Details
                                    </Link>
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
