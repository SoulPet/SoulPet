'use client';

export interface PerformanceMetrics {
    deliveryTime: number;
    processingTime: number;
    queueLength: number;
    cacheHitRate: number;
    errorRate: number;
    websocketLatency: number;
}

export interface ResourceUsage {
    memory: number;
    cpu: number;
    networkBandwidth: number;
}

export class NotificationPerformance {
    private static instance: NotificationPerformance;
    private metrics: Map<string, PerformanceMetrics[]> = new Map();
    private resourceUsage: ResourceUsage[] = [];
    private samplingInterval: number = 60000; // 1 minute
    private maxSamples: number = 1440; // 24 hours worth of samples
    private performanceObserver: PerformanceObserver | null = null;

    private constructor() {
        this.initializePerformanceMonitoring();
        this.startResourceMonitoring();
    }

    static getInstance(): NotificationPerformance {
        if (!NotificationPerformance.instance) {
            NotificationPerformance.instance = new NotificationPerformance();
        }
        return NotificationPerformance.instance;
    }

    private initializePerformanceMonitoring(): void {
        if (typeof PerformanceObserver !== 'undefined') {
            this.performanceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    this.recordPerformanceMetric(entry);
                });
            });

            try {
                this.performanceObserver.observe({
                    entryTypes: ['measure', 'resource'],
                    buffered: true,
                });
            } catch (error) {
                console.error('Failed to initialize performance monitoring:', error);
            }
        }
    }

    private startResourceMonitoring(): void {
        setInterval(() => {
            this.measureResourceUsage();
        }, this.samplingInterval);
    }

    /**
     * Record performance metric for a specific operation
     */
    recordMetric(
        operationType: string,
        metrics: Partial<PerformanceMetrics>
    ): void {
        const existingMetrics = this.metrics.get(operationType) || [];
        const newMetric: PerformanceMetrics = {
            deliveryTime: metrics.deliveryTime || 0,
            processingTime: metrics.processingTime || 0,
            queueLength: metrics.queueLength || 0,
            cacheHitRate: metrics.cacheHitRate || 0,
            errorRate: metrics.errorRate || 0,
            websocketLatency: metrics.websocketLatency || 0,
        };

        existingMetrics.push(newMetric);

        // Keep only the last maxSamples samples
        if (existingMetrics.length > this.maxSamples) {
            existingMetrics.shift();
        }

        this.metrics.set(operationType, existingMetrics);
    }

    /**
     * Start measuring performance for an operation
     */
    startMeasure(operationName: string): () => number {
        const startTime = performance.now();
        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            performance.measure(operationName, {
                start: startTime,
                duration: duration,
            });
            return duration;
        };
    }

    /**
     * Get performance metrics for a specific operation
     */
    getMetrics(
        operationType: string,
        timeRange?: { start: Date; end: Date }
    ): PerformanceMetrics[] {
        const metrics = this.metrics.get(operationType) || [];
        if (!timeRange) return metrics;

        const startTime = timeRange.start.getTime();
        const endTime = timeRange.end.getTime();

        return metrics.filter((metric, index) => {
            const timestamp =
                Date.now() - (metrics.length - index - 1) * this.samplingInterval;
            return timestamp >= startTime && timestamp <= endTime;
        });
    }

    /**
     * Get aggregated performance statistics
     */
    getStatistics(operationType: string): {
        averageDeliveryTime: number;
        averageProcessingTime: number;
        averageQueueLength: number;
        averageCacheHitRate: number;
        averageErrorRate: number;
        averageWebsocketLatency: number;
        p95DeliveryTime: number;
        p95ProcessingTime: number;
        maxQueueLength: number;
    } {
        const metrics = this.metrics.get(operationType) || [];
        if (metrics.length === 0) {
            return {
                averageDeliveryTime: 0,
                averageProcessingTime: 0,
                averageQueueLength: 0,
                averageCacheHitRate: 0,
                averageErrorRate: 0,
                averageWebsocketLatency: 0,
                p95DeliveryTime: 0,
                p95ProcessingTime: 0,
                maxQueueLength: 0,
            };
        }

        const sum = metrics.reduce(
            (acc, metric) => ({
                deliveryTime: acc.deliveryTime + metric.deliveryTime,
                processingTime: acc.processingTime + metric.processingTime,
                queueLength: acc.queueLength + metric.queueLength,
                cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
                errorRate: acc.errorRate + metric.errorRate,
                websocketLatency: acc.websocketLatency + metric.websocketLatency,
            }),
            {
                deliveryTime: 0,
                processingTime: 0,
                queueLength: 0,
                cacheHitRate: 0,
                errorRate: 0,
                websocketLatency: 0,
            }
        );

        const sortedDeliveryTimes = [...metrics].sort(
            (a, b) => a.deliveryTime - b.deliveryTime
        );
        const sortedProcessingTimes = [...metrics].sort(
            (a, b) => a.processingTime - b.processingTime
        );

        const p95Index = Math.floor(metrics.length * 0.95);

        return {
            averageDeliveryTime: sum.deliveryTime / metrics.length,
            averageProcessingTime: sum.processingTime / metrics.length,
            averageQueueLength: sum.queueLength / metrics.length,
            averageCacheHitRate: sum.cacheHitRate / metrics.length,
            averageErrorRate: sum.errorRate / metrics.length,
            averageWebsocketLatency: sum.websocketLatency / metrics.length,
            p95DeliveryTime: sortedDeliveryTimes[p95Index].deliveryTime,
            p95ProcessingTime: sortedProcessingTimes[p95Index].processingTime,
            maxQueueLength: Math.max(...metrics.map((m) => m.queueLength)),
        };
    }

    /**
     * Get resource usage statistics
     */
    getResourceUsage(): {
        averageMemory: number;
        averageCpu: number;
        averageNetworkBandwidth: number;
        peakMemory: number;
        peakCpu: number;
        peakNetworkBandwidth: number;
    } {
        if (this.resourceUsage.length === 0) {
            return {
                averageMemory: 0,
                averageCpu: 0,
                averageNetworkBandwidth: 0,
                peakMemory: 0,
                peakCpu: 0,
                peakNetworkBandwidth: 0,
            };
        }

        const sum = this.resourceUsage.reduce(
            (acc, usage) => ({
                memory: acc.memory + usage.memory,
                cpu: acc.cpu + usage.cpu,
                networkBandwidth: acc.networkBandwidth + usage.networkBandwidth,
            }),
            { memory: 0, cpu: 0, networkBandwidth: 0 }
        );

        return {
            averageMemory: sum.memory / this.resourceUsage.length,
            averageCpu: sum.cpu / this.resourceUsage.length,
            averageNetworkBandwidth: sum.networkBandwidth / this.resourceUsage.length,
            peakMemory: Math.max(...this.resourceUsage.map((u) => u.memory)),
            peakCpu: Math.max(...this.resourceUsage.map((u) => u.cpu)),
            peakNetworkBandwidth: Math.max(
                ...this.resourceUsage.map((u) => u.networkBandwidth)
            ),
        };
    }

    private recordPerformanceMetric(entry: PerformanceEntry): void {
        if (entry.entryType === 'measure') {
            this.recordMetric(entry.name, {
                processingTime: entry.duration,
            });
        }
    }

    private async measureResourceUsage(): Promise<void> {
        try {
            // Measure memory usage
            const memory = performance.memory?.usedJSHeapSize || 0;

            // Estimate CPU usage (if available)
            let cpu = 0;
            if ('cpuUsage' in process) {
                const cpuUsage = process.cpuUsage();
                cpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
            }

            // Estimate network bandwidth (if available)
            let networkBandwidth = 0;
            if ('connection' in navigator) {
                networkBandwidth = (navigator as any).connection?.downlink || 0;
            }

            this.resourceUsage.push({
                memory,
                cpu,
                networkBandwidth,
            });

            // Keep only the last maxSamples samples
            if (this.resourceUsage.length > this.maxSamples) {
                this.resourceUsage.shift();
            }
        } catch (error) {
            console.error('Failed to measure resource usage:', error);
        }
    }

    dispose(): void {
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
    }
}
