'use client'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const formSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export default function ResetPasswordPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    })

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (!token) {
            toast.error('Invalid reset token')
            return
        }

        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: data.password,
                }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            toast.success('Password successfully reset')
            router.push('/signin')
        } catch (error: any) {
            toast.error(error.message || 'Failed to reset password')
        } finally {
            setIsLoading(false)
        }
    }

    if (!token) {
        return (
            <AuthLayout
                title="Invalid reset link"
                description="This password reset link is invalid or has expired"
            >
                <Button onClick={() => router.push('/forgot-password')} className="w-full">
                    Request new reset link
                </Button>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Reset your password"
            description="Enter your new password below"
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Enter new password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                    <Input type="password" placeholder="Confirm new password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </Button>
                </form>
            </Form>
        </AuthLayout>
    )
} 