'use client';

import { ProfileForm } from '@/components/profile/profile-form';

export default function ProfilePage() {
    return (
        <div className="container mx-auto py-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Profile</h1>
                    <p className="text-muted-foreground">
                        Manage your profile and preferences.
                    </p>
                </div>
                <ProfileForm />
            </div>
        </div>
    );
}
