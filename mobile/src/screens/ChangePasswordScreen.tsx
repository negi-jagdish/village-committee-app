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

export default function ChangePasswordScreen({ navigation }: any) {
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
        <View style={styles.container}>
            <View style={styles.form}>
                <Text style={styles.label}>{t('auth.currentPassword') || 'Current Password'}</Text>
                <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    placeholder="Enter current password"
                />

                <Text style={styles.label}>{t('auth.newPassword') || 'New Password'}</Text>
                <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Enter new password"
                />

                <Text style={styles.label}>{t('auth.confirmPassword') || 'Confirm New Password'}</Text>
                <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="Confirm new password"
                />

                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
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
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    form: {
        backgroundColor: '#fff',
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
        color: '#333',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 12,
        fontSize: 16,
    },
    submitButton: {
        backgroundColor: '#1a5f2a',
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
