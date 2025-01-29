'use client'

import { Toaster } from 'sonner'

export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    background: 'white',
                    color: 'black',
                    border: '1px solid #E2E8F0',
                },
            }}
        />
    )
} 