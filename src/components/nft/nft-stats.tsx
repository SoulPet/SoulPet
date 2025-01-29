'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { NFTDisplay } from '@/lib/nft';
import Image from 'next/image';

interface NFTStatsProps {
    nfts: NFTDisplay[];
}

interface AttributeStats {
    [key: string]: {
        [value: string]: number;
    };
}

interface RarityScore {
    nft: NFTDisplay;
    score: number;
}

export function NFTStats({ nfts }: NFTStatsProps) {
    // Calculate attribute statistics
    const attributeStats = nfts.reduce(
        (stats, nft) => {
            nft.attributes?.forEach((attr) => {
                if (!stats[attr.trait_type]) {
                    stats[attr.trait_type] = {};
                }
                if (!stats[attr.trait_type][attr.value]) {
                    stats[attr.trait_type][attr.value] = 0;
                }
                stats[attr.trait_type][attr.value]++;
            });
            return stats;
        },
        {} as Record<string, Record<string, number>>
    );

    // Calculate rarity scores
    const rarityScores = nfts.map((nft) => {
        let score = 0;
        nft.attributes?.forEach((attr) => {
            // Rarity score = 1 / (number of NFTs with this attribute value / total number of NFTs)
            const count = attributeStats[attr.trait_type][attr.value];
            score += 1 / (count / nfts.length);
        });
        return {
            nft,
            score,
        };
    });

    // Sort by rarity score
    const sortedByRarity = [...rarityScores].sort((a, b) => b.score - a.score);

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Total Supply</CardTitle>
                    <CardDescription>
                        Total number of NFTs in the collection
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{nfts.length}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle>Attribute Distribution</CardTitle>
                        <CardDescription>
                            View the distribution of attributes in the collection
                        </CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">View Details</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Attribute Distribution</DialogTitle>
                                <DialogDescription>
                                    Distribution of attributes in the NFT collection
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {Object.entries(attributeStats).map(([trait, values]) => (
                                    <div key={trait} className="space-y-2">
                                        <h4 className="font-medium">{trait}</h4>
                                        <div className="grid gap-2">
                                            {Object.entries(values)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([value, count]) => (
                                                    <div
                                                        key={value}
                                                        className="flex items-center justify-between"
                                                    >
                                                        <span>{value}</span>
                                                        <span className="text-muted-foreground">
                                                            {count} (
                                                            {((count / nfts.length) * 100).toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle>Rarity Ranking</CardTitle>
                        <CardDescription>
                            View the rarity ranking of NFTs in the collection
                        </CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">View Details</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                            <DialogHeader>
                                <DialogTitle>Rarity Ranking</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                {sortedByRarity.map(({ nft, score }, index) => (
                                    <div
                                        key={nft.mintAddress}
                                        className="flex items-center space-x-4"
                                    >
                                        <div className="text-muted-foreground">#{index + 1}</div>
                                        <Image
                                            src={nft.image}
                                            alt={nft.name}
                                            width={48}
                                            height={48}
                                            className="rounded-lg"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">{nft.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Score: {score.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
            </Card>
        </div>
    );
}
