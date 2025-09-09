/**
 * API Client for Studio Collaboration Platform
 * Production-ready API client with error handling, retry logic, and type safety
 */

import { getAuthToken } from '@/lib/utils/cookies';

// Authentication will be handled via cookies primarily, localStorage as backup

// API Base URL from environment
const getAPIBaseURL = () => {
  // Production 환경에서는 NEXT_PUBLIC_BACKEND_URL 우선 사용
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://courageous-spirit-production.up.railway.app';
  }
  // Development 환경에서는 로컬 API URL 사용
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

const API_BASE_URL = getAPIBaseURL();

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Request options interface
interface RequestOptions extends RequestInit {
  token?: string;
  retry?: number;
  timeout?: number;
}

// Generic API response type
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Base API client with authentication and error handling
 */
class APIClient {
  private readonly baseURL: string;
  private readonly defaultHeaders: HeadersInit;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make an authenticated API request
   */
  private async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      token,
      retry = 3,
      timeout = 30000,
      headers = {},
      ...fetchOptions
    } = options;

    // Prepare URL
    const url = `${this.baseURL}${endpoint}`;

    // Get authentication token using utility function
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      authToken = getAuthToken();
    }

    // Prepare headers
    const requestHeaders: HeadersInit = {
      ...this.defaultHeaders,
      ...headers,
    };

    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Make request with retry logic
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < retry; attempt++) {
        try {
          const response = await fetch(url, {
            ...fetchOptions,
            headers: requestHeaders,
            signal: controller.signal,
            credentials: 'include',
          });

          clearTimeout(timeoutId);

          // Handle non-OK responses
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            lastError = new APIError(
              response.status,
              errorData.message || `HTTP ${response.status}`,
              errorData
            );

            // Don't retry on client errors (4xx)
            if (lastError instanceof APIError && lastError.status >= 400 && lastError.status < 500) {
              return Promise.reject(lastError);
            }

            // Continue to retry logic for 5xx errors
          } else {
            // Parse and return response
            return await response.json();
          }
        } catch (error) {
          lastError = error as Error;

          
          // Wait before retry (exponential backoff)
          if (attempt < retry - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }

      throw lastError || new Error('Request failed after retries');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // HTTP methods
  async get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T = unknown>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    const { headers = {}, token, ...restOptions } = options || {};

    // Remove Content-Type to let browser set it with boundary
    const uploadHeaders: HeadersInit = { ...headers };
    if (uploadHeaders && typeof uploadHeaders === 'object' && 'Content-Type' in uploadHeaders) {
      delete (uploadHeaders as Record<string, string>)['Content-Type'];
    }

    // Get authentication token using utility function
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      authToken = getAuthToken();
    }

    if (authToken) {
      uploadHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...restOptions,
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // API Upload Error response
        return Promise.reject(new APIError(
          response.status,
          errorData.message || errorData.error || `HTTP ${response.status}`,
          errorData
        ));
      }

      return await response.json();
    } catch (error) {
      // API Upload Request failed
      throw error;
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export convenience methods
export const api = {
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  upload: apiClient.upload.bind(apiClient),
};

export default api;