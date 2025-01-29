import { NotificationStore } from './notification-store';
import { Notification, NotificationPriority, NotificationType } from './types';

type NotificationCallback = (
    notification: Notification
) => void | Promise<void>;

interface Subscription {
    id: string;
    callback: NotificationCallback;
    filters?: {
        types?: NotificationType[];
        priorities?: NotificationPriority[];
        groups?: string[];
    };
}

interface PublishOptions {
    priority?: NotificationPriority;
    group?: string;
    data?: Record<string, any>;
    metadata?: Record<string, any>;
}

interface QueueOptions {
    batchSize?: number;
    batchDelay?: number; // milliseconds
    maxRetries?: number;
    retryDelay?: number; // milliseconds
}

export class NotificationPubSub {
    private static instance: NotificationPubSub;
    private store: NotificationStore;
    private subscriptions: Map<string, Subscription> = new Map();
    private queue: Notification[] = [];
    private processing: boolean = false;
    private readonly options: Required<QueueOptions>;
    private processingTimeout: NodeJS.Timeout | null = null;

    // Add event history
    private eventHistory: Array<{
        id: string;
        notification: Notification;
        timestamp: Date;
        deliveryAttempts: Array<{
            subscriberId: string;
            timestamp: Date;
            success: boolean;
            error?: string;
        }>;
        status: 'pending' | 'processing' | 'completed' | 'failed';
    }> = [];

    private readonly maxHistorySize = 1000;

    // Add subscriber statistics
    private subscriberStats: Map<
        string,
        {
            subscribed: Date;
            receivedCount: number;
            successCount: number;
            failureCount: number;
            lastReceived: Date | null;
            lastSuccess: Date | null;
            lastFailure: Date | null;
            averageProcessingTime: number;
            processingTimes: number[];
        }
    > = new Map();

    private constructor(options: QueueOptions = {}) {
        this.store = NotificationStore.getInstance();
        this.options = {
            batchSize: options.batchSize || 10,
            batchDelay: options.batchDelay || 100,
            maxRetries: options.maxRetries || 3,
            retryDelay: options.retryDelay || 1000,
        };
    }

    static getInstance(options?: QueueOptions): NotificationPubSub {
        if (!NotificationPubSub.instance) {
            NotificationPubSub.instance = new NotificationPubSub(options);
        }
        return NotificationPubSub.instance;
    }

    subscribe(
        callback: NotificationCallback,
        filters?: Subscription['filters']
    ): string {
        const id = crypto.randomUUID();
        this.subscriptions.set(id, { id, callback, filters });
        this.initializeSubscriberStats(id);
        return id;
    }

    unsubscribe(subscriptionId: string): boolean {
        const result = this.subscriptions.delete(subscriptionId);
        this.subscriberStats.delete(subscriptionId);
        return result;
    }

    async publish(notification: Notification): Promise<void> {
        const eventId = this.addToHistory(notification);
        this.queue.push({ eventId, notification });
        this.scheduleProcessing();
    }

    private scheduleProcessing(): void {
        if (!this.processing && !this.processingTimeout) {
            this.processingTimeout = setTimeout(() => {
                this.processingTimeout = null;
                this.processQueue();
            }, this.options.batchDelay);
        }
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;
        const batch = this.queue.splice(0, this.options.batchSize);
        const deliveryPromises: Promise<void>[] = [];

        for (const notification of batch) {
            const matchingSubscriptions = Array.from(
                this.subscriptions.values()
            ).filter((subscription) =>
                this.matchesFilters(notification, subscription.filters)
            );

            for (const subscription of matchingSubscriptions) {
                deliveryPromises.push(
                    this.deliverNotification(notification, subscription).catch((error) =>
                        console.error(
                            `Failed to deliver notification ${notification.id} to subscription ${subscription.id}:`,
                            error
                        )
                    )
                );
            }
        }

        await Promise.all(deliveryPromises);
        this.processing = false;

        if (this.queue.length > 0) {
            this.scheduleProcessing();
        }
    }

    private async deliverNotification(
        notification: Notification,
        subscription: Subscription,
        eventId: string,
        retryCount: number = 0
    ): Promise<void> {
        const startTime = performance.now();
        try {
            await subscription.callback(notification);
            const processingTime = performance.now() - startTime;

            this.updateSubscriberStats(subscription.id, true, processingTime);
            this.logDeliveryAttempt(eventId, subscription.id, true);
        } catch (error) {
            const processingTime = performance.now() - startTime;
            this.updateSubscriberStats(subscription.id, false, processingTime);
            this.logDeliveryAttempt(
                eventId,
                subscription.id,
                false,
                error instanceof Error ? error.message : 'Unknown error'
            );

            if (retryCount < this.options.maxRetries) {
                // Exponential backoff
                const delay = this.options.retryDelay * Math.pow(2, retryCount);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.deliverNotification(
                    notification,
                    subscription,
                    eventId,
                    retryCount + 1
                );
            }
            throw error;
        }
    }

