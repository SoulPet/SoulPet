export * from './desktop-notification';
export * from './notification-analytics';
export * from './notification-cache';
export * from './notification-error';
export * from './notification-preferences';
export * from './notification-queue';
export * from './notification-sound';
export * from './notification-subscription';
export * from './notification-template';
export * from './types';

import { DesktopNotification } from './desktop-notification';
import { NotificationAnalytics } from './notification-analytics';
import { NotificationCache } from './notification-cache';
import { ErrorHandler, NotificationError } from './notification-error';
import { NotificationPreferencesManager } from './notification-preferences';
import { NotificationQueue } from './notification-queue';
import { NotificationSound } from './notification-sound';
import { NotificationSubscriptionManager } from './notification-subscription';
import { NotificationTemplateManager } from './notification-template';
import { Notification, NotificationPriority, NotificationType } from './types';

export class NotificationService {
    private static instance: NotificationService;
    private sound: NotificationSound;
    private desktop: DesktopNotification;
    private templates: NotificationTemplateManager;
    private analytics: NotificationAnalytics;
    private preferences: NotificationPreferencesManager;
    private queue: NotificationQueue;
    private cache: NotificationCache;
    private subscriptions: NotificationSubscriptionManager;
    private errorHandler: ErrorHandler;
    private listeners: Map<string, ((notification: Notification) => void)[]> =
        new Map();
    private webSocket: WebSocket | null = null;

    private constructor() {
        this.sound = NotificationSound.getInstance();
        this.desktop = DesktopNotification.getInstance();
        this.templates = NotificationTemplateManager.getInstance();
        this.analytics = NotificationAnalytics.getInstance();
        this.preferences = NotificationPreferencesManager.getInstance();
        this.queue = NotificationQueue.getInstance();
        this.cache = NotificationCache.getInstance();
        this.subscriptions = NotificationSubscriptionManager.getInstance();
        this.errorHandler = ErrorHandler.getInstance();

        // Setup error handling
        this.setupErrorHandling();
    }

    private setupErrorHandling(): void {
        this.errorHandler.addListener((error) => {
            if (error instanceof NotificationError) {
                // Handle specific notification errors
                switch (error.code) {
                    case 'DELIVERY_FAILED':
                        // Attempt redelivery through queue
                        if (error.data?.notification && error.data?.userAddress) {
                            this.queue.enqueue(
                                error.data.notification,
                                error.data.userAddress
                            );
                        }
                        break;
                    case 'PREFERENCE_SYNC_FAILED':
                        // Schedule preference sync retry
                        setTimeout(() => {
                            this.preferences.syncToServer();
                        }, 5000);
                        break;
                    case 'WEBSOCKET_ERROR':
                        // Handle WebSocket errors
                        this.handleWebSocketError(error);
                        break;
                }
            }
        });
    }

    private handleWebSocketError(error: NotificationError): void {
        // Implement WebSocket error recovery logic
        if (error.retryable) {
            // Attempt to reconnect WebSocket
            this.subscriptions.updateConfig({
                maxReconnectAttempts: 5,
                reconnectDelay: 1000,
            });
        }
    }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Send a notification with retry support
     */
    async send(
        userAddress: string,
        type: NotificationType,
        title: string,
        message: string,
        options: {
            priority?: NotificationPriority;
            data?: Record<string, any>;
            group?: string;
            retry?: {
                maxRetries?: number;
                initialDelay?: number;
                maxDelay?: number;
            };
        } = {}
    ): Promise<string> {
        const notification: Notification = {
            id: Math.random().toString(36).substring(2),
            type,
            title,
            message,
            priority: options.priority || NotificationPriority.MEDIUM,
            timestamp: new Date(),
            read: false,
            data: options.data,
            group: options.group,
        };

        try {
            await this.errorHandler.executeWithRetry(
                async () => {
                    // Add to queue for processing
                    this.queue.enqueue(notification, userAddress);

                    // Track analytics
                    this.analytics.trackEvent(userAddress, notification, 'sent');

                    // Play sound based on priority
                    await this.sound.play(notification.priority);

                    // Show desktop notification if enabled
                    await this.desktop.show(notification);

                    // Notify subscribers
                    this.subscriptions.notifySubscribers(userAddress, notification);

                    // Invalidate cache
                    this.cache.invalidateUserCache(userAddress);
                },
                {
                    maxRetries: options.retry?.maxRetries,
                    initialDelay: options.retry?.initialDelay,
                    maxDelay: options.retry?.maxDelay,
                    onRetry: (error, attempt, delay) => {
                        console.warn(
                            `Retrying notification delivery (attempt ${attempt}):`,
                            error
                        );
                    },
                }
            );

            return notification.id;
        } catch (error) {
            this.errorHandler.handleError(
                new NotificationError(
                    'Failed to send notification',
                    'DELIVERY_FAILED',
                    true,
                    { notification, userAddress, originalError: error }
                )
            );
            throw error;
        }
    }

