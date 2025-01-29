'use client';

import { NotificationPriority, NotificationType } from './types';

export interface NotificationTemplate {
    id: string;
    type: NotificationType;
    titleTemplate: string;
    messageTemplate: string;
    priority: NotificationPriority;
    group?: string;
}

export interface TemplateData {
    [key: string]: string | number | boolean | undefined;
}

interface TemplateVariable {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'object';
    required: boolean;
    defaultValue?: any;
    validation?: RegExp | ((value: any) => boolean);
}

interface NotificationTemplate {
    id: string;
    name: string;
    description?: string;
    type: NotificationType;
    priority: NotificationPriority;
    titleTemplate: string;
    messageTemplate: string;
    variables: Record<string, TemplateVariable>;
    metadata?: Record<string, any>;
    version: string;
    created: Date;
    updated: Date;
    locales?: Record<
        string,
        {
            titleTemplate: string;
            messageTemplate: string;
        }
    >;
    category?: string;
    tags?: string[];
}

interface TemplateRenderOptions {
    locale?: string;
    timezone?: string;
    dateFormat?: string;
    fallbackLocale?: string;
    validateData?: boolean;
}

export class NotificationTemplateManager {
    private static instance: NotificationTemplateManager;
    private templates: Map<string, NotificationTemplate> = new Map();
    private defaultLocale: string = 'en';
    private defaultTimezone: string = 'UTC';
    private defaultDateFormat: string = 'YYYY-MM-DD HH:mm:ss';

    private constructor() {
        this.initializeDefaultTemplates();
    }

    static getInstance(): NotificationTemplateManager {
        if (!NotificationTemplateManager.instance) {
            NotificationTemplateManager.instance = new NotificationTemplateManager();
        }
        return NotificationTemplateManager.instance;
    }

    private initializeDefaultTemplates(): void {
        // System notification template
        this.addTemplate({
            id: 'system-notification',
            name: 'System Notification',
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.HIGH,
            titleTemplate: '{{title}}',
            messageTemplate: '{{message}}',
            variables: {
                title: {
                    name: 'title',
                    type: 'string',
                    required: true,
                },
                message: {
                    name: 'message',
                    type: 'string',
                    required: true,
                },
            },
            version: '1.0',
            created: new Date(),
            updated: new Date(),
        });

        // NFT listed template
        this.addTemplate({
            id: 'nft-listed',
            name: 'NFT Listed Notification',
            type: NotificationType.NFT_LISTED,
            priority: NotificationPriority.MEDIUM,
            titleTemplate: 'NFT {{nftName}} Listed',
            messageTemplate: '{{nftName}} has been listed for {{price}} {{currency}}',
            variables: {
                nftName: {
                    name: 'nftName',
                    type: 'string',
                    required: true,
                },
                price: {
                    name: 'price',
                    type: 'number',
                    required: true,
                },
                currency: {
                    name: 'currency',
                    type: 'string',
                    required: true,
                },
            },
            version: '1.0',
            created: new Date(),
            updated: new Date(),
            locales: {
                'zh-CN': {
                    titleTemplate: 'NFT {{nftName}} 已上架',
                    messageTemplate: '{{nftName}} 已以 {{price}} {{currency}} 上架',
                },
            },
        });
    }

    addTemplate(template: NotificationTemplate): void {
        this.validateTemplate(template);
        this.templates.set(template.id, {
            ...template,
            created: new Date(),
            updated: new Date(),
        });
    }

    updateTemplate(
        templateId: string,
        updates: Partial<NotificationTemplate>
    ): boolean {
        const template = this.templates.get(templateId);
        if (!template) return false;

        const updatedTemplate = {
            ...template,
            ...updates,
            updated: new Date(),
        };

        this.validateTemplate(updatedTemplate);
        this.templates.set(templateId, updatedTemplate);
        return true;
    }

    removeTemplate(templateId: string): boolean {
        return this.templates.delete(templateId);
    }

    getTemplate(templateId: string): NotificationTemplate | undefined {
        return this.templates.get(templateId);
    }

    getAllTemplates(): NotificationTemplate[] {
        return Array.from(this.templates.values());
    }