    private matchesFilters(
        notification: Notification,
        filters?: Subscription['filters']
    ): boolean {
        if (!filters) return true;

        if (filters.types && filters.types.length > 0) {
            if (!filters.types.includes(notification.type)) {
                return false;
            }
        }

        if (filters.priorities && filters.priorities.length > 0) {
            if (!filters.priorities.includes(notification.priority)) {
                return false;
            }
        }

        if (filters.groups && filters.groups.length > 0) {
            if (!notification.group || !filters.groups.includes(notification.group)) {
                return false;
            }
        }

        return true;
    }

    getSubscriptionCount(): number {
        return this.subscriptions.size;
    }

    getQueueSize(): number {
        return this.queue.length;
    }

    clearQueue(): void {
        this.queue = [];
    }

    dispose(): void {
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
            this.processingTimeout = null;
        }
        this.subscriptions.clear();
        this.queue = [];
        this.processing = false;
    }

    private addToHistory(
        notification: Notification,
        status: 'pending' | 'processing' | 'completed' | 'failed' = 'pending'
    ): string {
        const eventId = crypto.randomUUID();
        this.eventHistory.unshift({
            id: eventId,
            notification,
            timestamp: new Date(),
            deliveryAttempts: [],
            status,
        });

        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
        }

        return eventId;
    }

    private updateEventStatus(
        eventId: string,
        status: 'pending' | 'processing' | 'completed' | 'failed'
    ): void {
        const event = this.eventHistory.find((e) => e.id === eventId);
        if (event) {
            event.status = status;
        }
    }

    private logDeliveryAttempt(
        eventId: string,
        subscriberId: string,
        success: boolean,
        error?: string
    ): void {
        const event = this.eventHistory.find((e) => e.id === eventId);
        if (event) {
            event.deliveryAttempts.push({
                subscriberId,
                timestamp: new Date(),
                success,
                error,
            });
        }
    }

    private initializeSubscriberStats(subscriberId: string): void {
        this.subscriberStats.set(subscriberId, {
            subscribed: new Date(),
            receivedCount: 0,
            successCount: 0,
            failureCount: 0,
            lastReceived: null,
            lastSuccess: null,
            lastFailure: null,
            averageProcessingTime: 0,
            processingTimes: [],
        });
    }

    private updateSubscriberStats(
        subscriberId: string,
        success: boolean,
        processingTime: number
    ): void {
        const stats = this.subscriberStats.get(subscriberId);
        if (!stats) return;

        stats.receivedCount++;
        if (success) {
            stats.successCount++;
            stats.lastSuccess = new Date();
        } else {
            stats.failureCount++;
            stats.lastFailure = new Date();
        }
        stats.lastReceived = new Date();

        // Update processing time statistics
        stats.processingTimes.push(processingTime);
        if (stats.processingTimes.length > 100) {
            stats.processingTimes = stats.processingTimes.slice(-100);
        }
        stats.averageProcessingTime =
            stats.processingTimes.reduce((a, b) => a + b, 0) /
            stats.processingTimes.length;
    }

    getSubscriberStats(subscriberId?: string) {
        if (subscriberId) {
            return this.subscriberStats.get(subscriberId);
        }
        return Array.from(this.subscriberStats.entries()).map(([id, stats]) => ({
            id,
            ...stats,
        }));
    }

    getEventHistory(filter?: {
        status?: 'pending' | 'processing' | 'completed' | 'failed';
        startDate?: Date;
        endDate?: Date;
    }) {
        let events = this.eventHistory;

        if (filter?.status) {
            events = events.filter((e) => e.status === filter.status);
        }
        if (filter?.startDate) {
            events = events.filter((e) => e.timestamp >= filter.startDate!);
        }
        if (filter?.endDate) {
            events = events.filter((e) => e.timestamp <= filter.endDate!);
        }

        return events;
    }

    getDeliveryStats() {
        const totalEvents = this.eventHistory.length;
        const completedEvents = this.eventHistory.filter(
            (e) => e.status === 'completed'
        ).length;
        const failedEvents = this.eventHistory.filter(
            (e) => e.status === 'failed'
        ).length;
        const pendingEvents = this.eventHistory.filter(
            (e) => e.status === 'pending'
        ).length;
        const processingEvents = this.eventHistory.filter(
            (e) => e.status === 'processing'
        ).length;

        const totalDeliveryAttempts = this.eventHistory.reduce(
            (sum, event) => sum + event.deliveryAttempts.length,
            0
        );
        const successfulDeliveries = this.eventHistory.reduce(
            (sum, event) =>
                sum + event.deliveryAttempts.filter((a) => a.success).length,
            0
        );

        return {
            events: {
                total: totalEvents,
                completed: completedEvents,
                failed: failedEvents,
                pending: pendingEvents,
                processing: processingEvents,
            },
            deliveries: {
                total: totalDeliveryAttempts,
                successful: successfulDeliveries,
                failed: totalDeliveryAttempts - successfulDeliveries,
                successRate:
                    totalDeliveryAttempts > 0
                        ? (successfulDeliveries / totalDeliveryAttempts) * 100
                        : 0,
            },
            queue: {
                size: this.queue.length,
                processing: this.processing,
            },
        };
    }
}
