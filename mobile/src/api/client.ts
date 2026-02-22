import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Platform } from 'react-native';

// Production URL
// Production URL
const API_BASE_URL = 'http://178.16.138.41/api';

// Local Development URL (Physical Device Testing)
// const API_BASE_URL = 'http://192.168.1.8:3000/api';

// Emulator URL (Standard Android Emulator)
// const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';

export { API_BASE_URL };

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token: string) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

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
        if (error.response) {
            // Skip disruptive console.error (which triggers RN LogBox) for expected 403s on group operations
            const isChat403 = error.response.status === 403 && error.config?.url?.startsWith('/chat/');
            const isChatUpdateToken401 = error.response.status === 401 && error.config?.url?.includes('/chat/update-token');
            if (!isChat403 && !isChatUpdateToken401) {
                console.error('API Error Response:', error.response.status, error.response.data);
            }
        } else if (error.request) {
            console.error('API Error Request:', error.request);
        } else {
            console.error('API Error Message:', error.message);
        }

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
    loginSim: (phoneNumber: string) => api.post('/auth/login-sim', { phoneNumber }),
    setMpin: (mpin: string) => api.post('/auth/set-mpin', { mpin }),
    loginMpin: (contact: string, mpin: string) => api.post('/auth/login-mpin', { contact, mpin }),
};

// Members APIs
export const membersAPI = {
    getAll: () => api.get('/members'),
    getList: () => api.get('/members/list'),
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
    updateBio: (id: number, bio: string) =>
        api.put(`/members/${id}`, { bio }),
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
    createBulkIncome: (data: FormData | any) => {
        const isFormData = data instanceof FormData;
        return api.post('/transactions/bulk-income', data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
        });
    },
    createExpense: (data: FormData | any) => {
        const isFormData = data instanceof FormData;
        return api.post('/transactions/expense', data, {
            headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
        });
    },
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
    getAll: (params?: { limit?: number; offset?: number; category?: string; scope?: string; sortBy?: string; status?: string }) =>
        api.get('/news', { params }),
    getById: (id: number) => api.get(`/news/${id}`),
    create: (data: FormData) =>
        api.post('/news', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    update: (id: number, data: FormData) =>
        api.put(`/news/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    react: (id: number, reaction: 'like' | 'love' | 'celebrate') =>
        api.post(`/news/${id}/react`, { reaction }),
    delete: (id: number) => api.delete(`/news/${id}`),
    archive: (id: number) => api.patch(`/news/${id}/archive`),
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
    recalculateBalances: () => api.post('/reports/recalculate-balances'),
};

export const galleryAPI = {
    getEvents: () => api.get('/gallery/events'),
    getEventDetails: (id: number) => api.get(`/gallery/events/${id}`),
    createEvent: (data: FormData) => api.post('/gallery/events', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    addMedia: (data: FormData) => api.post('/gallery/media', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    deleteMedia: (id: number) => api.delete(`/gallery/media/${id}`),
    deleteEvent: (id: number) => api.delete(`/gallery/events/${id}`),
};

export const pollsAPI = {
    create: (data: FormData) => api.post('/polls', data, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    getActive: () => api.get('/polls'),
    getHistory: () => api.get('/polls/history'),
    getDetails: (id: number) => api.get(`/polls/${id}`),
    vote: (id: number, data: { option_ids: number | number[], text_response?: string }) => api.post(`/polls/${id}/vote`, data),
    edit: (id: number, data: { title?: string; description?: string; start_at?: string; end_at?: string; status?: string; allow_custom_answer?: boolean; show_results?: boolean }) =>
        api.put(`/polls/${id}`, data),
    delete: (id: number) => api.delete(`/polls/${id}`),

    getVotes: (id: number) => api.get(`/polls/${id}/votes`),
};

// Chat APIs
export const chatAPI = {
    getList: () => api.get('/chat/list'),
    getMessages: (groupId: number, limit = 50, offset = 0) =>
        api.get(`/chat/${groupId}/messages`, { params: { limit, offset } }),
    updateToken: (fcmToken: string) => api.post('/chat/update-token', { fcmToken }),
    sendMessage: (groupId: number, content: string, type = 'text', metadata?: any) =>
        api.post(`/chat/${groupId}/message`, { content, type, metadata }),
    uploadMedia: (formData: FormData) =>
        api.post('/chat/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
    createBroadcast: (content: string, type = 'text', metadata?: any) =>
        api.post('/chat/broadcast', { content, type, metadata }),
    createGroup: (data: { name?: string, type: 'private' | 'group', memberIds: number[] }) =>
        api.post('/chat/group', data),
    deleteMessage: (messageId: number) => api.delete(`/chat/message/${messageId}`),
    reactToMessage: (messageId: number, reaction: string) => api.post(`/chat/message/${messageId}/react`, { reaction }),
    replyToMessage: (groupId: number, content: string, replyToId: number, type = 'text', metadata?: any) =>
        api.post(`/chat/${groupId}/message`, { content, type, metadata, replyToId }),
    forwardMessage: (groupId: number, content: string, type = 'text', metadata?: any, isForwarded = true) =>
        api.post(`/chat/${groupId}/message`, { content, type, metadata, isForwarded }),
    getReactions: (messageId: number) => api.get(`/chat/message/${messageId}/reactions`),

    // Group Management
    getGroupDetails: (groupId: number) => api.get(`/chat/${groupId}`),
    updateGroupDetails: (groupId: number, data: { name?: string, description?: string, icon_url?: string }) =>
        api.put(`/chat/${groupId}`, data),
    addGroupMembers: (groupId: number, memberIds: number[]) =>
        api.post(`/chat/${groupId}/members`, { memberIds }),
    removeGroupMember: (groupId: number, memberId: number) =>
        api.delete(`/chat/${groupId}/members/${memberId}`),
    updateMemberRole: (groupId: number, memberId: number, role: 'admin' | 'member') =>
        api.put(`/chat/${groupId}/members/${memberId}/role`, { role }),
    leaveGroup: (groupId: number) => api.post(`/chat/${groupId}/leave`),
    createOrGetPrivateChat: (memberId: number) =>
        api.post('/chat/group', { type: 'private', memberIds: [memberId] }),
};

export default api;
export { api };
