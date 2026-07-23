/**
 * Generic API Client
 *
 * Provides reusable HTTP methods for API communication.
 * Eliminates duplicate fetch logic across API modules.
 *
 * Features:
 * - Centralized error handling
 * - Consistent request/response formatting
 * - Environment-aware base URL from runtime config
 * - JWT authentication with automatic token refresh on 401
 * - Support for both ASP.NET API and Python API
 */

import { getConfig } from '../config';

/**
 * Auth callbacks - set by AuthContext during initialization
 * This avoids circular dependencies
 */
let authCallbacks = {
  getAccessToken: null,
  refreshAccessToken: null,
  logout: null
};

/**
 * Register authentication callbacks from AuthContext
 * Must be called during app initialization
 */
export function registerAuthCallbacks(callbacks) {
  console.log('[registerAuthCallbacks] Registering auth callbacks:', {
    hasGetAccessToken: !!callbacks.getAccessToken,
    hasRefreshAccessToken: !!callbacks.refreshAccessToken,
    hasLogout: !!callbacks.logout
  });
  authCallbacks = callbacks;
}

/**
 * Get the API base URL from runtime configuration
 * @param {boolean} usePythonApi - Use Python API base URL instead of ASP.NET
 * @returns {string} The API base URL
 */
function getApiBaseUrl(usePythonApi = false) {
  const config = getConfig();
  return usePythonApi ? config.pythonApiBaseUrl : config.apiBaseUrl;
}

/**
 * Build full URL for an endpoint
 * @param {string} endpoint - The API endpoint path
 * @param {boolean} usePythonApi - Use Python API base URL
 * @returns {string} Full URL
 */
