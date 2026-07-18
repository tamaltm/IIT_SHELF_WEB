import { API_BASE_URL } from './config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type RequestOptions = {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = options;

  // Build query string when params are provided (ignore null/undefined)
  const queryString = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : '';

  const url = `${API_BASE_URL}${path}${queryString ? `?${queryString}` : ''}`;

  try {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    // Only set JSON content-type when we are sending a JSON body; avoid forcing it on GETs
    const baseHeaders =
      body === undefined || isFormData || method === 'GET'
        ? {}
        : { 'Content-Type': 'application/json' };

    const finalHeaders = isFormData
      ? { ...headers }
      : { ...baseHeaders, ...headers };

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
          ? body
          : JSON.stringify(body),
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json() : (await res.text() as any);

    if (!res.ok) {
      const message = isJson && data && (data.message || data.error) ? (data.message || data.error) : `Request failed: ${res.status}`;
      throw new Error(message);
    }

    return data as T;
  } catch (error) {
    // If it's already an Error with a message, rethrow it
    if (error instanceof Error) {
      throw error;
    }
    // Network errors or other issues
    throw new Error('Network error - please check your connection');
  }
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method'> = {}) =>
    request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body?: any, headers?: Record<string, string>) =>
    request<T>(path, { method: 'POST', body, headers }),
  put: <T>(path: string, body?: any, headers?: Record<string, string>) =>
    request<T>(path, { method: 'PUT', body, headers }),
  del: <T>(path: string, body?: any, headers?: Record<string, string>) =>
    request<T>(path, { method: 'DELETE', body, headers }),
};
