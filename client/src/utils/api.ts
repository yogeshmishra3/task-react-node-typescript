import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

export const setLogoutCallback = (callback: (message: string) => void) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        const message = error.response?.data?.error || 'Your session has expired. Please login again.';
        callback(message);
      }
      return Promise.reject(error);
    }
  );
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
