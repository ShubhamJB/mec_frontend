import { ApiErrorEnvelope, AuthTokens } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let accessTokenMemory: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessTokenMemory = token;
};

export const getAccessToken = () => accessTokenMemory;

export const getStoredRefreshToken = (): string | null => {
  return sessionStorage.getItem('fym_refresh_token');
};

export const setStoredRefreshToken = (token: string | null) => {
  if (token) {
    sessionStorage.setItem('fym_refresh_token', token);
  } else {
    sessionStorage.removeItem('fym_refresh_token');
  }
};

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        setAccessToken(null);
        setStoredRefreshToken(null);
        return null;
      }

      const data: AuthTokens = await response.json();
      setAccessToken(data.access_token);
      setStoredRefreshToken(data.refresh_token);
      return data.access_token;
    } catch {
      setAccessToken(null);
      setStoredRefreshToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown> | { errors?: Array<{ field: string; message: string }> };
  requestId?: string;
  status: number;

  constructor(status: number, envelope: ApiErrorEnvelope['error']) {
    super(envelope.message || 'An unexpected error occurred');
    this.name = 'ApiError';
    this.status = status;
    this.code = envelope.code;
    this.details = envelope.details;
    this.requestId = envelope.request_id;
  }
}

// Global active request tracking for loading spinner
type LoadingListener = (activeCount: number) => void;
const loadingListeners = new Set<LoadingListener>();
let activeRequests = 0;

function notifyLoadingListeners() {
  loadingListeners.forEach((listener) => listener(activeRequests));
}

export function subscribeToLoading(listener: LoadingListener): () => void {
  loadingListeners.add(listener);
  listener(activeRequests);
  return () => {
    loadingListeners.delete(listener);
  };
}

export interface ApiClientOptions extends RequestInit {
  skipGlobalLoader?: boolean;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { skipGlobalLoader = false, ...fetchOptions } = options;

  if (!skipGlobalLoader) {
    activeRequests++;
    notifyLoadingListeners();
  }

  try {
    // Artificial 500ms (0.5s) delay to make loading state observable during development
    await new Promise((resolve) => setTimeout(resolve, 500));

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(fetchOptions.headers || {});

    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    if (accessTokenMemory && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessTokenMemory}`);
    }

    let response = await fetch(url, { ...fetchOptions, headers });

    // If unauthorized and we have a refresh token, rotate and retry once
    if (response.status === 401 && getStoredRefreshToken()) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...fetchOptions, headers });
      }
    }

    if (!response.ok) {
      let errorEnvelope: ApiErrorEnvelope['error'] = {
        code: `HTTP_${response.status}`,
        message: response.statusText,
      };
      try {
        const body = await response.json();
        if (body && body.error) {
          errorEnvelope = body.error;
        }
      } catch {
        // Body wasn't JSON
      }
      throw new ApiError(response.status, errorEnvelope);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } finally {
    if (!skipGlobalLoader) {
      activeRequests = Math.max(0, activeRequests - 1);
      notifyLoadingListeners();
    }
  }
}
