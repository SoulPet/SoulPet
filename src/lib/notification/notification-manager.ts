import { NotificationExport } from './notification-export';
import { NotificationGroupManager } from './notification-group';
import { NotificationPubSub } from './notification-pubsub';
import { NotificationStore } from './notification-store';
import { NotificationTemplateManager } from './notification-template';
import { Notification, NotificationPriority, NotificationType } from './types';

interface NotificationOptions {
    priority?: NotificationPriority;
    group?: string;
    data?: Record<string, any>;
    metadata?: Record<string, any>;
    expiresAt?: Date;
    actions?: Array<{
        id: string;
        label: string;
        handler: () => void | Promise<void>;
    }>;
}

interface SubscriptionOptions {
    types?: NotificationType[];
    priorities?: NotificationPriority[];
    groups?: string[];
}

interface ManagerOptions {
    store?: {
        maxSize?: number;
        expirationTime?: number;
        persistenceKey?: string;
    };
    pubsub?: {
        batchSize?: number;
        batchDelay?: number;
        maxRetries?: number;
        retryDelay?: number;
    };
}

export class NotificationManager {
    private static instance: NotificationManager;
    private readonly store: NotificationStore;
    private readonly pubsub: NotificationPubSub;
    private readonly groupManager: NotificationGroupManager;
    private readonly templateManager: NotificationTemplateManager;
    private readonly exportManager: NotificationExport;

    private constructor(options: ManagerOptions = {}) {
        this.store = NotificationStore.getInstance(options.store);
        this.pubsub = NotificationPubSub.getInstance(options.pubsub);
        this.groupManager = NotificationGroupManager.getInstance();
        this.templateManager = NotificationTemplateManager.getInstance();
        this.exportManager = NotificationExport.getInstance();
    }

    static getInstance(options?: ManagerOptions): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager(options);
        }
        return NotificationManager.instance;
    }

    async notify(
        type: NotificationType,
        title: string,
        message: string,
        options: NotificationOptions = {}
    ): Promise<string> {
        const notification: Notification = {
            id: crypto.randomUUID(),
            type,
            title,
            message,
            priority: options.priority || NotificationPriority.MEDIUM,
            timestamp: new Date(),
            read: false,
            group: options.group,
            data: options.data,
            metadata: options.metadata,
            expiresAt: options.expiresAt,
            actions: options.actions,
        };

        // Store the notification
        this.store.add(notification);

        // Process group assignment
        const groupId = this.groupManager.processNotification(notification);
        if (groupId) {
            notification.group = groupId;
        }

        // Publish the notification
        await this.pubsub.publish(notification);

        return notification.id;
    }

    subscribe(
        callback: (notification: Notification) => void | Promise<void>,
        options?: SubscriptionOptions
    ): string {
        return this.pubsub.subscribe(callback, options);
    }

    unsubscribe(subscriptionId: string): boolean {
        return this.pubsub.unsubscribe(subscriptionId);
    }

    get(id: string): Notification | undefined {
        return this.store.get(id);
    }

    getAll(options: Parameters<typeof this.store.query>[0] = {}): Notification[] {
        return this.store.query(options);
    }

    update(id: string, updates: Partial<Notification>): boolean {
        return this.store.update(id, updates);
    }

    remove(id: string): boolean {
        return this.store.remove(id);
    }

    clear(): void {
        this.store.clear();
    }

    markAsRead(id: string): boolean {
        return this.store.update(id, { read: true });
    }

    markAllAsRead(): void {
        const notifications = this.store.query();
        notifications.forEach((notification) => {
            this.store.update(notification.id, { read: true });
        });
    }

    getUnreadCount(): number {
        return this.store.query({ read: false }).length;
    }

    // Group management
    getGroup(groupId: string) {
        return this.groupManager.getGroup(groupId);
    }

    getAllGroups() {
        return this.groupManager.getAllGroups();
    }

    getGroupStats() {
        return this.groupManager.getGroupStats();
    }

    // Template management
    renderTemplate(templateId: string, variables: Record<string, any>) {
        return this.templateManager.renderNotification(templateId, { variables });
    }

    getTemplate(templateId: string) {
        return this.templateManager.getTemplate(templateId);
    }

    getAllTemplates() {
        return this.templateManager.getAllTemplates();
    }

    // Export/Import
    async exportNotifications(
        notifications: Notification[],
        templateId?: string
    ): Promise<Blob> {
        return this.exportManager.exportNotifications(notifications, templateId);
    }

    async importNotifications(
        data: string | ArrayBuffer,
        options: Parameters<typeof this.exportManager.importNotifications>[1]
    ): Promise<Notification[]> {
        const notifications = await this.exportManager.importNotifications(
            data,
            options
        );
        this.store.addBatch(notifications);
        return notifications;
    }

    // Statistics
    getStats() {
        return {
            store: this.store.getStats(),
            groups: this.groupManager.getGroupStats(),
            subscriptions: this.pubsub.getSubscriptionCount(),
            queueSize: this.pubsub.getQueueSize(),
        };
    }

    // Cleanup
    dispose(): void {
        this.store.dispose();
        this.pubsub.dispose();
        this.groupManager.dispose();
    }
}
