import { ErrorSeverity, ErrorTag } from './error-alert';

interface ErrorClassification {
    severity: ErrorSeverity;
    tags: ErrorTag[];
}

interface ClassificationRule {
    id: string;
    name: string;
    patterns: {
        name?: string[];
        message?: string[];
        stack?: string[];
    };
    severity: ErrorSeverity;
    tags: ErrorTag[];
}

class ErrorClassificationService {
    private static instance: ErrorClassificationService;
    private rules: ClassificationRule[] = [];
    private readonly storageKey = 'error-classification-rules';

    private constructor() {
        this.loadRules();
        this.initializeDefaultRules();
    }

    static getInstance(): ErrorClassificationService {
        if (!ErrorClassificationService.instance) {
            ErrorClassificationService.instance = new ErrorClassificationService();
        }
        return ErrorClassificationService.instance;
    }

    // Initialize default rules
    private initializeDefaultRules(): void {
        const defaultRules: ClassificationRule[] = [
            {
                id: 'network-error',
                name: 'Network Errors',
                patterns: {
                    name: ['NetworkError'],
                    message: ['network', 'connection', 'timeout', 'offline'],
                },
                severity: 'high',
                tags: [
                    { name: 'type', value: 'network' },
                    { name: 'area', value: 'connectivity' },
                ],
            },
            {
                id: 'auth-error',
                name: 'Authentication Errors',
                patterns: {
                    name: ['AuthenticationError', 'AuthorizationError'],
                    message: ['unauthorized', 'forbidden', 'permission denied'],
                },
                severity: 'medium',
                tags: [
                    { name: 'type', value: 'auth' },
                    { name: 'area', value: 'security' },
                ],
            },
            {
                id: 'validation-error',
                name: 'Validation Errors',
                patterns: {
                    name: ['ValidationError'],
                    message: ['invalid', 'required', 'validation failed'],
                },
                severity: 'low',
                tags: [
                    { name: 'type', value: 'validation' },
                    { name: 'area', value: 'user-input' },
                ],
            },
            {
                id: 'wallet-error',
                name: 'Wallet Errors',
                patterns: {
                    name: ['WalletError'],
                    message: ['wallet', 'transaction', 'balance'],
                },
                severity: 'high',
                tags: [
                    { name: 'type', value: 'wallet' },
                    { name: 'area', value: 'blockchain' },
                ],
            },
            {
                id: 'nft-error',
                name: 'NFT Errors',
                patterns: {
                    name: ['NFTError'],
                    message: ['nft', 'mint', 'metadata'],
                },
                severity: 'high',
                tags: [
                    { name: 'type', value: 'nft' },
                    { name: 'area', value: 'blockchain' },
                ],
            },
            {
                id: 'rate-limit',
                name: 'Rate Limit Errors',
                patterns: {
                    name: ['RateLimitError'],
                    message: ['rate limit', 'too many requests'],
                },
                severity: 'medium',
                tags: [
                    { name: 'type', value: 'rate-limit' },
                    { name: 'area', value: 'api' },
                ],
            },
        ];

        // Only add default rules when no rules exist
        if (this.rules.length === 0) {
            this.rules = defaultRules;
            this.saveRules();
        }
    }

    // Load rules
    private loadRules(): void {
        if (typeof window === 'undefined') return;

        const rulesJson = localStorage.getItem(this.storageKey);
        if (rulesJson) {
            this.rules = JSON.parse(rulesJson);
        }
    }

    // Save rules
    private saveRules(): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(this.storageKey, JSON.stringify(this.rules));
    }

    // Add rule
    addRule(rule: ClassificationRule): void {
        this.rules.push(rule);
        this.saveRules();
    }

    // Update rule
    updateRule(ruleId: string, updates: Partial<ClassificationRule>): void {
        const index = this.rules.findIndex((r) => r.id === ruleId);
        if (index !== -1) {
            this.rules[index] = { ...this.rules[index], ...updates };
            this.saveRules();
        }
    }

    // Delete rule
    deleteRule(ruleId: string): void {
        this.rules = this.rules.filter((r) => r.id !== ruleId);
        this.saveRules();
    }

    // Get all rules
    getRules(): ClassificationRule[] {
        return this.rules;
    }

    // Classify error
    classifyError(error: {
        name: string;
        message: string;
        stack?: string;
    }): ErrorClassification | null {
        for (const rule of this.rules) {
            if (this.matchesRule(error, rule)) {
                return {
                    severity: rule.severity,
                    tags: rule.tags,
                };
            }
        }

        return null;
    }

    // Check if error matches rule
    private matchesRule(
        error: {
            name: string;
            message: string;
            stack?: string;
        },
        rule: ClassificationRule
    ): boolean {
        const { patterns } = rule;

        // Check error name
        if (patterns.name?.length) {
            const nameMatches = patterns.name.some((pattern) =>
                error.name.toLowerCase().includes(pattern.toLowerCase())
            );
            if (!nameMatches) return false;
        }

        // Check error message
        if (patterns.message?.length) {
            const messageMatches = patterns.message.some((pattern) =>
                error.message.toLowerCase().includes(pattern.toLowerCase())
            );
            if (!messageMatches) return false;
        }

        // Check error stack
        if (patterns.stack?.length && error.stack) {
            const stackMatches = patterns.stack.some((pattern) =>
                error.stack?.toLowerCase().includes(pattern.toLowerCase())
            );
            if (!stackMatches) return false;
        }

        return true;
    }

    // Auto tag error
    autoTagError(error: {
        name: string;
        message: string;
        stack?: string;
    }): ErrorTag[] {
        const tags: ErrorTag[] = [];

        // Add tags based on error name
        tags.push({ name: 'error-type', value: error.name });

        // Check if it's a network-related error
        if (
            error.message.toLowerCase().includes('network') ||
            error.message.toLowerCase().includes('connection') ||
            error.message.toLowerCase().includes('offline')
        ) {
            tags.push({ name: 'category', value: 'network' });
        }

        // Check if it's an auth-related error
        if (
            error.message.toLowerCase().includes('auth') ||
            error.message.toLowerCase().includes('permission') ||
            error.message.toLowerCase().includes('forbidden')
        ) {
            tags.push({ name: 'category', value: 'auth' });
        }

        // Check if it's a validation-related error
        if (
            error.message.toLowerCase().includes('validation') ||
            error.message.toLowerCase().includes('invalid') ||
            error.message.toLowerCase().includes('required')
        ) {
            tags.push({ name: 'category', value: 'validation' });
        }

        // Check if it's a blockchain-related error
        if (
            error.message.toLowerCase().includes('wallet') ||
            error.message.toLowerCase().includes('transaction') ||
            error.message.toLowerCase().includes('nft')
        ) {
            tags.push({ name: 'category', value: 'blockchain' });
        }

        return tags;
    }
}

export const errorClassification = ErrorClassificationService.getInstance();
