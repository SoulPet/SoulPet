import { Notification, NotificationPriority, NotificationType } from './types';

interface StoreOptions {
    maxSize?: number;
    expirationTime?: number; // in milliseconds
    persistenceKey?: string;
    cacheSize?: number;
}

interface QueryOptions {
    type?: NotificationType;
    priority?: NotificationPriority;
    read?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

interface Transaction {
    id: string;
    operations: Array<{
        type: 'add' | 'update' | 'remove';
        notification: Notification;
        previousValue?: Notification;
    }>;
    timestamp: Date;
}

export class NotificationStore {
    private static instance: NotificationStore;
    private notifications: Map<string, Notification> = new Map();
    private readonly maxSize: number;
    private readonly expirationTime: number;
    private readonly persistenceKey: string;
    private cleanupInterval: NodeJS.Timeout | null = null;

    // Indexing
    private typeIndex: Map<NotificationType, Set<string>> = new Map();
    private priorityIndex: Map<NotificationPriority, Set<string>> = new Map();
    private readIndex: Map<boolean, Set<string>> = new Map();
    private groupIndex: Map<string, Set<string>> = new Map();

    // Caching
    private queryCache: Map<
        string,
        { result: Notification[]; timestamp: number }
    > = new Map();
    private readonly cacheSize: number;
    private readonly cacheTTL: number = 60 * 1000; // 1 minute

    // Transaction support
    private transactions: Map<string, Transaction> = new Map();
    private activeTransaction: string | null = null;

    // Add transaction logging
    private transactionLog: Array<{
        id: string;
        type: 'begin' | 'commit' | 'rollback';
        timestamp: Date;
        operations?: Array<{
            type: 'add' | 'update' | 'remove';
            notificationId: string;
        }>;
    }> = [];

    // Add data consistency check
    private logTransaction(
        transactionId: string,
        type: 'begin' | 'commit' | 'rollback',
        operations?: Array<{
            type: 'add' | 'update' | 'remove';
            notificationId: string;
        }>
    ): void {
        this.transactionLog.push({
            id: transactionId,
            type,
            timestamp: new Date(),
            operations,
        });

        // Keep only last 1000 transaction logs
        if (this.transactionLog.length > 1000) {
            this.transactionLog = this.transactionLog.slice(-1000);
        }
    }

    // Add data consistency check
    checkDataConsistency(): {
        isConsistent: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Check index consistency
        if (!this.validateIndices()) {
            errors.push('Index inconsistency detected');
        }

        // Check for orphaned indices
        this.typeIndex.forEach((ids, type) => {
            ids.forEach((id) => {
                if (!this.notifications.has(id)) {
                    errors.push(`Orphaned ID ${id} in type index for type ${type}`);
                }
            });
        });

        this.priorityIndex.forEach((ids, priority) => {
            ids.forEach((id) => {
                if (!this.notifications.has(id)) {
                    errors.push(
                        `Orphaned ID ${id} in priority index for priority ${priority}`
                    );
                }
            });
        });

        this.readIndex.forEach((ids, read) => {
            ids.forEach((id) => {
                if (!this.notifications.has(id)) {
                    errors.push(`Orphaned ID ${id} in read index for read=${read}`);
                }
            });
        });

        this.groupIndex.forEach((ids, group) => {
            ids.forEach((id) => {
                if (!this.notifications.has(id)) {
                    errors.push(`Orphaned ID ${id} in group index for group ${group}`);
                }
            });
        });

        // Check for data integrity
        this.notifications.forEach((notification, id) => {
            if (!notification.id) {
                errors.push(`Notification ${id} missing ID`);
            }
            if (!notification.type) {
                errors.push(`Notification ${id} missing type`);
            }
            if (!notification.priority) {
                errors.push(`Notification ${id} missing priority`);
            }
            if (!notification.timestamp) {
                errors.push(`Notification ${id} missing timestamp`);
            }
            if (notification.read === undefined) {
                errors.push(`Notification ${id} missing read status`);
            }
        });

        return {
            isConsistent: errors.length === 0,
            errors,
        };
    }

