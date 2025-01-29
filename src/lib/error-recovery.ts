import { AppError, NetworkError, RateLimitError } from './error';
import { errorReporting } from './error-reporting';

interface RecoveryStrategy {
    canHandle: (error: unknown) => boolean;
    handle: (error: unknown) => Promise<void>;
}

class ErrorRecoveryService {
    private static instance: ErrorRecoveryService;
    private strategies: RecoveryStrategy[] = [];

    private constructor() {
        this.initializeStrategies();
    }

    static getInstance(): ErrorRecoveryService {
        if (!ErrorRecoveryService.instance) {
            ErrorRecoveryService.instance = new ErrorRecoveryService();
        }
        return ErrorRecoveryService.instance;
    }

    private initializeStrategies(): void {
        // Network error recovery strategy
        this.strategies.push({
            canHandle: (error) => error instanceof NetworkError,
            handle: async (error) => {
                const networkError = error as NetworkError;
                await errorReporting.reportError(networkError, {
                    recovery: 'network-retry',
                });

                // Wait for a while before retrying
                await new Promise((resolve) => setTimeout(resolve, 2000));

                // Add network status check here
                if (navigator.onLine) {
                    // Trigger page reload
                    window.location.reload();
                }
            },
        });

        // Rate limit error recovery strategy
        this.strategies.push({
            canHandle: (error) => error instanceof RateLimitError,
            handle: async (error) => {
                const rateLimitError = error as RateLimitError;
                await errorReporting.reportError(rateLimitError, {
                    recovery: 'rate-limit-wait',
                });

                // Wait for a longer time before retrying
                await new Promise((resolve) => setTimeout(resolve, 5000));
            },
        });

        // Default error recovery strategy
        this.strategies.push({
            canHandle: (error) => error instanceof AppError,
            handle: async (error) => {
                const appError = error as AppError;
                await errorReporting.reportError(appError, {
                    recovery: 'default',
                });

                // Choose recovery strategy based on error status code
                switch (appError.status) {
                    case 401:
                        // Redirect to login page
                        window.location.href = '/login';
                        break;
                    case 403:
                        // Clear permission cache and refresh
                        localStorage.removeItem('permissions');
                        window.location.reload();
                        break;
                    case 404:
                        // Redirect to homepage
                        window.location.href = '/';
                        break;
                    default:
                        // Default wait for a while before retrying
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                        window.location.reload();
                }
            },
        });
    }

    // Add custom recovery strategy
    addStrategy(strategy: RecoveryStrategy): void {
        this.strategies.unshift(strategy);
    }

    // Execute error recovery
    async recover(error: unknown): Promise<void> {
        // Find matching recovery strategy
        const strategy = this.strategies.find((s) => s.canHandle(error));

        if (strategy) {
            try {
                await strategy.handle(error);
            } catch (recoveryError) {
                // If recovery process fails, record and use default strategy
                await errorReporting.reportError(recoveryError, {
                    originalError: error,
                    recovery: 'failed',
                });
                await this.defaultRecovery(error);
            }
        } else {
            // If no matching strategy, use default recovery strategy
            await this.defaultRecovery(error);
        }
    }

    // Default recovery strategy
    private async defaultRecovery(error: unknown): Promise<void> {
        await errorReporting.reportError(error, {
            recovery: 'default',
        });

        // Wait for a while before refreshing page
        await new Promise((resolve) => setTimeout(resolve, 2000));
        window.location.reload();
    }

    // Check if recovery is possible
    canRecover(error: unknown): boolean {
        return this.strategies.some((strategy) => strategy.canHandle(error));
    }
}

export const errorRecovery = ErrorRecoveryService.getInstance();
