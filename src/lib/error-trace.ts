interface UserAction {
    type: string;
    timestamp: number;
    data?: Record<string, unknown>;
}

interface ErrorTrace {
    errorId: string;
    timestamp: number;
    error: {
        name: string;
        message: string;
        stack?: string;
    };
    userActions: UserAction[];
    environment: {
        userAgent: string;
        url: string;
        screenSize: {
            width: number;
            height: number;
        };
        language: string;
        timezone: string;
        platform: string;
    };
    performance?: {
        loadTime: number;
        resources: Array<{
            name: string;
            duration: number;
            type: string;
        }>;
        memory?: {
            jsHeapSizeLimit: number;
            totalJSHeapSize: number;
            usedJSHeapSize: number;
        };
    };
}

class ErrorTraceService {
    private static instance: ErrorTraceService;
    private readonly storageKey = 'error-traces';
    private readonly maxTraces = 50;
    private readonly maxActions = 50;
    private userActions: UserAction[] = [];
    private isRecording = false;

    private constructor() { }

    static getInstance(): ErrorTraceService {
        if (!ErrorTraceService.instance) {
            ErrorTraceService.instance = new ErrorTraceService();
        }
        return ErrorTraceService.instance;
    }

    // Start recording user behavior
    startRecording(): void {
        if (this.isRecording) return;
        this.isRecording = true;
        this.userActions = [];
        this.setEventListeners();
    }

    // Stop recording user behavior
    stopRecording(): void {
        if (!this.isRecording) return;
        this.isRecording = false;
        this.removeEventListeners();
    }

    // Record error trace
    async recordTrace(error: Error): Promise<string> {
        const errorId = crypto.randomUUID();
        const trace: ErrorTrace = {
            errorId,
            timestamp: Date.now(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            userActions: [...this.userActions],
            environment: this.captureEnvironment(),
            performance: await this.capturePerformance(),
        };

        this.storeErrorTrace(trace);
        return errorId;
    }

    // Get error trace
    getTrace(errorId: string): ErrorTrace | null {
        const traces = this.getStoredErrorTrace();
        return traces.find((t) => t.errorId === errorId) || null;
    }

    // Get all error traces
    getAllTraces(): ErrorTrace[] {
        return this.getStoredErrorTrace();
    }

    // Clear error traces
    clearTraces(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.storageKey);
    }

    // Set event listeners
    private setEventListeners(): void {
        if (typeof window === 'undefined') return;

        // Click events
        window.addEventListener('click', this.handleClick);
        // Form submissions
        window.addEventListener('submit', this.handleFormSubmit);
        // Route changes
        window.addEventListener('popstate', this.handleRouteChange);
        // API requests
        this.interceptFetch();
        // Console errors
        window.addEventListener('error', this.handleError);
        // Promise errors
        window.addEventListener('unhandledrejection', this.handlePromiseError);
    }

    // Remove event listeners
    private removeEventListeners(): void {
        if (typeof window === 'undefined') return;

        window.removeEventListener('click', this.handleClick);
        window.removeEventListener('submit', this.handleFormSubmit);
        window.removeEventListener('popstate', this.handleRouteChange);
        window.removeEventListener('error', this.handleError);
        window.removeEventListener('unhandledrejection', this.handlePromiseError);
    }

    // Handle click events
    private handleClick = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        const action: UserAction = {
            type: 'click',
            timestamp: Date.now(),
            data: {
                targetTag: target.tagName,
                targetId: target.id,
                targetClass: target.className,
                targetText: target.textContent,
                x: event.clientX,
                y: event.clientY,
            },
        };
        this.addUserBehavior(action);
    };

    // Handle form submissions
    private handleFormSubmit = (event: SubmitEvent): void => {
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        const data: Record<string, unknown> = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        const action: UserAction = {
            type: 'form_submit',
            timestamp: Date.now(),
            data: {
                formId: form.id,
                formAction: form.action,
                formMethod: form.method,
                formData: data,
            },
        };
        this.addUserBehavior(action);
    };

    // Handle route changes
    private handleRouteChange = (): void => {
        const action: UserAction = {
            type: 'route_change',
            timestamp: Date.now(),
            data: {
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
            },
        };
        this.addUserBehavior(action);
    };

    // Handle error events
    private handleError = (event: ErrorEvent): void => {
        const action: UserAction = {
            type: 'error',
            timestamp: Date.now(),
            data: {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            },
        };
        this.addUserBehavior(action);
    };

    // Handle Promise errors
    private handlePromiseError = (event: PromiseRejectionEvent): void => {
        const action: UserAction = {
            type: 'promise_error',
            timestamp: Date.now(),
            data: {
                reason: event.reason?.toString(),
            },
        };
        this.addUserBehavior(action);
    };

    // Intercept Fetch requests
    private interceptFetch(): void {
        const originalFetch = window.fetch;
        window.fetch = async (input: RequestInfo, init?: RequestInit) => {
            const startTime = Date.now();
            try {
                const response = await originalFetch(input, init);
                const action: UserAction = {
                    type: 'api_request',
                    timestamp: startTime,
                    data: {
                        url: typeof input === 'string' ? input : input.url,
                        method: init?.method || 'GET',
                        status: response.status,
                        duration: Date.now() - startTime,
                    },
                };
                this.addUserBehavior(action);
                return response;
            } catch (error) {
                const action: UserAction = {
                    type: 'api_error',
                    timestamp: startTime,
                    data: {
                        url: typeof input === 'string' ? input : input.url,
                        method: init?.method || 'GET',
                        error: error instanceof Error ? error.message : String(error),
                        duration: Date.now() - startTime,
                    },
                };
                this.addUserBehavior(action);
                throw error;
            }
        };
    }

    // Add user behavior
    private addUserBehavior(action: UserAction): void {
        this.userActions.push(action);
        if (this.userActions.length > this.maxActions) {
            this.userActions.shift();
        }
    }

    // Capture environment information
    private captureEnvironment(): ErrorTrace['environment'] {
        return {
            userAgent: navigator.userAgent,
            url: window.location.href,
            screenSize: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            platform: navigator.platform,
        };
    }

    // Capture performance information
    private async capturePerformance(): Promise<ErrorTrace['performance']> {
        if (typeof window === 'undefined') return undefined;

        const performance = window.performance;

        // Get resource loading information
        const resources = Array.from(performance.getEntriesByType('resource')).map(
            (entry) => ({
                name: entry.name,
                duration: entry.duration,
                type: entry.initiatorType,
            })
        );

        // Get memory usage information
        const memory = (performance as any).memory
            ? {
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            }
            : undefined;

        return {
            loadTime:
                performance.timing.loadEventEnd - performance.timing.navigationStart,
            resources,
            memory,
        };
    }

    // Store error trace
    private storeErrorTrace(trace: ErrorTrace): void {
        if (typeof window === 'undefined') return;

        const traces = this.getStoredErrorTrace();
        traces.unshift(trace);

        if (traces.length > this.maxTraces) {
            traces.pop();
        }

        localStorage.setItem(this.storageKey, JSON.stringify(traces));
    }

    // Get stored error trace
    private getStoredErrorTrace(): ErrorTrace[] {
        if (typeof window === 'undefined') return [];

        const tracesJson = localStorage.getItem(this.storageKey);
        return tracesJson ? JSON.parse(tracesJson) : [];
    }
}

export const errorTrace = ErrorTraceService.getInstance();
