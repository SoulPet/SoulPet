'use client';

import { ErrorAlert } from '@/components/ui/error-alert';
import { errorService } from '@/lib/error';
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        errorService.logError(error, { errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;

        if (hasError) {
            if (fallback) {
                return fallback;
            }

            return (
                <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
                    <div className="w-full max-w-md">
                        <ErrorAlert
                            title="Error occurred"
                            message={errorService.handleError(error)}
                            type="error"
                            action={{
                                label: 'Retry',
                                onClick: this.handleRetry,
                            }}
                        />
                    </div>
                </div>
            );
        }

        return children;
    }
}
