import axios from 'axios';
import { config } from './config';

const API_BASE_URL = config.API_URL;

// Type definitions
interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

interface Apartment {
  id: string;
  name: string;
  properties: string[];
  isFavorite: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_username?: string;
}

interface Booking {
  id: string;
  guest_name: string;
  checkIn: Date;
  checkOut: Date;
  apartment_id?: string;
  temporary_apartment?: string;
  apartment_name?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  created_by_username?: string;
}

interface ApartmentUpdate {
  name?: string;
  properties?: string[];
  isFavorite?: boolean;
}

interface BookingUpdate {
  guest_name?: string;
  check_in?: string;
  check_out?: string;
  apartment_id?: string;
  temporary_apartment?: string;
}

interface UserUpdate {
  username?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'viewer';
  active?: boolean;
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const getStoredUser = (): User | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Request interceptor to add auth header
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
          setTokens(newAccessToken, newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        clearTokens();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout', { refreshToken });
    clearTokens();
    return response.data;
  },

  logoutAll: async () => {
    const response = await api.post('/auth/logout-all');
    clearTokens();
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

// Apartments API
export const apartmentsAPI = {
  getAll: async (): Promise<Apartment[]> => {
    const response = await api.get('/apartments');
    return response.data;
  },

  getById: async (id: string): Promise<Apartment> => {
    const response = await api.get(`/apartments/${id}`);
    return response.data;
  },

  create: async (apartment: { name: string; properties: string[] }): Promise<Apartment> => {
    const response = await api.post('/apartments', apartment);
    return response.data;
  },

  update: async (id: string, updates: ApartmentUpdate): Promise<Apartment> => {
    const response = await api.put(`/apartments/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/apartments/${id}`);
    return response.data;
  },

  toggleFavorite: async (id: string): Promise<{ message: string; isFavorite: boolean }> => {
    const response = await api.patch(`/apartments/${id}/favorite`);
    return response.data;
  },
};

// Bookings API
export const bookingsAPI = {
  getAll: async (params?: { page?: number; limit?: number; apartment_id?: string; guest_name?: string }): Promise<Booking[]> => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Booking> => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  create: async (booking: {
    guest_name: string;
    check_in: string;
    check_out: string;
    apartment_id?: string;
    temporary_apartment?: string;
  }): Promise<Booking> => {
    const response = await api.post('/bookings', booking);
    return response.data;
  },

  update: async (id: string, updates: BookingUpdate): Promise<Booking> => {
    const response = await api.put(`/bookings/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  },

  getAvailableApartments: async (check_in: string, check_out: string): Promise<Apartment[]> => {
    const response = await api.post('/bookings/available-apartments', {
      check_in,
      check_out,
    });
    return response.data;
  },

  batchCreate: async (bookings: Omit<Booking, 'id' | 'created_by' | 'created_at' | 'updated_at'>[]): Promise<{ message: string; createdCount: number; bookingIds: string[] }> => {
    const response = await api.post('/bookings/batch', { bookings });
    return response.data;
  },

  deleteAll: async (): Promise<{ message: string; deletedCount: number }> => {
    const response = await api.delete('/bookings');
    return response.data;
  },
};

// Users API (admin only)
export const usersAPI = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (user: {
    username: string;
    email: string;
    password: string;
    role: string;
  }): Promise<User> => {
    const response = await api.post('/users', user);
    return response.data;
  },

  update: async (id: string, updates: UserUpdate): Promise<User> => {
    const response = await api.put(`/users/${id}`, updates);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  resetPassword: async (id: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post(`/users/${id}/reset-password`, {
      newPassword,
    });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/users/stats/overview');
    return response.data;
  },
};

// Backup API (admin only)
export const backupAPI = {
  export: async () => {
    const response = await api.get('/backup/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  import: async (file: File, replace: boolean = false) => {
    const formData = new FormData();
    formData.append('backup', file);
    formData.append('replace', replace.toString());

    const response = await api.post('/backup/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/backup/history');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/backup/stats');
    return response.data;
  },

  cleanupAuditLogs: async (days: number = 90) => {
    const response = await api.delete(`/backup/cleanup/audit-logs?days=${days}`);
    return response.data;
  },
};

export default api; 