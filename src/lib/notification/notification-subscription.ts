'use client';

import { Notification, NotificationType } from './types';

export interface SubscriptionOptions {
    types?: NotificationType[];
    groups?: string[];
    onNotification: (notification: Notification) => void;
    onError?: (error: Error) => void;
    onReconnect?: () => void;
}

export class NotificationSubscriptionManager {
    private static instance: NotificationSubscriptionManager;
    private webSocket: WebSocket | null = null;
    private subscriptions: Map<string, SubscriptionOptions[]> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000; // Start with 1 second
    private heartbeatInterval: NodeJS.Timeout | null = null;

    private constructor() {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
    }

    static getInstance(): NotificationSubscriptionManager {
        if (!NotificationSubscriptionManager.instance) {
            NotificationSubscriptionManager.instance =
                new NotificationSubscriptionManager();
        }
        return NotificationSubscriptionManager.instance;
    }

    /**
     * Subscribe to notifications for a user
     */
    subscribe(userAddress: string, options: SubscriptionOptions): () => void {
        const userSubs = this.subscriptions.get(userAddress) || [];
        userSubs.push(options);
        this.subscriptions.set(userAddress, userSubs);

        // Initialize WebSocket if not already connected
        this.ensureWebSocketConnection(userAddress);

        // Return unsubscribe function
        return () => {
            const subs = this.subscriptions.get(userAddress) || [];
            const index = subs.indexOf(options);
            if (index > -1) {
                subs.splice(index, 1);
                if (subs.length === 0) {
                    this.subscriptions.delete(userAddress);
                    this.closeWebSocket();
                } else {
                    this.subscriptions.set(userAddress, subs);
                }
            }
        };
    }

    private ensureWebSocketConnection(userAddress: string): void {
        if (this.webSocket?.readyState === WebSocket.OPEN) return;

        try {
            this.webSocket = new WebSocket(
                `wss://api.example.com/notifications/ws/${userAddress}`
            );
            this.setupWebSocketHandlers(userAddress);
            this.startHeartbeat();
        } catch (error) {
            console.error('Failed to establish WebSocket connection:', error);
            this.handleReconnect(userAddress);
        }
    }

    private setupWebSocketHandlers(userAddress: string): void {
        if (!this.webSocket) return;

        this.webSocket.onopen = () => {
            console.log('WebSocket connection established');
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;

            // Notify subscribers of reconnection
            const subs = this.subscriptions.get(userAddress) || [];
            subs.forEach((sub) => sub.onReconnect?.());
        };

        this.webSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'heartbeat') {
                    this.handleHeartbeat();
                    return;
                }

                const notification = data as Notification;
                this.notifySubscribers(userAddress, notification);
            } catch (error) {
                console.error('Failed to process WebSocket message:', error);
            }
        };

        this.webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            const subs = this.subscriptions.get(userAddress) || [];
            subs.forEach((sub) =>
                sub.onError?.(new Error('WebSocket connection error'))
            );
        };

        this.webSocket.onclose = () => {
            console.log('WebSocket connection closed');
            this.handleReconnect(userAddress);
        };
    }

    private notifySubscribers(
        userAddress: string,
        notification: Notification
    ): void {
        const subs = this.subscriptions.get(userAddress) || [];
        subs.forEach((sub) => {
            // Check if subscriber is interested in this notification type
            if (sub.types && !sub.types.includes(notification.type)) return;
            // Check if subscriber is interested in this notification group
            if (
                sub.groups &&
                notification.group &&
                !sub.groups.includes(notification.group)
            )
                return;

            try {
                sub.onNotification(notification);
            } catch (error) {
                console.error('Error in notification subscriber:', error);
                sub.onError?.(error as Error);
            }
        });
    }

    private handleReconnect(userAddress: string): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            const subs = this.subscriptions.get(userAddress) || [];
            subs.forEach((sub) =>
                sub.onError?.(new Error('Failed to reconnect after maximum attempts'))
            );
            return;
        }

        this.reconnectAttempts++;
        this.reconnectDelay *= 2; // Exponential backoff

        setTimeout(() => {
            console.log(
                `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
            );
            this.ensureWebSocketConnection(userAddress);
        }, this.reconnectDelay);
    }

    private startHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.webSocket?.readyState === WebSocket.OPEN) {
                this.webSocket.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, 30000); // Send heartbeat every 30 seconds
    }

    private handleHeartbeat(): void {
        // Reset connection monitoring
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
        }

        // Set new timeout for monitoring missed heartbeats
        this.heartbeatTimeout = setTimeout(() => {
            console.warn('Missed heartbeat, closing connection');
            this.closeWebSocket();
        }, 45000); // Wait 45 seconds for next heartbeat
    }

    private heartbeatTimeout: NodeJS.Timeout | null = null;

    private closeWebSocket(): void {
        if (this.webSocket) {
            this.webSocket.close();
            this.webSocket = null;
        }

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
    }

    private handleOnline = (): void => {
        console.log('Network connection restored');
        this.subscriptions.forEach((_, userAddress) => {
            this.ensureWebSocketConnection(userAddress);
        });
    };

    private handleOffline = (): void => {
        console.log('Network connection lost');
        this.closeWebSocket();
    };

    /**
     * Update subscription configuration
     */
    updateConfig(config: {
        maxReconnectAttempts?: number;
        reconnectDelay?: number;
    }): void {
        if (config.maxReconnectAttempts !== undefined) {
            this.maxReconnectAttempts = config.maxReconnectAttempts;
        }
        if (config.reconnectDelay !== undefined) {
            this.reconnectDelay = config.reconnectDelay;
        }
    }

    dispose(): void {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        this.closeWebSocket();
    }
}
