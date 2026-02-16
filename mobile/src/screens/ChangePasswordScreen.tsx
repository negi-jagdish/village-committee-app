import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

export default function ChangePasswordScreen({ navigation }: any) {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [submitting, setSubmitting] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async () => {
        // Validation
        if (!currentPassword) {
            Alert.alert('Error', t('auth.enterCurrentPassword') || 'Please enter current password');
            return;
        }
        if (!newPassword) {
            Alert.alert('Error', t('auth.enterNewPassword') || 'Please enter new password');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', t('auth.passwordMinLength') || 'Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', t('auth.passwordsDoNotMatch') || 'New passwords do not match');
            return;
        }

        setSubmitting(true);
        try {
            await authAPI.changePassword(currentPassword, newPassword);
            Alert.alert('Success', 'Password changed successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error: any) {
            console.error('Change password error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to change password');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.form, { backgroundColor: colors.card }]}>
                <Text style={[styles.label, { color: colors.text }]}>{t('auth.currentPassword') || 'Current Password'}</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, color: colors.text }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textTertiary}
                />

                <Text style={[styles.label, { color: colors.text }]}>{t('auth.newPassword') || 'New Password'}</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, color: colors.text }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textTertiary}
                />

                <Text style={[styles.label, { color: colors.text }]}>{t('auth.confirmPassword') || 'Confirm New Password'}</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: isDark ? '#333' : '#f9f9f9', borderColor: colors.border, color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textTertiary}
                />

                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        { backgroundColor: colors.primary },
                        submitting && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>{t('auth.changePassword') || 'Change Password'}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    form: {
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderRadius: 8,
        borderWidth: 1,
        padding: 12,
        fontSize: 16,
    },
    submitButton: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 10,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