    renderTemplate(
        templateId: string,
        data: Record<string, any>,
        options: TemplateRenderOptions = {}
    ): Notification {
        const template = this.templates.get(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        if (options.validateData) {
            this.validateTemplateData(template, data);
        }

        const locale = options.locale || this.defaultLocale;
        const localizedTemplate = template.locales?.[locale] || {
            titleTemplate: template.titleTemplate,
            messageTemplate: template.messageTemplate,
        };

        const title = this.renderString(localizedTemplate.titleTemplate, data);
        const message = this.renderString(localizedTemplate.messageTemplate, data);

        return {
            id: crypto.randomUUID(),
            type: template.type,
            priority: template.priority,
            title,
            message,
            timestamp: new Date(),
            read: false,
            data,
            metadata: {
                ...template.metadata,
                templateId: template.id,
                templateVersion: template.version,
                renderedAt: new Date(),
                locale,
            },
        };
    }

    private renderString(template: string, data: Record<string, any>): string {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const value = data[key.trim()];
            return value !== undefined ? String(value) : match;
        });
    }

    private validateTemplate(template: NotificationTemplate): void {
        if (!template.id) throw new Error('Template ID is required');
        if (!template.name) throw new Error('Template name is required');
        if (!template.type) throw new Error('Template type is required');
        if (!template.priority) throw new Error('Template priority is required');
        if (!template.titleTemplate)
            throw new Error('Template title template is required');
        if (!template.messageTemplate)
            throw new Error('Template message template is required');
        if (!template.variables) throw new Error('Template variables are required');

        // Validate variables
        Object.entries(template.variables).forEach(([key, variable]) => {
            if (!variable.name) throw new Error(`Variable name is required: ${key}`);
            if (!variable.type) throw new Error(`Variable type is required: ${key}`);
            if (variable.required === undefined)
                throw new Error(`Variable required flag is required: ${key}`);
        });

        // Validate locales if present
        if (template.locales) {
            Object.entries(template.locales).forEach(([locale, templates]) => {
                if (!templates.titleTemplate)
                    throw new Error(`Title template is required for locale: ${locale}`);
                if (!templates.messageTemplate)
                    throw new Error(`Message template is required for locale: ${locale}`);
            });
        }
    }

    private validateTemplateData(
        template: NotificationTemplate,
        data: Record<string, any>
    ): void {
        Object.entries(template.variables).forEach(([key, variable]) => {
            const value = data[key];

            if (variable.required && value === undefined) {
                throw new Error(`Required variable is missing: ${key}`);
            }

            if (value !== undefined) {
                // Type validation
                switch (variable.type) {
                    case 'string':
                        if (typeof value !== 'string') {
                            throw new Error(
                                `Invalid type for variable ${key}: expected string`
                            );
                        }
                        break;
                    case 'number':
                        if (typeof value !== 'number') {
                            throw new Error(
                                `Invalid type for variable ${key}: expected number`
                            );
                        }
                        break;
                    case 'boolean':
                        if (typeof value !== 'boolean') {
                            throw new Error(
                                `Invalid type for variable ${key}: expected boolean`
                            );
                        }
                        break;
                    case 'date':
                        if (!(value instanceof Date) && isNaN(new Date(value).getTime())) {
                            throw new Error(
                                `Invalid type for variable ${key}: expected Date`
                            );
                        }
                        break;
                    case 'object':
                        if (typeof value !== 'object' || value === null) {
                            throw new Error(
                                `Invalid type for variable ${key}: expected object`
                            );
                        }
                        break;
                }

                // Custom validation
                if (variable.validation) {
                    if (variable.validation instanceof RegExp) {
                        if (!variable.validation.test(String(value))) {
                            throw new Error(
                                `Validation failed for variable ${key}: does not match pattern`
                            );
                        }
                    } else if (!variable.validation(value)) {
                        throw new Error(
                            `Validation failed for variable ${key}: custom validation failed`
                        );
                    }
                }
            }
        });
    }

    setDefaultLocale(locale: string): void {
        this.defaultLocale = locale;
    }

    setDefaultTimezone(timezone: string): void {
        this.defaultTimezone = timezone;
    }

    setDefaultDateFormat(format: string): void {
        this.defaultDateFormat = format;
    }

    getTemplatesByType(type: NotificationType): NotificationTemplate[] {
        return Array.from(this.templates.values()).filter(
            (template) => template.type === type
        );
    }

    getTemplatesByCategory(category: string): NotificationTemplate[] {
        return Array.from(this.templates.values()).filter(
            (template) => template.category === category
        );
    }

    getTemplatesByTags(tags: string[]): NotificationTemplate[] {
        return Array.from(this.templates.values()).filter((template) =>
            template.tags?.some((tag) => tags.includes(tag))
        );
    }

    validateTemplateStructure(template: NotificationTemplate): string[] {
        const errors: string[] = [];

        // Check required fields
        if (!template.id) errors.push('Template ID is required');
        if (!template.name) errors.push('Template name is required');
        if (!template.type) errors.push('Template type is required');
        if (!template.priority) errors.push('Template priority is required');
        if (!template.titleTemplate)
            errors.push('Template title template is required');
        if (!template.messageTemplate)
            errors.push('Template message template is required');

        // Check variables
        if (!template.variables) {
            errors.push('Template variables are required');
        } else {
            Object.entries(template.variables).forEach(([key, variable]) => {
                if (!variable.name) errors.push(`Variable name is required for ${key}`);
                if (!variable.type) errors.push(`Variable type is required for ${key}`);
                if (variable.required === undefined)
                    errors.push(`Variable required flag is required for ${key}`);
            });
        }

        // Check template syntax
        const variablePattern = /\{\{([^}]+)\}\}/g;
        const titleVars = Array.from(
            template.titleTemplate.matchAll(variablePattern)
        );
        const messageVars = Array.from(
            template.messageTemplate.matchAll(variablePattern)
        );

        [...titleVars, ...messageVars].forEach((match) => {
            const varName = match[1].trim();
            if (!template.variables[varName]) {
                errors.push(`Template references undefined variable: ${varName}`);
            }
        });

        return errors;
    }

    cloneTemplate(
        templateId: string,
        newId: string
    ): NotificationTemplate | null {
        const template = this.templates.get(templateId);
        if (!template) return null;

        const clonedTemplate = {
            ...template,
            id: newId,
            name: `${template.name} (Copy)`,
            created: new Date(),
            updated: new Date(),
        };

        this.addTemplate(clonedTemplate);
        return clonedTemplate;
    }

    exportTemplate(templateId: string): string {
        const template = this.templates.get(templateId);
        if (!template) throw new Error(`Template not found: ${templateId}`);

        return JSON.stringify(template, null, 2);
    }

    importTemplate(templateJson: string): void {
        try {
            const template = JSON.parse(templateJson);
            this.validateTemplate(template);
            this.addTemplate(template);
        } catch (error) {
            throw new Error(`Failed to import template: ${error.message}`);
        }
    }

    dispose(): void {
        NotificationTemplateManager.instance = null as any;
    }
}
