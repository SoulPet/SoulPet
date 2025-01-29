'use client';

import { NotificationPerformance } from './notification-performance';
import { Notification, NotificationPriority } from './types';

export interface OptimizationConfig {
    maxQueueSize: number;
    batchSize: number;
    deliveryInterval: number;
    maxRetries: number;
    retryDelay: number;
    priorityWeights: Record<NotificationPriority, number>;
    cacheSize: number;
    throttleThreshold: number;
}

export class NotificationOptimizer {
    private static instance: NotificationOptimizer;
    private performance: NotificationPerformance;
    private config: OptimizationConfig;
    private throttled: boolean = false;
    private notificationQueue: Notification[] = [];
    private notificationCache: Map<string, Notification> = new Map();

    private constructor() {
        this.performance = NotificationPerformance.getInstance();
        this.config = this.getDefaultConfig();
        this.startOptimizationLoop();
    }

    static getInstance(): NotificationOptimizer {
        if (!NotificationOptimizer.instance) {
            NotificationOptimizer.instance = new NotificationOptimizer();
        }
        return NotificationOptimizer.instance;
    }

    private getDefaultConfig(): OptimizationConfig {
        return {
            maxQueueSize: 1000,
            batchSize: 10,
            deliveryInterval: 1000, // 1 second
            maxRetries: 3,
            retryDelay: 5000, // 5 seconds
            priorityWeights: {
                [NotificationPriority.URGENT]: 1.0,
                [NotificationPriority.HIGH]: 0.8,
                [NotificationPriority.MEDIUM]: 0.5,
                [NotificationPriority.LOW]: 0.2,
            },
            cacheSize: 100,
            throttleThreshold: 0.8, // 80% resource utilization
        };
    }

    /**
     * Update optimization configuration
     */
    updateConfig(newConfig: Partial<OptimizationConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.applyOptimizations();
    }

    /**
     * Optimize notification for delivery
     */
    optimizeNotification(notification: Notification): Notification {
        // Check cache first
        const cachedNotification = this.notificationCache.get(notification.id);
        if (cachedNotification) {
            return cachedNotification;
        }

        // Apply optimizations
        const optimizedNotification = {
            ...notification,
            priority: this.optimizePriority(notification),
            data: {
                ...notification.data,
                optimized: true,
                optimizationTimestamp: new Date(),
            },
        };

        // Update cache
        this.updateCache(notification.id, optimizedNotification);

        return optimizedNotification;
    }

    /**
     * Queue notification for optimized delivery
     */
    queueNotification(notification: Notification): void {
        if (this.notificationQueue.length >= this.config.maxQueueSize) {
            this.handleQueueOverflow();
        }

        const optimizedNotification = this.optimizeNotification(notification);
        this.notificationQueue.push(optimizedNotification);
    }

    /**
     * Get next batch of notifications for delivery
     */
    getNextBatch(): Notification[] {
        if (this.throttled) {
            return [];
        }

        const batch = this.notificationQueue
            .slice(0, this.config.batchSize)
            .sort(
                (a, b) =>
                    this.getPriorityWeight(b.priority) -
                    this.getPriorityWeight(a.priority)
            );

        this.notificationQueue = this.notificationQueue.slice(
            this.config.batchSize
        );
        return batch;
    }

    /**
     * Check if system is currently throttled
     */
    isThrottled(): boolean {
        return this.throttled;
    }

    /**
     * Get current optimization metrics
     */
    getOptimizationMetrics(): {
        queueLength: number;
        cacheSize: number;
        throttled: boolean;
        resourceUtilization: number;
        averageProcessingTime: number;
    } {
        const resourceStats = this.performance.getResourceUsage();
        const performanceStats = this.performance.getStatistics(
            'notification-delivery'
        );

        return {
            queueLength: this.notificationQueue.length,
            cacheSize: this.notificationCache.size,
            throttled: this.throttled,
            resourceUtilization: Math.max(
                resourceStats.averageCpu,
                resourceStats.averageMemory / 100,
                resourceStats.averageNetworkBandwidth / 100
            ),
            averageProcessingTime: performanceStats.averageProcessingTime,
        };
    }

    private startOptimizationLoop(): void {
        setInterval(() => {
            this.applyOptimizations();
        }, this.config.deliveryInterval);
    }

    private applyOptimizations(): void {
        const metrics = this.getOptimizationMetrics();

        // Update throttling state
        this.throttled =
            metrics.resourceUtilization > this.config.throttleThreshold;

        // Clean up cache if needed
        if (this.notificationCache.size > this.config.cacheSize) {
            this.cleanupCache();
        }

        // Adjust batch size based on performance
        if (metrics.averageProcessingTime > 100) {
            // If processing time > 100ms
            this.config.batchSize = Math.max(1, this.config.batchSize - 1);
        } else if (metrics.averageProcessingTime < 50) {
            // If processing time < 50ms
            this.config.batchSize = Math.min(20, this.config.batchSize + 1);
        }
    }

    private optimizePriority(notification: Notification): NotificationPriority {
        const metrics = this.getOptimizationMetrics();

        // Increase priority if system is under low load
        if (
            metrics.resourceUtilization < 0.3 &&
            notification.priority !== NotificationPriority.URGENT
        ) {
            return this.getNextHigherPriority(notification.priority);
        }

        // Decrease priority if system is under high load
        if (
            metrics.resourceUtilization > 0.7 &&
            notification.priority !== NotificationPriority.LOW
        ) {
            return this.getNextLowerPriority(notification.priority);
        }

        return notification.priority;
    }

    private getPriorityWeight(priority: NotificationPriority): number {
        return this.config.priorityWeights[priority] || 0;
    }

    private getNextHigherPriority(
        priority: NotificationPriority
    ): NotificationPriority {
        switch (priority) {
            case NotificationPriority.LOW:
                return NotificationPriority.MEDIUM;
            case NotificationPriority.MEDIUM:
                return NotificationPriority.HIGH;
            case NotificationPriority.HIGH:
                return NotificationPriority.URGENT;
            default:
                return priority;
        }
    }

    private getNextLowerPriority(
        priority: NotificationPriority
    ): NotificationPriority {
        switch (priority) {
            case NotificationPriority.URGENT:
                return NotificationPriority.HIGH;
            case NotificationPriority.HIGH:
                return NotificationPriority.MEDIUM;
            case NotificationPriority.MEDIUM:
                return NotificationPriority.LOW;
            default:
                return priority;
        }
    }

    private handleQueueOverflow(): void {
        // Remove lowest priority notifications first
        this.notificationQueue = this.notificationQueue
            .sort(
                (a, b) =>
                    this.getPriorityWeight(b.priority) -
                    this.getPriorityWeight(a.priority)
            )
            .slice(0, Math.floor(this.config.maxQueueSize * 0.9)); // Keep 90% of max size
    }

    private updateCache(id: string, notification: Notification): void {
        this.notificationCache.set(id, notification);
        if (this.notificationCache.size > this.config.cacheSize) {
            this.cleanupCache();
        }
    }

    private cleanupCache(): void {
        // Remove oldest entries
        const entriesToRemove = this.notificationCache.size - this.config.cacheSize;
        if (entriesToRemove <= 0) return;

        const entries = Array.from(this.notificationCache.entries());
        const sortedEntries = entries.sort(
            ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime()
        );

        for (let i = 0; i < entriesToRemove; i++) {
            this.notificationCache.delete(sortedEntries[i][0]);
        }
    }
}
