'use client';

import {
    NotificationChannel,
    NotificationPreference,
    NotificationPriority,
    NotificationType,
} from './types';

export class NotificationPreferencesManager {
    private static instance: NotificationPreferencesManager;
    private preferences: Map<string, NotificationPreference[]> = new Map();
    private syncTimeout: NodeJS.Timeout | null = null;

    private constructor() {
        this.loadFromLocalStorage();
        window.addEventListener('storage', this.handleStorageChange);
    }

    static getInstance(): NotificationPreferencesManager {
        if (!NotificationPreferencesManager.instance) {
            NotificationPreferencesManager.instance =
                new NotificationPreferencesManager();
        }
        return NotificationPreferencesManager.instance;
    }

    private loadFromLocalStorage(): void {
        try {
            const storedPrefs = localStorage.getItem('notification_preferences');
            if (storedPrefs) {
                const data = JSON.parse(storedPrefs);
                Object.entries(data).forEach(([userAddress, prefs]) => {
                    this.preferences.set(userAddress, prefs as NotificationPreference[]);
                });
            }
        } catch (error) {
            console.error('Failed to load preferences from localStorage:', error);
        }
    }

    private handleStorageChange = (event: StorageEvent): void => {
        if (event.key === 'notification_preferences' && event.newValue) {
            try {
                const data = JSON.parse(event.newValue);
                Object.entries(data).forEach(([userAddress, prefs]) => {
                    this.preferences.set(userAddress, prefs as NotificationPreference[]);
                });
            } catch (error) {
                console.error('Failed to sync preferences from storage event:', error);
            }
        }
    };

    private saveToLocalStorage(): void {
        try {
            const data: Record<string, NotificationPreference[]> = {};
            this.preferences.forEach((prefs, userAddress) => {
                data[userAddress] = prefs;
            });
            localStorage.setItem('notification_preferences', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save preferences to localStorage:', error);
        }
    }

    private scheduleSyncToServer(): void {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        this.syncTimeout = setTimeout(() => {
            this.syncToServer();
        }, 2000); // Debounce sync to server
    }

    private async syncToServer(): Promise<void> {
        try {
            const updates: Array<{
                userAddress: string;
                preferences: NotificationPreference[];
            }> = [];
            this.preferences.forEach((prefs, userAddress) => {
                updates.push({ userAddress, preferences: prefs });
            });

            const response = await fetch('/api/notifications/preferences/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                throw new Error('Failed to sync preferences with server');
            }
        } catch (error) {
            console.error('Failed to sync preferences with server:', error);
        }
    }

    async getPreferences(userAddress: string): Promise<NotificationPreference[]> {
        let prefs = this.preferences.get(userAddress);

        if (!prefs) {
            try {
                const response = await fetch(
                    `/api/notifications/preferences/${userAddress}`
                );
                if (response.ok) {
                    prefs = await response.json();
                    this.preferences.set(userAddress, prefs);
                    this.saveToLocalStorage();
                }
            } catch (error) {
                console.error('Failed to fetch preferences from server:', error);
            }
        }

        if (!prefs) {
            // Return default preferences if none exist
            prefs = Object.values(NotificationType).map((type) => ({
                type,
                enabled: true,
                channels: [NotificationChannel.IN_APP],
                priority: NotificationPriority.MEDIUM,
            }));
            this.preferences.set(userAddress, prefs);
            this.saveToLocalStorage();
        }

        return prefs;
    }

    async updatePreferences(
        userAddress: string,
        preferences: NotificationPreference[]
    ): Promise<void> {
        this.preferences.set(userAddress, preferences);
        this.saveToLocalStorage();
        this.scheduleSyncToServer();
    }

    async updateChannelPreference(
        userAddress: string,
        channel: NotificationChannel,
        enabled: boolean
    ): Promise<void> {
        const prefs = await this.getPreferences(userAddress);
        const updatedPrefs = prefs.map((pref) => ({
            ...pref,
            channels: enabled
                ? [...new Set([...pref.channels, channel])]
                : pref.channels.filter((ch) => ch !== channel),
        }));
        await this.updatePreferences(userAddress, updatedPrefs);
    }

    async updateTypePreference(
        userAddress: string,
        type: NotificationType,
        updates: Partial<NotificationPreference>
    ): Promise<void> {
        const prefs = await this.getPreferences(userAddress);
        const updatedPrefs = prefs.map((pref) =>
            pref.type === type ? { ...pref, ...updates } : pref
        );
        await this.updatePreferences(userAddress, updatedPrefs);
    }

    async resetToDefaults(userAddress: string): Promise<void> {
        const defaultPrefs = Object.values(NotificationType).map((type) => ({
            type,
            enabled: true,
            channels: [NotificationChannel.IN_APP],
            priority: NotificationPriority.MEDIUM,
        }));
        await this.updatePreferences(userAddress, defaultPrefs);
    }

    dispose(): void {
        window.removeEventListener('storage', this.handleStorageChange);
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
    }
}
