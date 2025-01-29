import {
    AppError,
    NetworkError,
    ValidationError,
    WalletError,
    errorService,
} from '../error';

describe('Error Service', () => {
    describe('handleError', () => {
        it('should handle AppError correctly', () => {
            const error = new AppError('Test error', 'TEST_ERROR', 500);
            expect(errorService.handleError(error)).toBe('Test error');
        });

        it('should handle NetworkError correctly', () => {
            const error = new NetworkError('Network error');
            expect(errorService.handleError(error)).toBe('Network error');
        });

        it('should handle ValidationError correctly', () => {
            const error = new ValidationError('Validation error');
            expect(errorService.handleError(error)).toBe('Validation error');
        });

        it('should handle WalletError correctly', () => {
            const error = new WalletError('Wallet error');
            expect(errorService.handleError(error)).toBe('Wallet error');
        });

        it('should handle unknown error correctly', () => {
            expect(errorService.handleError('unknown')).toBe(
                'Unknown error occurred'
            );
        });
    });

    describe('retry', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should retry failed operations', async () => {
            const mockFn = jest.fn();
            mockFn
                .mockRejectedValueOnce(new Error('Failed'))
                .mockRejectedValueOnce(new Error('Failed'))
                .mockResolvedValueOnce('Success');

            const promise = errorService.retry(mockFn, 3, 1000);

            // Fast-forward timers
            jest.runAllTimers();

            const result = await promise;
            expect(result).toBe('Success');
            expect(mockFn).toHaveBeenCalledTimes(3);
        });

        it('should throw error after max retries', async () => {
            const mockFn = jest.fn().mockRejectedValue(new Error('Failed'));

            const promise = errorService.retry(mockFn, 3, 1000);

            // Fast-forward timers
            jest.runAllTimers();

            await expect(promise).rejects.toThrow('Failed');
            expect(mockFn).toHaveBeenCalledTimes(4); // Initial try + 3 retries
        });
    });

    describe('logError', () => {
        it('should log errors correctly', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const error = new Error('Test error');

            errorService.logError(error);

            expect(consoleSpy).toHaveBeenCalledWith('[Error]:', error);
            consoleSpy.mockRestore();
        });
    });
});