    // Add performance monitoring
    private performanceMetrics: {
        operations: {
            add: number;
            update: number;
            remove: number;
            query: number;
        };
        timings: {
            add: number[];
            update: number[];
            remove: number[];
            query: number[];
        };
        cacheHits: number;
        cacheMisses: number;
        lastCleanup: Date | null;
        cleanupDuration: number[];
    } = {
            operations: {
                add: 0,
                update: 0,
                remove: 0,
                query: 0,
            },
            timings: {
                add: [],
                update: [],
                remove: [],
                query: [],
            },
            cacheHits: 0,
            cacheMisses: 0,
            lastCleanup: null,
            cleanupDuration: [],
        };

    private measureOperation<T>(
        operation: () => T,
        type: 'add' | 'update' | 'remove' | 'query'
    ): T {
        const start = performance.now();
        try {
            const result = operation();
            const duration = performance.now() - start;

            this.performanceMetrics.operations[type]++;
            this.performanceMetrics.timings[type].push(duration);

            // Keep only last 100 timings
            if (this.performanceMetrics.timings[type].length > 100) {
                this.performanceMetrics.timings[type] =
                    this.performanceMetrics.timings[type].slice(-100);
            }

            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.performanceMetrics.timings[type].push(duration);
            throw error;
        }
    }

    private constructor(options: StoreOptions = {}) {
        this.maxSize = options.maxSize || 1000;
        this.expirationTime = options.expirationTime || 30 * 24 * 60 * 60 * 1000; // 30 days
        this.persistenceKey = options.persistenceKey || 'notifications_store';
        this.cacheSize = options.cacheSize || 100;

        this.initializeIndices();
        this.loadFromStorage();
        this.startCleanupInterval();
    }

    static getInstance(options?: StoreOptions): NotificationStore {
        if (!NotificationStore.instance) {
            NotificationStore.instance = new NotificationStore(options);
        }
        return NotificationStore.instance;
    }

    private initializeIndices(): void {
        // Initialize type index
        Object.values(NotificationType).forEach((type) => {
            this.typeIndex.set(type, new Set());
        });

        // Initialize priority index
        Object.values(NotificationPriority).forEach((priority) => {
            this.priorityIndex.set(priority, new Set());
        });

        // Initialize read index
        this.readIndex.set(true, new Set());
        this.readIndex.set(false, new Set());
    }

    private updateIndices(notification: Notification): void {
        // Update type index
        this.typeIndex.get(notification.type)?.add(notification.id);

        // Update priority index
        this.priorityIndex.get(notification.priority)?.add(notification.id);

        // Update read index
        this.readIndex.get(notification.read)?.add(notification.id);

        // Update group index
        if (notification.group) {
            if (!this.groupIndex.has(notification.group)) {
                this.groupIndex.set(notification.group, new Set());
            }
            this.groupIndex.get(notification.group)?.add(notification.id);
        }
    }

