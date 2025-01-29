import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { errorService } from './error';

// Cache interface
interface Cache {
    [key: string]: {
        data: unknown;
        timestamp: number;
    };
}

class ApiClient {
    private static instance: ApiClient;
    private client: AxiosInstance;
    private cache: Cache = {};
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout

    private constructor() {
        this.client = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    static getInstance(): ApiClient {
        if (!ApiClient.instance) {
            ApiClient.instance = new ApiClient();
        }
        return ApiClient.instance;
    }

    private setupInterceptors(): void {
        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                // Add authentication token here if needed
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                return response;
            },
            (error: AxiosError) => {
                if (error.response) {
                    throw new Error(error.response.data as string);
                }
                throw new Error('Network request failed');
            }
        );
    }

    private getCacheKey(config: AxiosRequestConfig): string {
        return `${config.method}-${config.url}-${JSON.stringify(config.params)}`;
    }

    private isCacheValid(timestamp: number): boolean {
        return Date.now() - timestamp < this.cacheTimeout;
    }

    async request<T>(config: AxiosRequestConfig): Promise<T> {
        const cacheKey = this.getCacheKey(config);

        // Check cache
        if (config.method === 'get') {
            const cached = this.cache[cacheKey];
            if (cached && this.isCacheValid(cached.timestamp)) {
                return cached.data as T;
            }
        }

        try {
            const response = await errorService.retry(() =>
                this.client.request<T>(config)
            );

            // Cache GET request response
            if (config.method === 'get') {
                this.cache[cacheKey] = {
                    data: response.data,
                    timestamp: Date.now(),
                };
            }

            return response.data;
        } catch (error) {
            errorService.logError(error);
            throw error;
        }
    }

    // Clear cache
    clearCache(): void {
        this.cache = {};
    }

    // Clear specific request cache
    clearRequestCache(config: AxiosRequestConfig): void {
        const cacheKey = this.getCacheKey(config);
        delete this.cache[cacheKey];
    }
}

export const apiClient = ApiClient.getInstance();
