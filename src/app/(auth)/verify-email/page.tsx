'use client'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function VerifyEmailPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [isVerifying, setIsVerifying] = useState(true)
    const [isSuccess, setIsSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            setIsVerifying(false)
            return
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch('/api/auth/email/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                })

                const result = await response.json()
                if (!response.ok) throw new Error(result.error)

                setIsSuccess(true)
                toast.success('Email verified successfully')
            } catch (error: any) {
                toast.error(error.message || 'Failed to verify email')
                setIsSuccess(false)
            } finally {
                setIsVerifying(false)
            }
        }

        verifyEmail()
    }, [token])

    if (isVerifying) {
        return (
            <AuthLayout
                title="Verifying your email"
                description="Please wait while we verify your email address"
            >
                <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                </div>
            </AuthLayout>
        )
    }

    if (!token) {
        return (
            <AuthLayout
                title="Invalid verification link"
                description="This email verification link is invalid or has expired"
            >
                <Button onClick={() => router.push('/signin')} className="w-full">
                    Back to Sign In
                </Button>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title={isSuccess ? 'Email verified' : 'Verification failed'}
            description={
                isSuccess
                    ? 'Your email has been verified successfully'
                    : 'Failed to verify your email address'
            }
        >
            <Button
                onClick={() => router.push(isSuccess ? '/signin' : '/signup')}
                className="w-full"
            >
                {isSuccess ? 'Sign In' : 'Try Again'}
            </Button>
        </AuthLayout>
    )
} 