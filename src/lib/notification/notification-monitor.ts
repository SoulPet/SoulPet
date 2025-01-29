'use client';

import { NotificationPerformance } from './notification-performance';
import { NotificationSecurity } from './notification-security';
import { NotificationSync } from './notification-sync';

export interface MonitorConfig {
    checkInterval: number; // milliseconds
    metricsRetention: number; // days
    alertThresholds: {
        cpuUsage: number;
        memoryUsage: number;
        errorRate: number;
        responseTime: number;
        queueSize: number;
    };
    enableAlerting: boolean;
    healthCheckEndpoints?: string[];
}

export interface SystemHealth {
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
        [key: string]: {
            status: 'up' | 'down' | 'degraded';
            lastCheck: Date;
            message?: string;
        };
    };
    lastUpdate: Date;
}

export interface PerformanceMetrics {
    timestamp: Date;
    cpu: {
        usage: number;
        load: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    notifications: {
        delivered: number;
        failed: number;
        pending: number;
        averageLatency: number;
    };
    security: {
        activeUsers: number;
        failedAttempts: number;
        encryptionOperations: number;
    };
    sync: {
        pendingOperations: number;
        syncLatency: number;
        conflicts: number;
    };
}

export interface Alert {
    id: string;
    type: 'performance' | 'security' | 'error' | 'system';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    data?: any;
    acknowledged: boolean;
}

export class NotificationMonitor {
    private static instance: NotificationMonitor;
    private config: MonitorConfig;
    private health: SystemHealth;
    private metrics: PerformanceMetrics[] = [];
    private alerts: Alert[] = [];
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly performance: NotificationPerformance;
    private readonly sync: NotificationSync;
    private readonly security: NotificationSecurity;
    private readonly eventListeners: Map<string, Set<Function>> = new Map();

    private constructor() {
        this.config = this.getDefaultConfig();
        this.health = this.getInitialHealth();
        this.performance = NotificationPerformance.getInstance();
        this.sync = NotificationSync.getInstance();
        this.security = NotificationSecurity.getInstance();
        this.startMonitoring();
    }

    static getInstance(): NotificationMonitor {
        if (!NotificationMonitor.instance) {
            NotificationMonitor.instance = new NotificationMonitor();
        }
        return NotificationMonitor.instance;
    }

    private getDefaultConfig(): MonitorConfig {
        return {
            checkInterval: 60000, // 1 minute
            metricsRetention: 30, // 30 days
            alertThresholds: {
                cpuUsage: 80, // 80%
                memoryUsage: 85, // 85%
                errorRate: 5, // 5%
                responseTime: 1000, // 1 second
                queueSize: 1000,
            },
            enableAlerting: true,
        };
    }

    private getInitialHealth(): SystemHealth {
        return {
            status: 'healthy',
            components: {
                notifications: { status: 'up', lastCheck: new Date() },
                security: { status: 'up', lastCheck: new Date() },
                sync: { status: 'up', lastCheck: new Date() },
                database: { status: 'up', lastCheck: new Date() },
            },
            lastUpdate: new Date(),
        };
    }

    /**
     * Update monitor configuration
     */
    updateConfig(newConfig: Partial<MonitorConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.restartMonitoring();
    }

    /**
     * Get current system health
     */
    getSystemHealth(): SystemHealth {
        return { ...this.health };
    }

    /**
     * Get performance metrics
     */
    getMetrics(timeRange?: { start: Date; end: Date }): PerformanceMetrics[] {
        if (!timeRange) {
            return [...this.metrics];
        }

        return this.metrics.filter(
            (metric) =>
                metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
        );
    }

    /**
     * Get active alerts
     */
    getAlerts(acknowledged: boolean = false): Alert[] {
        return this.alerts.filter((alert) => alert.acknowledged === acknowledged);
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string): boolean {
        const alert = this.alerts.find((a) => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            return true;
        }
        return false;
    }

