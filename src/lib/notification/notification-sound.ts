'use client';

import { NotificationPriority } from './types';

interface SoundTheme {
    id: string;
    name: string;
    sounds: {
        default: string;
        urgent: string;
        high: string;
        medium: string;
        low: string;
    };
}

interface QuietHours {
    enabled: boolean;
    start: number; // Hour in 24-hour format (0-23)
    end: number; // Hour in 24-hour format (0-23)
    days: number[]; // Days of week (0-6, 0 = Sunday)
}

interface SoundCacheItem {
    url: string;
    audio: HTMLAudioElement;
    lastUsed: Date;
    size: number;
}

interface PlaybackState {
    isPlaying: boolean;
    currentSound: string | null;
    volume: number;
    startTime: Date | null;
    duration: number | null;
}

interface QueueItem {
    soundUrl: string;
    priority: NotificationPriority;
    timestamp: Date;
    retries: number;
}

export class NotificationSound {
    private static instance: NotificationSound;
    private audio: HTMLAudioElement | null = null;
    private enabled: boolean = true;
    private volume: number = 1.0;
    private currentTheme: string = 'default';
    private themes: Map<string, SoundTheme> = new Map();
    private quietHours: QuietHours = {
        enabled: false,
        start: 22, // 10 PM
        end: 7, // 7 AM
        days: [0, 1, 2, 3, 4, 5, 6], // All days
    };
    private customSounds: Map<string, string> = new Map();
    private cache: Map<string, SoundCacheItem> = new Map();
    private maxCacheSize: number = 50 * 1024 * 1024; // 50MB
    private currentCacheSize: number = 0;
    private playbackState: PlaybackState = {
        isPlaying: false,
        currentSound: null,
        volume: 1.0,
        startTime: null,
        duration: null,
    };
    private soundQueue: QueueItem[] = [];
    private maxRetries: number = 3;
    private processingQueue: boolean = false;

    private constructor() {
        this.initializeDefaultThemes();
    }

    static getInstance(): NotificationSound {
        if (!NotificationSound.instance) {
            NotificationSound.instance = new NotificationSound();
        }
        return NotificationSound.instance;
    }

    private initializeDefaultThemes(): void {
        this.themes.set('default', {
            id: 'default',
            name: 'Default Theme',
            sounds: {
                default: '/sounds/notification.mp3',
                urgent: '/sounds/urgent.mp3',
                high: '/sounds/high.mp3',
                medium: '/sounds/medium.mp3',
                low: '/sounds/low.mp3',
            },
        });

        this.themes.set('minimal', {
            id: 'minimal',
            name: 'Minimal Theme',
            sounds: {
                default: '/sounds/minimal/notification.mp3',
                urgent: '/sounds/minimal/urgent.mp3',
                high: '/sounds/minimal/high.mp3',
                medium: '/sounds/minimal/medium.mp3',
                low: '/sounds/minimal/low.mp3',
            },
        });
    }

    /**
     * Set notification sound enabled/disabled
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Set master volume (0.0 - 1.0)
     */
    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Set current sound theme
     */
    setTheme(themeId: string): void {
        if (this.themes.has(themeId)) {
            this.currentTheme = themeId;
        }
    }

    /**
     * Add custom sound theme
     */
    addTheme(theme: SoundTheme): void {
        this.themes.set(theme.id, theme);
    }

    /**
     * Remove sound theme
     */
    removeTheme(themeId: string): void {
        if (themeId !== 'default') {
            this.themes.delete(themeId);
            if (this.currentTheme === themeId) {
                this.currentTheme = 'default';
            }
        }
    }

    /**
     * Configure quiet hours
     */
    setQuietHours(config: Partial<QuietHours>): void {
        this.quietHours = { ...this.quietHours, ...config };
    }

    /**
     * Add custom sound for specific notification type
     */
    addCustomSound(notificationType: string, soundUrl: string): void {
        this.customSounds.set(notificationType, soundUrl);
    }

    /**
     * Remove custom sound for specific notification type
     */
    removeCustomSound(notificationType: string): void {
        this.customSounds.delete(notificationType);
    }

    /**
     * Test a sound file
     */
    async testSound(soundUrl: string): Promise<{
        valid: boolean;
        format?: string;
        duration?: number;
        error?: string;
    }> {
        try {
            const audio = new Audio(soundUrl);
            await new Promise((resolve, reject) => {
                audio.addEventListener('loadedmetadata', resolve);
                audio.addEventListener('error', reject);
            });

            const format = this.getSoundFormat(soundUrl);
            if (!this.isSupportedFormat(format)) {
                return {
                    valid: false,
                    format,
                    error: 'Unsupported audio format',
                };
            }

            return {
                valid: true,
                format,
                duration: audio.duration,
            };
        } catch (error) {
            return {
                valid: false,
                error: 'Failed to load sound file',
            };
        }
    }

    /**
     * Add sound to cache
     */
    async addToCache(soundUrl: string): Promise<void> {
        if (this.cache.has(soundUrl)) return;

        try {
            const audio = new Audio(soundUrl);
            await new Promise((resolve) =>
                audio.addEventListener('loadedmetadata', resolve)
            );

            const size = await this.getAudioSize(soundUrl);
            while (this.currentCacheSize + size > this.maxCacheSize) {
                this.evictFromCache();
            }

            this.cache.set(soundUrl, {
                url: soundUrl,
                audio,
                lastUsed: new Date(),
                size,
            });
            this.currentCacheSize += size;
        } catch (error) {
            console.error('Failed to cache sound:', error);
        }
    }

