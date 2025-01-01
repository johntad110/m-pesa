import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface APIClientConfig {
    baseURL: string;
    timeout?: number;
    retries?: number;
}

export class APIClient {
    private axiosInstance: AxiosInstance;
    private retries: number;

    constructor(config: APIClientConfig) {
        this.axiosInstance = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 5000,
        });
        this.retries = config.retries || 3;

        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => this.handleError(error) // Centralized error handling
        );
    }

    private async requestWithRetry<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        url: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<AxiosResponse<T>> {
        let attempts = 0;

        while (attempts < this.retries) {
            try {
                attempts++;
                switch (method) {
                    case 'GET':
                        return await this.axiosInstance.get<T>(url, config);
                    case 'POST':
                        return await this.axiosInstance.post<T>(url, data, config);
                    case 'PUT':
                        return await this.axiosInstance.put<T>(url, data, config);
                    case 'DELETE':
                        return await this.axiosInstance.delete<T>(url, config);
                    default:
                        throw new Error(`Unsupported HTTP method: ${method}`);
                }
            } catch (error) {
                if (attempts >= this.retries) {
                    this.handleError(error as AxiosError); // Throw the error after max retries
                }
            }
        }

        throw new Error('Request failed after max retries.'); // Fallback, though retries handle this
    }

    async fetchPaginated<T>(
        url: string,
        config?: AxiosRequestConfig,
        paginationKey: string = 'next',
        resultsKey: string = 'data'
    ): Promise<T[]> {
        const results: T[] = [];
        let nextPage: string | null = url;

        while (nextPage) {
            const response = await this.requestWithRetry<T>(`GET`, nextPage, undefined, config);
            const responseData = response.data as Record<string, unknown>;

            // Collect results
            if (Array.isArray(responseData[resultsKey])) {
                results.push(...(responseData[resultsKey] as T[]));
            }

            // Determine the next page
            nextPage = (responseData[paginationKey] as string) || null;
        }

        return results;
    }

    private handleError(error: AxiosError): never {
        if (error.response) {
            const status = error.response.status;

            switch (status) {
                case 400:
                    throw new Error('Bad Request: Check your input.');
                case 401:
                    throw new Error('Unauthorized: Invalid credentials.');
                case 404:
                    throw new Error('Not Found: The requested resource does not exist.');
                case 500:
                    throw new Error('Server Error: Try again later.');
                default:
                    throw new Error(
                        `HTTP Error: ${status} - ${error.response.data ? JSON.stringify(error.response.data) : 'Unknown error'}`
                    );
            }
        } else if (error.request) {
            throw new Error('Network Error: No response from server.');
        } else {
            throw new Error(`Error: ${error.message}`);
        }
    }
}
