import { cn } from '@/lib/utils'

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({
    size = 'md',
    className,
    ...props
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
    }

    return (
        <div
            className={cn(
                'animate-spin rounded-full border-t-transparent border-primary',
                sizeClasses[size],
                className
            )}
            {...props}
        >
            <span className="sr-only">Loading...</span>
        </div>
    )
} 