    private removeFromIndices(notification: Notification): void {
        this.typeIndex.get(notification.type)?.delete(notification.id);
        this.priorityIndex.get(notification.priority)?.delete(notification.id);
        this.readIndex.get(notification.read)?.delete(notification.id);
        if (notification.group) {
            this.groupIndex.get(notification.group)?.delete(notification.id);
        }
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.persistenceKey);
            if (stored) {
                const data = JSON.parse(stored);
                data.forEach((notification: Notification) => {
                    // Convert string dates back to Date objects
                    notification.timestamp = new Date(notification.timestamp);
                    if (notification.expiresAt) {
                        notification.expiresAt = new Date(notification.expiresAt);
                    }
                    this.notifications.set(notification.id, notification);
                });
            }
        } catch (error) {
            console.error('Failed to load notifications from storage:', error);
        }
    }

    private saveToStorage(): void {
        try {
            const data = Array.from(this.notifications.values());
            localStorage.setItem(this.persistenceKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save notifications to storage:', error);
        }
    }

    private startCleanupInterval(): void {
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
        let removed = false;

        // Remove expired notifications
        this.notifications.forEach((notification, id) => {
            const age = now - notification.timestamp.getTime();
            if (
                age > this.expirationTime ||
                (notification.expiresAt && now > notification.expiresAt.getTime())
            ) {
                this.notifications.delete(id);
                removed = true;
            }
        });

        // Enforce size limit if needed
        if (this.notifications.size > this.maxSize) {
            const sortedNotifications = Array.from(this.notifications.entries()).sort(
                ([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime()
            );

            while (sortedNotifications.length > this.maxSize) {
                const [id] = sortedNotifications.pop()!;
                this.notifications.delete(id);
                removed = true;
            }
        }

        if (removed) {
            this.saveToStorage();
        }
    }

    add(notification: Notification): void {
        this.measureOperation(() => {
            this.notifications.set(notification.id, notification);
            this.updateIndices(notification);
            this.cleanup();
            this.saveToStorage();
        }, 'add');
    }

    addBatch(notifications: Notification[]): void {
        notifications.forEach((notification) => {
            this.notifications.set(notification.id, notification);
        });
        this.cleanup();
        this.saveToStorage();
    }

    get(id: string): Notification | undefined {
        return this.notifications.get(id);
    }

    update(id: string, updates: Partial<Notification>): boolean {
        return this.measureOperation(() => {
            const notification = this.notifications.get(id);
            if (!notification) return false;

            const updatedNotification = { ...notification, ...updates };
            this.notifications.set(id, updatedNotification);
            this.removeFromIndices(notification);
            this.updateIndices(updatedNotification);
            this.saveToStorage();
            return true;
        }, 'update');
    }

    remove(id: string): boolean {
        return this.measureOperation(() => {
            const notification = this.notifications.get(id);
            if (!notification) return false;

            this.notifications.delete(id);
            this.removeFromIndices(notification);
            this.saveToStorage();
            return true;
        }, 'remove');
    }

    removeBatch(ids: string[]): number {
        let count = 0;
        ids.forEach((id) => {
            if (this.notifications.delete(id)) {
                count++;
            }
        });
        if (count > 0) {
            this.saveToStorage();
        }
        return count;
    }

    clear(): void {
        this.notifications.clear();
        this.saveToStorage();
    }

    query(options: QueryOptions = {}): Notification[] {
        return this.measureOperation(() => {
            const cacheKey = this.getCacheKey(options);
            const cachedResult = this.getCacheEntry(cacheKey);

            if (cachedResult) {
                this.performanceMetrics.cacheHits++;
                return cachedResult;
            }

            this.performanceMetrics.cacheMisses++;

            let results: Set<string> | null = null;

            // Use indices for filtering
            if (options.type) {
                results = new Set(this.typeIndex.get(options.type));
            }
            if (options.priority) {
                const priorityIds = this.priorityIndex.get(options.priority);
                results = results
                    ? new Set([...results].filter((id) => priorityIds?.has(id)))
                    : new Set(priorityIds);
            }
            if (options.read !== undefined) {
                const readIds = this.readIndex.get(options.read);
                results = results
                    ? new Set([...results].filter((id) => readIds?.has(id)))
                    : new Set(readIds);
            }

            // Convert to array of notifications
            let notifications = results
                ? Array.from(results)
                    .map((id) => this.notifications.get(id)!)
                    .filter(Boolean)
                : Array.from(this.notifications.values());

            // Apply date filters
            if (options.startDate) {
                notifications = notifications.filter(
                    (n) => n.timestamp >= options.startDate!
                );
            }
            if (options.endDate) {
                notifications = notifications.filter(
                    (n) => n.timestamp <= options.endDate!
                );
            }

            // Sort by timestamp
            notifications.sort(
                (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
            );

            // Apply pagination
            if (options.offset !== undefined || options.limit !== undefined) {
                const start = options.offset || 0;
                const end = options.limit ? start + options.limit : undefined;
                notifications = notifications.slice(start, end);
            }

            // Cache the result
            this.setCacheEntry(cacheKey, notifications);

            return notifications;
        }, 'query');
    }

    getStats(): {
        total: number;
        unread: number;
        byPriority: Record<NotificationPriority, number>;
        byType: Record<NotificationType, number>;
    } {
        const stats = {
            total: this.notifications.size,
            unread: 0,
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

        this.notifications.forEach((notification) => {
            if (!notification.read) stats.unread++;
            stats.byPriority[notification.priority]++;
            stats.byType[notification.type]++;
        });

        return stats;
    }

    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    // Transaction support
    beginTransaction(): string {
        if (this.activeTransaction) {
            throw new Error('A transaction is already in progress');
        }

        const transactionId = crypto.randomUUID();
        this.transactions.set(transactionId, {
            id: transactionId,
            operations: [],
            timestamp: new Date(),
        });
        this.activeTransaction = transactionId;
        return transactionId;
    }

    commitTransaction(transactionId: string): void {
        if (this.activeTransaction !== transactionId) {
            throw new Error('Invalid transaction ID');
        }

        const transaction = this.transactions.get(transactionId);
        if (!transaction) {
            throw new Error('Transaction not found');
        }

        try {
            // Apply all operations
            transaction.operations.forEach((op) => {
                switch (op.type) {
                    case 'add':
                        this.notifications.set(op.notification.id, op.notification);
                        this.updateIndices(op.notification);
                        break;
                    case 'update':
                        this.notifications.set(op.notification.id, op.notification);
                        if (op.previousValue) {
                            this.removeFromIndices(op.previousValue);
                        }
                        this.updateIndices(op.notification);
                        break;
                    case 'remove':
                        this.notifications.delete(op.notification.id);
                        this.removeFromIndices(op.notification);
                        break;
                }
            });

            // Save to storage
            this.saveToStorage();

            // Clear cache
            this.clearCache();
        } catch (error) {
            // Rollback on error
            this.rollbackTransaction(transactionId);
            throw error;
        } finally {
            // Cleanup
            this.transactions.delete(transactionId);
            this.activeTransaction = null;
        }
    }

    rollbackTransaction(transactionId: string): void {
        if (this.activeTransaction !== transactionId) {
            throw new Error('Invalid transaction ID');
        }

        this.transactions.delete(transactionId);
        this.activeTransaction = null;
    }

    // Cache management
    private getCacheKey(options: QueryOptions): string {
        return JSON.stringify(options);
    }

    private setCacheEntry(key: string, result: Notification[]): void {
        if (this.queryCache.size >= this.cacheSize) {
            // Remove oldest entry
            const oldestKey = Array.from(this.queryCache.keys())[0];
            this.queryCache.delete(oldestKey);
        }

        this.queryCache.set(key, {
            result,
            timestamp: Date.now(),
        });
    }

    private getCacheEntry(key: string): Notification[] | null {
        const entry = this.queryCache.get(key);
        if (!entry) return null;

        // Check if cache entry is still valid
        if (Date.now() - entry.timestamp > this.cacheTTL) {
            this.queryCache.delete(key);
            return null;
        }

        return entry.result;
    }

    private clearCache(): void {
        this.queryCache.clear();
    }

    // Add atomic transaction support
    private async executeInTransaction<T>(
        operation: () => Promise<T> | T
    ): Promise<T> {
        const transactionId = this.beginTransaction();
        try {
            const result = await operation();
            this.commitTransaction(transactionId);
            return result;
        } catch (error) {
            this.rollbackTransaction(transactionId);
            throw error;
        }
    }

    // Add index rebuilding
    rebuildIndices(): void {
        // Clear existing indices
        this.typeIndex.clear();
        this.priorityIndex.clear();
        this.readIndex.clear();
        this.groupIndex.clear();

        // Reinitialize empty indices
        this.initializeIndices();

        // Rebuild indices from notifications
        this.notifications.forEach((notification) => {
            this.updateIndices(notification);
        });
    }

    // Optimize batch operations
    async addBatchOptimized(notifications: Notification[]): Promise<void> {
        await this.executeInTransaction(async () => {
            // Pre-allocate space in indices
            notifications.forEach((notification) => {
                if (!this.typeIndex.has(notification.type)) {
                    this.typeIndex.set(notification.type, new Set());
                }
                if (!this.priorityIndex.has(notification.priority)) {
                    this.priorityIndex.set(notification.priority, new Set());
                }
                if (notification.group && !this.groupIndex.has(notification.group)) {
                    this.groupIndex.set(notification.group, new Set());
                }
            });

            // Batch update notifications and indices
            const operations = notifications.map((notification) => ({
                type: 'add' as const,
                notification,
            }));

            // Apply operations in batch
            operations.forEach((op) => {
                this.notifications.set(op.notification.id, op.notification);
                this.updateIndices(op.notification);
            });

            // Single storage save for all operations
            this.saveToStorage();
            this.clearCache();
        });
    }

    // Optimize batch updates
    async updateBatchOptimized(
        updates: Array<{ id: string; updates: Partial<Notification> }>
    ): Promise<number> {
        return this.executeInTransaction(async () => {
            let updateCount = 0;

            // Batch process all updates
            const operations = updates
                .map((update) => {
                    const notification = this.notifications.get(update.id);
                    if (!notification) return null;

                    const updatedNotification = { ...notification, ...update.updates };
                    return {
                        type: 'update' as const,
                        notification: updatedNotification,
                        previousValue: notification,
                    };
                })
                .filter((op): op is NonNullable<typeof op> => op !== null);

            // Apply all valid operations
            operations.forEach((op) => {
                this.notifications.set(op.notification.id, op.notification);
                this.removeFromIndices(op.previousValue);
                this.updateIndices(op.notification);
                updateCount++;
            });

            // Single storage save for all operations
            if (updateCount > 0) {
                this.saveToStorage();
                this.clearCache();
            }

            return updateCount;
        });
    }

    // Optimize batch removals
    async removeBatchOptimized(ids: string[]): Promise<number> {
        return this.executeInTransaction(async () => {
            let removeCount = 0;

            // Batch process all removals
            const operations = ids
                .map((id) => {
                    const notification = this.notifications.get(id);
                    if (!notification) return null;

                    return {
                        type: 'remove' as const,
                        notification,
                    };
                })
                .filter((op): op is NonNullable<typeof op> => op !== null);

            // Apply all valid operations
            operations.forEach((op) => {
                this.notifications.delete(op.notification.id);
                this.removeFromIndices(op.notification);
                removeCount++;
            });

            // Single storage save for all operations
            if (removeCount > 0) {
                this.saveToStorage();
                this.clearCache();
            }

            return removeCount;
        });
    }

    // Add index validation
    validateIndices(): boolean {
        let isValid = true;

        // Validate type index
        this.notifications.forEach((notification) => {
            const typeSet = this.typeIndex.get(notification.type);
            if (!typeSet?.has(notification.id)) {
                console.error(
                    `Type index inconsistency found for notification ${notification.id}`
                );
                isValid = false;
            }
        });

        // Validate priority index
        this.notifications.forEach((notification) => {
            const prioritySet = this.priorityIndex.get(notification.priority);
            if (!prioritySet?.has(notification.id)) {
                console.error(
                    `Priority index inconsistency found for notification ${notification.id}`
                );
                isValid = false;
            }
        });

        // Validate read index
        this.notifications.forEach((notification) => {
            const readSet = this.readIndex.get(notification.read);
            if (!readSet?.has(notification.id)) {
                console.error(
                    `Read index inconsistency found for notification ${notification.id}`
                );
                isValid = false;
            }
        });

        // Validate group index
        this.notifications.forEach((notification) => {
            if (notification.group) {
                const groupSet = this.groupIndex.get(notification.group);
                if (!groupSet?.has(notification.id)) {
                    console.error(
                        `Group index inconsistency found for notification ${notification.id}`
                    );
                    isValid = false;
                }
            }
        });

        return isValid;
    }

    // Add index repair
    repairIndices(): void {
        if (this.validateIndices()) {
            return; // Indices are valid, no repair needed
        }

        console.log('Repairing indices...');
        this.rebuildIndices();

        if (!this.validateIndices()) {
            throw new Error('Index repair failed');
        }
        console.log('Index repair completed successfully');
    }

    // Add performance statistics
    getPerformanceStats() {
        const calculateAverage = (arr: number[]) =>
            arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        return {
            operations: { ...this.performanceMetrics.operations },
            averageTimings: {
                add: calculateAverage(this.performanceMetrics.timings.add),
                update: calculateAverage(this.performanceMetrics.timings.update),
                remove: calculateAverage(this.performanceMetrics.timings.remove),
                query: calculateAverage(this.performanceMetrics.timings.query),
            },
            cache: {
                hits: this.performanceMetrics.cacheHits,
                misses: this.performanceMetrics.cacheMisses,
                hitRate:
                    this.performanceMetrics.cacheHits /
                    (this.performanceMetrics.cacheHits +
                        this.performanceMetrics.cacheMisses) || 0,
            },
            cleanup: {
                lastRun: this.performanceMetrics.lastCleanup,
                averageDuration: calculateAverage(
                    this.performanceMetrics.cleanupDuration
                ),
            },
        };
    }
}
