'use client';

import { Notification, NotificationPriority, NotificationType } from './types';

interface NotificationIcon {
    type: NotificationType;
    icon: string;
    badge?: string;
}

interface NotificationGroup {
    id: string;
    title: string;
    notifications: Notification[];
    timestamp: Date;
    collapsed: boolean;
}

interface NavigationConfig {
    baseUrl: string;
    routes: {
        [key in NotificationType]?: string;
    };
}

interface NotificationTheme {
    id: string;
    name: string;
    styles: {
        backgroundColor: string;
        textColor: string;
        iconSize: string;
        font: string;
        borderRadius: string;
        padding: string;
    };
    animations: {
        show: string;
        hide: string;
    };
}

interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
}

interface NotificationInteraction {
    id: string;
    type: 'show' | 'click' | 'close' | 'action';
    timestamp: Date;
    action?: string;
}

interface OfflineNotification {
    notification: Notification;
    timestamp: Date;
    attempts: number;
}

export class DesktopNotification {
    private static instance: DesktopNotification;
    private enabled: boolean = false;
    private icons: Map<NotificationType, NotificationIcon> = new Map();
    private groups: Map<string, NotificationGroup> = new Map();
    private navigationConfig: NavigationConfig = {
        baseUrl: '/',
        routes: {},
    };
    private groupingEnabled: boolean = true;
    private maxGroupSize: number = 5;
    private groupExpiration: number = 30 * 60 * 1000; // 30 minutes
    private themes: Map<string, NotificationTheme> = new Map();
    private currentTheme: string = 'default';
    private interactions: NotificationInteraction[] = [];
    private maxInteractionHistory: number = 1000;
    private offlineQueue: OfflineNotification[] = [];
    private isOnline: boolean = navigator.onLine;
    private priorityQueue: Map<NotificationPriority, Notification[]> = new Map();

    private constructor() {
        this.initializeIcons();
        this.requestPermission();
        this.startGroupCleanup();
        this.initializeThemes();
        this.setupOfflineSupport();
        this.initializePriorityQueues();
    }

    static getInstance(): DesktopNotification {
        if (!DesktopNotification.instance) {
            DesktopNotification.instance = new DesktopNotification();
        }
        return DesktopNotification.instance;
    }

    private initializeIcons(): void {
        // Initialize default icons
        this.registerIcon({
            type: NotificationType.SYSTEM,
            icon: '/icons/system.png',
            badge: '/icons/badges/system.png',
        });

        this.registerIcon({
            type: NotificationType.NFT_LISTED,
            icon: '/icons/nft.png',
            badge: '/icons/badges/nft.png',
        });

        this.registerIcon({
            type: NotificationType.TOKEN_TRANSFER,
            icon: '/icons/token.png',
            badge: '/icons/badges/token.png',
        });
    }

    private async requestPermission(): Promise<void> {
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notifications');
            return;
        }

