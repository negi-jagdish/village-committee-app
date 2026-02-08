import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Production URL
const API_BASE_URL = 'https://village-committee-api.onrender.com/api';

// Local Development URL
// const API_BASE_URL = Platform.OS === 'android'
//     ? 'http://10.0.2.2:3000/api'
//     : 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    login: (contact: string, password: string) =>
        api.post('/auth/login', { contact, password }),
    getProfile: () => api.get('/auth/me'),
    changePassword: (currentPassword: string, newPassword: string) =>
        api.post('/auth/change-password', { currentPassword, newPassword }),
    resetPassword: (id: number, newPassword: string) =>
        api.post(`/auth/reset-password/${id}`, { newPassword }),
};

// Members APIs
export const membersAPI = {
    getAll: () => api.get('/members'),
    getById: (id: number) => api.get(`/members/${id}`),
    create: (data: any) => api.post('/members', data),
    update: (id: number, data: any) => api.put(`/members/${id}`, data),
    getContributions: (id: number) => api.get(`/members/${id}/contributions`),
    waive: (memberId: number, driveId: number, reason: string) => api.post(`/members/${memberId}/waive`, { drive_id: driveId, reason }),
    removeWaiver: (memberId: number, driveId: number) => api.delete(`/members/${memberId}/waive/${driveId}`),
    uploadProfilePicture: (id: number, formData: FormData) =>
        api.post(`/members/${id}/profile-picture`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    uploadBackgroundPicture: (id: number, formData: FormData) =>
        api.post(`/members/${id}/background-picture`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

// Drives APIs
export const drivesAPI = {
    getAll: () => api.get('/drives'),
    getById: (id: number) => api.get(`/drives/${id}`),
    create: (data: any) => api.post('/drives', data),
    update: (id: number, data: any) => api.put(`/drives/${id}`, data),
};

// Transactions APIs
export const transactionsAPI = {
    getAll: (params?: any) => api.get('/transactions', { params }),
    createIncome: (data: FormData | any) => {
        const isFormData = data instanceof FormData;
        return api.post('/transactions/income', data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
        });
    },
    createBulkIncome: (data: FormData) =>
        api.post('/transactions/bulk-income', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    createExpense: (data: FormData) =>
        api.post('/transactions/expense', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    approve: (id: number, status: 'approved' | 'rejected') =>
        api.patch(`/transactions/${id}/approve`, { status }),
    allowEdit: (id: number) => api.patch(`/transactions/${id}/allow-edit`),
    update: (id: number, data: FormData) =>
        api.put(`/transactions/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    updateBulk: (paymentId: number, data: FormData) =>
        api.put(`/transactions/bulk-income/${paymentId}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getPendingApprovals: () => api.get('/transactions/pending-approvals'),
    delete: (id: number) => api.delete(`/transactions/${id}`),
    getOpeningBalance: () => api.get('/transactions/opening-balance'),
    updateOpeningBalance: (data: any) => api.put('/transactions/opening-balance', data),
};

// News APIs
export const newsAPI = {
    getAll: (params?: { limit?: number; offset?: number; category?: string; scope?: string; sortBy?: string }) =>
        api.get('/news', { params }),
    getById: (id: number) => api.get(`/news/${id}`),
    create: (data: FormData) =>
        api.post('/news', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    update: (id: number, data: any) => api.put(`/news/${id}`, data),
    react: (id: number, reaction: 'like' | 'love' | 'celebrate') =>
        api.post(`/news/${id}/react`, { reaction }),
    delete: (id: number) => api.delete(`/news/${id}`),
};

// Dashboard APIs
export const dashboardAPI = {
    getSummary: () => api.get('/dashboard'),
    getCashbook: (params?: any) => api.get('/dashboard/cashbook', { params }),
    getCollectionSummary: () => api.get('/dashboard/collection-summary'),
};

export const reportsAPI = {
    getPendingDues: () => api.get('/reports/pending-dues'),
    getPaymentsReceived: () => api.get('/reports/payments-received'),
};

export const galleryAPI = {
    getEvents: () => api.get('/gallery/events'),
    createEvent: (data: FormData) =>
        api.post('/gallery/events', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    getEventDetails: (id: number) => api.get(`/gallery/events/${id}`),
    addMedia: (data: FormData) =>
        api.post('/gallery/media', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    deleteMedia: (id: number) => api.delete(`/gallery/media/${id}`),
};

export default api;
