import axios from 'axios';
import { API_URL } from './const';
import { useStore } from '@/stores/store';
import { router } from '@/router';

// Create axios instance with sensible defaults
const storeAdminAxiosClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Authorization header
storeAdminAxiosClient.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Log error for debugging (optional)
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
storeAdminAxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      return Promise.reject(error);
    }

    const { status } = error.response;

    // Handle 401 Unauthorized
    if (status === 401) {
      const { clearAdminData } = useStore.getState();
      clearAdminData();

      // Avoid redirect loops
      if (window.location.pathname !== '/store-admin/login') {
        void router.navigate({
          to: '/store-admin/login',
          replace: true,
        });
      }
    }

    return Promise.reject(error);
  }
);

export default storeAdminAxiosClient;
