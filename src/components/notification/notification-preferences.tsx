'use client';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    NotificationChannel,
    NotificationPreference,
    NotificationPriority,
    NotificationType,
} from '@/lib/notification';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
    userAddress: string;
    onUpdate?: () => void;
}

/**
 * Component for managing notification preferences
 */
export function NotificationPreferences({
    userAddress,
    onUpdate,
}: NotificationPreferencesProps) {
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadPreferences();
    }, [userAddress]);

    const loadPreferences = async () => {
        try {
            setIsLoading(true);
            // TODO: Load preferences from backend
            const prefs = Object.values(NotificationType).map((type) => ({
                type,
                enabled: true,
                channels: [NotificationChannel.IN_APP],
                priority: NotificationPriority.MEDIUM,
            }));
            setPreferences(prefs);
        } catch (error) {
            console.error('Failed to load preferences:', error);
            toast.error('Failed to load notification preferences');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            // TODO: Save preferences to backend
            toast.success('Preferences saved successfully');
            onUpdate?.();
        } catch (error) {
            console.error('Failed to save preferences:', error);
            toast.error('Failed to save preferences');
        } finally {
            setIsSaving(false);
        }
    };

    const updatePreference = (
        type: NotificationType,
        updates: Partial<NotificationPreference>
    ) => {
        setPreferences((prev) =>
            prev.map((pref) => (pref.type === type ? { ...pref, ...updates } : pref))
        );
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage your notification settings</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {preferences.map((pref) => (
                        <div
                            key={pref.type}
                            className="flex items-start justify-between space-x-4 p-4 bg-muted rounded-lg"
                        >
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`enable-${pref.type}`}
                                        checked={pref.enabled}
                                        onCheckedChange={(checked) =>
                                            updatePreference(pref.type, {
                                                enabled: checked as boolean,
                                            })
                                        }
                                    />
                                    <Label
                                        htmlFor={`enable-${pref.type}`}
                                        className="font-medium"
                                    >
                                        {pref.type
                                            .split('_')
                                            .map(
                                                (word) =>
                                                    word.charAt(0).toUpperCase() +
                                                    word.slice(1).toLowerCase()
                                            )
                                            .join(' ')}
                                    </Label>
                                </div>
                                {pref.enabled && (
                                    <div className="ml-6 space-y-4 mt-2">
                                        <div>
                                            <Label>Priority</Label>
                                            <Select
                                                value={pref.priority}
                                                onValueChange={(value) =>
                                                    updatePreference(pref.type, {
                                                        priority: value as NotificationPriority,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.values(NotificationPriority).map(
                                                        (priority) => (
                                                            <SelectItem key={priority} value={priority}>
                                                                {priority.charAt(0).toUpperCase() +
                                                                    priority.slice(1)}
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Channels</Label>
                                            <div className="space-y-2">
                                                {Object.values(NotificationChannel).map((channel) => (
                                                    <div
                                                        key={channel}
                                                        className="flex items-center space-x-2"
                                                    >
                                                        <Checkbox
                                                            id={`${pref.type}-${channel}`}
                                                            checked={pref.channels.includes(channel)}
                                                            onCheckedChange={(checked) => {
                                                                const newChannels = checked
                                                                    ? [...pref.channels, channel]
                                                                    : pref.channels.filter(
                                                                        (ch) => ch !== channel
                                                                    );
                                                                updatePreference(pref.type, {
                                                                    channels: newChannels,
                                                                });
                                                            }}
                                                        />
                                                        <Label htmlFor={`${pref.type}-${channel}`}>
                                                            {channel
                                                                .split('_')
                                                                .map(
                                                                    (word) =>
                                                                        word.charAt(0).toUpperCase() +
                                                                        word.slice(1).toLowerCase()
                                                                )
                                                                .join(' ')}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
