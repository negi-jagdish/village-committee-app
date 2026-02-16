import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { membersAPI, authAPI } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function MemberDetailsScreen({ route, navigation }: any) {
    const { colors, isDark } = useTheme();
    const styles = getStyles(colors, isDark);
    const { memberId } = route.params;
    const { t, i18n } = useTranslation();
    const language = i18n.language;
    const currentUser = useSelector((state: RootState) => state.auth.user);

    const [loading, setLoading] = useState(true);
    const [member, setMember] = useState<any>(null);
    const [contributions, setContributions] = useState<any[]>([]);
    const [pendingDues, setPendingDues] = useState<any[]>([]);

    // Reset Password State
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [newResetPassword, setNewResetPassword] = useState('');
    const [resetting, setResetting] = useState(false);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [memberRes, contributionsRes] = await Promise.all([
                membersAPI.getById(memberId),
                membersAPI.getContributions(memberId),
            ]);
            setMember(memberRes.data);
            setContributions(contributionsRes.data.contributions);
            setPendingDues(contributionsRes.data.pending);
        } catch (error) {
            console.error('Fetch member details error:', error);
            Alert.alert('Error', 'Failed to load member details');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDetails();
        }, [memberId])
    );

    const handleResetPassword = async () => {
        if (newResetPassword.length < 4) {
            Alert.alert('Error', 'Password must be at least 4 characters');
            return;
        }

        setResetting(true);
        try {
            await authAPI.resetPassword(memberId, newResetPassword);
            Alert.alert('Success', 'Password has been reset successfully');
            setResetModalVisible(false);
            setNewResetPassword('');
        } catch (error) {
            Alert.alert('Error', 'Failed to reset password');
        } finally {
            setResetting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a5f2a" />
            </View>
        );
    }

    if (!member) return null;

    const totalPending = pendingDues.reduce((sum, item) => sum + item.amount_pending, 0);

    // Permission Check
    const isPresident = currentUser?.role === 'president';
    const canEdit = isPresident ||
        (currentUser?.role === 'secretary' && member.role !== 'president');

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Profile Card */}
            <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    {canEdit && (
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => navigation.navigate('AddMember', { member, isEdit: true })}
                        >
                            <Text style={styles.editButtonText}>✎ Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.name}>{member.name}</Text>
                <Text style={styles.role}>{member.role.toUpperCase()}</Text>

                <View style={styles.statusBadge}>
                    <Text style={[
                        styles.statusText,
                        { color: member.status === 'active' || member.is_active ? 'green' : 'red' }
                    ]}>
                        {member.status ? member.status.toUpperCase() : (member.is_active ? 'ACTIVE' : 'INACTIVE')}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Father's Name:</Text>
                    <Text style={styles.infoValue}>{member.father_name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Sex:</Text>
                    <Text style={styles.infoValue}>{member.sex ? member.sex.charAt(0).toUpperCase() + member.sex.slice(1) : 'Male'}</Text>
                </View>
                {member.mother_name && (
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Mother's Name:</Text>
                        <Text style={styles.infoValue}>{member.mother_name}</Text>
                    </View>
                )}
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Contact:</Text>
                    <Text style={styles.infoValue}>{member.contact_1}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Address:</Text>
                    <Text style={styles.infoValue}>{member.village_landmark}, {member.current_address}</Text>
                </View>

                {/* President Reset Password Action */}
                {isPresident && (
                    <TouchableOpacity
                        style={styles.resetPasswordBtn}
                        onPress={() => setResetModalVisible(true)}
                    >
                        <Text style={styles.resetPasswordText}>🔒 Reset Password</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Password Reset Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={resetModalVisible}
                onRequestClose={() => setResetModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reset Password</Text>
                        <Text style={styles.modalSubtitle}>
                            Enter new password for {member.name}
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="New Password"
                            value={newResetPassword}
                            onChangeText={setNewResetPassword}
                            secureTextEntry
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setResetModalVisible(false);
                                    setNewResetPassword('');
                                }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, styles.confirmBtn]}
                                onPress={handleResetPassword}
                                disabled={resetting}
                            >
                                {resetting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>Reset</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Pending Dues Section */}
            {pendingDues.length > 0 ? (
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('profile.pendingDues')}</Text>
                        <Text style={styles.pendingTotal}>{formatCurrency(totalPending)}</Text>
                    </View>
                    {pendingDues.map((item) => (
                        <View key={item.drive_id || 'legacy'} style={styles.dueItem}>
                            <View>
                                <Text style={styles.dueTitle}>
                                    {language === 'hi' && item.drive_title_hi ? item.drive_title_hi : item.drive_title}
                                </Text>
                                <Text style={styles.dueSubtitle}>
                                    Paid: {formatCurrency(item.amount_paid)} / Target: {formatCurrency(item.amount_required)}
                                </Text>
                            </View>
                            <Text style={styles.dueAmount}>{formatCurrency(item.amount_pending)}</Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={[styles.sectionCard, styles.successCard]}>
                    <Text style={styles.successText}>✅ No Pending Dues!</Text>
                </View>
            )}

            {/* Contribution History */}
            <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t('profile.contributions')}</Text>
                {contributions.length === 0 ? (
                    <Text style={styles.emptyText}>No contributions yet</Text>
                ) : (
                    contributions.map((c) => (
                        <View key={c.id} style={styles.historyItem}>
                            <View>
                                <Text style={styles.historyTitle}>
                                    {language === 'hi' && c.title_hi ? c.title_hi : c.title}
                                </Text>
                                <Text style={styles.historyDate}>
                                    {new Date(c.created_at).toLocaleDateString('en-IN')}
                                </Text>
                            </View>
                            <Text style={styles.historyAmount}>+ {formatCurrency(c.amount)}</Text>
                        </View>
                    ))
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    headerCard: {
        backgroundColor: colors.card,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTop: {
        width: '100%',
        alignItems: 'center',
        position: 'relative',
    },
    editButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        backgroundColor: isDark ? '#333' : '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    editButtonText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: isDark ? '#1b3a20' : '#e8f5e9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    role: {
        fontSize: 14,
        color: colors.textSecondary,
        backgroundColor: isDark ? '#333' : '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
    },
    statusBadge: {
        marginBottom: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    infoRow: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: 8,
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        paddingBottom: 8,
    },
    infoLabel: {
        color: colors.textSecondary,
        width: '35%',
        fontWeight: '500',
    },
    infoValue: {
        color: colors.text,
        width: '60%',
        textAlign: 'right',
        fontWeight: '600',
    },
    sectionCard: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
    },
    pendingTotal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.error,
    },
    dueItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    dueTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    dueSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    dueAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.error,
    },
    successCard: {
        backgroundColor: isDark ? '#1b3a20' : '#e8f5e9',
        alignItems: 'center',
        padding: 20,
    },
    successText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyText: {
        color: colors.textSecondary,
        textAlign: 'center',
        padding: 10,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    historyTitle: {
        fontSize: 15,
        color: colors.text,
    },
    historyDate: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    historyAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary,
    },
    resetPasswordBtn: {
        marginTop: 20,
        backgroundColor: isDark ? '#3e2723' : '#fff3e0',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ffb74d',
    },
    resetPasswordText: {
        color: '#f57c00',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: colors.text,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
        color: colors.text,
        backgroundColor: isDark ? '#333' : '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: isDark ? '#424242' : '#f5f5f5',
    },
    confirmBtn: {
        backgroundColor: colors.error,
    },
    cancelBtnText: {
        color: colors.text,
        fontWeight: '600',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
