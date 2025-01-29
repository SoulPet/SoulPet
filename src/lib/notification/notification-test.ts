'use client';

import { NotificationMonitor } from './notification-monitor';
import { NotificationPerformance } from './notification-performance';
import { NotificationPriority, NotificationType } from './types';

export interface TestConfig {
    parallelTests: number;
    iterationsPerTest: number;
    timeoutMs: number;
    mockResponses: boolean;
    recordResults: boolean;
    logLevel: 'debug' | 'info' | 'error';
}

export interface TestCase {
    id: string;
    name: string;
    type: 'unit' | 'integration' | 'performance' | 'stress';
    setup?: () => Promise<void>;
    execute: () => Promise<void>;
    cleanup?: () => Promise<void>;
    assertions: Array<() => Promise<boolean>>;
    timeout?: number;
}

export interface TestResult {
    testId: string;
    success: boolean;
    executionTime: number;
    error?: Error;
    metrics?: {
        cpu: number;
        memory: number;
        latency: number;
    };
    assertions: Array<{
        description: string;
        passed: boolean;
        error?: string;
    }>;
}

export interface TestSuite {
    name: string;
    tests: TestCase[];
    beforeAll?: () => Promise<void>;
    afterAll?: () => Promise<void>;
    beforeEach?: () => Promise<void>;
    afterEach?: () => Promise<void>;
}

export class NotificationTest {
    private static instance: NotificationTest;
    private config: TestConfig;
    private results: Map<string, TestResult[]> = new Map();
    private mocks: Map<string, Function> = new Map();
    private readonly monitor: NotificationMonitor;
    private readonly performance: NotificationPerformance;

    private constructor() {
        this.config = this.getDefaultConfig();
        this.monitor = NotificationMonitor.getInstance();
        this.performance = NotificationPerformance.getInstance();
        this.initializeTestEnvironment();
    }

    static getInstance(): NotificationTest {
        if (!NotificationTest.instance) {
            NotificationTest.instance = new NotificationTest();
        }
        return NotificationTest.instance;
    }

    private getDefaultConfig(): TestConfig {
        return {
            parallelTests: 4,
            iterationsPerTest: 100,
            timeoutMs: 5000,
            mockResponses: true,
            recordResults: true,
            logLevel: 'info',
        };
    }

