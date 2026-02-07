import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { authAPI } from '../api/client';
import { setCredentials, persistAuth } from '../store';

export default function LoginScreen() {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const performLogin = async (mobile: string, pass: string) => {
        setLoading(true);
        try {
            const response = await authAPI.login(mobile, pass);
            const { token, user } = response.data;
            await persistAuth(user, token);
            dispatch(setCredentials({ user, token }));
        } catch (error: any) {
            Alert.alert(t('common.error'), error.response?.data?.error || t('auth.invalidCredentials'));
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = () => {
        if (!contact || !password) {
            Alert.alert(t('common.error'), t('auth.invalidCredentials'));
            return;
        }
        performLogin(contact, password);
    };

    const QuickLoginButton = ({ name, mobile, color }: any) => (
        <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: color || '#455a64' }]}
            onPress={() => performLogin(mobile, '123456')}
        >
            <Text style={styles.quickButtonText}>{name}</Text>
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <React.Fragment>
                <View style={styles.scrollViewContent}>
                    {/* Using a View wrapper instead of proper ScrollView for now to keep structure, 
                        assuming screen height is enough or we rely on outer handling. 
                        Actually better to just use ScrollView inside here if many buttons. 
                    */}
                    <View style={styles.logoContainer}>
                        <View style={styles.logoCircle}>
                            <Text style={styles.logoText}>🏘️</Text>
                        </View>
                        <Text style={styles.title}>Chamdoli Village Committee</Text>
                        <Text style={styles.subtitle}>चामडोली ग्राम समिति</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <Text style={styles.label}>{t('auth.contact')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter contact number"
                            value={contact}
                            onChangeText={setContact}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                        />

                        <Text style={styles.label}>{t('auth.password')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.loginButtonText}>{t('auth.loginButton')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Quick Login Section (Test Only) */}
                    <View style={styles.quickLoginContainer}>
                        <Text style={styles.quickLoginTitle}>Fast Login (Test Users)</Text>
                        <View style={styles.quickLoginGrid}>
                            <QuickLoginButton name="President" mobile="9000000001" color="#d32f2f" />
                            <QuickLoginButton name="Cashier" mobile="9000000002" color="#2e7d32" />
                            <QuickLoginButton name="Secretary" mobile="9000000003" color="#1976d2" />
                            <QuickLoginButton name="Reporter" mobile="9000000004" color="#f57c00" />

                            <QuickLoginButton name="Member 1" mobile="9000000011" />
                            <QuickLoginButton name="Member 2" mobile="9000000012" />
                            <QuickLoginButton name="Member 3" mobile="9000000013" />
                            <QuickLoginButton name="Member 4" mobile="9000000014" />
                            <QuickLoginButton name="Member 5" mobile="9000000015" />
                            <QuickLoginButton name="Member 6" mobile="9000000016" />
                        </View>
                    </View>
                </View>
            </React.Fragment>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a5f2a',
    },
    scrollViewContent: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    logoText: {
        fontSize: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#bfe6c8',
        marginTop: 4,
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    loginButton: {
        backgroundColor: '#1a5f2a',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonDisabled: {
        backgroundColor: '#7cb887',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    quickLoginContainer: {
        marginTop: 10,
    },
    quickLoginTitle: {
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: 'bold',
        opacity: 0.8,
    },
    quickLoginGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    quickButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        minWidth: '45%',
        alignItems: 'center',
    },
    quickButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    }
});
