'use client'

import { Button } from '@/components/ui/button'
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    public render() {
        if (this.state.hasError) {
            return (
                this.props.fallback || (
                    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
                        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                        <p className="text-gray-600 mb-6">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <div className="space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => window.location.reload()}
                            >
                                Refresh Page
                            </Button>
                            <Button onClick={this.handleRetry}>Try Again</Button>
                        </div>
                    </div>
                )
            )
        }

        return this.props.children
    }
} 