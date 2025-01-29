'use client'

import { AuthLayout } from '@/components/auth/auth-layout'
import { EmailSignUpForm } from '@/components/auth/email-sign-up-form'
import { WalletSignIn } from '@/components/auth/wallet-sign-in'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailSignUpData, WalletSignInData } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignUpPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const handleEmailSignUp = async (data: EmailSignUpData) => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/email/signup', {
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
            console.error('Sign up error:', error)
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
            title="Create an account"
            description="Sign up to get started with SoulPet"
        >
            <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email">Email</TabsTrigger>
                    <TabsTrigger value="wallet">Wallet</TabsTrigger>
                </TabsList>
                <TabsContent value="email">
                    <EmailSignUpForm onSubmit={handleEmailSignUp} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="wallet">
                    <WalletSignIn onSignIn={handleWalletSignIn} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </AuthLayout>
    )
} 