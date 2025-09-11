/**
 * API Client for Studio Collaboration Platform
 * Production-ready API client with error handling, retry logic, and type safety
 */

// Authentication will be handled via localStorage token

// API Base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
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
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Base API client with authentication and error handling
 */
class APIClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make an authenticated API request
   */
  private async request<T = any>(
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

    // Get authentication token from localStorage or cookies
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      // First try localStorage
      authToken = localStorage.getItem('token') || undefined;
      
      // Fallback to cookie if no token in localStorage
      if (!authToken) {
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
        authToken = cookieToken || undefined;
      }
      
      // Debug logging (only for auth endpoints)
      if (url.includes('/auth')) {
        console.log('🔑 API Client - Auth request:', url);
        console.log('🔑 API Client - Token available:', !!authToken);
      }
    }

    // Prepare headers
    const requestHeaders: HeadersInit = {
      ...this.defaultHeaders,
      ...headers,
    };

    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
      if (url.includes('/auth')) {
        console.log('✅ API Client - Authorization header set for auth request');
      }
    } else if (url.includes('/auth')) {
      console.log('⚠️ API Client - No token available for auth request');
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
            throw new APIError(
              response.status,
              errorData.message || `HTTP ${response.status}`,
              errorData
            );
          }

          // Parse and return response
          const data = await response.json();
          return data;
        } catch (error) {
          lastError = error as Error;
          
          // Don't retry on client errors (4xx)
          if (error instanceof APIError && error.status >= 400 && error.status < 500) {
            throw error;
          }
          
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
  async get<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Upload file with multipart/form-data
   */
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    const { headers = {}, token, ...restOptions } = options || {};
    
    // Remove Content-Type to let browser set it with boundary
    const uploadHeaders: any = { ...headers };
    delete uploadHeaders['Content-Type'];

    // Get authentication token
    let authToken = token;
    if (!authToken && typeof window !== 'undefined') {
      authToken = localStorage.getItem('token') || undefined;
      
      if (!authToken) {
        const cookieToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
        authToken = cookieToken || undefined;
      }
    }

    if (authToken) {
      uploadHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    console.log('[API Upload] Uploading to:', url);
    console.log('[API Upload] FormData entries:', Array.from(formData.entries()).map(([k, v]) => 
      [k, v instanceof File ? `File(${v.name}, ${v.type}, ${v.size} bytes)` : v]
    ));

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
        console.error('[API Upload] Error response:', response.status, errorData);
        throw new APIError(
          response.status,
          errorData.message || errorData.error || `HTTP ${response.status}`,
          errorData
        );
      }

      const data = await response.json();
      console.log('[API Upload] Success:', data);
      return data;
    } catch (error) {
      console.error('[API Upload] Request failed:', error);
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