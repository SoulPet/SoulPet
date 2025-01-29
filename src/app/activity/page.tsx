'use client';

import { ActivityList } from '@/components/activity/activity-list';

export default function ActivityPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Activity History</h1>
                    <p className="text-muted-foreground">
                        View your recent activity and transactions.
                    </p>
                </div>
                <ActivityList />
            </div>
        </div>
    );
}
