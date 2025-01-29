'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NFTDisplay, NFTService } from '@/lib/nft';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TransferDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (recipientAddress: string) => Promise<void>;
}

function TransferDialog({ isOpen, onClose, onConfirm }: TransferDialogProps) {
    const [recipientAddress, setRecipientAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            await onConfirm(recipientAddress);
            onClose();
        } catch (error) {
            // Error is handled by the parent component
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Transfer NFT</DialogTitle>
                    <DialogDescription>
                        Enter the recipient&apos;s wallet address to transfer the NFT.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="recipient">Recipient Address</Label>
                            <Input
                                id="recipient"
                                placeholder="Enter recipient's wallet address"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Transferring...' : 'Transfer'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface BurnDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

function BurnDialog({ isOpen, onClose, onConfirm }: BurnDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = async () => {
        try {
            setIsLoading(true);
            await onConfirm();
            onClose();
        } catch (error) {
            // Error is handled by the parent component
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Burn NFT</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to burn this NFT? This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Burning...' : 'Burn NFT'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function NFTsPage() {
    const router = useRouter();
    const wallet = useWallet();
    const { connection } = useConnection();
    const [nfts, setNfts] = useState<NFTDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedNFTs, setSelectedNFTs] = useState<Set<string>>(new Set());
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [isBurnDialogOpen, setIsBurnDialogOpen] = useState(false);
    const [filteredNFTs, setFilteredNFTs] = useState<NFTDisplay[]>([]);

    useEffect(() => {
        if (!wallet.publicKey) {
            setNfts([]);
            setIsLoading(false);
            return;
        }

        const fetchNFTs = async () => {
            try {
                setIsLoading(true);
                const nftService = new NFTService(connection);
                const userNFTs = await nftService.getNFTsByOwner(wallet.publicKey!);

                const nftData = await Promise.all(
                    userNFTs.map(async (nft) => {
                        const metadata = await fetch(nft.uri).then((res) => res.json());
                        return {
                            mintAddress: nft.address.toString(),
                            name: metadata.name,
                            description: metadata.description,
                            image: metadata.image,
                            attributes: metadata.attributes || [],
                        };
                    })
                );

                setNfts(nftData);
            } catch (error) {
                console.error('Failed to fetch NFTs:', error);
                toast.error('Failed to fetch NFTs');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNFTs();
    }, [wallet.publicKey, connection]);

    const handleTransfer = async (recipientAddress: string) => {
        if (!wallet.publicKey || selectedNFTs.size === 0) return;

        try {
            const nftService = new NFTService(connection);
            nftService.setWallet(wallet);
            await nftService.batchTransferNFTs(
                Array.from(selectedNFTs).map((mintAddress) => ({
                    mintAddress,
                    toAddress: recipientAddress,
                }))
            );
            toast.success('NFTs transferred successfully');
            setSelectedNFTs(new Set());
            // Refresh NFT list
            router.refresh();
        } catch (error) {
            console.error('Failed to transfer NFTs:', error);
            toast.error('Failed to transfer NFTs');
            throw error;
        }
    };

    const handleBurn = async () => {
        if (!wallet.publicKey || selectedNFTs.size === 0) return;

        try {
            const nftService = new NFTService(connection);
            nftService.setWallet(wallet);
            await nftService.batchBurnNFTs(Array.from(selectedNFTs));
            toast.success('NFTs burned successfully');
            setSelectedNFTs(new Set());
            // Refresh NFT list
            router.refresh();
        } catch (error) {
            console.error('Failed to burn NFTs:', error);
            toast.error('Failed to burn NFTs');
            throw error;
        }
    };

    const handleSelect = (mintAddress: string, selected: boolean) => {
        const newSelected = new Set(selectedNFTs);
        if (selected) {
            newSelected.add(mintAddress);
        } else {
            newSelected.delete(mintAddress);
        }
        setSelectedNFTs(newSelected);
    };

    const handleCollectionClick = (collection: any) => {
        router.push(`/collections/${collection.id}`);
    };

    if (!wallet.publicKey) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <h3 className="text-lg font-semibold">Connect Wallet to View NFTs</h3>
                    <p className="mt-2 text-muted-foreground">
                        Please connect your wallet to view your NFTs.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">My NFTs</h2>
                <div className="flex items-center gap-4">
                    {selectedNFTs.size > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => setSelectedNFTs(new Set())}
                        >
                            Deselect ({selectedNFTs.size})
                        </Button>
                    )}
                    <NFTBatchUpload onUpload={handleUpload} />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {nfts.map((nft) => (
                    <NFTCard
                        key={nft.mintAddress}
                        nft={nft}
                        onTransfer={handleTransfer}
                        onBurn={handleBurn}
                        isSelected={selectedNFTs.has(nft.mintAddress)}
                        onSelect={handleSelect}
                    />
                ))}
            </div>
        </div>
    );
}
