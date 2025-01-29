'use client';

import { NotificationOptimizer } from './notification-optimizer';
import { Notification } from './types';

export interface ScheduleConfig {
    startTime?: Date;
    endTime?: Date;
    timezone?: string;
    repeat?: {
        frequency: 'minutely' | 'hourly' | 'daily' | 'weekly' | 'monthly';
        interval: number;
        daysOfWeek?: number[];
        daysOfMonth?: number[];
        endAfterOccurrences?: number;
        endAfterDate?: Date;
    };
    retryPolicy?: {
        maxAttempts: number;
        backoffMultiplier: number;
        initialDelay: number;
    };
}

interface ScheduledNotification {
    notification: Notification;
    config: ScheduleConfig;
    nextExecutionTime: Date;
    executionCount: number;
    retryCount: number;
    lastExecutionTime?: Date;
}

export class NotificationScheduler {
    private static instance: NotificationScheduler;
    private optimizer: NotificationOptimizer;
    private scheduledNotifications: Map<string, ScheduledNotification> =
        new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();
    private readonly checkInterval: number = 1000; // 1 second

    private constructor() {
        this.optimizer = NotificationOptimizer.getInstance();
        this.startScheduler();
    }

    static getInstance(): NotificationScheduler {
        if (!NotificationScheduler.instance) {
            NotificationScheduler.instance = new NotificationScheduler();
        }
        return NotificationScheduler.instance;
    }

    /**
     * Schedule a notification for delivery
     */
    scheduleNotification(
        notification: Notification,
        config: ScheduleConfig
    ): string {
        const scheduleId = `${notification.id}_${Date.now()}`;
        const scheduledNotification: ScheduledNotification = {
            notification,
            config,
            nextExecutionTime: this.calculateNextExecutionTime(config),
            executionCount: 0,
            retryCount: 0,
        };

        this.scheduledNotifications.set(scheduleId, scheduledNotification);
        this.scheduleNextExecution(scheduleId);

        return scheduleId;
    }

    /**
     * Cancel a scheduled notification
     */
    cancelScheduledNotification(scheduleId: string): boolean {
        const timer = this.timers.get(scheduleId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(scheduleId);
        }
        return this.scheduledNotifications.delete(scheduleId);
    }

    /**
     * Update schedule configuration
     */
    updateSchedule(scheduleId: string, config: Partial<ScheduleConfig>): boolean {
        const scheduled = this.scheduledNotifications.get(scheduleId);
        if (!scheduled) return false;

        scheduled.config = { ...scheduled.config, ...config };
        scheduled.nextExecutionTime = this.calculateNextExecutionTime(
            scheduled.config
        );

        // Reset execution count if repeat config changes
        if (config.repeat) {
            scheduled.executionCount = 0;
        }

        this.cancelScheduledNotification(scheduleId);
        this.scheduleNextExecution(scheduleId);

        return true;
    }

    /**
     * Get all scheduled notifications
     */
    getScheduledNotifications(): Map<
        string,
        {
            notification: Notification;
            config: ScheduleConfig;
            nextExecutionTime: Date;
            executionCount: number;
        }
    > {
        const schedules = new Map();
        this.scheduledNotifications.forEach((value, key) => {
            schedules.set(key, {
                notification: value.notification,
                config: value.config,
                nextExecutionTime: value.nextExecutionTime,
                executionCount: value.executionCount,
            });
        });
        return schedules;
    }

    /**
     * Get schedule status
     */
    getScheduleStatus(scheduleId: string): {
        exists: boolean;
        nextExecutionTime?: Date;
        executionCount?: number;
        isActive?: boolean;
    } {
        const scheduled = this.scheduledNotifications.get(scheduleId);
        if (!scheduled) {
            return { exists: false };
        }

        return {
            exists: true,
            nextExecutionTime: scheduled.nextExecutionTime,
            executionCount: scheduled.executionCount,
            isActive: this.timers.has(scheduleId),
        };
    }

    private startScheduler(): void {
        setInterval(() => {
            this.checkScheduledNotifications();
        }, this.checkInterval);
    }

    private checkScheduledNotifications(): void {
        const now = new Date();
        this.scheduledNotifications.forEach((scheduled, scheduleId) => {
            if (scheduled.nextExecutionTime <= now) {
                this.executeScheduledNotification(scheduleId);
            }
        });
    }

