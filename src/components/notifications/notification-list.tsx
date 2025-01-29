'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Notification, notificationService } from '@/lib/notification';
import { useWallet } from '@solana/wallet-adapter-react';
import { Bell, Check, Clock, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';

export function NotificationList() {
    const wallet = useWallet();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!wallet.publicKey) return;

        // Load notifications from localStorage
        const savedNotifications = localStorage.getItem(
            `notifications-${wallet.publicKey.toString()}`
        );
        if (savedNotifications) {
            setNotifications(JSON.parse(savedNotifications));
        }
    }, [wallet.publicKey]);

    const markAsRead = (id: string) => {
        if (!wallet.publicKey) return;
        notificationService.markAsRead(wallet.publicKey.toString(), id);
        const updatedNotifications = notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
        );
        setNotifications(updatedNotifications);
    };

    const deleteNotification = (id: string) => {
        if (!wallet.publicKey) return;
        notificationService.deleteNotification(wallet.publicKey.toString(), id);
        const updatedNotifications = notifications.filter(
            (notification) => notification.id !== id
        );
        setNotifications(updatedNotifications);
    };

    const markAllAsRead = () => {
        if (!wallet.publicKey) return;
        notificationService.markAllAsRead(wallet.publicKey.toString());
        const updatedNotifications = notifications.map((notification) => ({
            ...notification,
            read: true,
        }));
        setNotifications(updatedNotifications);
    };

    const clearAll = () => {
        if (!wallet.publicKey) return;
        notificationService.clearAll(wallet.publicKey.toString());
        setNotifications([]);
    };

    if (!wallet.publicKey) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                        Please connect your wallet to view your notifications.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const unreadCount = notifications.filter(
        (notification) => !notification.read
    ).length;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                                    {unreadCount}
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            View your notifications and updates.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button variant="outline" size="sm" onClick={markAllAsRead}>
                                <Check className="mr-2 h-4 w-4" />
                                Mark all as read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button variant="outline" size="sm" onClick={clearAll}>
                                <Trash className="mr-2 h-4 w-4" />
                                Clear all notifications
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {notifications.length === 0 ? (
                    <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                        <Bell className="mb-2 h-12 w-12 text-muted-foreground" />
                        <p className="text-lg font-medium">No notifications</p>
                        <p className="text-sm text-muted-foreground">
                            New notifications will appear here when they occur.
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`relative rounded-lg border p-4 ${notification.read ? 'bg-background' : 'bg-muted'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="font-medium">{notification.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <Clock className="mr-1 h-3 w-3" />
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </div>
                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => markAsRead(notification.id)}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteNotification(notification.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
