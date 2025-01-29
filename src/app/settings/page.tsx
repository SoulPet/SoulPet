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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <div className="container py-8">
            <div className="mx-auto max-w-2xl space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your application preferences.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Customize the appearance and theme of your application.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label
                                htmlFor="theme"
                                className="text-sm font-medium leading-none"
                            >
                                Theme
                            </label>
                            <Select value={theme} onValueChange={(value) => setTheme(value)}>
                                <SelectTrigger id="theme">
                                    <SelectValue placeholder="Select theme" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                                Choose your preferred theme appearance.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Data</CardTitle>
                        <CardDescription>
                            Manage your application data and cache.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium leading-none">Clear Data</h3>
                            <p className="text-sm text-muted-foreground">
                                Clear all locally stored data, including favorites,
                                notifications, and activity history.
                            </p>
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                            >
                                Clear All Data
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
