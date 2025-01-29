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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Notification, NotificationType } from '@/lib/notification';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, Filter, SortDesc, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NotificationListProps {
    userAddress: string;
}

type SortOption = 'newest' | 'oldest' | 'priority';

/**
 * Component for displaying user notifications
 */
export function NotificationList({ userAddress }: NotificationListProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
    const [sortBy, setSortBy] = useState<SortOption>('newest');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, [userAddress]);

    const loadNotifications = async () => {
        try {
            setIsLoading(true);
            // TODO: Load notifications from backend
            const mockNotifications: Notification[] = [
                {
                    id: '1',
                    title: 'NFT Listed',
                    message: 'Your NFT has been listed on the marketplace',
                    type: NotificationType.NFT_LISTED,
                    read: false,
                    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
                },
                {
                    id: '2',
                    title: 'NFT Sold',
                    message: 'Your NFT has been sold for 1.5 SOL',
                    type: NotificationType.NFT_SOLD,
                    read: true,
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                },
            ];
            setNotifications(mockNotifications);
        } catch (error) {
            console.error('Failed to load notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            // TODO: Update notification status in backend
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
            );
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            toast.error('Failed to update notification');
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            // TODO: Delete notification in backend
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            toast.success('Notification deleted');
        } catch (error) {
            console.error('Failed to delete notification:', error);
            toast.error('Failed to delete notification');
        }
    };

    const clearAll = async () => {
        try {
            // TODO: Clear all notifications in backend
            setNotifications([]);
            toast.success('All notifications cleared');
        } catch (error) {
            console.error('Failed to clear notifications:', error);
            toast.error('Failed to clear notifications');
        }
    };

    const filteredAndSortedNotifications = notifications
        .filter((n) => {
            if (showUnreadOnly && n.read) return false;
            if (filterType !== 'all' && n.type !== filterType) return false;
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'oldest':
                    return a.createdAt.getTime() - b.createdAt.getTime();
                case 'priority':
                    return b.type.localeCompare(a.type);
                case 'newest':
                default:
                    return b.createdAt.getTime() - a.createdAt.getTime();
            }
        });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                        {notifications.length
                            ? `You have ${notifications.filter((n) => !n.read).length
                            } unread notifications`
                            : 'No notifications'}
                    </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                    {notifications.length > 0 && (
                        <>
                            <Select
                                value={filterType}
                                onValueChange={(value) =>
                                    setFilterType(value as NotificationType | 'all')
                                }
                            >
                                <SelectTrigger className="w-[140px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Filter by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {Object.values(NotificationType).map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type
                                                .split('_')
                                                .map(
                                                    (word) =>
                                                        word.charAt(0).toUpperCase() +
                                                        word.slice(1).toLowerCase()
                                                )
                                                .join(' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={sortBy}
                                onValueChange={(value) => setSortBy(value as SortOption)}
                            >
                                <SelectTrigger className="w-[140px]">
                                    <SortDesc className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="oldest">Oldest</SelectItem>
                                    <SelectItem value="priority">Priority</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                                className={showUnreadOnly ? 'bg-muted' : ''}
                            >
                                Unread Only
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearAll}
                                className="text-muted-foreground"
                            >
                                Clear All
                            </Button>
                        </>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {filteredAndSortedNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Bell className="h-12 w-12 text-muted-foreground/50" />
                            <p className="mt-2 text-sm text-muted-foreground">
                                No notifications to display
                            </p>
                        </div>
                    ) : (
                        filteredAndSortedNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`flex items-start space-x-4 rounded-lg border p-4 ${notification.read ? 'bg-background' : 'bg-muted'
                                    }`}
                            >
                                <div className="flex-1 space-y-1">
                                    <p className="font-medium leading-none">
                                        {notification.title}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(notification.createdAt, {
                                            addSuffix: true,
                                        })}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
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
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
