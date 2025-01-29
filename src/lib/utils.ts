import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    return String(error)
}

export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
): Promise<T> {
    let lastError: unknown
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error
            if (i === maxRetries - 1) break
            await sleep(baseDelay * Math.pow(2, i))
        }
    }
    throw lastError
}

export function debounce<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout

    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

export function throttle<T extends (...args: any[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0

    return (...args: Parameters<T>) => {
        const now = Date.now()
        if (now - lastCall >= delay) {
            fn(...args)
            lastCall = now
        }
    }
} 