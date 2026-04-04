import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const API_URL = rawApiUrl.replace(/\/+$/, '');

const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: false,
    headers: {
        "Content-Type": "application/json"
    }
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
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const rawMessage =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Network request failed';
        let message = rawMessage;

        if (!error.response) {
            message = rawMessage || 'Request failed to reach the server.';
        } else if (status >= 500) {
            message = rawMessage || 'Server error. Please try again in a moment.';
        } else if (status === 403) {
            message = rawMessage || 'You do not have permission for this action.';
        } else if (status === 401) {
            message = rawMessage || 'Your session has expired. Please log in again.';
        }

        if (import.meta.env.DEV) {
            console.error('[API] Error', {
                status,
                url: error.config?.url,
                message
            });
        }

        const normalized = new Error(message);
        normalized.status = status;
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
