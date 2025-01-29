interface PerformanceMetrics {
    pageLoad: {
        navigationStart: number;
        loadEventEnd: number;
        totalTime: number;
        domContentLoaded: number;
        firstPaint: number;
        firstContentfulPaint: number;
    };
    resources: Array<{
        name: string;
        initiatorType: string;
        duration: number;
        size: number;
        protocol: string;
        priority: string;
    }>;
    memory: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
    } | null;
    api: {
        endpoint: string;
        method: string;
        duration: number;
        status: number;
        timestamp: number;
    }[];
    errors: {
        count: number;
        types: Record<string, number>;
    };
}

interface PerformanceSnapshot {
    id: string;
    timestamp: number;
    url: string;
    metrics: PerformanceMetrics;
}

class PerformanceMonitorService {
    private static instance: PerformanceMonitorService;
    private readonly storageKey = 'performance-snapshots';
    private readonly maxSnapshots = 100;
    private isMonitoring = false;
    private apiMetrics: PerformanceMetrics['api'] = [];

    private constructor() { }

    static getInstance(): PerformanceMonitorService {
        if (!PerformanceMonitorService.instance) {
            PerformanceMonitorService.instance = new PerformanceMonitorService();
        }
        return PerformanceMonitorService.instance;
    }

    // Start performance monitoring
    startMonitoring(): void {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.setupMonitoring();
    }

    // Stop performance monitoring
    stopMonitoring(): void {
        if (!this.isMonitoring) return;
        this.isMonitoring = false;
        this.cleanupMonitoring();
    }

    // Get current performance snapshot
    async captureSnapshot(): Promise<string> {
        const metrics = await this.gatherMetrics();
        const snapshot: PerformanceSnapshot = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            url: window.location.href,
            metrics,
        };

        this.storeSnapshot(snapshot);
        return snapshot.id;
    }

    // Get performance snapshot
    getSnapshot(id: string): PerformanceSnapshot | null {
        const snapshots = this.getStoredSnapshots();
        return snapshots.find((s) => s.id === id) || null;
    }

    // Get all performance snapshots
    getAllSnapshots(): PerformanceSnapshot[] {
        return this.getStoredSnapshots();
    }

    // Clear performance snapshots
    clearSnapshots(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.storageKey);
    }

    // Setup performance monitoring
    private setupMonitoring(): void {
        if (typeof window === 'undefined') return;

        // Monitor API requests
        this.interceptFetch();

        // Monitor resource loading
        this.observeResources();

        // Monitor page performance
        this.observePageMetrics();
    }

    // Cleanup performance monitoring
    private cleanupMonitoring(): void {
        // Cleanup tasks...
    }

    // Collect performance metrics
    private async gatherMetrics(): Promise<PerformanceMetrics> {
        const performance = window.performance;

        // Page load performance
        const timing = performance.timing;
        const paintEntries = performance.getEntriesByType('paint');
        const firstPaint = paintEntries.find(
            (entry) => entry.name === 'first-paint'
        );
        const firstContentfulPaint = paintEntries.find(
            (entry) => entry.name === 'first-contentful-paint'
        );

        // Resource loading performance
        const resourceEntries = performance.getEntriesByType(
            'resource'
        ) as PerformanceResourceTiming[];
        const resources = resourceEntries.map((entry) => ({
            name: entry.name,
            initiatorType: entry.initiatorType,
            duration: entry.duration,
            size: entry.transferSize,
            protocol: entry.nextHopProtocol,
            priority: (entry as any).priority || 'unknown',
        }));

        // Memory usage
        const memory = (performance as any).memory
            ? {
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            }
            : null;

        // Error statistics
        const errorTypes: Record<string, number> = {};
        const errorEntries = performance.getEntriesByType('error');
        errorEntries.forEach((entry) => {
            const name = entry.name || 'unknown';
            errorTypes[name] = (errorTypes[name] || 0) + 1;
        });

        return {
            pageLoad: {
                navigationStart: timing.navigationStart,
                loadEventEnd: timing.loadEventEnd,
                totalTime: timing.loadEventEnd - timing.navigationStart,
                domContentLoaded:
                    timing.domContentLoadedEventEnd - timing.navigationStart,
                firstPaint: firstPaint ? firstPaint.startTime : 0,
                firstContentfulPaint: firstContentfulPaint
                    ? firstContentfulPaint.startTime
                    : 0,
            },
            resources,
            memory,
            api: [...this.apiMetrics],
            errors: {
                count: Object.values(errorTypes).reduce((a, b) => a + b, 0),
                types: errorTypes,
            },
        };
    }

    // Monitor API requests
    private interceptFetch(): void {
        const originalFetch = window.fetch;
        window.fetch = async (input: RequestInfo, init?: RequestInit) => {
            const startTime = performance.now();
            try {
                const response = await originalFetch(input, init);
                const endTime = performance.now();
                this.apiMetrics.push({
                    endpoint: typeof input === 'string' ? input : input.url,
                    method: init?.method || 'GET',
                    duration: endTime - startTime,
                    status: response.status,
                    timestamp: Date.now(),
                });
                // Limit API metrics
                if (this.apiMetrics.length > 100) {
                    this.apiMetrics.shift();
                }
                return response;
            } catch (error) {
                const endTime = performance.now();
                this.apiMetrics.push({
                    endpoint: typeof input === 'string' ? input : input.url,
                    method: init?.method || 'GET',
                    duration: endTime - startTime,
                    status: 0,
                    timestamp: Date.now(),
                });
                throw error;
            }
        };
    }

    // Monitor resource loading
    private observeResources(): void {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.entryType === 'resource') {
                    // Add real-time resource loading analysis logic here
                }
            });
        });

        observer.observe({ entryTypes: ['resource'] });
    }

    // Monitor page performance
    private observePageMetrics(): void {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                // Add real-time page performance analysis logic here
                console.log(`Performance Entry: ${entry.name}`, entry);
            });
        });

        observer.observe({
            entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift'],
        });
    }

    // Store performance snapshot
    private storeSnapshot(snapshot: PerformanceSnapshot): void {
        if (typeof window === 'undefined') return;

        const snapshots = this.getStoredSnapshots();
        snapshots.unshift(snapshot);

        if (snapshots.length > this.maxSnapshots) {
            snapshots.pop();
        }

        localStorage.setItem(this.storageKey, JSON.stringify(snapshots));
    }

    // Get stored performance snapshots
    private getStoredSnapshots(): PerformanceSnapshot[] {
        if (typeof window === 'undefined') return [];

        const snapshotsJson = localStorage.getItem(this.storageKey);
        return snapshotsJson ? JSON.parse(snapshotsJson) : [];
    }
}

export const performanceMonitor = PerformanceMonitorService.getInstance();
