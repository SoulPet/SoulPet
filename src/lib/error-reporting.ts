import { ErrorSeverity, ErrorTag, errorAlert } from './error-alert';
import { errorClassification } from './error-classification';

export interface ErrorReport {
    name: string;
    message: string;
    stack?: string;
    timestamp: number;
    context?: Record<string, unknown>;
    userAgent?: string;
    url?: string;
    severity?: ErrorSeverity;
    tags?: ErrorTag[];
}

class ErrorReportingService {
    private static instance: ErrorReportingService;
    private readonly storageKey = 'error-reports';
    private readonly maxStoredErrors = 100;

    private constructor() { }

    static getInstance(): ErrorReportingService {
        if (!ErrorReportingService.instance) {
            ErrorReportingService.instance = new ErrorReportingService();
        }
        return ErrorReportingService.instance;
    }

    async reportError(
        error: unknown,
        context?: Record<string, unknown>
    ): Promise<void> {
        const report = this.createErrorReport(error, context);

        // Classify error and add tags
        const classification = errorClassification.classifyError(report);
        if (classification) {
            report.severity = classification.severity;
            report.tags = classification.tags;
        } else {
            report.tags = errorClassification.autoTagError(report);
        }

        // Store error report
        this.storeErrorReport(report);

        if (process.env.NODE_ENV === 'development') {
            console.error('[Error Report]:', report);
        }

        // Handle alerts
        await errorAlert.processError(report);

        if (process.env.NODE_ENV === 'production') {
            try {
                await this.sendErrorToServer(report);
            } catch (e) {
                console.error('Failed to send error report:', e);
            }
        }
    }

    private createErrorReport(
        error: unknown,
        context?: Record<string, unknown>
    ): ErrorReport {
        const report: ErrorReport = {
            name: error instanceof Error ? error.name : 'Unknown Error',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: Date.now(),
            context,
            userAgent:
                typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
        };
        return report;
    }

    private storeErrorReport(report: ErrorReport): void {
        if (typeof window === 'undefined') return;

        const reports = this.getStoredReports();
        reports.unshift(report);

        if (reports.length > this.maxStoredErrors) {
            reports.pop();
        }

        localStorage.setItem(this.storageKey, JSON.stringify(reports));
    }

    getStoredReports(): ErrorReport[] {
        if (typeof window === 'undefined') return [];

        const reportsJson = localStorage.getItem(this.storageKey);
        return reportsJson ? JSON.parse(reportsJson) : [];
    }

    clearStoredReports(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.storageKey);
    }

    private async sendErrorToServer(report: ErrorReport): Promise<void> {
        if (process.env.NEXT_PUBLIC_ERROR_REPORTING_URL) {
            await fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(report),
            });
        }
    }
}

export const errorReporting = ErrorReportingService.getInstance();