        if (Notification.permission === 'granted') {
            this.enabled = true;
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.enabled = permission === 'granted';
        }
    }

    /**
     * Configure navigation routes
     */
    configureNavigation(config: NavigationConfig): void {
        this.navigationConfig = config;
    }

    /**
     * Register notification icon
     */
    registerIcon(icon: NotificationIcon): void {
        this.icons.set(icon.type, icon);
    }

    /**
     * Configure notification grouping
     */
    configureGrouping(config: {
        enabled: boolean;
        maxGroupSize?: number;
        groupExpiration?: number;
    }): void {
        this.groupingEnabled = config.enabled;
        if (config.maxGroupSize !== undefined) {
            this.maxGroupSize = config.maxGroupSize;
        }
        if (config.groupExpiration !== undefined) {
            this.groupExpiration = config.groupExpiration;
        }
    }

    /**
     * Show desktop notification
     */
    async show(notification: Notification): Promise<void> {
        if (!this.enabled || !('Notification' in window)) return;

        try {
            // Add to priority queue
            const queue = this.priorityQueue.get(notification.priority)!;
            queue.push(notification);

            // Process queue based on priority
            await this.processPriorityQueue();
        } catch (error) {
            console.error('Failed to show desktop notification:', error);
        }
    }

    /**
     * Clear all notifications
     */
    clearAll(): void {
        this.groups.clear();
    }

    /**
     * Clear notifications by group
     */
    clearGroup(groupId: string): void {
        this.groups.delete(groupId);
    }

    private async showSingleNotification(
        notification: Notification
    ): Promise<void> {
        const icon = this.getIconForType(notification.type);
        const theme = this.themes.get(this.currentTheme)!;

        // Define notification actions
        const actions: NotificationAction[] = [
            {
                action: 'view',
                title: 'View',
                icon: '/icons/actions/view.png',
            },
        ];

        if (notification.type === NotificationType.NFT_LISTED) {
            actions.push({
                action: 'buy',
                title: 'Buy Now',
                icon: '/icons/actions/buy.png',
            });
        }

        const options: NotificationOptions = {
            icon: icon.icon,
            badge: icon.badge,
            tag: notification.id,
            body: notification.message,
            renotify: notification.priority >= NotificationPriority.HIGH,
            requireInteraction: notification.priority === NotificationPriority.URGENT,
            actions,
            data: {
                ...notification,
                route: this.getNotificationRoute(notification),
                theme: theme.styles,
            },
        };

        if (!this.isOnline) {
            this.queueOfflineNotification(notification);
            return;
        }

        const desktopNotification = new window.Notification(
            notification.title,
            options
        );

        // Track show interaction
        this.trackInteraction({
            id: notification.id,
            type: 'show',
            timestamp: new Date(),
        });

        desktopNotification.onclick = () => {
            this.trackInteraction({
                id: notification.id,
                type: 'click',
                timestamp: new Date(),
            });
            this.handleNotificationClick(notification);
        };

        desktopNotification.onclose = () => {
            this.trackInteraction({
                id: notification.id,
                type: 'close',
                timestamp: new Date(),
            });
        };
    }

    private async showGroupedNotification(
        notification: Notification
    ): Promise<void> {
        const groupId = this.getGroupId(notification);
        let group = this.groups.get(groupId);

        if (!group) {
            group = {
                id: groupId,
                title: this.getGroupTitle(notification),
                notifications: [],
                timestamp: new Date(),
                collapsed: true,
            };
            this.groups.set(groupId, group);
        }

        // Add notification to group
        group.notifications.unshift(notification);
        group.timestamp = new Date();

        // Limit group size
        if (group.notifications.length > this.maxGroupSize) {
            group.notifications = group.notifications.slice(0, this.maxGroupSize);
        }

        // Show group notification
        const icon = this.getIconForType(notification.type);
        const options: NotificationOptions = {
            icon: icon.icon,
            badge: icon.badge,
            tag: groupId,
            body: this.getGroupBody(group),
            renotify: true,
            requireInteraction: false,
            data: {
                groupId,
                route: this.getNotificationRoute(notification),
            },
        };

        const desktopNotification = new window.Notification(group.title, options);

        desktopNotification.onclick = () => {
            this.handleGroupClick(groupId);
        };
    }

    private getIconForType(type: NotificationType): NotificationIcon {
        return (
            this.icons.get(type) || {
                type,
                icon: '/icons/default.png',
                badge: '/icons/badges/default.png',
            }
        );
    }

    private getGroupId(notification: Notification): string {
        return `${notification.type}_${notification.group || 'default'}`;
    }

    private getGroupTitle(notification: Notification): string {
        return `${notification.type} Notifications`;
    }

    private getGroupBody(group: NotificationGroup): string {
        const count = group.notifications.length;
        const latest = group.notifications[0];
        return count === 1
            ? latest.message
            : `${latest.message} and ${count - 1} more notifications`;
    }

    private getNotificationRoute(notification: Notification): string {
        const baseRoute =
            this.navigationConfig.routes[notification.type] ||
            this.navigationConfig.baseUrl;
        return `${baseRoute}/${notification.id}`;
    }

    private handleNotificationClick(notification: Notification): void {
        window.focus();
        window.location.href = this.getNotificationRoute(notification);
    }

    private handleGroupClick(groupId: string): void {
        window.focus();
        const group = this.groups.get(groupId);
        if (group && group.notifications.length > 0) {
            window.location.href = this.getNotificationRoute(group.notifications[0]);
        }
    }

    private startGroupCleanup(): void {
        setInterval(
            () => {
                const now = Date.now();
                for (const [groupId, group] of this.groups.entries()) {
                    if (now - group.timestamp.getTime() > this.groupExpiration) {
                        this.groups.delete(groupId);
                    }
                }
            },
            5 * 60 * 1000
        ); // Check every 5 minutes
    }

    private initializeThemes(): void {
        this.themes.set('default', {
            id: 'default',
            name: 'Default Theme',
            styles: {
                backgroundColor: '#ffffff',
                textColor: '#000000',
                iconSize: '48px',
                font: 'system-ui',
                borderRadius: '8px',
                padding: '16px',
            },
            animations: {
                show: 'slide-in 0.3s ease-out',
                hide: 'fade-out 0.2s ease-in',
            },
        });

        this.themes.set('dark', {
            id: 'dark',
            name: 'Dark Theme',
            styles: {
                backgroundColor: '#1a1a1a',
                textColor: '#ffffff',
                iconSize: '48px',
                font: 'system-ui',
                borderRadius: '8px',
                padding: '16px',
            },
            animations: {
                show: 'slide-in 0.3s ease-out',
                hide: 'fade-out 0.2s ease-in',
            },
        });
    }

    private setupOfflineSupport(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processOfflineQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    private initializePriorityQueues(): void {
        this.priorityQueue.set(NotificationPriority.URGENT, []);
        this.priorityQueue.set(NotificationPriority.HIGH, []);
        this.priorityQueue.set(NotificationPriority.MEDIUM, []);
        this.priorityQueue.set(NotificationPriority.LOW, []);
    }

    /**
     * Set notification theme
     */
    setTheme(themeId: string): void {
        if (this.themes.has(themeId)) {
            this.currentTheme = themeId;
        }
    }

    /**
     * Add custom theme
     */
    addTheme(theme: NotificationTheme): void {
        this.themes.set(theme.id, theme);
    }

    /**
     * Get interaction statistics
     */
    getInteractionStats(): {
        total: number;
        clicks: number;
        closes: number;
        actions: number;
        clickRate: number;
    } {
        const total = this.interactions.length;
        const clicks = this.interactions.filter((i) => i.type === 'click').length;
        const closes = this.interactions.filter((i) => i.type === 'close').length;
        const actions = this.interactions.filter((i) => i.type === 'action').length;

        return {
            total,
            clicks,
            closes,
            actions,
            clickRate: total > 0 ? clicks / total : 0,
        };
    }

    /**
     * Clear interaction history
     */
    clearInteractionHistory(): void {
        this.interactions = [];
    }

    private queueOfflineNotification(notification: Notification): void {
        this.offlineQueue.push({
            notification,
            timestamp: new Date(),
            attempts: 0,
        });
    }

    private async processOfflineQueue(): Promise<void> {
        if (!this.isOnline) return;

        const maxAttempts = 3;
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];

        for (const item of queue) {
            try {
                await this.showSingleNotification(item.notification);
            } catch (error) {
                if (item.attempts < maxAttempts) {
                    item.attempts++;
                    this.offlineQueue.push(item);
                } else {
                    console.error(
                        'Failed to show offline notification after max attempts:',
                        error
                    );
                }
            }
        }
    }

    private trackInteraction(interaction: NotificationInteraction): void {
        this.interactions.push(interaction);
        if (this.interactions.length > this.maxInteractionHistory) {
            this.interactions = this.interactions.slice(-this.maxInteractionHistory);
        }
    }

    private async processPriorityQueue(): Promise<void> {
        const priorities = [
            NotificationPriority.URGENT,
            NotificationPriority.HIGH,
            NotificationPriority.MEDIUM,
            NotificationPriority.LOW,
        ];

        for (const priority of priorities) {
            const queue = this.priorityQueue.get(priority)!;
            while (queue.length > 0) {
                const notification = queue.shift()!;
                if (this.groupingEnabled) {
                    await this.showGroupedNotification(notification);
                } else {
                    await this.showSingleNotification(notification);
                }
            }
        }
    }
}
