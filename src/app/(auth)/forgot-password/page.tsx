'use client'

import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const formSchema = z.object({
    email: z.string().email('Invalid email address'),
})

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
        },
    })

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/password/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            toast.success('Password reset email sent')
            router.push('/signin')
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reset email')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AuthLayout
            title="Reset your password"
            description="Enter your email address and we'll send you a link to reset your password"
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter your email" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send reset link'}
                    </Button>
                </form>
            </Form>
        </AuthLayout>
    )
} 