    /**
     * Subscribe to notifications with error handling
     */
    subscribe(
        userAddress: string,
        options: {
            types?: NotificationType[];
            groups?: string[];
            onNotification: (notification: Notification) => void;
            onError?: (error: Error) => void;
        }
    ): () => void {
        try {
            return this.subscriptions.subscribe(userAddress, {
                ...options,
                onError: (error) => {
                    this.errorHandler.handleError(error);
                    options.onError?.(error);
                },
            });
        } catch (error) {
            this.errorHandler.handleError(
                new NotificationError(
                    'Failed to subscribe to notifications',
                    'SUBSCRIPTION_FAILED',
                    true,
                    { userAddress, options }
                )
            );
            throw error;
        }
    }

    /**
     * Send a notification using a template
     */
    async sendFromTemplate(
        userAddress: string,
        templateId: string,
        data: Record<string, any>
    ): Promise<string> {
        const template = this.templates.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const { title, message } = this.templates.formatTemplate(template, data);
        return this.send(userAddress, template.type, title, message, {
            priority: template.priority,
            data: { ...data, templateId },
            group: template.group,
        });
    }

    /**
     * Send a batch of notifications
     */
    async sendBatch(
        notifications: Array<{
            userAddress: string;
            type: NotificationType;
            title: string;
            message: string;
            options?: {
                priority?: NotificationPriority;
                data?: Record<string, any>;
                group?: string;
            };
        }>
    ): Promise<string[]> {
        const notificationIds: string[] = [];

        // Convert to queue items
        const queueItems = notifications.map((item) => {
            const notification: Notification = {
                id: Math.random().toString(36).substring(2),
                type: item.type,
                title: item.title,
                message: item.message,
                priority: item.options?.priority || NotificationPriority.MEDIUM,
                timestamp: new Date(),
                read: false,
                data: item.options?.data,
                group: item.options?.group,
            };

            notificationIds.push(notification.id);
            return { notification, userAddress: item.userAddress };
        });

        // Add to queue
        this.queue.enqueueBatch(queueItems);

        return notificationIds;
    }

    /**
     * Get notifications with caching
     */
    async getNotifications(
        userAddress: string,
        options: {
            unreadOnly?: boolean;
            type?: NotificationType;
            group?: string;
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ notifications: Notification[]; total: number }> {
        // Try to get from cache first
        const cacheKey = `notifications:${userAddress}:${JSON.stringify(options)}`;
        const cached = this.cache.get<{
            notifications: Notification[];
            total: number;
        }>(cacheKey);
        if (cached) return cached;

        try {
            const queryParams = new URLSearchParams();
            if (options.unreadOnly) queryParams.append('unreadOnly', 'true');
            if (options.type) queryParams.append('type', options.type);
            if (options.group) queryParams.append('group', options.group);
            if (options.limit) queryParams.append('limit', options.limit.toString());
            if (options.offset)
                queryParams.append('offset', options.offset.toString());

            const response = await fetch(
                `/api/notifications/${userAddress}?${queryParams.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const result = await response.json();

            // Cache the result
            this.cache.set(cacheKey, result);

            return result;
        } catch (error) {
            console.error('Failed to get notifications:', error);
            return { notifications: [], total: 0 };
        }
    }

    /**
     * Get system health status
     */
    getSystemHealth(): {
        queue: {
            total: number;
            byPriority: Record<NotificationPriority, number>;
            failedCount: number;
        };
        cache: {
            size: number;
            maxSize: number;
            oldestEntry: number;
            newestEntry: number;
        };
        websocket: {
            connected: boolean;
            reconnectAttempts: number;
        };
        errors: {
            total: number;
            retryable: number;
            nonRetryable: number;
        };
    } {
        return {
            queue: this.queue.getQueueStatus(),
            cache: this.cache.getStats(),
            websocket: {
                connected: this.subscriptions.isConnected(),
                reconnectAttempts: this.subscriptions.getReconnectAttempts(),
            },
            errors: {
                total: 0, // TODO: Implement error tracking
                retryable: 0,
                nonRetryable: 0,
            },
        };
    }

    /**
     * Mark a notification as read and track analytics
     */
    async markAsRead(userAddress: string, notificationId: string): Promise<void> {
        try {
            const response = await fetch(`/api/notifications/${userAddress}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationIds: [notificationId] }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            // Track the read event
            const notification = await this.getNotificationById(
                userAddress,
                notificationId
            );
            if (notification) {
                this.analytics.trackEvent(userAddress, notification, 'read');
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            throw error;
        }
    }

    /**
     * Get a single notification by ID
     */
    private async getNotificationById(
        userAddress: string,
        notificationId: string
    ): Promise<Notification | null> {
        try {
            const response = await fetch(
                `/api/notifications/${userAddress}/${notificationId}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch notification');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get notification:', error);
            return null;
        }
    }

    /**
     * Get notification statistics and trends
     */
    async getAnalytics(
        userAddress: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        stats: NotificationStats;
        trends: NotificationTrend[];
        engagement: {
            clickThroughRate: number;
            averageResponseTime: number;
            dismissRate: number;
        };
    }> {
        const [stats, trends, engagement] = await Promise.all([
            this.analytics.getStats(userAddress, startDate, endDate),
            this.analytics.getTrends(userAddress, {
                startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                endDate: endDate || new Date(),
                groupBy: 'day',
            }),
            this.analytics.getEngagementMetrics(userAddress),
        ]);

        return {
            stats,
            trends,
            engagement,
        };
    }
}
