'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorAnalysis } from '@/lib/error-analysis';
import { errorReporting } from '@/lib/error-reporting';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface ErrorDashboardProps {
    className?: string;
}

export function ErrorDashboard({ className }: ErrorDashboardProps) {
    const [stats, setStats] = useState(errorAnalysis.getAnalysis()?.stats);
    const [patterns, setPatterns] = useState(
        errorAnalysis.getAnalysis()?.patterns
    );

    const updateAnalysis = () => {
        const reports = errorReporting.getStoredReports();
        const newStats = errorAnalysis.analyzeErrors(reports);
        const newPatterns = errorAnalysis.detectPatterns(reports);

        errorAnalysis.saveAnalysis(newStats, newPatterns);
        setStats(newStats);
        setPatterns(newPatterns);
    };

    useEffect(() => {
        updateAnalysis();
    }, []);

    const clearData = () => {
        errorReporting.clearStoredReports();
        errorAnalysis.clearAnalysis();
        setStats(undefined);
        setPatterns(undefined);
    };

    if (!stats) {
        return (
            <Card className={className}>
                <div className="p-6 text-center">
                    <p className="text-muted-foreground">No error data available</p>
                </div>
            </Card>
        );
    }

    // Prepare chart data
    const hourlyData = Object.entries(stats.errorsByHour).map(
        ([hour, count]) => ({
            hour: `${hour}:00`,
            count,
        })
    );

    const typeData = Object.entries(stats.errorsByType).map(([type, count]) => ({
        type,
        count,
    }));

    return (
        <Card className={className}>
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">Error Monitoring</h2>
                    <div className="space-x-2">
                        <Button variant="outline" onClick={updateAnalysis}>
                            Refresh
                        </Button>
                        <Button variant="destructive" onClick={clearData}>
                            Clear Data
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card>
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                Total Errors
                            </h3>
                            <p className="text-2xl font-bold">{stats.totalErrors}</p>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                Recovery Success Rate
                            </h3>
                            <p className="text-2xl font-bold">
                                {stats.recoveryStats.total
                                    ? Math.round(
                                        (stats.recoveryStats.successful /
                                            stats.recoveryStats.total) *
                                        100
                                    )
                                    : 0}
                                %
                            </p>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-4">
                            <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                Error Types Count
                            </h3>
                            <p className="text-2xl font-bold">
                                {Object.keys(stats.errorsByType).length}
                            </p>
                        </div>
                    </Card>
                </div>

                <Tabs defaultValue="hourly" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="hourly">Hourly Distribution</TabsTrigger>
                        <TabsTrigger value="type">By Type</TabsTrigger>
                        <TabsTrigger value="recent">Recent Errors</TabsTrigger>
                        <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
                    </TabsList>

                    <TabsContent value="hourly" className="space-y-4">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={hourlyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="hour" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar
                                        dataKey="count"
                                        fill="var(--primary)"
                                        name="Error Count"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>

                    <TabsContent value="type" className="space-y-4">
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={typeData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="type" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar
                                        dataKey="count"
                                        fill="var(--primary)"
                                        name="Error Count"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </TabsContent>

                    <TabsContent value="recent">
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                                {stats.recentErrors.map((error) => (
                                    <Card key={error.name}>
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium">{error.name}</h4>
                                                <span className="text-sm text-muted-foreground">
                                                    {formatDistanceToNow(error.lastOccurred, {
                                                        addSuffix: true,
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Occurrences: {error.count}
                                            </p>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="patterns">
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4">
                                {patterns?.map((pattern, index) => (
                                    <Card key={index}>
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium">{pattern.name}</h4>
                                                <span className="text-sm text-muted-foreground">
                                                    Frequency: {pattern.frequency} times/ hour
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Time Range:{' '}
                                                {formatDistanceToNow(pattern.timeRange[0], {
                                                    addSuffix: true,
                                                })}{' '}
                                                to{' '}
                                                {formatDistanceToNow(pattern.timeRange[1], {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                            {pattern.context && (
                                                <div className="text-sm">
                                                    <p className="font-medium mb-1">Context:</p>
                                                    <pre className="text-xs bg-muted p-2 rounded">
                                                        {JSON.stringify(pattern.context, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </Card>
    );
}
