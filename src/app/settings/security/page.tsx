'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { zodResolver } from '@hookform/resolvers/zod'
import Image from 'next/image'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export default function SecuritySettingsPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [is2FAEnabled, setIs2FAEnabled] = useState(false)
    const [qrCode, setQrCode] = useState<string | null>(null)

    const form = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        },
    })

    const onChangePassword = async (data: z.infer<typeof passwordSchema>) => {
        try {
            setIsLoading(true)
            const response = await fetch('/api/auth/password/change', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error)

            toast.success('Password changed successfully')
            form.reset()
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password')
        } finally {
            setIsLoading(false)
        }
    }

    const handle2FAToggle = async () => {
        try {
            setIsLoading(true)
            if (!is2FAEnabled) {
                // Enable 2FA
                const response = await fetch('/api/auth/2fa/setup', {
                    method: 'POST',
                })

                const result = await response.json()
                if (!response.ok) throw new Error(result.error)

                setQrCode(result.qrCode)
            } else {
                // Disable 2FA
                const response = await fetch('/api/auth/2fa/disable', {
                    method: 'POST',
                })

                const result = await response.json()
                if (!response.ok) throw new Error(result.error)

                setQrCode(null)
            }

            setIs2FAEnabled(!is2FAEnabled)
            toast.success(is2FAEnabled ? '2FA disabled' : '2FA enabled')
        } catch (error: any) {
            toast.error(error.message || 'Failed to toggle 2FA')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-bold">Security Settings</h1>

            {/* Change Password */}
            <Card>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                        Update your password to keep your account secure
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onChangePassword)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
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
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
                <CardHeader>
                    <CardTitle>Two-Factor Authentication</CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">2FA Authentication</h3>
                            <p className="text-sm text-gray-500">
                                {is2FAEnabled
                                    ? 'Two-factor authentication is enabled'
                                    : 'Enable two-factor authentication for enhanced security'}
                            </p>
                        </div>
                        <Switch
                            checked={is2FAEnabled}
                            onCheckedChange={handle2FAToggle}
                            disabled={isLoading}
                        />
                    </div>

                    {qrCode && (
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Scan QR Code</h4>
                            <div className="bg-white p-4 inline-block rounded-lg">
                                <Image
                                    src={qrCode}
                                    alt="2FA QR Code"
                                    width={200}
                                    height={200}
                                />
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Scan this QR code with your authenticator app
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>
                        Manage your active sessions across devices
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" disabled={isLoading}>
                        Sign Out All Devices
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
} 