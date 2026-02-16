import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { authAPI } from '../api/client';
import { setCredentials, persistAuth } from '../store';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';
import SimCardsManager from 'react-native-sim-cards-manager';

export default function LoginScreen() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const dispatch = useDispatch();

    // State
    const [contact, setContact] = useState('');
    const [password, setPassword] = useState(''); // Used for Password / MPIN
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loginMethod, setLoginMethod] = useState<'password' | 'mpin'>('mpin'); // Default to MPIN for simplicity

    // --- SIM Login Logic ---
    const handleSimLogin = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert('Not Supported', 'SIM Login is only available on Android.');
            return;
        }

        try {
            setLoading(true);
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
                PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS
            ]);

            if (
                granted['android.permission.READ_PHONE_STATE'] === PermissionsAndroid.RESULTS.GRANTED ||
                granted['android.permission.READ_PHONE_NUMBERS'] === PermissionsAndroid.RESULTS.GRANTED
            ) {
                // Get SIM Cards
                const simCards = await SimCardsManager.getSimCards({
                    title: 'Permission Required',
                    message: 'This app needs access to your SIM card to log you in automatically.',
                    buttonPositive: 'OK',
                    buttonNegative: 'Cancel'
                });

                if (simCards && simCards.length > 0) {
                    // Try to login with the first SIM's number
                    // Note: phoneNumber might not be available on all carriers
                    const phoneNumber = simCards[0].phoneNumber;

                    if (phoneNumber) {
                        // Normalize: Remove +91 or other prefixes if backend expects 10 digits
                        // For now sending as is, backend should handle
                        const response = await authAPI.loginSim(phoneNumber);
                        const { token, user } = response.data;
                        await persistAuth(user, token);
                        dispatch(setCredentials({ user, token }));
                    } else {
                        Alert.alert('SIM Error', 'Could not read phone number from SIM. Please use MPIN or Password.');
                    }
                } else {
                    Alert.alert('No SIM', 'No SIM card detected.');
                }
            } else {
                Alert.alert('Permission Denied', 'Phone permission is required for SIM Login.');
            }
        } catch (error: any) {
            // 404 means user not found
            if (error.response?.status === 404) {
                Alert.alert('Not Registered', 'This phone number is not registered. Please contact the admin.');
            } else {
                console.error('SIM Login Error:', error);
                Alert.alert('Error', 'SIM Login failed. Please try manual login.');
            }
        } finally {
            setLoading(false);
        }
    };

    const performLogin = async () => {
        if (!contact || !password) {
            Alert.alert('Error', 'Please enter required fields');
            return;
        }

        setLoading(true);
        try {
            let response;
            if (loginMethod === 'mpin') {
                response = await authAPI.loginMpin(contact, password);
            } else {
                response = await authAPI.login(contact, password);
            }

            const { token, user } = response.data;
            await persistAuth(user, token);
            dispatch(setCredentials({ user, token }));
        } catch (error: any) {
            const msg = error.response?.data?.error || 'Login failed';
            Alert.alert('Login Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: '#1a5f2a' }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoEmoji}>🏘️</Text>
                    </View>
                    <Text style={styles.title}>Chamdoli Village</Text>
                    <Text style={styles.subtitle}>चामडोली ग्राम समिति</Text>
                </View>

                {/* Main Card */}
                <View style={[styles.card, { backgroundColor: colors.card }]}>

                    {/* Method Tabs */}
                    <View style={styles.methodTabs}>
                        <TouchableOpacity
                            style={[styles.methodTab, loginMethod === 'mpin' && styles.methodTabActive]}
                            onPress={() => setLoginMethod('mpin')}
                        >
                            <Text style={[styles.methodTabText, loginMethod === 'mpin' && styles.methodTabTextActive]}>Use MPIN</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.methodTab, loginMethod === 'password' && styles.methodTabActive]}
                            onPress={() => setLoginMethod('password')}
                        >
                            <Text style={[styles.methodTabText, loginMethod === 'password' && styles.methodTabTextActive]}>Password</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Input Fields */}
                    <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                        placeholder="e.g. 9876543210"
                        placeholderTextColor="#666"
                        value={contact}
                        onChangeText={setContact}
                        keyboardType="phone-pad"
                        maxLength={10}
                    />

                    <Text style={[styles.label, { color: colors.text }]}>
                        {loginMethod === 'mpin' ? '4-Digit MPIN' : 'Password'}
                    </Text>
                    <View style={[styles.passwordContainer, { backgroundColor: colors.background }]}>
                        <TextInput
                            style={[styles.passwordInput, { color: colors.text }]}
                            placeholder={loginMethod === 'mpin' ? 'Enter 4-digit PIN' : 'Enter Password'}
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            keyboardType={loginMethod === 'mpin' ? 'numeric' : 'default'}
                            maxLength={loginMethod === 'mpin' ? 4 : undefined}
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {/* Primary Login Button */}
                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.disabledButton]}
                        onPress={performLogin}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.loginButtonText}>
                                {loginMethod === 'mpin' ? 'Login with MPIN' : 'Login'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    {Platform.OS === 'android' && (
                        <>
                            <View style={styles.dividerContainer}>
                                <View style={styles.dividerLine} />
                                <Text style={styles.dividerText}>OR</Text>
                                <View style={styles.dividerLine} />
                            </View>

                            {/* SIM Login Button */}
                            <TouchableOpacity
                                style={[styles.simButton, loading && styles.disabledButton]}
                                onPress={handleSimLogin}
                                disabled={loading}
                            >
                                <Icon name="sim-card" size={20} color="#1a5f2a" style={{ marginRight: 8 }} />
                                <Text style={styles.simButtonText}>Login instantly with SIM</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', padding: 20 },
    header: { alignItems: 'center', marginBottom: 30 },
    logoCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 5
    },
    logoEmoji: { fontSize: 40 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    subtitle: { fontSize: 16, color: '#AED581' },
    card: {
        borderRadius: 20, padding: 24, elevation: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
    },
    methodTabs: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#f0f0f0', borderRadius: 12, padding: 4 },
    methodTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    methodTabActive: { backgroundColor: '#fff', elevation: 2 },
    methodTabText: { fontWeight: '600', color: '#666' },
    methodTabTextActive: { color: '#1a5f2a', fontWeight: 'bold' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
    input: {
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16,
        marginBottom: 16, borderWidth: 1, borderColor: '#eee'
    },
    passwordContainer: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
        borderColor: '#eee', marginBottom: 24
    },
    passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
    eyeButton: { padding: 12 },
    loginButton: {
        backgroundColor: '#1a5f2a', borderRadius: 12, paddingVertical: 16,
        alignItems: 'center', elevation: 2
    },
    loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    disabledButton: { opacity: 0.7 },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
    dividerText: { marginHorizontal: 10, color: '#999', fontWeight: '600', fontSize: 12 },
    simButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#E8F5E9', borderRadius: 12, paddingVertical: 16,
        borderWidth: 1, borderColor: '#C8E6C9'
    },
    simButtonText: { color: '#1a5f2a', fontSize: 15, fontWeight: 'bold' },
});
