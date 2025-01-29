export enum NotificationPriority {
    URGENT = 'URGENT',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
}

export enum NotificationType {
    SYSTEM = 'SYSTEM',
    NFT_LISTED = 'NFT_LISTED',
    TOKEN_TRANSFER = 'TOKEN_TRANSFER',
    CUSTOM = 'CUSTOM',
}

export interface Notification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    group?: string;
    data?: Record<string, any>;
    actions?: Array<{
        id: string;
        label: string;
        icon?: string;
        handler?: () => void;
    }>;
    metadata?: {
        source?: string;
        category?: string;
        tags?: string[];
        expiresAt?: Date;
        [key: string]: any;
    };
}
