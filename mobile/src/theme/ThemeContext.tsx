import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface ThemeColors {
    // Backgrounds
    background: string;
    surface: string;
    card: string;
    // Text
    text: string;
    textSecondary: string;
    textTertiary: string;
    // Borders
    border: string;
    borderLight: string;
    // Primary brand
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryText: string;
    // Navigation
    headerBg: string;
    headerText: string;
    tabBarBg: string;
    tabBarActive: string;
    tabBarInactive: string;
    tabBarBorder: string;
    // Inputs
    inputBg: string;
    inputText: string;
    inputBorder: string;
    inputPlaceholder: string;
    // Status
    success: string;
    successBg: string;
    error: string;
    errorBg: string;
    warning: string;
    warningBg: string;
    // Misc
    shadow: string;
    overlay: string;
    skeleton: string;
    badge: string;
    badgeText: string;
}

export const lightColors: ThemeColors = {
    background: '#f0f2f5',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#1a1a1a',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    primary: '#1a5f2a',
    primaryDark: '#144a21',
    primaryLight: '#e8f5e9',
    primaryText: '#ffffff',
    headerBg: '#1a5f2a',
    headerText: '#ffffff',
    tabBarBg: '#ffffff',
    tabBarActive: '#1a5f2a',
    tabBarInactive: '#999999',
    tabBarBorder: '#e0e0e0',
    inputBg: '#f5f5f5',
    inputText: '#333333',
    inputBorder: '#e0e0e0',
    inputPlaceholder: '#999999',
    success: '#2e7d32',
    successBg: '#e8f5e9',
    error: '#c62828',
    errorBg: '#ffebee',
    warning: '#e65100',
    warningBg: '#fff3e0',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.5)',
    skeleton: '#e0e0e0',
    badge: '#e8f5e9',
    badgeText: '#1a5f2a',
};

export const darkColors: ThemeColors = {
    background: '#121212',
    surface: '#1c1c1e',
    card: '#1c1c1e',
    text: '#f0f0f0',
    textSecondary: '#aaaaaa',
    textTertiary: '#777777',
    border: '#2a2a2a',
    borderLight: '#333333',
    primary: '#2e8b3e',
    primaryDark: '#1a5f2a',
    primaryLight: '#1b3a20',
    primaryText: '#ffffff',
    headerBg: '#1a1a1a',
    headerText: '#f0f0f0',
    tabBarBg: '#1a1a1a',
    tabBarActive: '#4caf50',
    tabBarInactive: '#666666',
    tabBarBorder: '#2a2a2a',
    inputBg: '#2a2a2a',
    inputText: '#eeeeee',
    inputBorder: '#3a3a3a',
    inputPlaceholder: '#666666',
    success: '#4caf50',
    successBg: '#1b3a20',
    error: '#ef5350',
    errorBg: '#3a1a1a',
    warning: '#ffb74d',
    warningBg: '#3a2a0a',
    shadow: '#000000',
    overlay: 'rgba(0,0,0,0.7)',
    skeleton: '#2a2a2a',
    badge: '#2a5a32',
    badgeText: '#a5d6a7',
};

interface ThemeContextType {
    colors: ThemeColors;
    isDark: boolean;
    themeMode: 'system' | 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
    colors: lightColors,
    isDark: false,
    themeMode: 'system',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const themeMode = useSelector((state: RootState) => state.app.themeMode);

    const isDark = useMemo(() => {
        if (themeMode === 'system') return systemScheme === 'dark';
        return themeMode === 'dark';
    }, [themeMode, systemScheme]);

    const colors = isDark ? darkColors : lightColors;

    const value = useMemo(() => ({ colors, isDark, themeMode }), [colors, isDark, themeMode]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    return useContext(ThemeContext);
}
