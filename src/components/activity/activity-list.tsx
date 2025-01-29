'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityItem } from '@/lib/activity';
import { useWallet } from '@solana/wallet-adapter-react';
import {
    ArrowLeftRight,
    Clock,
    FolderHeart,
    History,
    Plus,
    Trash,
    UserCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function ActivityList() {
    const wallet = useWallet();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [filter, setFilter] = useState<ActivityItem['type'] | 'all'>('all');

    useEffect(() => {
        if (!wallet.publicKey) return;

        // Load activity history from localStorage
        const savedHistory = localStorage.getItem(
            `activity-${wallet.publicKey.toString()}`
        );
        if (savedHistory) {
            setActivities(JSON.parse(savedHistory));
        }
    }, [wallet.publicKey]);

    const filteredActivities = activities.filter(
        (activity) => filter === 'all' || activity.type === filter
    );

    const getActivityIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'transfer':
                return '🔄';
            case 'mint':
                return '🎨';
            case 'burn':
                return '🔥';
            case 'collection':
                return '📁';
            case 'profile':
                return '👤';
            default:
                return '📝';
        }
    };

    if (!wallet.publicKey) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>
                        Please connect your wallet to view your activity history.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>Activity History</CardTitle>
                        <CardDescription>View all your activity records.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="all">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="transfer">
                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                            Transfer
                        </TabsTrigger>
                        <TabsTrigger value="mint">
                            <Plus className="mr-2 h-4 w-4" />
                            Mint
                        </TabsTrigger>
                        <TabsTrigger value="burn">
                            <Trash className="mr-2 h-4 w-4" />
                            Burn
                        </TabsTrigger>
                        <TabsTrigger value="collection">
                            <FolderHeart className="mr-2 h-4 w-4" />
                            Collection
                        </TabsTrigger>
                        <TabsTrigger value="profile">
                            <UserCircle className="mr-2 h-4 w-4" />
                            Profile
                        </TabsTrigger>
                    </TabsList>
                    {filteredActivities.length === 0 ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
                            <History className="mb-2 h-12 w-12 text-muted-foreground" />
                            <p className="text-lg font-medium">No Activity Records</p>
                            <p className="text-sm text-muted-foreground">
                                Your activity records will be displayed here.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                                {filteredActivities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-start gap-4 rounded-lg border p-4"
                                    >
                                        <div className="text-2xl">
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="font-medium">{activity.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {activity.description}
                                            </p>
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Clock className="mr-1 h-3 w-3" />
                                            {new Date(activity.timestamp).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}
