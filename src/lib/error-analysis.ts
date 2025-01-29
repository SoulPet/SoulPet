import { ErrorReport } from './error-reporting';

interface ErrorStats {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByHour: Record<number, number>;
    recentErrors: Array<{
        name: string;
        count: number;
        lastOccurred: number;
    }>;
    recoveryStats: {
        total: number;
        successful: number;
        failed: number;
    };
}

interface ErrorPattern {
    name: string;
    frequency: number;
    timeRange: [number, number];
    context?: Record<string, unknown>;
}

class ErrorAnalysisService {
    private static instance: ErrorAnalysisService;
    private readonly storageKey = 'error-analysis';

    private constructor() { }

    static getInstance(): ErrorAnalysisService {
        if (!ErrorAnalysisService.instance) {
            ErrorAnalysisService.instance = new ErrorAnalysisService();
        }
        return ErrorAnalysisService.instance;
    }

    // Analyze error reports and generate statistics
    analyzeErrors(reports: ErrorReport[]): ErrorStats {
        const stats: ErrorStats = {
            totalErrors: reports.length,
            errorsByType: {},
            errorsByHour: {},
            recentErrors: [],
            recoveryStats: {
                total: 0,
                successful: 0,
                failed: 0,
            },
        };

        // Count errors by type
        reports.forEach((report) => {
            stats.errorsByType[report.name] =
                (stats.errorsByType[report.name] || 0) + 1;

            // Count errors by hour
            const hour = new Date(report.timestamp).getHours();
            stats.errorsByHour[hour] = (stats.errorsByHour[hour] || 0) + 1;

            // Calculate recovery statistics
            if (report.context?.recovery) {
                stats.recoveryStats.total++;
                if (report.context.recovery === 'failed') {
                    stats.recoveryStats.failed++;
                } else {
                    stats.recoveryStats.successful++;
                }
            }
        });

        // Get recent errors
        const errorCounts = new Map<
            string,
            { count: number; lastOccurred: number }
        >();
        reports.forEach((report) => {
            const current = errorCounts.get(report.name) || {
                count: 0,
                lastOccurred: report.timestamp,
            };
            errorCounts.set(report.name, {
                count: current.count + 1,
                lastOccurred: Math.max(current.lastOccurred, report.timestamp),
            });
        });

        stats.recentErrors = Array.from(errorCounts.entries())
            .map(([name, { count, lastOccurred }]) => ({
                name,
                count,
                lastOccurred,
            }))
            .sort((a, b) => b.lastOccurred - a.lastOccurred)
            .slice(0, 10);

        return stats;
    }

    // Detect error patterns
    detectPatterns(reports: ErrorReport[]): ErrorPattern[] {
        const patterns: ErrorPattern[] = [];
        const timeWindow = 3600000; // 1 hour window

        // Group by error type
        const errorsByType = new Map<string, ErrorReport[]>();
        reports.forEach((report) => {
            const errors = errorsByType.get(report.name) || [];
            errors.push(report);
            errorsByType.set(report.name, errors);
        });

        // Analyze patterns for each error type
        errorsByType.forEach((typeReports, name) => {
            // Count frequency by time window
            const timestamps = typeReports.map((r) => r.timestamp).sort();
            let maxFrequency = 0;
            let patternStart = timestamps[0];
            let patternEnd = timestamps[0];

            for (let i = 0; i < timestamps.length; i++) {
                const windowStart = timestamps[i];
                const windowEnd = windowStart + timeWindow;
                const frequency = timestamps.filter(
                    (t) => t >= windowStart && t <= windowEnd
                ).length;

                if (frequency > maxFrequency) {
                    maxFrequency = frequency;
                    patternStart = windowStart;
                    patternEnd = windowEnd;
                }
            }

            // If frequency exceeds threshold, record as a pattern
            if (maxFrequency >= 3) {
                patterns.push({
                    name,
                    frequency: maxFrequency,
                    timeRange: [patternStart, patternEnd],
                    context: this.analyzeContext(
                        typeReports.filter(
                            (r) => r.timestamp >= patternStart && r.timestamp <= patternEnd
                        )
                    ),
                });
            }
        });

        return patterns.sort((a, b) => b.frequency - a.frequency);
    }

    // Analyze error context
    private analyzeContext(
        reports: ErrorReport[]
    ): Record<string, unknown> | undefined {
        if (reports.length === 0) return undefined;

        const context: Record<string, unknown> = {};
        const contextKeys = new Set<string>();

        // Collect all context keys
        reports.forEach((report) => {
            if (report.context) {
                Object.keys(report.context).forEach((key) => contextKeys.add(key));
            }
        });

        // Analyze patterns for each error type
        contextKeys.forEach((key) => {
            const values = reports
                .map((r) => r.context?.[key])
                .filter((v) => v !== undefined);

            if (values.length > 0) {
                // If all values are the same, record the value
                const allSame = values.every((v) => v === values[0]);
                if (allSame) {
                    context[key] = values[0];
                }
                // If it's a number, calculate the average
                else if (values.every((v) => typeof v === 'number')) {
                    context[key] =
                        values.reduce((a, b) => (a as number) + (b as number), 0) /
                        values.length;
                }
            }
        });

        return Object.keys(context).length > 0 ? context : undefined;
    }

    // Save analysis results
    saveAnalysis(stats: ErrorStats, patterns: ErrorPattern[]): void {
        if (typeof window === 'undefined') return;

        localStorage.setItem(
            this.storageKey,
            JSON.stringify({
                stats,
                patterns,
                timestamp: Date.now(),
            })
        );
    }

    // Get saved analysis results
    getAnalysis(): {
        stats: ErrorStats;
        patterns: ErrorPattern[];
        timestamp: number;
    } | null {
        if (typeof window === 'undefined') return null;

        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : null;
    }

    // Clear analysis results
    clearAnalysis(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.storageKey);
    }
}

export const errorAnalysis = ErrorAnalysisService.getInstance();
