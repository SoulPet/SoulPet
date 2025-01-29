'use client';

export class NotificationError extends Error {
    constructor(
        message: string,
        public code: string,
        public retryable: boolean = true,
        public data?: any
    ) {
        super(message);
        this.name = 'NotificationError';
    }
}

export class RetryStrategy {
    private static readonly DEFAULT_MAX_RETRIES = 3;
    private static readonly DEFAULT_INITIAL_DELAY = 1000; // 1 second
    private static readonly DEFAULT_MAX_DELAY = 30000; // 30 seconds
    private static readonly DEFAULT_BACKOFF_FACTOR = 2;

    constructor(
        private maxRetries: number = RetryStrategy.DEFAULT_MAX_RETRIES,
        private initialDelay: number = RetryStrategy.DEFAULT_INITIAL_DELAY,
        private maxDelay: number = RetryStrategy.DEFAULT_MAX_DELAY,
        private backoffFactor: number = RetryStrategy.DEFAULT_BACKOFF_FACTOR
    ) { }

    async execute<T>(
        operation: () => Promise<T>,
        onRetry?: (error: Error, attempt: number, delay: number) => void
    ): Promise<T> {
        let lastError: Error;
        let attempt = 0;
        let delay = this.initialDelay;

        while (attempt < this.maxRetries) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                // Check if error is retryable
                if (error instanceof NotificationError && !error.retryable) {
                    throw error;
                }

                attempt++;
                if (attempt === this.maxRetries) {
                    break;
                }

                // Calculate next delay with exponential backoff
                delay = Math.min(delay * this.backoffFactor, this.maxDelay);

                // Notify retry callback if provided
                if (onRetry) {
                    onRetry(lastError, attempt, delay);
                }

                // Wait before next attempt
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw new NotificationError(
            `Operation failed after ${this.maxRetries} attempts: ${lastError.message}`,
            'MAX_RETRIES_EXCEEDED',
            false,
            { originalError: lastError }
        );
    }
}

export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorListeners: ((error: Error) => void)[] = [];

    private constructor() { }

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Add error listener
     */
    addListener(listener: (error: Error) => void): () => void {
        this.errorListeners.push(listener);
        return () => {
            const index = this.errorListeners.indexOf(listener);
            if (index > -1) {
                this.errorListeners.splice(index, 1);
            }
        };
    }

    /**
     * Handle error
     */
    handleError(error: Error): void {
        console.error('Notification error:', error);

        // Notify all listeners
        this.errorListeners.forEach((listener) => {
            try {
                listener(error);
            } catch (listenerError) {
                console.error('Error in error listener:', listenerError);
            }
        });

        // Log to error tracking service
        this.logError(error);
    }

    /**
     * Create retry strategy
     */
    createRetryStrategy(options?: {
        maxRetries?: number;
        initialDelay?: number;
        maxDelay?: number;
        backoffFactor?: number;
    }): RetryStrategy {
        return new RetryStrategy(
            options?.maxRetries,
            options?.initialDelay,
            options?.maxDelay,
            options?.backoffFactor
        );
    }

    /**
     * Execute with retry
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        options?: {
            maxRetries?: number;
            initialDelay?: number;
            maxDelay?: number;
            backoffFactor?: number;
            onRetry?: (error: Error, attempt: number, delay: number) => void;
        }
    ): Promise<T> {
        const strategy = this.createRetryStrategy(options);
        return strategy.execute(operation, options?.onRetry);
    }

    private async logError(error: Error): Promise<void> {
        try {
            const errorData = {
                name: error.name,
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                ...(error instanceof NotificationError && {
                    code: error.code,
                    retryable: error.retryable,
                    data: error.data,
                }),
            };

            await fetch('/api/errors/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(errorData),
            });
        } catch (loggingError) {
            console.error('Failed to log error:', loggingError);
        }
    }
}
