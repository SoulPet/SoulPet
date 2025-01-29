'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
    return (
        <div
            className={cn(
                'animate-spin rounded-full border-2 border-current border-t-transparent',
                {
                    'h-4 w-4': size === 'sm',
                    'h-6 w-6': size === 'md',
                    'h-8 w-8': size === 'lg',
                },
                className
            )}
        >
            <span className="sr-only">Loading...</span>
        </div>
    )
} 