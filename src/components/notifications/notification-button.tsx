'use client';

import { Button } from '@/components/ui/button';
import { notificationService } from '@/lib/notification';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function NotificationButton() {
    const wallet = useWallet();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!wallet.publicKey) {
            setUnreadCount(0);
            return;
        }

        // Initialize unread count
        const count = notificationService.getUnreadCount(
            wallet.publicKey.toString()
        );
        setUnreadCount(count);

        // Listen for localStorage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === `notifications-${wallet.publicKey.toString()}`) {
                const count = notificationService.getUnreadCount(
                    wallet.publicKey.toString()
                );
                setUnreadCount(count);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [wallet.publicKey]);

    return (
        <Button variant="ghost" size="icon" asChild className="relative">
            <Link href="/notifications">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                        {unreadCount}
                    </span>
                )}
                <span className="sr-only">View notifications</span>
            </Link>
        </Button>
    );
}
