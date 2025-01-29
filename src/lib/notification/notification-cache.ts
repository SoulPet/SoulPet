'use client';

import { Notification } from './types';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

export class NotificationCache {
    private static instance: NotificationCache;
    private cache: Map<string, CacheEntry<any>> = new Map();
    private maxCacheSize: number = 1000;
    private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
    private cleanupInterval: number = 60 * 1000; // 1 minute

    private constructor() {
        setInterval(() => this.cleanup(), this.cleanupInterval);
    }

    static getInstance(): NotificationCache {
        if (!NotificationCache.instance) {
            NotificationCache.instance = new NotificationCache();
        }
        return NotificationCache.instance;
    }

    /**
     * Set cache configuration
     */
    configure(config: {
        maxCacheSize?: number;
        defaultTTL?: number;
        cleanupInterval?: number;
    }): void {
        if (config.maxCacheSize !== undefined) {
            this.maxCacheSize = config.maxCacheSize;
        }
        if (config.defaultTTL !== undefined) {
            this.defaultTTL = config.defaultTTL;
        }
        if (config.cleanupInterval !== undefined) {
            this.cleanupInterval = config.cleanupInterval;
        }
    }

    /**
     * Get a cached item
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set a cached item
     */
    set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
        // Ensure cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldest();
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl,
        });
    }

    /**
     * Delete a cached item
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cached items
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        oldestEntry: number;
        newestEntry: number;
    } {
        let oldestTimestamp = Date.now();
        let newestTimestamp = 0;

        this.cache.forEach((entry) => {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
            }
            if (entry.timestamp > newestTimestamp) {
                newestTimestamp = entry.timestamp;
            }
        });

        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            oldestEntry: oldestTimestamp,
            newestEntry: newestTimestamp,
        };
    }

    /**
     * Cache notifications for a user
     */
    cacheUserNotifications(
        userAddress: string,
        notifications: Notification[],
        ttl?: number
    ): void {
        this.set(`notifications:${userAddress}`, notifications, ttl);
    }

    /**
     * Get cached notifications for a user
     */
    getCachedUserNotifications(userAddress: string): Notification[] | null {
        return this.get(`notifications:${userAddress}`);
    }

    /**
     * Cache a single notification
     */
    cacheNotification(
        userAddress: string,
        notification: Notification,
        ttl?: number
    ): void {
        this.set(
            `notification:${userAddress}:${notification.id}`,
            notification,
            ttl
        );
    }

    /**
     * Get a cached notification
     */
    getCachedNotification(
        userAddress: string,
        notificationId: string
    ): Notification | null {
        return this.get(`notification:${userAddress}:${notificationId}`);
    }

    /**
     * Invalidate user's cached notifications
     */
    invalidateUserCache(userAddress: string): void {
        const prefix = `notifications:${userAddress}`;
        const keysToDelete: string[] = [];

        this.cache.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach((key) => this.cache.delete(key));
    }

    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        this.cache.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach((key) => this.cache.delete(key));
    }

    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTimestamp = Date.now();

        this.cache.forEach((entry, key) => {
            if (entry.timestamp < oldestTimestamp) {
                oldestTimestamp = entry.timestamp;
                oldestKey = key;
            }
        });

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }
}
