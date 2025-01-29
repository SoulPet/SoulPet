interface ActivityItem {
    id: string;
    type: 'transfer' | 'mint' | 'burn' | 'collection' | 'profile';
    title: string;
    description: string;
    timestamp: number;
}

class ActivityService {
    private static instance: ActivityService;
    private constructor() { }

    static getInstance(): ActivityService {
        if (!ActivityService.instance) {
            ActivityService.instance = new ActivityService();
        }
        return ActivityService.instance;
    }

    private getActivities(walletAddress: string): ActivityItem[] {
        const savedActivities = localStorage.getItem(`activities-${walletAddress}`);
        return savedActivities ? JSON.parse(savedActivities) : [];
    }

    private saveActivities(
        walletAddress: string,
        activities: ActivityItem[]
    ): void {
        localStorage.setItem(
            `activities-${walletAddress}`,
            JSON.stringify(activities)
        );
    }

    addActivity(
        walletAddress: string,
        activity: Omit<ActivityItem, 'id' | 'timestamp'>
    ): void {
        const activities = this.getActivities(walletAddress);
        const newActivity: ActivityItem = {
            ...activity,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        this.saveActivities(walletAddress, [newActivity, ...activities]);
    }

    // Add NFT transfer activity
    addNFTTransferActivity(
        from: string,
        to: string,
        tokenId: string,
        metadata: Record<string, unknown>
    ): void {
        const activity = {
            type: 'nft_transfer',
            timestamp: Date.now(),
            data: {
                from,
                to,
                tokenId,
                metadata,
            },
        };
        this.addActivity(activity);
    }

    // Add NFT mint activity
    addNFTMintActivity(
        owner: string,
        tokenId: string,
        metadata: Record<string, unknown>
    ): void {
        const activity = {
            type: 'nft_mint',
            timestamp: Date.now(),
            data: {
                owner,
                tokenId,
                metadata,
            },
        };
        this.addActivity(activity);
    }

    // Add NFT burn activity
    addNFTBurnActivity(owner: string, tokenId: string): void {
        const activity = {
            type: 'nft_burn',
            timestamp: Date.now(),
            data: {
                owner,
                tokenId,
            },
        };
        this.addActivity(activity);
    }

    // Add favorite activity
    addFavoriteActivity(
        userId: string,
        itemType: string,
        itemId: string,
        metadata?: Record<string, unknown>
    ): void {
        const activity = {
            type: 'favorite',
            timestamp: Date.now(),
            data: {
                userId,
                itemType,
                itemId,
                metadata,
            },
        };
        this.addActivity(activity);
    }

    // Add profile activity
    addProfileActivity(
        userId: string,
        action: string,
        metadata?: Record<string, unknown>
    ): void {
        const activity = {
            type: 'profile',
            timestamp: Date.now(),
            data: {
                userId,
                action,
                metadata,
            },
        };
        this.addActivity(activity);
    }

    // Get activities by type
    getActivitiesByType(
        walletAddress: string,
        type: ActivityItem['type']
    ): ActivityItem[] {
        const activities = this.getActivities(walletAddress);
        return activities.filter((activity) => activity.type === type);
    }

    // Clear all activities
    clearActivities(walletAddress: string): void {
        this.saveActivities(walletAddress, []);
    }
}

export const activityService = ActivityService.getInstance();
export type { ActivityItem };
