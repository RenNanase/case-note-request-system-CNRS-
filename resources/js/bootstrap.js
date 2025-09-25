// Bootstrap file for Laravel + Vite
import axios from 'axios';

// Configure axios defaults
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Set up CSRF token for axios
const token = document.head.querySelector('meta[name="csrf-token"]');

if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
} else {
    console.error('CSRF token not found: https://laravel.com/docs/csrf#csrf-x-csrf-token');
}

// Add request interceptor for debugging
window.axios.interceptors.request.use(
    (config) => {
        console.log('Making API request:', config.method?.toUpperCase(), config.url);
        return config;
    },
    (error) => {
        console.error('API request error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
window.axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 419) {
            // CSRF token mismatch - refresh the page
            window.location.reload();
        }
        return Promise.reject(error);
    }
);
