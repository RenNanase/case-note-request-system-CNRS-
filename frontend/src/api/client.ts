import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: '/api', // Use /api prefix for all API routes - works with Vite proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cnrs_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Adding auth token to request:', config.url);
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ No auth token found for request:', config.url);
    }

    console.log('📡 Request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config?.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('💥 API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
      headers: error.response?.headers
    });

    // Handle 401 unauthorized responses
    if (error.response?.status === 401) {
      console.log('🔒 Authentication failed, redirecting to login...');
      // Clear stored token and redirect to login
      localStorage.removeItem('cnrs_token');
      localStorage.removeItem('cnrs_user');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
