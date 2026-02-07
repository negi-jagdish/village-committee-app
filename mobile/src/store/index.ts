import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface User {
    id: number;
    name: string;
    role: 'member' | 'cashier' | 'secretary' | 'reporter' | 'president';
    contact: string; // This is mapped from contact_1
    contact_1?: string;
    father_name?: string;
    mother_name?: string;
    date_of_birth?: string;
    village_landmark?: string;
    current_address?: string;
    contact_2?: string;
    email?: string;
    status?: string;
    sex?: string;
    legacy_due?: number;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface AppState {
    language: 'en' | 'hi';
}

// Auth Slice
const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false,
    } as AuthState,
    reducers: {
        setCredentials: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.isLoading = false;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
    },
});

// App Settings Slice
const appSlice = createSlice({
    name: 'app',
    initialState: {
        language: 'en',
    } as AppState,
    reducers: {
        setLanguage: (state, action: PayloadAction<'en' | 'hi'>) => {
            state.language = action.payload;
        },
    },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export const { setLanguage } = appSlice.actions;

// Store
export const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
        app: appSlice.reducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Persistence helpers
export const persistAuth = async (user: User, token: string) => {
    await AsyncStorage.setItem('user', JSON.stringify(user));
    await AsyncStorage.setItem('token', token);
};

export const clearAuth = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
};

export const loadAuth = async () => {
    const userStr = await AsyncStorage.getItem('user');
    const token = await AsyncStorage.getItem('token');
    if (userStr && token) {
        return { user: JSON.parse(userStr) as User, token };
    }
    return null;
};

export const persistLanguage = async (lang: 'en' | 'hi') => {
    await AsyncStorage.setItem('language', lang);
};

export const loadLanguage = async (): Promise<'en' | 'hi'> => {
    const lang = await AsyncStorage.getItem('language');
    return (lang as 'en' | 'hi') || 'en';
};