    /**
     * Add event listener
     */
    addEventListener(event: string, callback: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(event: string, callback: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    private startMonitoring(): void {
        this.checkInterval = setInterval(() => {
            this.performHealthCheck();
            this.collectMetrics();
            this.checkAlertConditions();
            this.cleanupOldData();
        }, this.config.checkInterval);
    }

    private async performHealthCheck(): Promise<void> {
        try {
            // Check components health
            const components = await Promise.all([
                this.checkNotificationsHealth(),
                this.checkSecurityHealth(),
                this.checkSyncHealth(),
                this.checkDatabaseHealth(),
            ]);

            // Update health status
            this.health.components.notifications = components[0];
            this.health.components.security = components[1];
            this.health.components.sync = components[2];
            this.health.components.database = components[3];

            // Determine overall status
            const statuses = Object.values(this.health.components).map(
                (c) => c.status
            );
            if (statuses.includes('down')) {
                this.health.status = 'unhealthy';
            } else if (statuses.includes('degraded')) {
                this.health.status = 'degraded';
            } else {
                this.health.status = 'healthy';
            }

            this.health.lastUpdate = new Date();
            this.emit('healthUpdate', this.health);
        } catch (error) {
            this.createAlert({
                type: 'system',
                severity: 'critical',
                message: `Health check failed: ${error.message}`,
            });
        }
    }

    private async collectMetrics(): Promise<void> {
        try {
            const perfStats = this.performance.getResourceUsage();
            const syncStats = this.sync.getSyncStats();
            const securityContext = this.security.getSecurityContext();

            const metrics: PerformanceMetrics = {
                timestamp: new Date(),
                cpu: {
                    usage: perfStats.averageCpu,
                    load: perfStats.peakCpu,
                },
                memory: {
                    used: perfStats.averageMemory,
                    total: performance.memory?.jsHeapSizeLimit || 0,
                    percentage:
                        (perfStats.averageMemory /
                            (performance.memory?.jsHeapSizeLimit || 1)) *
                        100,
                },
                notifications: {
                    delivered: 0, // Implement actual metrics
                    failed: 0,
                    pending: 0,
                    averageLatency: 0,
                },
                security: {
                    activeUsers: securityContext ? 1 : 0,
                    failedAttempts: 0, // Implement actual metrics
                    encryptionOperations: 0,
                },
                sync: {
                    pendingOperations: syncStats.pendingChanges || 0,
                    syncLatency: syncStats.averageSyncTime || 0,
                    conflicts: syncStats.conflictsResolved || 0,
                },
            };

            this.metrics.push(metrics);
            this.emit('metricsUpdate', metrics);
        } catch (error) {
            console.error('Failed to collect metrics:', error);
        }
    }

    private checkAlertConditions(): void {
        if (!this.config.enableAlerting) return;

        const latestMetrics = this.metrics[this.metrics.length - 1];
        if (!latestMetrics) return;

        // Check CPU usage
        if (latestMetrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
            this.createAlert({
                type: 'performance',
                severity: 'warning',
                message: `High CPU usage: ${latestMetrics.cpu.usage}%`,
            });
        }

        // Check memory usage
        if (
            latestMetrics.memory.percentage > this.config.alertThresholds.memoryUsage
        ) {
            this.createAlert({
                type: 'performance',
                severity: 'warning',
                message: `High memory usage: ${latestMetrics.memory.percentage}%`,
            });
        }

        // Check error rate
        const errorRate =
            (latestMetrics.notifications.failed /
                (latestMetrics.notifications.delivered +
                    latestMetrics.notifications.failed)) *
            100;
        if (errorRate > this.config.alertThresholds.errorRate) {
            this.createAlert({
                type: 'error',
                severity: 'critical',
                message: `High error rate: ${errorRate}%`,
            });
        }

        // Check response time
        if (
            latestMetrics.notifications.averageLatency >
            this.config.alertThresholds.responseTime
        ) {
            this.createAlert({
                type: 'performance',
                severity: 'warning',
                message: `High latency: ${latestMetrics.notifications.averageLatency}ms`,
            });
        }
    }

    private createAlert(params: {
        type: Alert['type'];
        severity: Alert['severity'];
        message: string;
        data?: any;
    }): void {
        const alert: Alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: params.type,
            severity: params.severity,
            message: params.message,
            timestamp: new Date(),
            data: params.data,
            acknowledged: false,
        };

        this.alerts.push(alert);
        this.emit('alert', alert);
    }

    private cleanupOldData(): void {
        const retentionDate = new Date();
        retentionDate.setDate(
            retentionDate.getDate() - this.config.metricsRetention
        );

        // Cleanup old metrics
        this.metrics = this.metrics.filter(
            (metric) => metric.timestamp >= retentionDate
        );

        // Cleanup acknowledged alerts
        this.alerts = this.alerts.filter(
            (alert) => !alert.acknowledged || alert.timestamp >= retentionDate
        );
    }

    private async checkNotificationsHealth(): Promise<
        SystemHealth['components']['notifications']
    > {
        // Implement actual health check
        return {
            status: 'up',
            lastCheck: new Date(),
        };
    }

    private async checkSecurityHealth(): Promise<
        SystemHealth['components']['security']
    > {
        // Implement actual health check
        return {
            status: 'up',
            lastCheck: new Date(),
        };
    }

    private async checkSyncHealth(): Promise<SystemHealth['components']['sync']> {
        // Implement actual health check
        return {
            status: 'up',
            lastCheck: new Date(),
        };
    }

    private async checkDatabaseHealth(): Promise<
        SystemHealth['components']['database']
    > {
        // Implement actual health check
        return {
            status: 'up',
            lastCheck: new Date(),
        };
    }

    private emit(event: string, data?: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback) => callback(data));
        }
    }

    private restartMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.startMonitoring();
    }
}
