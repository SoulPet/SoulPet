export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorTag {
    name: string;
    value: string;
}

export interface AlertRule {
    id: string;
    name: string;
    description?: string;
    condition: {
        type: 'threshold' | 'pattern' | 'frequency';
        threshold?: number;
        timeWindow?: number;
        pattern?: string;
        tags?: ErrorTag[];
        severity?: ErrorSeverity[];
    };
    actions: {
        type: 'email' | 'slack' | 'webhook';
        target: string;
        template?: string;
    }[];
    enabled: boolean;
}

interface AlertState {
    ruleId: string;
    errorCount: number;
    lastTriggered?: number;
    cooldown?: number;
}

class ErrorAlertService {
    private static instance: ErrorAlertService;
    private rules: AlertRule[] = [];
    private alertStates = new Map<string, AlertState>();
    private readonly storageKey = 'error-alert-rules';

    private constructor() {
        this.loadRules();
    }

    static getInstance(): ErrorAlertService {
        if (!ErrorAlertService.instance) {
            ErrorAlertService.instance = new ErrorAlertService();
        }
        return ErrorAlertService.instance;
    }

    // Load alert rules
    private loadRules(): void {
        if (typeof window === 'undefined') return;

        const rulesJson = localStorage.getItem(this.storageKey);
        if (rulesJson) {
            this.rules = JSON.parse(rulesJson);
        }
    }

    // Save alert rules
    private saveRules(): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(this.storageKey, JSON.stringify(this.rules));
    }

    // Add alert rule
    addRule(rule: AlertRule): void {
        this.rules.push(rule);
        this.saveRules();
    }

    // Update alert rule
    updateRule(ruleId: string, updates: Partial<AlertRule>): void {
        const index = this.rules.findIndex((r) => r.id === ruleId);
        if (index !== -1) {
            this.rules[index] = { ...this.rules[index], ...updates };
            this.saveRules();
        }
    }

    // Delete alert rule
    deleteRule(ruleId: string): void {
        this.rules = this.rules.filter((r) => r.id !== ruleId);
        this.saveRules();
    }

    // Get all rules
    getRules(): AlertRule[] {
        return this.rules;
    }

    // Process error and trigger alerts
    async processError(error: {
        name: string;
        message: string;
        timestamp: number;
        severity?: ErrorSeverity;
        tags?: ErrorTag[];
    }): Promise<void> {
        for (const rule of this.rules) {
            if (!rule.enabled) continue;

            const state = this.alertStates.get(rule.id) || {
                ruleId: rule.id,
                errorCount: 0,
            };

            // Check if in cooldown period
            if (
                state.cooldown &&
                state.lastTriggered &&
                Date.now() - state.lastTriggered < state.cooldown
            ) {
                continue;
            }

            // Check if conditions are met
            if (this.checkCondition(rule, error, state)) {
                // Trigger alert actions
                await this.triggerActions(rule, error);

                // Update state
                state.lastTriggered = Date.now();
                state.errorCount = 0;
                state.cooldown = 300000; // 5 minute cooldown period

                this.alertStates.set(rule.id, state);
            } else {
                // Update error count
                state.errorCount++;
                this.alertStates.set(rule.id, state);
            }
        }
    }

    // Check if in cooldown period
    private checkCondition(
        rule: AlertRule,
        error: {
            name: string;
            message: string;
            timestamp: number;
            severity?: ErrorSeverity;
            tags?: ErrorTag[];
        },
        state: AlertState
    ): boolean {
        const { condition } = rule;

        // Check severity
        if (
            condition.severity &&
            error.severity &&
            !condition.severity.includes(error.severity)
        ) {
            return false;
        }

        // Check tags
        if (condition.tags) {
            const hasAllTags = condition.tags.every((requiredTag) =>
                error.tags?.some(
                    (tag) =>
                        tag.name === requiredTag.name && tag.value === requiredTag.value
                )
            );
            if (!hasAllTags) return false;
        }

        switch (condition.type) {
            case 'threshold':
                return (
                    condition.threshold !== undefined &&
                    state.errorCount >= condition.threshold
                );
            case 'pattern':
                return (
                    condition.pattern !== undefined &&
                    (error.message.includes(condition.pattern) ||
                        error.name.includes(condition.pattern))
                );
            case 'frequency':
                if (
                    condition.threshold &&
                    condition.timeWindow &&
                    state.lastTriggered
                ) {
                    const timeSinceLastError = Date.now() - state.lastTriggered;
                    return (
                        timeSinceLastError <= condition.timeWindow &&
                        state.errorCount >= condition.threshold
                    );
                }
                return false;
            default:
                return false;
        }
    }

    // Trigger alert actions
    private async triggerActions(
        rule: AlertRule,
        error: {
            name: string;
            message: string;
            timestamp: number;
            severity?: ErrorSeverity;
            tags?: ErrorTag[];
        }
    ): Promise<void> {
        for (const action of rule.actions) {
            try {
                const message = this.formatAlertMessage(rule, error, action.template);

                switch (action.type) {
                    case 'email':
                        await this.sendEmail(action.target, message);
                        break;
                    case 'slack':
                        await this.sendSlackMessage(action.target, message);
                        break;
                    case 'webhook':
                        await this.sendWebhook(action.target, message);
                        break;
                }
            } catch (e) {
                console.error(`Failed to execute alert action: ${e}`);
            }
        }
    }

    // Format alert message
    private formatAlertMessage(
        rule: AlertRule,
        error: {
            name: string;
            message: string;
            timestamp: number;
            severity?: ErrorSeverity;
            tags?: ErrorTag[];
        },
        template?: string
    ): string {
        if (template) {
            return template
                .replace('{{ruleName}}', rule.name)
                .replace('{{errorName}}', error.name)
                .replace('{{errorMessage}}', error.message)
                .replace('{{severity}}', error.severity || 'unknown')
                .replace('{{timestamp}}', new Date(error.timestamp).toISOString())
                .replace(
                    '{{tags}}',
                    error.tags?.map((tag) => `${tag.name}=${tag.value}`).join(', ') ||
                    'none'
                );
        }

        return `
Alert: ${rule.name}
Error: ${error.name}
Message: ${error.message}
Severity: ${error.severity || 'unknown'}
Time: ${new Date(error.timestamp).toISOString()}
Tags: ${error.tags?.map((tag) => `${tag.name}=${tag.value}`).join(', ') || 'none'
            }
`;
    }

    // Send email
    private async sendEmail(to: string, message: string): Promise<void> {
        if (process.env.NEXT_PUBLIC_EMAIL_API_URL) {
            await fetch(process.env.NEXT_PUBLIC_EMAIL_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to,
                    subject: 'Error Alert',
                    message,
                }),
            });
        }
    }

    // Send Slack message
    private async sendSlackMessage(
        webhook: string,
        message: string
    ): Promise<void> {
        await fetch(webhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: message,
            }),
        });
    }

    // Send Webhook
    private async sendWebhook(url: string, message: string): Promise<void> {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
            }),
        });
    }
}

export const errorAlert = ErrorAlertService.getInstance();
