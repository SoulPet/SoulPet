'use client'

import { AuthLayout } from '@/components/auth/auth-layout'
import { EmailSignInForm } from '@/components/auth/email-sign-in-form'
import { WalletSignIn } from '@/components/auth/wallet-sign-in'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailSignInData, WalletSignInData } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignInPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleEmailSignIn = async (data: EmailSignInData) => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/email/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            // Store token
            localStorage.setItem('token', result.token)

            // Redirect to home
            router.push('/')
        } catch (error) {
            console.error('Sign in error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleWalletSignIn = async (data: WalletSignInData) => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/wallet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            // Store token
            localStorage.setItem('token', result.token)

            // Redirect to home
            router.push('/')
        } catch (error) {
            console.error('Wallet sign in error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Welcome back"
            description="Sign in to your account to continue"
        >
            <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="wallet">Wallet</TabsTrigger>
                </TabsList>
                <TabsContent value="email">
                    <EmailSignInForm onSubmit={handleEmailSignIn} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="wallet">
                    <WalletSignIn onSignIn={handleWalletSignIn} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </AuthLayout>
    )
} 