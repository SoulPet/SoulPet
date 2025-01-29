// Base error types
class BaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

// Network errors
class NetworkError extends BaseError {
    constructor(message = 'Network request failed') {
        super(message);
    }
}

// Validation errors
class ValidationError extends BaseError {
    constructor(message: string) {
        super(message);
    }
}

// Wallet errors
class WalletError extends BaseError {
    constructor(message: string) {
        super(message);
    }
}

// NFT errors
class NFTError extends BaseError {
    constructor(message: string) {
        super(message);
    }
}

// Transaction errors
class TransactionError extends BaseError {
    constructor(message: string) {
        super(message);
    }
}

// Authentication errors
class AuthError extends BaseError {
    constructor(message = 'Authentication failed') {
        super(message);
    }
}

// Permission errors
class PermissionError extends BaseError {
    constructor(message = 'Permission denied') {
        super(message);
    }
}

// Resource not found errors
class NotFoundError extends BaseError {
    constructor(message = 'Resource not found') {
        super(message);
    }
}

// Rate limit errors
class RateLimitError extends BaseError {
    constructor(message = 'Rate limit exceeded') {
        super(message);
    }
}

// Conflict errors
class ConflictError extends BaseError {
    constructor(message = 'Resource conflict') {
        super(message);
    }
}

// Server errors
class ServerError extends BaseError {
    constructor(message = 'Internal server error') {
        super(message);
    }
}

// Error factory function
function createError(type: string, message: string): BaseError {
    switch (type) {
        case 'network':
            return new NetworkError(message);
        case 'validation':
            return new ValidationError(message);
        case 'wallet':
            return new WalletError(message);
        case 'nft':
            return new NFTError(message);
        case 'transaction':
            return new TransactionError(message);
        case 'auth':
            return new AuthError(message);
        case 'permission':
            return new PermissionError(message);
        case 'notFound':
            return new NotFoundError(message);
        case 'rateLimit':
            return new RateLimitError(message);
        case 'conflict':
            return new ConflictError(message);
        case 'server':
            return new ServerError(message);
        default:
            return new BaseError(message);
    }
}

// Error assertion function
function assertError(error: unknown): asserts error is Error {
    if (!(error instanceof Error)) {
        throw new Error('Not an error object');
    }
}

// Error type guards
function isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
}

function isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
}

function isWalletError(error: unknown): error is WalletError {
    return error instanceof WalletError;
}

function isNFTError(error: unknown): error is NFTError {
    return error instanceof NFTError;
}

function isTransactionError(error: unknown): error is TransactionError {
    return error instanceof TransactionError;
}

function isAuthError(error: unknown): error is AuthError {
    return error instanceof AuthError;
}

function isPermissionError(error: unknown): error is PermissionError {
    return error instanceof PermissionError;
}

function isNotFoundError(error: unknown): error is NotFoundError {
    return error instanceof NotFoundError;
}

function isRateLimitError(error: unknown): error is RateLimitError {
    return error instanceof RateLimitError;
}

function isConflictError(error: unknown): error is ConflictError {
    return error instanceof ConflictError;
}

function isServerError(error: unknown): error is ServerError {
    return error instanceof ServerError;
}

// Error handling service
class ErrorService {
    private static instance: ErrorService;

    private constructor() { }

    static getInstance(): ErrorService {
        if (!ErrorService.instance) {
            ErrorService.instance = new ErrorService();
        }
        return ErrorService.instance;
    }

    // Handle error and return user-friendly message
    handleError(error: unknown): string {
        assertError(error);

        if (isNetworkError(error)) {
            return 'Network connection error. Please check your internet connection.';
        }
        if (isValidationError(error)) {
            return 'Invalid input. Please check your data.';
        }
        if (isWalletError(error)) {
            return 'Wallet operation failed. Please try again.';
        }
        if (isNFTError(error)) {
            return 'NFT operation failed. Please try again.';
        }
        if (isTransactionError(error)) {
            return 'Transaction failed. Please try again.';
        }
        if (isAuthError(error)) {
            return 'Authentication failed. Please log in again.';
        }
        if (isPermissionError(error)) {
            return 'Permission denied. Please check your access rights.';
        }
        if (isNotFoundError(error)) {
            return 'Resource not found. Please try again.';
        }
        if (isRateLimitError(error)) {
            return 'Too many requests. Please try again later.';
        }
        if (isConflictError(error)) {
            return 'Resource conflict. Please try again.';
        }
        if (isServerError(error)) {
            return 'Server error. Please try again later.';
        }

        return 'An unexpected error occurred. Please try again.';
    }

    // Get error message
    getErrorMessage(error: unknown): string {
        assertError(error);
        return error.message;
    }

    // Log error
    logError(error: unknown): void {
        // Log to console
        console.error(error);

        // Report error
        this.reportError(error);
    }

    // Retry function
    async retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (retries === 0) throw error;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.retry(fn, retries - 1, delay * 2);
        }
    }
}

export const errorService = ErrorService.getInstance();
