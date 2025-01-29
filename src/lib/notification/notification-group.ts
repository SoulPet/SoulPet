import { Notification, NotificationType } from './types';

interface GroupConfig {
    id: string;
    name: string;
    description?: string;
    rules: GroupRule[];
    collapsed?: boolean;
    maxSize?: number;
    autoExpire?: number; // milliseconds
    actions?: GroupAction[];
}

interface GroupRule {
    field: keyof Notification | string;
    operator:
    | 'equals'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'matches'
    | 'exists';
    value?: any;
    path?: string[]; // For nested fields
}

interface GroupAction {
    id: string;
    label: string;
    handler: (notifications: Notification[]) => Promise<void>;
}

interface GroupedNotifications {
    id: string;
    name: string;
    notifications: Notification[];
    collapsed: boolean;
    lastUpdated: Date;
}

export class NotificationGroupManager {
    private static instance: NotificationGroupManager;
    private groups: Map<string, GroupConfig> = new Map();
    private groupedNotifications: Map<string, GroupedNotifications> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.initializeDefaultGroups();
        this.startCleanup();
    }

    static getInstance(): NotificationGroupManager {
        if (!NotificationGroupManager.instance) {
            NotificationGroupManager.instance = new NotificationGroupManager();
        }
        return NotificationGroupManager.instance;
    }

    private initializeDefaultGroups() {
        // System notifications group
        this.addGroup({
            id: 'system',
            name: 'System Notifications',
            rules: [
                {
                    field: 'type',
                    operator: 'equals',
                    value: NotificationType.SYSTEM,
                },
            ],
            collapsed: false,
        });

        // NFT notifications group
        this.addGroup({
            id: 'nft',
            name: 'NFT Notifications',
            rules: [
                {
                    field: 'type',
                    operator: 'equals',
                    value: NotificationType.NFT_LISTED,
                },
            ],
            collapsed: true,
            maxSize: 50,
        });

        // Token notifications group
        this.addGroup({
            id: 'token',
            name: 'Token Notifications',
            rules: [
                {
                    field: 'type',
                    operator: 'equals',
                    value: NotificationType.TOKEN_TRANSFER,
                },
            ],
            collapsed: true,
            maxSize: 50,
        });
    }

    addGroup(config: GroupConfig): void {
        this.groups.set(config.id, {
            ...config,
            collapsed: config.collapsed ?? true,
        });

        // Initialize group storage
        this.groupedNotifications.set(config.id, {
            id: config.id,
            name: config.name,
            notifications: [],
            collapsed: config.collapsed ?? true,
            lastUpdated: new Date(),
        });
    }

    removeGroup(groupId: string): boolean {
        const result = this.groups.delete(groupId);
        this.groupedNotifications.delete(groupId);
        return result;
    }

    processNotification(notification: Notification): string | null {
        for (const [groupId, config] of this.groups) {
            if (this.matchesGroupRules(notification, config.rules)) {
                this.addToGroup(groupId, notification);
                return groupId;
            }
        }
        return null;
    }

    private matchesGroupRules(
        notification: Notification,
        rules: GroupRule[]
    ): boolean {
        return rules.every((rule) => {
            const value = this.getFieldValue(notification, rule);

            switch (rule.operator) {
                case 'equals':
                    return value === rule.value;
                case 'contains':
                    return (
                        typeof value === 'string' &&
                        value.toLowerCase().includes(rule.value.toLowerCase())
                    );
                case 'startsWith':
                    return (
                        typeof value === 'string' &&
                        value.toLowerCase().startsWith(rule.value.toLowerCase())
                    );
                case 'endsWith':
                    return (
                        typeof value === 'string' &&
                        value.toLowerCase().endsWith(rule.value.toLowerCase())
                    );
                case 'matches':
                    return new RegExp(rule.value).test(value);
                case 'exists':
                    return value !== undefined && value !== null;
                default:
                    return false;
            }
        });
    }

    private getFieldValue(notification: Notification, rule: GroupRule): any {
        if (rule.path) {
            return rule.path.reduce((obj, key) => obj?.[key], notification);
        }
        return notification[rule.field as keyof Notification];
    }

    private addToGroup(groupId: string, notification: Notification): void {
        const group = this.groupedNotifications.get(groupId);
        const config = this.groups.get(groupId);

        if (!group || !config) return;

        group.notifications.push(notification);
        group.lastUpdated = new Date();

        // Enforce max size if specified
        if (config.maxSize && group.notifications.length > config.maxSize) {
            group.notifications = group.notifications.slice(-config.maxSize);
        }

        this.groupedNotifications.set(groupId, group);
    }

    getGroup(groupId: string): GroupedNotifications | undefined {
        return this.groupedNotifications.get(groupId);
    }

    getAllGroups(): GroupedNotifications[] {
        return Array.from(this.groupedNotifications.values());
    }

    toggleGroupCollapse(groupId: string): boolean {
        const group = this.groupedNotifications.get(groupId);
        if (group) {
            group.collapsed = !group.collapsed;
            this.groupedNotifications.set(groupId, group);
            return group.collapsed;
        }
        return false;
    }

    async executeGroupAction(groupId: string, actionId: string): Promise<void> {
        const group = this.groupedNotifications.get(groupId);
        const config = this.groups.get(groupId);

        if (!group || !config?.actions) return;

        const action = config.actions.find((a) => a.id === actionId);
        if (action) {
            await action.handler(group.notifications);
        }
    }

    clearGroup(groupId: string): void {
        const group = this.groupedNotifications.get(groupId);
        if (group) {
            group.notifications = [];
            group.lastUpdated = new Date();
            this.groupedNotifications.set(groupId, group);
        }
    }

    private startCleanup(): void {
        // Run cleanup every hour
        this.cleanupInterval = setInterval(
            () => {
                this.cleanup();
            },
            60 * 60 * 1000
        );
    }

    private cleanup(): void {
        const now = Date.now();

        for (const [groupId, config] of this.groups) {
            if (!config.autoExpire) continue;

            const group = this.groupedNotifications.get(groupId);
            if (!group) continue;

            // Remove expired notifications
            group.notifications = group.notifications.filter((notification) => {
                const age = now - notification.timestamp.getTime();
                return age <= config.autoExpire!;
            });

            // Update group
            this.groupedNotifications.set(groupId, group);
        }
    }

    getGroupStats(groupId?: string):
        | {
            total: number;
            unread: number;
            lastUpdated: Date | null;
            byPriority: Record<NotificationPriority, number>;
            byType: Record<NotificationType, number>;
        }
        | Record<
            string,
            {
                total: number;
                unread: number;
                lastUpdated: Date | null;
                byPriority: Record<NotificationPriority, number>;
                byType: Record<NotificationType, number>;
            }
        > {
        if (groupId) {
            const group = this.groupedNotifications.get(groupId);
            if (!group) {
                throw new Error(`Group not found: ${groupId}`);
            }
            return this.calculateGroupStats(group);
        }

        const stats: Record<
            string,
            ReturnType<typeof this.calculateGroupStats>
        > = {};
        this.groupedNotifications.forEach((group, id) => {
            stats[id] = this.calculateGroupStats(group);
        });
        return stats;
    }

    private calculateGroupStats(group: GroupedNotifications) {
        const stats = {
            total: group.notifications.length,
            unread: 0,
            lastUpdated: group.lastUpdated,
            byPriority: {
                [NotificationPriority.URGENT]: 0,
                [NotificationPriority.HIGH]: 0,
                [NotificationPriority.MEDIUM]: 0,
                [NotificationPriority.LOW]: 0,
            },
            byType: {
                [NotificationType.SYSTEM]: 0,
                [NotificationType.NFT_LISTED]: 0,
                [NotificationType.TOKEN_TRANSFER]: 0,
                [NotificationType.CUSTOM]: 0,
            },
        };

        group.notifications.forEach((notification) => {
            if (!notification.read) stats.unread++;
            stats.byPriority[notification.priority]++;
            stats.byType[notification.type]++;
        });

        return stats;
    }

    addBulkToGroup(groupId: string, notifications: Notification[]): number {
        const group = this.groupedNotifications.get(groupId);
        const config = this.groups.get(groupId);

        if (!group || !config) return 0;

        let addedCount = 0;
        notifications.forEach((notification) => {
            if (this.matchesGroupRules(notification, config.rules)) {
                group.notifications.push(notification);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            group.lastUpdated = new Date();

            // Enforce max size if specified
            if (config.maxSize && group.notifications.length > config.maxSize) {
                group.notifications = group.notifications.slice(-config.maxSize);
            }

            this.groupedNotifications.set(groupId, group);
        }

        return addedCount;
    }

    removeBulkFromGroup(groupId: string, notificationIds: string[]): number {
        const group = this.groupedNotifications.get(groupId);
        if (!group) return 0;

        const initialLength = group.notifications.length;
        group.notifications = group.notifications.filter(
            (n) => !notificationIds.includes(n.id)
        );

        const removedCount = initialLength - group.notifications.length;
        if (removedCount > 0) {
            group.lastUpdated = new Date();
            this.groupedNotifications.set(groupId, group);
        }

        return removedCount;
    }

    mergeGroups(sourceGroupId: string, targetGroupId: string): boolean {
        const sourceGroup = this.groupedNotifications.get(sourceGroupId);
        const targetGroup = this.groupedNotifications.get(targetGroupId);
        const targetConfig = this.groups.get(targetGroupId);

        if (!sourceGroup || !targetGroup || !targetConfig) return false;

        // Filter notifications that match target group rules
        const matchingNotifications = sourceGroup.notifications.filter(
            (notification) => this.matchesGroupRules(notification, targetConfig.rules)
        );

        // Add matching notifications to target group
        targetGroup.notifications.push(...matchingNotifications);
        targetGroup.lastUpdated = new Date();

        // Enforce max size if specified
        if (
            targetConfig.maxSize &&
            targetGroup.notifications.length > targetConfig.maxSize
        ) {
            targetGroup.notifications = targetGroup.notifications.slice(
                -targetConfig.maxSize
            );
        }

        // Update target group
        this.groupedNotifications.set(targetGroupId, targetGroup);

        // Remove source group
        this.groups.delete(sourceGroupId);
        this.groupedNotifications.delete(sourceGroupId);

        return true;
    }

    searchGroups(query: string): GroupedNotifications[] {
        const normalizedQuery = query.toLowerCase();
        return Array.from(this.groupedNotifications.values()).filter((group) => {
            // Search in group name
            if (group.name.toLowerCase().includes(normalizedQuery)) return true;

            // Search in notification titles and messages
            return group.notifications.some(
                (n) =>
                    n.title.toLowerCase().includes(normalizedQuery) ||
                    n.message.toLowerCase().includes(normalizedQuery)
            );
        });
    }

    sortGroup(
        groupId: string,
        criteria: 'timestamp' | 'priority' | 'type' | 'read',
        ascending: boolean = false
    ): void {
        const group = this.groupedNotifications.get(groupId);
        if (!group) return;

        group.notifications.sort((a, b) => {
            let comparison = 0;
            switch (criteria) {
                case 'timestamp':
                    comparison = a.timestamp.getTime() - b.timestamp.getTime();
                    break;
                case 'priority':
                    comparison =
                        this.getPriorityWeight(a.priority) -
                        this.getPriorityWeight(b.priority);
                    break;
                case 'type':
                    comparison = a.type.localeCompare(b.type);
                    break;
                case 'read':
                    comparison = (a.read ? 1 : 0) - (b.read ? 1 : 0);
                    break;
            }
            return ascending ? comparison : -comparison;
        });

        this.groupedNotifications.set(groupId, group);
    }

    private getPriorityWeight(priority: NotificationPriority): number {
        switch (priority) {
            case NotificationPriority.URGENT:
                return 4;
            case NotificationPriority.HIGH:
                return 3;
            case NotificationPriority.MEDIUM:
                return 2;
            case NotificationPriority.LOW:
                return 1;
            default:
                return 0;
        }
    }

    filterGroup(
        groupId: string,
        filters: {
            type?: NotificationType[];
            priority?: NotificationPriority[];
            read?: boolean;
            startDate?: Date;
            endDate?: Date;
        }
    ): Notification[] {
        const group = this.groupedNotifications.get(groupId);
        if (!group) return [];

        return group.notifications.filter((notification) => {
            if (filters.type && !filters.type.includes(notification.type)) {
                return false;
            }
            if (
                filters.priority &&
                !filters.priority.includes(notification.priority)
            ) {
                return false;
            }
            if (filters.read !== undefined && notification.read !== filters.read) {
                return false;
            }
            if (filters.startDate && notification.timestamp < filters.startDate) {
                return false;
            }
            if (filters.endDate && notification.timestamp > filters.endDate) {
                return false;
            }
            return true;
        });
    }

    exportGroup(groupId: string): string {
        const group = this.groupedNotifications.get(groupId);
        const config = this.groups.get(groupId);
        if (!group || !config) {
            throw new Error(`Group not found: ${groupId}`);
        }

        return JSON.stringify(
            {
                config,
                notifications: group.notifications,
            },
            null,
            2
        );
    }

    importGroup(groupData: string): string {
        try {
            const { config, notifications } = JSON.parse(groupData);
            this.addGroup(config);
            this.addBulkToGroup(config.id, notifications);
            return config.id;
        } catch (error) {
            throw new Error(`Failed to import group: ${error.message}`);
        }
    }

    validateGroupConfig(config: GroupConfig): string[] {
        const errors: string[] = [];

        if (!config.id) errors.push('Group ID is required');
        if (!config.name) errors.push('Group name is required');
        if (!Array.isArray(config.rules) || config.rules.length === 0) {
            errors.push('Group must have at least one rule');
        }

        config.rules.forEach((rule, index) => {
            if (!rule.field) {
                errors.push(`Rule ${index + 1}: Field is required`);
            }
            if (!rule.operator) {
                errors.push(`Rule ${index + 1}: Operator is required`);
            }
            if (rule.operator !== 'exists' && rule.value === undefined) {
                errors.push(
                    `Rule ${index + 1}: Value is required for operator ${rule.operator}`
                );
            }
        });

        if (config.maxSize !== undefined && config.maxSize <= 0) {
            errors.push('Max size must be greater than 0');
        }
        if (config.autoExpire !== undefined && config.autoExpire <= 0) {
            errors.push('Auto expire must be greater than 0');
        }

        return errors;
    }

    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        NotificationGroupManager.instance = null as any;
    }
}
