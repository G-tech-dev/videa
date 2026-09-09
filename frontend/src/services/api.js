import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.API_URL || import.meta.env.VITE_API_URL || 'https://videa-api.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const message = error.response.data?.message || 'Something went wrong';
      toast.error(message);
      
      // Handle unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  activatePremium: (plan) => api.post('/auth/premium', { plan }),
};

// Channel Services
export const channelService = {
  create: (data) => api.post('/channels', data),
  getAll: () => api.get('/channels'),
  getById: (id) => api.get(`/channels/${id}`),
  getMyChannel: () => api.get('/channels/my-channel'),
  getMyChannelAnalytics: () => api.get('/channels/my-channel/analytics'),
  update: (id, data) => api.put(`/channels/${id}`, data),
  refreshStats: (id) => api.post(`/channels/${id}/refresh-stats`),
};

// Video Services
export const videoService = {
  create: (data) => api.post('/videos', data),
  getAll: (params) => api.get('/videos', { params }),
  getById: (id) => api.get(`/videos/${id}`),
  getByChannel: (channelId) => api.get(`/videos/channel/${channelId}`),
  update: (id, data) => api.put(`/videos/${id}`, data),
  delete: (id) => api.delete(`/videos/${id}`),
};

// Watch Services
export const watchService = {
  track: (data) => api.post('/watch/track', data),
  getHistory: () => api.get('/watch/history'),
  getEarnings: () => api.get('/watch/earnings'),
};

// Wallet Services
export const walletService = {
  get: () => api.get('/wallet'),
  updateDetails: (data) => api.put('/wallet/details', data),
  deposit: (data) => api.post('/wallet/deposit', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
};

export default api;