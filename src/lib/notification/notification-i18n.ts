'use client';

import { Notification, NotificationType } from './types';

export interface I18nConfig {
    defaultLocale: string;
    fallbackLocale: string;
    supportedLocales: string[];
    loadPath: string;
    interpolation: {
        prefix: string;
        suffix: string;
    };
    dateFormat: {
        short: string;
        medium: string;
        long: string;
    };
    numberFormat: {
        decimal: string;
        thousand: string;
        precision: number;
    };
}

export interface LocaleMessages {
    [key: string]: {
        [key: string]: string;
    };
}

export interface TranslateOptions {
    locale?: string;
    interpolation?: Record<string, any>;
    defaultValue?: string;
    context?: any;
}

export interface FormatOptions {
    locale?: string;
    format?: string;
    timezone?: string;
}

export class NotificationI18n {
    private static instance: NotificationI18n;
    private config: I18nConfig;
    private messages: LocaleMessages = {};
    private currentLocale: string;
    private loadedLocales: Set<string> = new Set();
    private readonly eventListeners: Map<string, Set<Function>> = new Map();

    private constructor() {
        this.config = this.getDefaultConfig();
        this.currentLocale = this.config.defaultLocale;
        this.initializeI18n();
    }

    static getInstance(): NotificationI18n {
        if (!NotificationI18n.instance) {
            NotificationI18n.instance = new NotificationI18n();
        }
        return NotificationI18n.instance;
    }

    private getDefaultConfig(): I18nConfig {
        return {
            defaultLocale: 'en',
            fallbackLocale: 'en',
            supportedLocales: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko'],
            loadPath: '/locales/{{locale}}/{{ns}}.json',
            interpolation: {
                prefix: '{{',
                suffix: '}}',
            },
            dateFormat: {
                short: 'MM/DD/YYYY',
                medium: 'MMM D, YYYY',
                long: 'MMMM D, YYYY HH:mm:ss',
            },
            numberFormat: {
                decimal: '.',
                thousand: ',',
                precision: 2,
            },
        };
    }

    /**
     * Update i18n configuration
     */
    updateConfig(newConfig: Partial<I18nConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Set current locale
     */
    async setLocale(locale: string): Promise<void> {
        if (!this.config.supportedLocales.includes(locale)) {
            throw new Error(`Locale ${locale} is not supported`);
        }

        if (!this.loadedLocales.has(locale)) {
            await this.loadLocaleMessages(locale);
        }

        this.currentLocale = locale;
        this.emit('localeChanged', locale);
    }

    /**
     * Get current locale
     */
    getLocale(): string {
        return this.currentLocale;
    }

    /**
     * Translate message
     */
    translate(key: string, options: TranslateOptions = {}): string {
        const locale = options.locale || this.currentLocale;
        const messages =
            this.messages[locale] || this.messages[this.config.fallbackLocale];

        if (!messages) {
            return options.defaultValue || key;
        }

        let message = messages[key];
        if (!message) {
            message = this.getFallbackMessage(key) || options.defaultValue || key;
        }

        return this.interpolate(
            message,
            options.interpolation || {},
            options.context
        );
    }

    /**
     * Format date
     */
    formatDate(date: Date, options: FormatOptions = {}): string {
        const locale = options.locale || this.currentLocale;
        const format = options.format || 'medium';

        return new Intl.DateTimeFormat(locale, {
            dateStyle: format as any,
            timeZone: options.timezone,
        }).format(date);
    }

    /**
     * Format number
     */
    formatNumber(number: number, options: FormatOptions = {}): string {
        const locale = options.locale || this.currentLocale;

        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: this.config.numberFormat.precision,
            maximumFractionDigits: this.config.numberFormat.precision,
        }).format(number);
    }

    /**
     * Translate notification
     */
    translateNotification(notification: Notification): Notification {
        return {
            ...notification,
            title: this.translate(`notifications.${notification.type}.title`, {
                context: notification,
            }),
            message: this.translate(`notifications.${notification.type}.message`, {
                context: notification,
            }),
            data: {
                ...notification.data,
                translatedAt: new Date(),
                originalLocale: notification.data?.locale,
                targetLocale: this.currentLocale,
            },
        };
    }

    /**
     * Add translation
     */
    addTranslation(
        locale: string,
        namespace: string,
        messages: Record<string, string>
    ): void {
        if (!this.messages[locale]) {
            this.messages[locale] = {};
        }

        Object.entries(messages).forEach(([key, value]) => {
            this.messages[locale][`${namespace}.${key}`] = value;
        });

        this.loadedLocales.add(locale);
        this.emit('translationsAdded', { locale, namespace });
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

    private async initializeI18n(): Promise<void> {
        try {
            await this.loadLocaleMessages(this.config.defaultLocale);
            this.setupDefaultTranslations();
        } catch (error) {
            console.error('Failed to initialize i18n:', error);
        }
    }

    private async loadLocaleMessages(locale: string): Promise<void> {
        try {
            const response = await fetch(
                this.config.loadPath
                    .replace('{{locale}}', locale)
                    .replace('{{ns}}', 'notifications')
            );
            const messages = await response.json();
            this.addTranslation(locale, 'notifications', messages);
        } catch (error) {
            console.error(`Failed to load messages for locale ${locale}:`, error);
        }
    }

    private setupDefaultTranslations(): void {
        // Add default English translations
        this.addTranslation('en', 'notifications', {
            'system.title': 'System Notification',
            'system.message': 'System message: {{message}}',
            'nft.sale.title': 'NFT Sale',
            'nft.sale.message': '{{name}} was sold for {{price}}',
            'token.transfer.title': 'Token Transfer',
            'token.transfer.message': 'Received {{amount}} {{symbol}}',
        });
    }

    private interpolate(
        message: string,
        interpolation: Record<string, any>,
        context?: any
    ): string {
        const { prefix, suffix } = this.config.interpolation;
        let result = message;

        // Replace interpolation variables
        Object.entries(interpolation).forEach(([key, value]) => {
            const token = `${prefix}${key}${suffix}`;
            result = result.replace(new RegExp(token, 'g'), String(value));
        });

        // Replace context variables
        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                const token = `${prefix}${key}${suffix}`;
                result = result.replace(new RegExp(token, 'g'), String(value));
            });
        }

        return result;
    }

    private getFallbackMessage(key: string): string | undefined {
        return this.messages[this.config.fallbackLocale]?.[key];
    }

    private emit(event: string, data?: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((callback) => callback(data));
        }
    }

    /**
     * Get notification type display name
     */
    getNotificationTypeDisplay(type: NotificationType): string {
        return this.translate(`notificationTypes.${type}`, {
            defaultValue: type,
        });
    }

    /**
     * Format relative time
     */
    formatRelativeTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return this.translate('time.days_ago', {
                interpolation: { count: days },
            });
        } else if (hours > 0) {
            return this.translate('time.hours_ago', {
                interpolation: { count: hours },
            });
        } else if (minutes > 0) {
            return this.translate('time.minutes_ago', {
                interpolation: { count: minutes },
            });
        } else {
            return this.translate('time.just_now');
        }
    }
}