    /**
     * Clear sound cache
     */
    clearCache(): void {
        this.cache.clear();
        this.currentCacheSize = 0;
    }

    /**
     * Add sound to queue
     */
    queueSound(soundUrl: string, priority: NotificationPriority): void {
        this.soundQueue.push({
            soundUrl,
            priority,
            timestamp: new Date(),
            retries: 0,
        });

        if (!this.processingQueue) {
            this.processQueue();
        }
    }

    /**
     * Get current playback state
     */
    getPlaybackState(): PlaybackState {
        return { ...this.playbackState };
    }

    private async processQueue(): Promise<void> {
        if (this.processingQueue || this.soundQueue.length === 0) return;

        this.processingQueue = true;
        try {
            while (this.soundQueue.length > 0) {
                const item = this.soundQueue[0];
                try {
                    await this.play(item.priority, undefined, item.soundUrl);
                    this.soundQueue.shift();
                } catch (error) {
                    if (item.retries < this.maxRetries) {
                        item.retries++;
                        // Move to end of queue
                        this.soundQueue.push(this.soundQueue.shift()!);
                    } else {
                        // Remove failed item
                        this.soundQueue.shift();
                        console.error('Failed to play sound after max retries:', error);
                    }
                }
            }
        } finally {
            this.processingQueue = false;
        }
    }

    private async getAudioSize(url: string): Promise<number> {
        const response = await fetch(url, { method: 'HEAD' });
        return parseInt(response.headers.get('content-length') || '0');
    }

    private evictFromCache(): void {
        let oldestItem: [string, SoundCacheItem] | null = null;
        for (const entry of this.cache.entries()) {
            if (!oldestItem || entry[1].lastUsed < oldestItem[1].lastUsed) {
                oldestItem = entry;
            }
        }

        if (oldestItem) {
            this.currentCacheSize -= oldestItem[1].size;
            this.cache.delete(oldestItem[0]);
        }
    }

    private getSoundFormat(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();
        return extension || '';
    }

    private isSupportedFormat(format: string): boolean {
        const supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
        return supportedFormats.includes(format);
    }

    /**
     * Play notification sound
     */
    async play(
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        notificationType?: string,
        soundUrl?: string
    ): Promise<void> {
        if (!this.enabled || this.isQuietHours()) return;

        try {
            // Get appropriate sound URL
            const url = soundUrl || this.getSoundUrl(priority, notificationType);

            // Try to get from cache first
            let audio: HTMLAudioElement;
            const cached = this.cache.get(url);
            if (cached) {
                audio = cached.audio;
                cached.lastUsed = new Date();
            } else {
                audio = new Audio(url);
                this.addToCache(url).catch(console.error);
            }

            // Set volume based on priority and master volume
            const priorityVolume = this.getPriorityVolume(priority);
            audio.volume = this.volume * priorityVolume;

            // Update playback state
            this.playbackState = {
                isPlaying: true,
                currentSound: url,
                volume: audio.volume,
                startTime: new Date(),
                duration: audio.duration,
            };

            await audio.play();

            // Reset playback state when done
            audio.onended = () => {
                this.playbackState = {
                    isPlaying: false,
                    currentSound: null,
                    volume: this.volume,
                    startTime: null,
                    duration: null,
                };
            };
        } catch (error) {
            console.error('Failed to play notification sound:', error);
            this.playbackState.isPlaying = false;
        }
    }

    /**
     * Preload sounds for faster playback
     */
    preloadSounds(): void {
        const theme = this.themes.get(this.currentTheme);
        if (!theme) return;

        Object.values(theme.sounds).forEach((soundUrl) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = soundUrl;
        });

        this.customSounds.forEach((soundUrl) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = soundUrl;
        });
    }

    private isQuietHours(): boolean {
        if (!this.quietHours.enabled) return false;

        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();

        // Check if current day is in quiet hours days
        if (!this.quietHours.days.includes(day)) return false;

        // Handle quiet hours that span across midnight
        if (this.quietHours.start > this.quietHours.end) {
            return hour >= this.quietHours.start || hour < this.quietHours.end;
        }

        return hour >= this.quietHours.start && hour < this.quietHours.end;
    }

    private getSoundUrl(
        priority: NotificationPriority,
        notificationType?: string
    ): string {
        // Check for custom sound first
        if (notificationType && this.customSounds.has(notificationType)) {
            return this.customSounds.get(notificationType)!;
        }

        // Get sound from current theme
        const theme = this.themes.get(this.currentTheme);
        if (!theme) return '/sounds/notification.mp3';

        switch (priority) {
            case NotificationPriority.URGENT:
                return theme.sounds.urgent;
            case NotificationPriority.HIGH:
                return theme.sounds.high;
            case NotificationPriority.MEDIUM:
                return theme.sounds.medium;
            case NotificationPriority.LOW:
                return theme.sounds.low;
            default:
                return theme.sounds.default;
        }
    }

    private getPriorityVolume(priority: NotificationPriority): number {
        switch (priority) {
            case NotificationPriority.URGENT:
                return 1.0;
            case NotificationPriority.HIGH:
                return 0.8;
            case NotificationPriority.MEDIUM:
                return 0.6;
            case NotificationPriority.LOW:
                return 0.4;
            default:
                return 0.7;
        }
    }
}