    private executeScheduledNotification(scheduleId: string): void {
        const scheduled = this.scheduledNotifications.get(scheduleId);
        if (!scheduled) return;

        try {
            // Send notification through optimizer
            this.optimizer.queueNotification(scheduled.notification);

            // Update execution details
            scheduled.executionCount++;
            scheduled.lastExecutionTime = new Date();
            scheduled.retryCount = 0;

            // Calculate next execution time for recurring notifications
            if (scheduled.config.repeat) {
                const shouldContinue = this.shouldContinueRepeat(scheduled);
                if (shouldContinue) {
                    scheduled.nextExecutionTime = this.calculateNextExecutionTime(
                        scheduled.config,
                        scheduled.lastExecutionTime
                    );
                    this.scheduleNextExecution(scheduleId);
                } else {
                    this.cancelScheduledNotification(scheduleId);
                }
            } else {
                this.cancelScheduledNotification(scheduleId);
            }
        } catch (error) {
            this.handleExecutionError(scheduleId, error);
        }
    }

    private handleExecutionError(scheduleId: string, error: any): void {
        const scheduled = this.scheduledNotifications.get(scheduleId);
        if (!scheduled || !scheduled.config.retryPolicy) return;

        const { maxAttempts, backoffMultiplier, initialDelay } =
            scheduled.config.retryPolicy;

        if (scheduled.retryCount < maxAttempts) {
            scheduled.retryCount++;
            const retryDelay =
                initialDelay * Math.pow(backoffMultiplier, scheduled.retryCount - 1);
            scheduled.nextExecutionTime = new Date(Date.now() + retryDelay);
            this.scheduleNextExecution(scheduleId);
        } else {
            console.error(
                `Failed to execute scheduled notification ${scheduleId} after ${maxAttempts} attempts:`,
                error
            );
            this.cancelScheduledNotification(scheduleId);
        }
    }

    private calculateNextExecutionTime(
        config: ScheduleConfig,
        lastExecution?: Date
    ): Date {
        const baseTime = lastExecution || new Date();
        let nextTime =
            config.startTime && config.startTime > baseTime
                ? new Date(config.startTime)
                : new Date(baseTime);

        if (config.repeat) {
            const { frequency, interval } = config.repeat;
            switch (frequency) {
                case 'minutely':
                    nextTime.setMinutes(nextTime.getMinutes() + interval);
                    break;
                case 'hourly':
                    nextTime.setHours(nextTime.getHours() + interval);
                    break;
                case 'daily':
                    nextTime.setDate(nextTime.getDate() + interval);
                    break;
                case 'weekly':
                    nextTime.setDate(nextTime.getDate() + interval * 7);
                    break;
                case 'monthly':
                    nextTime.setMonth(nextTime.getMonth() + interval);
                    break;
            }

            // Adjust for specific days if specified
            if (frequency === 'weekly' && config.repeat.daysOfWeek) {
                while (!config.repeat.daysOfWeek.includes(nextTime.getDay())) {
                    nextTime.setDate(nextTime.getDate() + 1);
                }
            }

            if (frequency === 'monthly' && config.repeat.daysOfMonth) {
                while (!config.repeat.daysOfMonth.includes(nextTime.getDate())) {
                    nextTime.setDate(nextTime.getDate() + 1);
                    if (nextTime.getDate() === 1) break; // Prevent infinite loop
                }
            }
        }

        // Adjust for timezone if specified
        if (config.timezone) {
            const targetTz = new Date(
                nextTime.toLocaleString('en-US', { timeZone: config.timezone })
            );
            const tzOffset = targetTz.getTime() - nextTime.getTime();
            nextTime = new Date(nextTime.getTime() + tzOffset);
        }

        return nextTime;
    }

    private shouldContinueRepeat(scheduled: ScheduledNotification): boolean {
        const { repeat } = scheduled.config;
        if (!repeat) return false;

        if (
            repeat.endAfterOccurrences &&
            scheduled.executionCount >= repeat.endAfterOccurrences
        ) {
            return false;
        }

        if (
            repeat.endAfterDate &&
            scheduled.nextExecutionTime > repeat.endAfterDate
        ) {
            return false;
        }

        return true;
    }

    private scheduleNextExecution(scheduleId: string): void {
        const scheduled = this.scheduledNotifications.get(scheduleId);
        if (!scheduled) return;

        const now = new Date();
        const delay = Math.max(
            0,
            scheduled.nextExecutionTime.getTime() - now.getTime()
        );

        const timer = setTimeout(() => {
            this.executeScheduledNotification(scheduleId);
        }, delay);

        this.timers.set(scheduleId, timer);
    }
}
