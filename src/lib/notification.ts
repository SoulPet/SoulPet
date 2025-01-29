/**
 * Types of notifications available in the system
 */
export enum NotificationType {
    // System notifications
    SYSTEM = 'system',
    MAINTENANCE = 'maintenance',

    // Transaction notifications
    TRANSACTION = 'transaction',
    TRANSFER = 'transfer',

    // NFT notifications
    NFT_MINT = 'nft_mint',
    NFT_TRANSFER = 'nft_transfer',
    NFT_SALE = 'nft_sale',
    NFT_OFFER = 'nft_offer',

    // Token notifications
    TOKEN_MINT = 'token_mint',
    TOKEN_TRANSFER = 'token_transfer',
    TOKEN_BURN = 'token_burn',

    // Market notifications
    PRICE_ALERT = 'price_alert',
    LISTING = 'listing',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

/**
 * Notification delivery channels
 */
export enum NotificationChannel {
    IN_APP = 'in_app',
    EMAIL = 'email',
    PUSH = 'push',
}

/**
 * Notification data structure
 */
export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    timestamp: Date;
    read: boolean;
    data?: Record<string, any>;
}

/**
 * Subscription preferences for a notification type
 */
export interface NotificationPreference {
    type: NotificationType;
    enabled: boolean;
    channels: NotificationChannel[];
    priority: NotificationPriority;
}

/**
 * Service for managing notifications and subscriptions
 */
export class NotificationService {
    private static instance: NotificationService;
    private listeners: Map<string, ((notification: Notification) => void)[]> =
        new Map();
    private webSocket: WebSocket | null = null;

    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Initialize WebSocket connection for real-time notifications
     */
    private initializeWebSocket(userAddress: string) {
        if (this.webSocket) return;

        // TODO: Replace with actual WebSocket endpoint
        this.webSocket = new WebSocket(
            `wss://api.example.com/notifications/${userAddress}`
        );

        this.webSocket.onmessage = (event) => {
            const notification: Notification = JSON.parse(event.data);
            this.notifyListeners(userAddress, notification);
        };

        this.webSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.reconnectWebSocket(userAddress);
        };

        this.webSocket.onclose = () => {
            console.log('WebSocket connection closed');
            this.reconnectWebSocket(userAddress);
        };
    }

    /**
     * Attempt to reconnect WebSocket
     */
    private reconnectWebSocket(userAddress: string) {
        setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            this.initializeWebSocket(userAddress);
        }, 5000);
    }

    /**
     * Notify all listeners for a specific user
     */
    private notifyListeners(userAddress: string, notification: Notification) {
        const userListeners = this.listeners.get(userAddress) || [];
        userListeners.forEach((listener) => listener(notification));
    }

    /**
     * Subscribe to notifications for a specific user
     */
    subscribe(
        userAddress: string,
        callback: (notification: Notification) => void
    ): () => void {
        const userListeners = this.listeners.get(userAddress) || [];
        userListeners.push(callback);
        this.listeners.set(userAddress, userListeners);

        // Initialize WebSocket connection if not already connected
        this.initializeWebSocket(userAddress);

        return () => {
            const updatedListeners = (this.listeners.get(userAddress) || []).filter(
                (listener) => listener !== callback
            );

            if (updatedListeners.length === 0) {
                this.listeners.delete(userAddress);
                this.webSocket?.close();
                this.webSocket = null;
            } else {
                this.listeners.set(userAddress, updatedListeners);
            }
        };
    }

    /**
     * Send a notification
     */
    async send(
        userAddress: string,
        type: NotificationType,
        title: string,
        message: string,
        options: {
            priority?: NotificationPriority;
            data?: Record<string, any>;
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
        };

        try {
            // TODO: Send notification to backend
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAddress,
                    notification,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send notification');
            }

            // Notify listeners immediately for real-time updates
            this.notifyListeners(userAddress, notification);

            return notification.id;
        } catch (error) {
            console.error('Failed to send notification:', error);
            throw error;
        }
    }

    /**
     * Get user's notification preferences with caching
     */
    async getPreferences(userAddress: string): Promise<NotificationPreference[]> {
        try {
            // TODO: Implement caching mechanism
            const response = await fetch(
                `/api/notifications/preferences/${userAddress}`
            );
            if (!response.ok) {
                throw new Error('Failed to fetch preferences');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to get preferences:', error);
            // Return default preferences if fetch fails
            return Object.values(NotificationType).map((type) => ({
                type,
                enabled: true,
                channels: [NotificationChannel.IN_APP],
                priority: NotificationPriority.MEDIUM,
            }));
        }
    }

    /**
     * Update user's notification preferences
     */
    async updatePreferences(
        userAddress: string,
        preferences: NotificationPreference[]
    ): Promise<void> {
        try {
            const response = await fetch(
                `/api/notifications/preferences/${userAddress}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(preferences),
                }
            );

            if (!response.ok) {
                throw new Error('Failed to update preferences');
            }
        } catch (error) {
            console.error('Failed to update preferences:', error);
            throw error;
        }
    }

    /**
     * Get user's notifications with pagination and filtering
     */
    async getNotifications(
        userAddress: string,
        options: {
            unreadOnly?: boolean;
            type?: NotificationType;
            limit?: number;
            offset?: number;
            startDate?: Date;
            endDate?: Date;
        } = {}
    ): Promise<{ notifications: Notification[]; total: number }> {
        try {
            const queryParams = new URLSearchParams();
            if (options.unreadOnly) queryParams.append('unreadOnly', 'true');
            if (options.type) queryParams.append('type', options.type);
            if (options.limit) queryParams.append('limit', options.limit.toString());
            if (options.offset)
                queryParams.append('offset', options.offset.toString());
            if (options.startDate)
                queryParams.append('startDate', options.startDate.toISOString());
            if (options.endDate)
                queryParams.append('endDate', options.endDate.toISOString());

            const response = await fetch(
                `/api/notifications/${userAddress}?${queryParams.toString()}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get notifications:', error);
            return { notifications: [], total: 0 };
        }
    }

    /**
     * Mark notifications as read
     */
    async markAsRead(
        userAddress: string,
        notificationIds: string[]
    ): Promise<void> {
        try {
            const response = await fetch(`/api/notifications/${userAddress}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to mark notifications as read');
            }
        } catch (error) {
            console.error('Failed to mark notifications as read:', error);
            throw error;
        }
    }

    /**
     * Delete notifications
     */
    async deleteNotifications(
        userAddress: string,
        notificationIds: string[]
    ): Promise<void> {
        try {
            const response = await fetch(`/api/notifications/${userAddress}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notificationIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to delete notifications');
            }
        } catch (error) {
            console.error('Failed to delete notifications:', error);
            throw error;
        }
    }
}
