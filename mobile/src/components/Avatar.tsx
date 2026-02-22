import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { API_BASE_URL } from '../api/client';

interface AvatarProps {
    uri?: string | null;
    name: string;
    size?: number;
    style?: StyleProp<ImageStyle>;
}

const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 50, style }) => {
    const { colors, isDark } = useTheme();

    const getInitials = (name: string) => {
        if (!name) return '?';
        const names = name.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    const imageUrl = uri ? (uri.startsWith('http') ? uri : `${API_BASE_URL.replace('/api', '')}${uri}`) : null;

    if (imageUrl) {
        return (
            <Image
                source={{ uri: imageUrl }}
                style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#eee' } as ImageStyle, style]}
            />
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: isDark ? '#1b3a20' : '#e8f5e9', // Theme derived background
                    borderColor: colors.borderLight,
                    borderWidth: 0, // Optional
                },
                style
            ]}
        >
            <Text style={[styles.text, { fontSize: size * 0.4, color: isDark ? '#81c784' : '#2e7d32' }]}>
                {getInitials(name)}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    text: {
        fontWeight: 'bold',
    },
});

export default Avatar;
