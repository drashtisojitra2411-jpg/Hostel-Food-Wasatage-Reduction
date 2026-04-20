import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const GENERIC_API_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export const API_URL = rawApiUrl.replace(/\/+$/, '');

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: false,
    headers: {
        "Content-Type": "application/json"
    },
    transformResponse: [(data, headers) => parseJsonSafely(data, headers)]
});

function getToken() {
    return localStorage.getItem('auth_token');
}

function setToken(token) {
    if (token) {
        localStorage.setItem('auth_token', token);
        return;
    }

    localStorage.removeItem('auth_token');
}

apiClient.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
        console.debug('[API] Request', {
            method: config.method,
            url: `${config.baseURL || ''}${config.url || ''}`
        });
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => {
        const hasBody =
            response.data !== null &&
            response.data !== undefined &&
            !(typeof response.data === 'string' && response.data.trim() === '');

        if (response.status !== 204 && !hasBody) {
            console.error('[API] Empty response body', {
                status: response.status,
                url: response.config?.url
            });

            const error = new Error(GENERIC_API_ERROR_MESSAGE);
            error.status = response.status;
            error.code = 'EMPTY_RESPONSE_BODY';
            error.response = response;
            return Promise.reject(error);
        }

        return response;
    },
    (error) => {
        const status = error.response?.status;
        const isJsonParseFailure =
            error.code === 'INVALID_JSON_RESPONSE' ||
            /json/i.test(error.message || '');
        const rawMessage =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Network request failed';
        let message = rawMessage;

        if (isJsonParseFailure || error.code === 'EMPTY_RESPONSE_BODY') {
            message = GENERIC_API_ERROR_MESSAGE;
        } else if (!error.response) {
            message = rawMessage || 'Request failed to reach the server.';
        } else if (status >= 500) {
            message = rawMessage || 'Server error. Please try again in a moment.';
        } else if (status === 403) {
            message = rawMessage || 'You do not have permission for this action.';
        } else if (status === 401) {
            message = rawMessage || 'Your session has expired. Please log in again.';
        }

        console.error('[API] Error', {
            status,
            url: error.config?.url,
            code: error.code,
            message
        });

        const normalized = new Error(message);
        normalized.status = status;
        normalized.code = error.code;
        normalized.original = error;
        normalized.response = error.response;
        return Promise.reject(normalized);
    }
);

const api = {
    get: async (path, config = {}) => {
        const response = await apiClient.get(normalizePath(path), config);
        return response.data;
    },
    post: async (path, body = {}, config = {}) => {
        const response = await apiClient.post(normalizePath(path), body, config);
        return response.data;
    },
    put: async (path, body = {}, config = {}) => {
        const response = await apiClient.put(normalizePath(path), body, config);
        return response.data;
    },
    delete: async (path, body = null, config = {}) => {
        const response = await apiClient.delete(normalizePath(path), { ...config, data: body });
        return response.data;
    },
    getToken,
    setToken,
    hasToken: () => Boolean(getToken()),
    baseURL: API_URL
};

export default api;

export async function fetchJson(path = '', options = {}) {
    const normalizedPath = normalizePath(path);
    const token = getToken();
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    try {
        const response = await fetch(`${API_URL}${normalizedPath}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorPayload = await parseFetchBody(response);
            throw new Error(
                errorPayload?.message ||
                errorPayload?.error ||
                GENERIC_API_ERROR_MESSAGE
            );
        }

        return await parseFetchBody(response);
    } catch (error) {
        console.error('[fetchJson] Request failed', {
            path: normalizedPath,
            message: error.message
        });
        throw error instanceof Error
            ? error
            : new Error(GENERIC_API_ERROR_MESSAGE);
    }
}

function normalizePath(path = '') {
    const value = String(path || '').trim();
    if (!value) {
        return '/';
    }
    const normalized = value.startsWith('/') ? value : `/${value}`;

    if (normalized === '/api') {
        return '/';
    }

    return normalized.startsWith('/api/') ? normalized.slice(4) : normalized;
}

function parseJsonSafely(data, headers) {
    if (data == null) {
        return null;
    }

    if (typeof data !== 'string') {
        return data;
    }

    const text = data.trim();
    if (!text) {
        return null;
    }

    const contentType = String(
        headers?.['content-type'] ||
        headers?.['Content-Type'] ||
        ''
    ).toLowerCase();
    const shouldParseJson =
        contentType.includes('application/json') ||
        text.startsWith('{') ||
        text.startsWith('[');

    if (!shouldParseJson) {
        return text;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('[API] Invalid JSON response', {
            contentType,
            preview: text.slice(0, 200)
        });

        const parseError = new Error(GENERIC_API_ERROR_MESSAGE);
        parseError.code = 'INVALID_JSON_RESPONSE';
        parseError.original = error;
        throw parseError;
    }
}

async function parseFetchBody(response) {
    const text = await response.text();

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('[fetchJson] Invalid JSON response', {
            status: response.status,
            url: response.url,
            preview: text.slice(0, 200)
        });
        throw new Error(GENERIC_API_ERROR_MESSAGE);
    }
}