    /**
     * Update test configuration
     */
    updateConfig(newConfig: Partial<TestConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Run a test suite
     */
    async runTestSuite(suite: TestSuite): Promise<Map<string, TestResult[]>> {
        try {
            this.log('info', `Starting test suite: ${suite.name}`);

            // Run beforeAll hook
            if (suite.beforeAll) {
                await suite.beforeAll();
            }

            // Run tests
            for (const test of suite.tests) {
                if (suite.beforeEach) {
                    await suite.beforeEach();
                }

                const results = await this.runTest(test);
                this.results.set(test.id, results);

                if (suite.afterEach) {
                    await suite.afterEach();
                }
            }

            // Run afterAll hook
            if (suite.afterAll) {
                await suite.afterAll();
            }

            return this.results;
        } catch (error) {
            this.log('error', `Test suite failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Run a single test
     */
    async runTest(test: TestCase): Promise<TestResult[]> {
        const results: TestResult[] = [];

        try {
            this.log('info', `Running test: ${test.name}`);

            // Setup test environment
            if (test.setup) {
                await test.setup();
            }

            // Run test iterations
            for (let i = 0; i < this.config.iterationsPerTest; i++) {
                const result = await this.executeTestIteration(test);
                results.push(result);

                if (!result.success && test.type !== 'stress') {
                    break;
                }
            }

            // Cleanup test environment
            if (test.cleanup) {
                await test.cleanup();
            }
        } catch (error) {
            this.log('error', `Test failed: ${error.message}`);
            results.push(this.createFailedResult(test, error));
        }

        return results;
    }

    /**
     * Create a mock function
     */
    createMock<T extends Function>(name: string, implementation: T): T {
        this.mocks.set(name, implementation);
        return implementation;
    }

    /**
     * Get test results
     */
    getTestResults(testId?: string): TestResult[] {
        if (testId) {
            return this.results.get(testId) || [];
        }
        return Array.from(this.results.values()).flat();
    }

    /**
     * Generate test report
     */
    generateTestReport(): string {
        let report = 'Test Execution Report\n';
        report += '====================\n\n';

        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        let totalTime = 0;

        this.results.forEach((results, testId) => {
            const testResults = this.summarizeTestResults(results);
            totalTests += testResults.total;
            passedTests += testResults.passed;
            failedTests += testResults.failed;
            totalTime += testResults.totalTime;

            report += `Test ID: ${testId}\n`;
            report += `- Total Iterations: ${testResults.total}\n`;
            report += `- Passed: ${testResults.passed}\n`;
            report += `- Failed: ${testResults.failed}\n`;
            report += `- Average Execution Time: ${testResults.averageTime.toFixed(2)}ms\n`;
            report += `- Performance Metrics:\n`;
            report += `  - CPU: ${testResults.averageCpu.toFixed(2)}%\n`;
            report += `  - Memory: ${testResults.averageMemory.toFixed(2)}MB\n`;
            report += `  - Latency: ${testResults.averageLatency.toFixed(2)}ms\n\n`;
        });

        report += 'Summary\n';
        report += '-------\n';
        report += `Total Tests: ${totalTests}\n`;
        report += `Passed: ${passedTests}\n`;
        report += `Failed: ${failedTests}\n`;
        report += `Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`;
        report += `Total Execution Time: ${totalTime}ms\n`;

        return report;
    }

    private async executeTestIteration(test: TestCase): Promise<TestResult> {
        const startTime = performance.now();
        const result: TestResult = {
            testId: test.id,
            success: true,
            executionTime: 0,
            assertions: [],
            metrics: {
                cpu: 0,
                memory: 0,
                latency: 0,
            },
        };

        try {
            // Start performance monitoring
            const endMeasure = this.performance.startMeasure(test.id);

            // Execute test
            await Promise.race([
                test.execute(),
                this.createTimeout(test.timeout || this.config.timeoutMs),
            ]);

            // Run assertions
            for (const assertion of test.assertions) {
                try {
                    const passed = await assertion();
                    result.assertions.push({
                        description: assertion.name || 'Unnamed assertion',
                        passed,
                    });
                    if (!passed) result.success = false;
                } catch (error) {
                    result.assertions.push({
                        description: assertion.name || 'Unnamed assertion',
                        passed: false,
                        error: error.message,
                    });
                    result.success = false;
                }
            }

            // Collect metrics
            const duration = endMeasure();
            const perfMetrics = await this.collectPerformanceMetrics();
            result.metrics = perfMetrics;
            result.executionTime = duration;
        } catch (error) {
            result.success = false;
            result.error = error;
        }

        return result;
    }

    private createTimeout(ms: number): Promise<never> {
        return new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Test timed out after ${ms}ms`)), ms)
        );
    }

    private async collectPerformanceMetrics(): Promise<TestResult['metrics']> {
        const resourceStats = await this.performance.getResourceUsage();
        return {
            cpu: resourceStats.averageCpu,
            memory: resourceStats.averageMemory,
            latency: resourceStats.averageNetworkBandwidth,
        };
    }

    private summarizeTestResults(results: TestResult[]) {
        return results.reduce(
            (summary, result) => ({
                total: summary.total + 1,
                passed: summary.passed + (result.success ? 1 : 0),
                failed: summary.failed + (result.success ? 0 : 1),
                totalTime: summary.totalTime + result.executionTime,
                averageTime: summary.totalTime / summary.total,
                averageCpu: summary.averageCpu + (result.metrics?.cpu || 0),
                averageMemory: summary.averageMemory + (result.metrics?.memory || 0),
                averageLatency: summary.averageLatency + (result.metrics?.latency || 0),
            }),
            {
                total: 0,
                passed: 0,
                failed: 0,
                totalTime: 0,
                averageTime: 0,
                averageCpu: 0,
                averageMemory: 0,
                averageLatency: 0,
            }
        );
    }

    private createFailedResult(test: TestCase, error: Error): TestResult {
        return {
            testId: test.id,
            success: false,
            executionTime: 0,
            error,
            assertions: [],
        };
    }

    private initializeTestEnvironment(): void {
        // Setup test environment
        if (this.config.mockResponses) {
            this.setupMocks();
        }
    }

    private setupMocks(): void {
        // Setup mock implementations
        this.createMock('fetchNotification', async () => ({
            id: 'test_notification',
            type: NotificationType.SYSTEM,
            priority: NotificationPriority.MEDIUM,
            title: 'Test Notification',
            message: 'This is a test notification',
            timestamp: new Date(),
        }));
    }

    private log(level: TestConfig['logLevel'], message: string): void {
        if (this.shouldLog(level)) {
            console[level](`[NotificationTest] ${message}`);
        }
    }

    private shouldLog(level: TestConfig['logLevel']): boolean {
        const levels = {
            debug: 0,
            info: 1,
            error: 2,
        };
        return levels[level] >= levels[this.config.logLevel];
    }
}
