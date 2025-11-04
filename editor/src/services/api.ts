import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

export class ApiError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

class Api {
    private client: AxiosInstance;
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        // Request interceptor
        this.client.interceptors.request.use((config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => response,
            async (error: AxiosError) => {
                if (error.response?.status === 401) {
                    store.dispatch(logout());
                    window.location.href = '/login';
                    return Promise.reject(
                        new ApiError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.')
                    );
                }

                if (error.response?.data) {
                    const data = error.response.data as any;
                    return Promise.reject(
                        new ApiError(
                            error.response.status,
                            data.code || 'UNKNOWN_ERROR',
                            data.message || 'An unexpected error occurred',
                            data.details
                        )
                    );
                }

                if (error.message === 'Network Error') {
                    return Promise.reject(
                        new ApiError(0, 'NETWORK_ERROR', 'Unable to connect to the server. Please check your internet connection.')
                    );
                }

                return Promise.reject(
                    new ApiError(500, 'UNKNOWN_ERROR', 'An unexpected error occurred')
                );
            }
        );
    }

    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.get<T>(url, config);
        return response.data;
    }

    public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.post<T>(url, data, config);
        return response.data;
    }

    public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.put<T>(url, data, config);
        return response.data;
    }

    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.delete<T>(url, config);
        return response.data;
    }

    public async upload(url: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await this.client.post<{ url: string }>(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const progress = (progressEvent.loaded / progressEvent.total) * 100;
                    onProgress(progress);
                }
            },
        });

        return response.data.url;
    }
}

export const api = new Api();