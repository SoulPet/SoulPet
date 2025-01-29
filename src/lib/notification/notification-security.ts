'use client';

import { Notification, NotificationType } from './types';

export interface SecurityConfig {
    encryptionEnabled: boolean;
    encryptionAlgorithm: 'AES-GCM' | 'AES-CBC';
    keySize: 128 | 256;
    accessTokenExpiration: number; // milliseconds
    maxDevices: number;
    requireTwoFactor: boolean;
    ipWhitelist?: string[];
}

export interface AccessControl {
    userId: string;
    roles: string[];
    permissions: Set<string>;
    deviceId?: string;
    expiresAt: Date;
}

export interface SecurityContext {
    authenticated: boolean;
    user?: {
        id: string;
        roles: string[];
    };
    device?: {
        id: string;
        trusted: boolean;
    };
    session?: {
        id: string;
        expiresAt: Date;
    };
}

export interface EncryptionKey {
    key: CryptoKey;
    iv: Uint8Array;
    algorithm: string;
    createdAt: Date;
    expiresAt: Date;
}

export class NotificationSecurity {
    private static instance: NotificationSecurity;
    private config: SecurityConfig;
    private accessControls: Map<string, AccessControl> = new Map();
    private encryptionKeys: Map<string, EncryptionKey> = new Map();
    private securityContext: SecurityContext | null = null;
    private readonly crypto: SubtleCrypto;

    private constructor() {
        this.config = this.getDefaultConfig();
        this.crypto = window.crypto.subtle;
        this.initializeSecurity();
    }

    static getInstance(): NotificationSecurity {
        if (!NotificationSecurity.instance) {
            NotificationSecurity.instance = new NotificationSecurity();
        }
        return NotificationSecurity.instance;
    }

    private getDefaultConfig(): SecurityConfig {
        return {
            encryptionEnabled: true,
            encryptionAlgorithm: 'AES-GCM',
            keySize: 256,
            accessTokenExpiration: 24 * 60 * 60 * 1000, // 24 hours
            maxDevices: 5,
            requireTwoFactor: false,
        };
    }

    /**
     * Update security configuration
     */
    updateConfig(newConfig: Partial<SecurityConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.initializeSecurity();
    }

