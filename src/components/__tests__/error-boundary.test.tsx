import { errorService } from '@/lib/error';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../error-boundary';

// Mock error service
jest.mock('@/lib/error', () => ({
    errorService: {
        logError: jest.fn(),
        handleError: jest.fn((error) => error?.message || 'Unknown error occurred'),
    },
}));

describe('ErrorBoundary', () => {
    const ThrowError = () => {
        throw new Error('Test error');
    };

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render children when there is no error', () => {
        const { container } = render(
            <ErrorBoundary>
                <div>Test content</div>
            </ErrorBoundary>
        );

        expect(container).toHaveTextContent('Test content');
    });

    it('should render error UI when there is an error', () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Error occurred')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should render fallback UI when provided and there is an error', () => {
        const fallback = <div>Custom error UI</div>;

        render(
            <ErrorBoundary fallback={fallback}>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('should call errorService.logError when an error occurs', () => {
        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        expect(errorService.logError).toHaveBeenCalled();
    });

    it('should reload page when retry button is clicked', () => {
        const reloadMock = jest.fn();
        Object.defineProperty(window, 'location', {
            value: { reload: reloadMock },
            writable: true,
        });

        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>
        );

        fireEvent.click(screen.getByText('Retry'));
        expect(reloadMock).toHaveBeenCalled();
    });
});
