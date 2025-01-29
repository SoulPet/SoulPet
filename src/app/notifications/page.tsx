'use client';

import { NotificationList } from '@/components/notification/notification-list';
import { NotificationPreferences } from '@/components/notification/notification-preferences';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Page component for managing notifications and preferences
 */
export default function NotificationsPage() {
    const { publicKey } = useWallet();
    const navigate = useNavigate();

    useEffect(() => {
        if (!publicKey) {
            navigate('/');
        }
    }, [publicKey, navigate]);

    if (!publicKey) {
        return null;
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-bold">Notifications</h1>
            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-8">
                    <NotificationList userAddress={publicKey.toBase58()} />
                </div>
                <div>
                    <NotificationPreferences
                        userAddress={publicKey.toBase58()}
                        onUpdate={() => {
                            // Optionally refresh notifications when preferences are updated
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