    /**
     * Authenticate user and create security context
     */
    async authenticate(credentials: {
        userId: string;
        token: string;
        deviceId?: string;
        twoFactorCode?: string;
    }): Promise<SecurityContext> {
        try {
            // Validate credentials (implement actual validation logic)
            await this.validateCredentials(credentials);

            // Create security context
            this.securityContext = {
                authenticated: true,
                user: {
                    id: credentials.userId,
                    roles: await this.getUserRoles(credentials.userId),
                },
                device: credentials.deviceId
                    ? {
                        id: credentials.deviceId,
                        trusted: await this.isDeviceTrusted(credentials.deviceId),
                    }
                    : undefined,
                session: {
                    id: this.generateSessionId(),
                    expiresAt: new Date(Date.now() + this.config.accessTokenExpiration),
                },
            };

            return this.securityContext;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Check if user has required permissions
     */
    async checkPermissions(
        userId: string,
        requiredPermissions: string[]
    ): Promise<boolean> {
        const accessControl = this.accessControls.get(userId);
        if (!accessControl) return false;

        return requiredPermissions.every((permission) =>
            accessControl.permissions.has(permission)
        );
    }

    /**
     * Encrypt notification content
     */
    async encryptNotification(notification: Notification): Promise<Notification> {
        if (!this.config.encryptionEnabled) return notification;

        try {
            const encryptionKey = await this.getOrCreateEncryptionKey();
            const encryptedData = await this.encrypt(
                JSON.stringify(notification),
                encryptionKey
            );

            return {
                ...notification,
                data: {
                    ...notification.data,
                    encrypted: true,
                    content: encryptedData,
                    keyId: encryptionKey.algorithm,
                },
            };
        } catch (error) {
            throw new Error(`Encryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt notification content
     */
    async decryptNotification(notification: Notification): Promise<Notification> {
        if (!notification.data?.encrypted) return notification;

        try {
            const encryptionKey = await this.getEncryptionKey(
                notification.data.keyId
            );
            const decryptedData = await this.decrypt(
                notification.data.content,
                encryptionKey
            );

            return JSON.parse(decryptedData);
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Grant access permissions
     */
    grantAccess(accessControl: AccessControl): void {
        this.accessControls.set(accessControl.userId, accessControl);
    }

    /**
     * Revoke access permissions
     */
    revokeAccess(userId: string): void {
        this.accessControls.delete(userId);
    }

    /**
     * Validate notification access
     */
    async validateAccess(
        notification: Notification,
        userId: string
    ): Promise<boolean> {
        // Check authentication
        if (!this.securityContext?.authenticated) {
            return false;
        }

        // Check user permissions
        const requiredPermissions = this.getRequiredPermissions(notification.type);
        const hasPermission = await this.checkPermissions(
            userId,
            requiredPermissions
        );
        if (!hasPermission) {
            return false;
        }

        // Check device trust
        if (this.securityContext.device && !this.securityContext.device.trusted) {
            return false;
        }

        // Check session expiration
        if (
            this.securityContext.session &&
            this.securityContext.session.expiresAt < new Date()
        ) {
            return false;
        }

        return true;
    }

    /**
     * Get current security context
     */
    getSecurityContext(): SecurityContext | null {
        return this.securityContext;
    }

    private async initializeSecurity(): Promise<void> {
        await this.initializeEncryptionKeys();
        this.setupSecurityEventListeners();
    }

    private async initializeEncryptionKeys(): Promise<void> {
        if (!this.config.encryptionEnabled) return;

        const key = await this.generateEncryptionKey();
        this.encryptionKeys.set('primary', key);
    }

    private async generateEncryptionKey(): Promise<EncryptionKey> {
        const algorithm = {
            name: this.config.encryptionAlgorithm,
            length: this.config.keySize,
        };

        const key = await this.crypto.generateKey(algorithm, true, [
            'encrypt',
            'decrypt',
        ]);

        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        return {
            key,
            iv,
            algorithm: this.config.encryptionAlgorithm,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        };
    }

    private async encrypt(data: string, key: EncryptionKey): Promise<string> {
        const encodedData = new TextEncoder().encode(data);

        const encryptedData = await this.crypto.encrypt(
            {
                name: key.algorithm,
                iv: key.iv,
            },
            key.key,
            encodedData
        );

        return btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
    }

    private async decrypt(
        encryptedData: string,
        key: EncryptionKey
    ): Promise<string> {
        const decodedData = Uint8Array.from(atob(encryptedData), (c) =>
            c.charCodeAt(0)
        );

        const decryptedData = await this.crypto.decrypt(
            {
                name: key.algorithm,
                iv: key.iv,
            },
            key.key,
            decodedData
        );

        return new TextDecoder().decode(decryptedData);
    }

    private async getOrCreateEncryptionKey(): Promise<EncryptionKey> {
        const primaryKey = this.encryptionKeys.get('primary');
        if (primaryKey && primaryKey.expiresAt > new Date()) {
            return primaryKey;
        }

        const newKey = await this.generateEncryptionKey();
        this.encryptionKeys.set('primary', newKey);
        return newKey;
    }

    private async getEncryptionKey(keyId: string): Promise<EncryptionKey> {
        const key = this.encryptionKeys.get(keyId);
        if (!key) {
            throw new Error(`Encryption key not found: ${keyId}`);
        }
        return key;
    }

    private getRequiredPermissions(type: NotificationType): string[] {
        // Define required permissions based on notification type
        const permissionMap: Record<NotificationType, string[]> = {
            NFT_SALE: ['read:nft', 'read:sales'],
            TOKEN_TRANSFER: ['read:tokens', 'read:transfers'],
            SYSTEM: ['read:system'],
        };
        return permissionMap[type] || ['read:notifications'];
    }

    private setupSecurityEventListeners(): void {
        // Listen for security-related events
        window.addEventListener('storage', this.handleStorageEvent.bind(this));
        window.addEventListener('offline', this.handleOfflineMode.bind(this));
    }

    private handleStorageEvent(event: StorageEvent): void {
        if (event.key === 'securityContext') {
            this.validateSecurityContext();
        }
    }

    private handleOfflineMode(): void {
        // Implement offline mode security measures
    }

    private validateSecurityContext(): void {
        if (!this.securityContext) return;

        if (this.securityContext.session?.expiresAt < new Date()) {
            this.securityContext = null;
        }
    }

    private async validateCredentials(credentials: any): Promise<boolean> {
        // Implement actual credential validation
        return true;
    }

    private async getUserRoles(userId: string): Promise<string[]> {
        // Implement role retrieval
        return ['user'];
    }

    private async isDeviceTrusted(deviceId: string): Promise<boolean> {
        // Implement device trust validation
        return true;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
