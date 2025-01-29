'use client';

import { Notification, NotificationPriority } from './types';

interface QueuedNotification {
    notification: Notification;
    userAddress: string;
    retryCount: number;
    lastAttempt?: Date;
}

export class NotificationQueue {
    private static instance: NotificationQueue;
    private queue: QueuedNotification[] = [];
    private processing: boolean = false;
    private maxRetries: number = 3;
    private retryDelay: number = 5000; // 5 seconds
    private rateLimitDelay: number = 1000; // 1 second between notifications
    private lastProcessed?: Date;

    private constructor() {
        // Start processing queue periodically
        setInterval(() => this.processQueue(), 1000);
    }

    static getInstance(): NotificationQueue {
        if (!NotificationQueue.instance) {
            NotificationQueue.instance = new NotificationQueue();
        }
        return NotificationQueue.instance;
    }

    /**
     * Add a notification to the queue
     */
    enqueue(notification: Notification, userAddress: string): void {
        this.queue.push({
            notification,
            userAddress,
            retryCount: 0,
        });

        // Sort queue by priority
        this.queue.sort((a, b) => {
            const priorityOrder = {
                [NotificationPriority.URGENT]: 0,
                [NotificationPriority.HIGH]: 1,
                [NotificationPriority.MEDIUM]: 2,
                [NotificationPriority.LOW]: 3,
            };
            return (
                priorityOrder[a.notification.priority] -
                priorityOrder[b.notification.priority]
            );
        });
    }

    /**
     * Add multiple notifications to the queue
     */
    enqueueBatch(
        notifications: Array<{ notification: Notification; userAddress: string }>
    ): void {
        notifications.forEach(({ notification, userAddress }) => {
            this.enqueue(notification, userAddress);
        });
    }

    /**
     * Process the notification queue
     */
    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        // Check rate limiting
        if (
            this.lastProcessed &&
            Date.now() - this.lastProcessed.getTime() < this.rateLimitDelay
        ) {
            return;
        }

        this.processing = true;

        try {
            const item = this.queue[0];
            const success = await this.processNotification(item);

            if (success) {
                this.queue.shift(); // Remove from queue if successful
                this.lastProcessed = new Date();
            } else {
                // Handle retry logic
                item.retryCount++;
                item.lastAttempt = new Date();

                if (item.retryCount >= this.maxRetries) {
                    console.error(
                        `Failed to process notification after ${this.maxRetries} attempts:`,
                        item
                    );
                    this.queue.shift(); // Remove from queue after max retries
                } else {
                    // Move to end of queue for retry
                    this.queue.shift();
                    this.queue.push(item);
                }
            }
        } finally {
            this.processing = false;
        }
    }

    /**
     * Process a single notification
     */
    private async processNotification(
        item: QueuedNotification
    ): Promise<boolean> {
        try {
            // Check if we need to wait before retrying
            if (
                item.lastAttempt &&
                Date.now() - item.lastAttempt.getTime() < this.retryDelay
            ) {
                return false;
            }

            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAddress: item.userAddress,
                    notification: item.notification,
                }),
            });

            return response.ok;
        } catch (error) {
            console.error('Failed to process notification:', error);
            return false;
        }
    }

    /**
     * Get current queue status
     */
    getQueueStatus(): {
        total: number;
        byPriority: Record<NotificationPriority, number>;
        failedCount: number;
    } {
        const byPriority = {
            [NotificationPriority.URGENT]: 0,
            [NotificationPriority.HIGH]: 0,
            [NotificationPriority.MEDIUM]: 0,
            [NotificationPriority.LOW]: 0,
        };

        let failedCount = 0;

        this.queue.forEach((item) => {
            byPriority[item.notification.priority]++;
            if (item.retryCount > 0) failedCount++;
        });

        return {
            total: this.queue.length,
            byPriority,
            failedCount,
        };
    }

    /**
     * Clear all notifications from the queue
     */
    clearQueue(): void {
        this.queue = [];
    }

    /**
     * Clear notifications for a specific user
     */
    clearUserNotifications(userAddress: string): void {
        this.queue = this.queue.filter((item) => item.userAddress !== userAddress);
    }

    /**
     * Update queue configuration
     */
    updateConfig(config: {
        maxRetries?: number;
        retryDelay?: number;
        rateLimitDelay?: number;
    }): void {
        if (config.maxRetries !== undefined) this.maxRetries = config.maxRetries;
        if (config.retryDelay !== undefined) this.retryDelay = config.retryDelay;
        if (config.rateLimitDelay !== undefined)
            this.rateLimitDelay = config.rateLimitDelay;
    }
}
