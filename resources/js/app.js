// Laravel + Vite integration
import './bootstrap';

// Example of how to use your built assets
console.log('Laravel app.js loaded with Vite!');

// You can import your React components here if needed
// import { createRoot } from 'react-dom/client';
// import App from '../frontend/src/App';

// Example: Mount React app to a specific element
// const container = document.getElementById('react-app');
// if (container) {
//     const root = createRoot(container);
//     root.render(<App />);
// }

// Global utilities
window.Laravel = {
    csrfToken: document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
    baseUrl: window.location.origin + '/CNRS',
};

// Example API helper
window.api = {
    baseUrl: window.Laravel.baseUrl + '/api',

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': window.Laravel.csrfToken,
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};

// Example: Auto-refresh CSRF token
document.addEventListener('DOMContentLoaded', function() {
    // Refresh CSRF token every 30 minutes
    setInterval(async () => {
        try {
            const response = await fetch('/CNRS/sanctum/csrf-cookie');
            if (response.ok) {
                const token = document.querySelector('meta[name="csrf-token"]');
                if (token) {
                    token.setAttribute('content', response.headers.get('X-CSRF-TOKEN'));
                }
            }
        } catch (error) {
            console.warn('Failed to refresh CSRF token:', error);
        }
    }, 30 * 60 * 1000); // 30 minutes
});