function buildUrl(endpoint, usePythonApi = false) {
  const baseUrl = getApiBaseUrl(usePythonApi);
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Ensure base URL doesn't end with slash
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBaseUrl}/${cleanEndpoint}`;
}

/**
 * Build headers for API requests
 * @param {boolean} skipAuth - Skip adding Authorization header
 * @param {object} additionalHeaders - Additional headers to include
 * @returns {object} Headers object
 */
function buildHeaders(skipAuth = false, additionalHeaders = {}) {
  const headers = { ...additionalHeaders };

  // Add JWT token if available and not skipped
  if (!skipAuth && authCallbacks.getAccessToken) {
    const token = authCallbacks.getAccessToken();
    console.log('[buildHeaders] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else {
    console.log('[buildHeaders] Skipping auth:', skipAuth, 'Callback available:', !!authCallbacks.getAccessToken);
  }

  return headers;
}

/**
 * Handle API response and errors
 * @param {Response} response - Fetch response object
 * @param {string} defaultErrorMessage - Default error message if parsing fails
 * @returns {Promise<any>} Parsed response data
 * @throws {Error} API error with message from server or default message
 */
async function handleResponse(response, defaultErrorMessage = 'API request failed') {
  if (!response.ok) {
    let errorMessage = defaultErrorMessage;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || defaultErrorMessage;
    } catch (e) {
      // If error response isn't JSON, use default message
    }

    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return true;
  }

  return response.json();
}

/**
 * Make a fetch request with automatic token refresh on 401
 * @param {string} url - Full URL to fetch
 * @param {object} options - Fetch options
 * @param {string} defaultErrorMessage - Default error message
 * @param {boolean} skipAuth - Skip authentication
 * @param {boolean} isRetry - Is this a retry after token refresh
 * @returns {Promise<any>} Response data
 */
async function fetchWithAuth(url, options, defaultErrorMessage, skipAuth, isRetry = false) {
  console.log(`Making request to ${url} with options:`, options);
  const response = await fetch(url, options);

  // Handle 401 Unauthorized - try to refresh token and retry once
  if (response.status === 401 && !skipAuth && !isRetry && authCallbacks.refreshAccessToken) {
    console.log('Received 401, attempting token refresh...');

    const refreshSuccess = await authCallbacks.refreshAccessToken();

    if (refreshSuccess) {
      console.log('Token refresh successful, retrying request...');

      // Rebuild headers with new token
      const newToken = authCallbacks.getAccessToken();
      if (newToken) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        };
      }

      // Retry the request
      return fetchWithAuth(url, options, defaultErrorMessage, skipAuth, true);
    } else {
      console.log('Token refresh failed, logging out...');
      if (authCallbacks.logout) {
        authCallbacks.logout();
      }
      throw new Error('Session expired. Please log in again.');
    }
  }

  return handleResponse(response, defaultErrorMessage);
}

/**
 * Generic GET request
 * @param {string} endpoint - API endpoint
 * @param {string} errorMessage - Custom error message
 * @param {object} options - Additional options
 * @param {boolean} options.skipAuth - Skip JWT authentication
 * @param {boolean} options.usePythonApi - Use Python API base URL
 * @returns {Promise<any>} Response data
 */
export async function get(endpoint, errorMessage = 'Failed to fetch data', options = {}) {
  const { skipAuth = false, usePythonApi = false } = options;

  return fetchWithAuth(
    buildUrl(endpoint, usePythonApi),
    {
      method: 'GET',
      headers: buildHeaders(skipAuth)
    },
    errorMessage,
    skipAuth
  );
}

/**
 * Generic POST request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body data
 * @param {string} errorMessage - Custom error message
 * @param {object} options - Additional options
 * @param {boolean} options.skipAuth - Skip JWT authentication
 * @param {boolean} options.usePythonApi - Use Python API base URL
 * @returns {Promise<any>} Response data
 */
export async function post(endpoint, data, errorMessage = 'Failed to create resource', options = {}) {
  const { skipAuth = false, usePythonApi = false } = options;

  return fetchWithAuth(
    buildUrl(endpoint, usePythonApi),
    {
      method: 'POST',
      headers: buildHeaders(skipAuth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    },
    errorMessage,
    skipAuth
  );
}

/**
 * Generic PUT request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body data
 * @param {string} errorMessage - Custom error message
 * @param {object} options - Additional options
 * @param {boolean} options.skipAuth - Skip JWT authentication
 * @param {boolean} options.usePythonApi - Use Python API base URL
 * @returns {Promise<any>} Response data
 */
export async function put(endpoint, data, errorMessage = 'Failed to update resource', options = {}) {
  const { skipAuth = false, usePythonApi = false } = options;

  return fetchWithAuth(
    buildUrl(endpoint, usePythonApi),
    {
      method: 'PUT',
      headers: buildHeaders(skipAuth, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(data)
    },
    errorMessage,
    skipAuth
  );
}

/**
 * Generic PATCH request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body data (optional)
 * @param {string} errorMessage - Custom error message
 * @param {object} options - Additional options
 * @param {boolean} options.skipAuth - Skip JWT authentication
 * @param {boolean} options.usePythonApi - Use Python API base URL
 * @returns {Promise<any>} Response data
 */
export async function patch(endpoint, data = null, errorMessage = 'Failed to update resource', options = {}) {
  const { skipAuth = false, usePythonApi = false } = options;

  const fetchOptions = {
    method: 'PATCH',
    headers: buildHeaders(skipAuth, data ? { 'Content-Type': 'application/json' } : {})
  };

  if (data) {
    fetchOptions.body = JSON.stringify(data);
  }

  return fetchWithAuth(
    buildUrl(endpoint, usePythonApi),
    fetchOptions,
    errorMessage,
    skipAuth
  );
}

/**
 * Generic DELETE request
 * @param {string} endpoint - API endpoint
 * @param {string} errorMessage - Custom error message
 * @param {object} options - Additional options
 * @param {boolean} options.skipAuth - Skip JWT authentication
 * @param {boolean} options.usePythonApi - Use Python API base URL
 * @returns {Promise<boolean>} Success status
 */
export async function del(endpoint, errorMessage = 'Failed to delete resource', options = {}) {
  const { skipAuth = false, usePythonApi = false } = options;

  return fetchWithAuth(
    buildUrl(endpoint, usePythonApi),
    {
      method: 'DELETE',
      headers: buildHeaders(skipAuth)
    },
    errorMessage,
    skipAuth
  );
}

/**
 * Multipart form data POST request (for file uploads)
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - FormData object with file and other fields
 * @param {string} errorMessage - Custom error message
 * @param {object} options - Additional options
 * @param {boolean} options.skipAuth - Skip JWT authentication
 * @param {boolean} options.usePythonApi - Use Python API base URL
 * @returns {Promise<any>} Response data
 */
export async function postMultipart(endpoint, formData, errorMessage = 'Failed to upload file', options = {}) {
  const { skipAuth = false, usePythonApi = false } = options;

  // Don't set Content-Type header - browser will set it with boundary
  return fetchWithAuth(
    buildUrl(endpoint, usePythonApi),
    {
      method: 'POST',
      headers: buildHeaders(skipAuth),
      body: formData
    },
    errorMessage,
    skipAuth
  );
}

/**
 * Create a namespaced API client for a specific resource
 * @param {string} basePath - Base path for the resource (e.g., '/categories')
 * @param {object} options - Additional options
 * @param {boolean} options.skipAuth - Skip JWT authentication for all requests
 * @param {boolean} options.usePythonApi - Use Python API base URL
 * @returns {object} API client with standard CRUD methods
 */
export function createApiClient(basePath, options = {}) {
  return {
    getAll: (errorMessage) => get(basePath, errorMessage, options),
    getById: (id, errorMessage) => get(`${basePath}/${id}`, errorMessage, options),
    create: (data, errorMessage) => post(basePath, data, errorMessage, options),
    update: (id, data, errorMessage) => put(`${basePath}/${id}`, data, errorMessage, options),
    delete: (id, errorMessage) => del(`${basePath}/${id}`, errorMessage, options)
  };
}

/**
 * Get current access token (for special cases like blob downloads)
 * @returns {string|null} Current access token
 */
export function getAccessToken() {
  return authCallbacks.getAccessToken ? authCallbacks.getAccessToken() : null;
}

/**
 * Default export - individual methods for more flexibility
 */
export default {
  get,
  post,
  put,
  patch,
  del,
  postMultipart,
  createApiClient,
  registerAuthCallbacks,
  getAccessToken
};
