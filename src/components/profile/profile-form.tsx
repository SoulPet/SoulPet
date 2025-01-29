'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const profileSchema = z.object({
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username cannot exceed 20 characters'),
    bio: z.string().max(200, 'Bio cannot exceed 200 characters').optional(),
    email: z.string().email('Please enter a valid email address').optional(),
    twitter: z.string().optional(),
    discord: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileForm() {
    const wallet = useWallet();
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            username: '',
            bio: '',
            email: '',
            twitter: '',
            discord: '',
        },
    });

    useEffect(() => {
        if (!wallet.publicKey) return;

        // Load user profile from localStorage
        const savedProfile = localStorage.getItem(
            `user-profile-${wallet.publicKey.toString()}`
        );
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            form.reset(profile);
        }
    }, [wallet.publicKey, form]);

    const onSubmit = (data: ProfileFormValues) => {
        if (!wallet.publicKey) return;

        // Save to localStorage
        localStorage.setItem(
            `user-profile-${wallet.publicKey.toString()}`,
            JSON.stringify(data)
        );
        toast.success('Profile updated successfully');
    };

    if (!wallet.publicKey) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        Please connect your wallet to manage your profile.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                    Manage your profile and social media accounts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter your username" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        This is your public display name.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Bio</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Introduce yourself" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        A brief personal introduction.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="your@email.com"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Used for receiving notifications and updates.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="twitter"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Twitter</FormLabel>
                                    <FormControl>
                                        <Input placeholder="@username" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="discord"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Discord</FormLabel>
                                    <FormControl>
                                        <Input placeholder="username#0000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit">Save Changes</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
