'use client';

import { ErrorList } from '@/components/error/error-list';

export default function ErrorMonitoringPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Error Monitoring</h1>
                    <p className="text-muted-foreground">
                        Monitor and track system errors and issues.
                    </p>
                </div>
                <ErrorList />
            </div>
        </div>
    );
}
