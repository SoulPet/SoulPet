'use client';

import { Notification, NotificationType } from './types';

export interface NotificationStats {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<string, number>;
    byGroup: Record<string, number>;
    readRate: number;
    averageResponseTime: number; // in milliseconds
}

export interface NotificationTrend {
    date: Date;
    count: number;
    type?: NotificationType;
}

export class NotificationAnalytics {
    private static instance: NotificationAnalytics;
    private analyticsData: Map<string, any> = new Map();

    private constructor() { }

    static getInstance(): NotificationAnalytics {
        if (!NotificationAnalytics.instance) {
            NotificationAnalytics.instance = new NotificationAnalytics();
        }
        return NotificationAnalytics.instance;
    }

    /**
     * Track a notification event
     */
    trackEvent(
        userAddress: string,
        notification: Notification,
        eventType: 'sent' | 'read' | 'clicked' | 'dismissed'
    ): void {
        const event = {
            timestamp: new Date(),
            notificationId: notification.id,
            notificationType: notification.type,
            eventType,
            priority: notification.priority,
            group: notification.group,
        };

        // Store event for analytics
        const userEvents = this.analyticsData.get(userAddress) || [];
        userEvents.push(event);
        this.analyticsData.set(userAddress, userEvents);

        // Send to analytics service
        this.sendToAnalytics(userAddress, event);
    }

    /**
     * Get notification statistics for a user
     */
    async getStats(
        userAddress: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<NotificationStats> {
        try {
            const response = await fetch(
                `/api/notifications/${userAddress}/stats?${startDate ? `startDate=${startDate.toISOString()}` : ''
                }${endDate ? `&endDate=${endDate.toISOString()}` : ''}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch notification stats');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get notification stats:', error);
            throw error;
        }
    }

    /**
     * Get notification trends over time
     */
    async getTrends(
        userAddress: string,
        options: {
            startDate: Date;
            endDate: Date;
            groupBy: 'day' | 'week' | 'month';
            type?: NotificationType;
        }
    ): Promise<NotificationTrend[]> {
        try {
            const queryParams = new URLSearchParams({
                startDate: options.startDate.toISOString(),
                endDate: options.endDate.toISOString(),
                groupBy: options.groupBy,
                ...(options.type && { type: options.type }),
            });

            const response = await fetch(
                `/api/notifications/${userAddress}/trends?${queryParams.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch notification trends');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get notification trends:', error);
            throw error;
        }
    }

    /**
     * Get user engagement metrics
     */
    async getEngagementMetrics(userAddress: string): Promise<{
        clickThroughRate: number;
        averageResponseTime: number;
        dismissRate: number;
    }> {
        try {
            const response = await fetch(
                `/api/notifications/${userAddress}/engagement`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch engagement metrics');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get engagement metrics:', error);
            throw error;
        }
    }

    /**
     * Send analytics data to backend service
     */
    private async sendToAnalytics(
        userAddress: string,
        event: any
    ): Promise<void> {
        try {
            const response = await fetch('/api/analytics/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAddress,
                    event,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send analytics data');
            }
        } catch (error) {
            console.error('Failed to send analytics data:', error);
        }
    }
}
