import { Notification, NotificationPriority } from './types';

interface PriorityConfig {
    [NotificationPriority.URGENT]: {
        timeout: number; // Time before auto-expiry
        maxRetries: number; // Max delivery attempts
        retryDelay: number; // Delay between retries
        requireAck: boolean; // Require acknowledgment
    };
    [NotificationPriority.HIGH]: {
        timeout: number;
        maxRetries: number;
        retryDelay: number;
        requireAck: boolean;
    };
    [NotificationPriority.MEDIUM]: {
        timeout: number;
        maxRetries: number;
        retryDelay: number;
        requireAck: boolean;
    };
    [NotificationPriority.LOW]: {
        timeout: number;
        maxRetries: number;
        retryDelay: number;
        requireAck: boolean;
    };
}

interface PriorityQueue {
    [NotificationPriority.URGENT]: Notification[];
    [NotificationPriority.HIGH]: Notification[];
    [NotificationPriority.MEDIUM]: Notification[];
    [NotificationPriority.LOW]: Notification[];
}

export class NotificationPriorityManager {
    private static instance: NotificationPriorityManager;
    private config: PriorityConfig;
    private queues: PriorityQueue;
    private processingIntervals: Map<NotificationPriority, NodeJS.Timeout> =
        new Map();
    private retryMap: Map<string, number> = new Map();
    private ackTimeouts: Map<string, NodeJS.Timeout> = new Map();

    private constructor() {
        this.initializeConfig();
        this.initializeQueues();
        this.startProcessing();
    }

    static getInstance(): NotificationPriorityManager {
        if (!NotificationPriorityManager.instance) {
            NotificationPriorityManager.instance = new NotificationPriorityManager();
        }
        return NotificationPriorityManager.instance;
    }

    private initializeConfig() {
        this.config = {
            [NotificationPriority.URGENT]: {
                timeout: 5 * 60 * 1000, // 5 minutes
                maxRetries: 5,
                retryDelay: 30 * 1000, // 30 seconds
                requireAck: true,
            },
            [NotificationPriority.HIGH]: {
                timeout: 15 * 60 * 1000, // 15 minutes
                maxRetries: 3,
                retryDelay: 2 * 60 * 1000, // 2 minutes
                requireAck: true,
            },
            [NotificationPriority.MEDIUM]: {
                timeout: 60 * 60 * 1000, // 1 hour
                maxRetries: 2,
                retryDelay: 5 * 60 * 1000, // 5 minutes
                requireAck: false,
            },
            [NotificationPriority.LOW]: {
                timeout: 24 * 60 * 60 * 1000, // 24 hours
                maxRetries: 1,
                retryDelay: 30 * 60 * 1000, // 30 minutes
                requireAck: false,
            },
        };
    }

    private initializeQueues() {
        this.queues = {
            [NotificationPriority.URGENT]: [],
            [NotificationPriority.HIGH]: [],
            [NotificationPriority.MEDIUM]: [],
            [NotificationPriority.LOW]: [],
        };
    }

    private startProcessing() {
        // Process each priority queue at different intervals
        const intervals = {
            [NotificationPriority.URGENT]: 1000, // 1 second
            [NotificationPriority.HIGH]: 5000, // 5 seconds
            [NotificationPriority.MEDIUM]: 15000, // 15 seconds
            [NotificationPriority.LOW]: 60000, // 1 minute
        };

        Object.entries(intervals).forEach(([priority, interval]) => {
            const timer = setInterval(
                () => this.processQueue(priority as NotificationPriority),
                interval
            );
            this.processingIntervals.set(priority as NotificationPriority, timer);
        });
    }

    enqueue(notification: Notification): void {
        this.queues[notification.priority].push(notification);

        if (this.config[notification.priority].requireAck) {
            this.setupAckTimeout(notification);
        }
    }

    private async processQueue(priority: NotificationPriority): Promise<void> {
        const queue = this.queues[priority];
        if (queue.length === 0) return;

        const notification = queue[0];
        try {
            await this.processNotification(notification);
            queue.shift(); // Remove processed notification
            this.retryMap.delete(notification.id);
        } catch (error) {
            await this.handleProcessingError(notification, error);
        }
    }

    private async processNotification(notification: Notification): Promise<void> {
        // Implementation would depend on how notifications are actually delivered
        // This is a placeholder for the actual delivery mechanism
        return new Promise((resolve, reject) => {
            // Simulate processing
            setTimeout(() => {
                if (Math.random() > 0.9) {
                    // 10% chance of failure
                    reject(new Error('Failed to process notification'));
                } else {
                    resolve();
                }
            }, 100);
        });
    }

    private async handleProcessingError(
        notification: Notification,
        error: any
    ): Promise<void> {
        const retryCount = this.retryMap.get(notification.id) || 0;
        const config = this.config[notification.priority];

        if (retryCount < config.maxRetries) {
            this.retryMap.set(notification.id, retryCount + 1);
            // Move to end of queue for retry
            this.queues[notification.priority] = this.queues[
                notification.priority
            ].filter((n) => n.id !== notification.id);
            setTimeout(() => {
                this.queues[notification.priority].push(notification);
            }, config.retryDelay);
        } else {
            // Handle final failure
            console.error(
                `Failed to process notification after ${retryCount} retries:`,
                error
            );
            this.queues[notification.priority].shift();
            this.retryMap.delete(notification.id);
        }
    }

    private setupAckTimeout(notification: Notification): void {
        const timeout = setTimeout(() => {
            this.handleAckTimeout(notification);
        }, this.config[notification.priority].timeout);

        this.ackTimeouts.set(notification.id, timeout);
    }

    private handleAckTimeout(notification: Notification): void {
        // Handle unacknowledged notification
        console.warn(
            `Notification ${notification.id} was not acknowledged within timeout`
        );
        this.retryMap.delete(notification.id);
        this.ackTimeouts.delete(notification.id);
    }

    acknowledgeNotification(notificationId: string): void {
        const timeout = this.ackTimeouts.get(notificationId);
        if (timeout) {
            clearTimeout(timeout);
            this.ackTimeouts.delete(notificationId);
        }
    }

    getQueueStats(): Record<
        NotificationPriority,
        {
            queued: number;
            processing: number;
            retrying: number;
            awaitingAck: number;
        }
    > {
        const stats = {} as Record<NotificationPriority, any>;

        Object.values(NotificationPriority).forEach((priority) => {
            stats[priority] = {
                queued: this.queues[priority].length,
                processing: 0,
                retrying: Array.from(this.retryMap.entries()).filter(
                    ([, count]) => count > 0
                ).length,
                awaitingAck: this.ackTimeouts.size,
            };
        });

        return stats;
    }

    dispose(): void {
        // Clear all intervals
        this.processingIntervals.forEach((interval) => clearInterval(interval));
        this.processingIntervals.clear();

        // Clear all timeouts
        this.ackTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.ackTimeouts.clear();

        // Clear all queues
        this.initializeQueues();
        this.retryMap.clear();
    }
}
