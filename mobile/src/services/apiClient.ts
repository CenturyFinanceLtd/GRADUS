/**
 * API Client for GRADUS Mobile App
 * Ported from frontend/src/services/apiClient.js
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { config } from '../config';

// Create axios instance with default config
const axiosInstance: AxiosInstance = axios.create({
    baseURL: config.apiBaseUrl,
    timeout: config.timeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Token storage reference (will be set by AuthContext)
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
    (config) => {
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response) {
            const { status, data } = error.response;
            const errorMessage = (data as any)?.message || 'Request failed';

            // Create a structured error
            const apiError = new Error(errorMessage) as Error & {
                status?: number;
                details?: any;
            };
            apiError.status = status;
            apiError.details = (data as any)?.details;

            return Promise.reject(apiError);
        }

        return Promise.reject(error);
    }
);

// API client interface matching web app
const apiClient = {
    get: async <T = any>(path: string, options?: AxiosRequestConfig): Promise<T> => {
        const response = await axiosInstance.get<T>(path, options);
        return response.data;
    },

    post: async <T = any>(path: string, body?: any, options?: AxiosRequestConfig): Promise<T> => {
        const response = await axiosInstance.post<T>(path, body, options);
        return response.data;
    },

    put: async <T = any>(path: string, body?: any, options?: AxiosRequestConfig): Promise<T> => {
        const response = await axiosInstance.put<T>(path, body, options);
        return response.data;
    },

    delete: async <T = any>(path: string, options?: AxiosRequestConfig): Promise<T> => {
        const response = await axiosInstance.delete<T>(path, options);
        return response.data;
    },

    // For multipart/form-data uploads
    upload: async <T = any>(path: string, formData: FormData, options?: AxiosRequestConfig): Promise<T> => {
        const response = await axiosInstance.post<T>(path, formData, {
            ...options,
            headers: {
                ...options?.headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};

export default apiClient;
export { axiosInstance };
