'use client';

import { Notification, NotificationPriority, NotificationType } from './types';

export interface FilterOptions {
    types?: NotificationType[];
    groups?: string[];
    priorities?: NotificationPriority[];
    startDate?: Date;
    endDate?: Date;
    read?: boolean;
    search?: string;
    tags?: string[];
    customFilter?: (notification: Notification) => boolean;
}

export interface SortOptions {
    field: 'timestamp' | 'priority' | 'type' | 'group';
    direction: 'asc' | 'desc';
}

export interface GroupOptions {
    by: 'type' | 'priority' | 'group' | 'date';
    dateGrouping?: 'day' | 'week' | 'month';
}

export class NotificationFilter {
    private static instance: NotificationFilter;

    private constructor() { }

    static getInstance(): NotificationFilter {
        if (!NotificationFilter.instance) {
            NotificationFilter.instance = new NotificationFilter();
        }
        return NotificationFilter.instance;
    }

    /**
     * Filter notifications based on provided options
     */
    filterNotifications(
        notifications: Notification[],
        options: FilterOptions
    ): Notification[] {
        return notifications.filter((notification) => {
            // Type filter
            if (options.types && !options.types.includes(notification.type)) {
                return false;
            }

            // Group filter
            if (
                options.groups &&
                notification.group &&
                !options.groups.includes(notification.group)
            ) {
                return false;
            }

            // Priority filter
            if (
                options.priorities &&
                !options.priorities.includes(notification.priority)
            ) {
                return false;
            }

            // Date range filter
            if (options.startDate && notification.timestamp < options.startDate) {
                return false;
            }
            if (options.endDate && notification.timestamp > options.endDate) {
                return false;
            }

            // Read status filter
            if (options.read !== undefined && notification.read !== options.read) {
                return false;
            }

            // Search filter
            if (options.search) {
                const searchLower = options.search.toLowerCase();
                const matchesSearch =
                    notification.title.toLowerCase().includes(searchLower) ||
                    notification.message.toLowerCase().includes(searchLower);
                if (!matchesSearch) {
                    return false;
                }
            }

            // Tags filter
            if (options.tags && options.tags.length > 0) {
                const notificationTags = notification.data?.tags || [];
                if (!options.tags.some((tag) => notificationTags.includes(tag))) {
                    return false;
                }
            }

            // Custom filter
            if (options.customFilter && !options.customFilter(notification)) {
                return false;
            }

            return true;
        });
    }

    /**
     * Sort notifications
     */
    sortNotifications(
        notifications: Notification[],
        options: SortOptions
    ): Notification[] {
        return [...notifications].sort((a, b) => {
            let comparison = 0;
            switch (options.field) {
                case 'timestamp':
                    comparison = a.timestamp.getTime() - b.timestamp.getTime();
                    break;
                case 'priority':
                    comparison = this.comparePriorities(a.priority, b.priority);
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
                case 'group':
                    comparison = (a.group || '').localeCompare(b.group || '');
                    break;
            }
            return options.direction === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Group notifications
     */
    groupNotifications(
        notifications: Notification[],
        options: GroupOptions
    ): Map<string, Notification[]> {
        const groups = new Map<string, Notification[]>();

        notifications.forEach((notification) => {
            let groupKey: string;

            switch (options.by) {
                case 'type':
                    groupKey = notification.type;
                    break;
                case 'priority':
                    groupKey = notification.priority;
                    break;
                case 'group':
                    groupKey = notification.group || 'ungrouped';
                    break;
                case 'date':
                    groupKey = this.getDateGroupKey(
                        notification.timestamp,
                        options.dateGrouping || 'day'
                    );
                    break;
                default:
                    groupKey = 'default';
            }

            const groupNotifications = groups.get(groupKey) || [];
            groupNotifications.push(notification);
            groups.set(groupKey, groupNotifications);
        });

        return groups;
    }

    /**
     * Get notification statistics
     */
    getStatistics(notifications: Notification[]): {
        total: number;
        unread: number;
        byType: Record<NotificationType, number>;
        byPriority: Record<NotificationPriority, number>;
        byGroup: Record<string, number>;
        readRate: number;
        averageAgeInHours: number;
    } {
        const stats = {
            total: notifications.length,
            unread: notifications.filter((n) => !n.read).length,
            byType: {} as Record<NotificationType, number>,
            byPriority: {} as Record<NotificationPriority, number>,
            byGroup: {} as Record<string, number>,
            readRate: 0,
            averageAgeInHours: 0,
        };

        // Calculate distributions
        notifications.forEach((notification) => {
            // By type
            stats.byType[notification.type] =
                (stats.byType[notification.type] || 0) + 1;

            // By priority
            stats.byPriority[notification.priority] =
                (stats.byPriority[notification.priority] || 0) + 1;

            // By group
            const group = notification.group || 'ungrouped';
            stats.byGroup[group] = (stats.byGroup[group] || 0) + 1;
        });

        // Calculate read rate
        stats.readRate =
            notifications.length > 0
                ? (notifications.filter((n) => n.read).length / notifications.length) *
                100
                : 0;

        // Calculate average age
        const totalAge = notifications.reduce((sum, n) => {
            return sum + (Date.now() - n.timestamp.getTime());
        }, 0);
        stats.averageAgeInHours =
            notifications.length > 0
                ? totalAge / notifications.length / (1000 * 60 * 60)
                : 0;

        return stats;
    }

    private comparePriorities(
        a: NotificationPriority,
        b: NotificationPriority
    ): number {
        const priorityOrder = {
            [NotificationPriority.URGENT]: 0,
            [NotificationPriority.HIGH]: 1,
            [NotificationPriority.MEDIUM]: 2,
            [NotificationPriority.LOW]: 3,
        };
        return priorityOrder[a] - priorityOrder[b];
    }

    private getDateGroupKey(
        date: Date,
        grouping: 'day' | 'week' | 'month'
    ): string {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const week = this.getWeekNumber(date);

        switch (grouping) {
            case 'day':
                return `${year}-${month}-${day}`;
            case 'week':
                return `${year}-W${week}`;
            case 'month':
                return `${year}-${month}`;
        }
    }

    private getWeekNumber(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }
}
