import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, logout, clearAuth, setLanguage, persistLanguage } from '../store';
import { membersAPI } from '../api/client';
import i18n from '../i18n';

interface Contribution {
    id: number;
    amount: number;
    drive_title: string;
    drive_title_hi: string;
    created_at: string;
    status: string;
}

interface PendingDue {
    drive_id: number;
    drive_title: string;
    drive_title_hi: string;
    amount_required: number;
    amount_paid: number;
    amount_pending: number;
}

export default function ProfileScreen({ navigation }: any) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const language = useSelector((state: RootState) => state.app.language);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [pendingDues, setPendingDues] = useState<PendingDue[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchContributions = async () => {
        if (!user) return;
        try {
            const response = await membersAPI.getContributions(user.id);
            setContributions(response.data.contributions);
            setPendingDues(response.data.pending);
        } catch (error) {
            console.error('Fetch contributions error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContributions();
    }, [user]);

    const handleLogout = () => {
        Alert.alert(
            t('auth.logout'),
            'Are you sure you want to logout?',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('auth.logout'),
                    style: 'destructive',
                    onPress: async () => {
                        await clearAuth();
                        dispatch(logout());
                    },
                },
            ]
        );
    };

    const toggleLanguage = async () => {
        const newLang = language === 'en' ? 'hi' : 'en';
        dispatch(setLanguage(newLang));
        await persistLanguage(newLang);
        i18n.changeLanguage(newLang);
    };

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const totalPending = pendingDues.reduce((sum, d) => sum + d.amount_pending, 0);

    return (
        <ScrollView style={styles.container}>
            {/* Profile Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userRole}>
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </Text>
                <Text style={styles.userContact}>{user?.contact}</Text>
                <Text style={styles.userContact}>
                    {user?.sex ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1) : 'Male'}
                </Text>
            </View>

            {/* Pending Dues Summary */}
            {pendingDues.length > 0 && (
                <View style={styles.pendingCard}>
                    <Text style={styles.pendingTitle}>{t('profile.pendingDues')}</Text>
                    <Text style={styles.pendingAmount}>{formatCurrency(totalPending)}</Text>
                    {pendingDues.map((due) => (
                        <View key={due.drive_id || 'legacy'} style={styles.pendingItem}>
                            <Text style={styles.pendingDriveTitle}>
                                {language === 'hi' && due.drive_title_hi ? due.drive_title_hi : due.drive_title}
                            </Text>
                            <Text style={styles.pendingDriveAmount}>
                                {formatCurrency(due.amount_pending)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Contributions List */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.contributions')}</Text>
                {contributions.length === 0 ? (
                    <Text style={styles.emptyText}>No contributions yet</Text>
                ) : (
                    contributions.slice(0, 10).map((c) => (
                        <View key={c.id} style={styles.contributionItem}>
                            <View>
                                <Text style={styles.contributionDrive}>
                                    {language === 'hi' && c.drive_title_hi ? c.drive_title_hi : c.drive_title}
                                </Text>
                                <Text style={styles.contributionDate}>
                                    {new Date(c.created_at).toLocaleDateString('en-IN')}
                                </Text>
                            </View>
                            <Text style={styles.contributionAmount}>
                                {formatCurrency(c.amount)}
                            </Text>
                        </View>
                    ))
                )}
            </View>

            {/* Settings */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>

                {/* Language Toggle */}
                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>{t('profile.language')}</Text>
                    <View style={styles.languageToggle}>
                        <Text style={[styles.langText, language === 'en' && styles.activeLang]}>EN</Text>
                        <Switch
                            value={language === 'hi'}
                            onValueChange={toggleLanguage}
                            trackColor={{ false: '#e0e0e0', true: '#bfe6c8' }}
                            thumbColor={language === 'hi' ? '#1a5f2a' : '#999'}
                        />
                        <Text style={[styles.langText, language === 'hi' && styles.activeLang]}>हि</Text>
                    </View>
                </View>

                {/* Edit Profile */}
                <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => navigation.navigate('AddMember', { member: user, isEdit: true })}
                >
                    <Text style={styles.settingLabel}>{t('profile.editProfile')}</Text>
                    <Text style={styles.settingArrow}>→</Text>
                </TouchableOpacity>

                {/* Change Password */}
                <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => navigation.navigate('ChangePassword')}
                >
                    <Text style={styles.settingLabel}>{t('profile.changePassword')}</Text>
                    <Text style={styles.settingArrow}>→</Text>
                </TouchableOpacity>
            </View>

            {/* Role-based Actions */}
            {(user?.role === 'secretary' || user?.role === 'president') && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Management</Text>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('MembersList')}
                    >
                        <Text style={styles.actionButtonText}>{t('members.title')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>{t('auth.logout')}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#1a5f2a',
        padding: 24,
        alignItems: 'center',
        paddingTop: 40,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a5f2a',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    userRole: {
        fontSize: 14,
        color: '#bfe6c8',
        marginTop: 4,
    },
    userContact: {
        fontSize: 14,
        color: '#bfe6c8',
        marginTop: 2,
    },
    pendingCard: {
        backgroundColor: '#fff3e0',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
    },
    pendingTitle: {
        fontSize: 14,
        color: '#e65100',
        fontWeight: '600',
    },
    pendingAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#e65100',
        marginVertical: 8,
    },
    pendingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    pendingDriveTitle: {
        fontSize: 14,
        color: '#666',
    },
    pendingDriveAmount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e65100',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
        paddingVertical: 20,
    },
    contributionItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contributionDrive: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    contributionDate: {
        fontSize: 12,
        color: '#999',
    },
    contributionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    settingItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 16,
        color: '#333',
    },
    settingArrow: {
        fontSize: 20,
        color: '#999',
    },
    languageToggle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    langText: {
        fontSize: 14,
        color: '#999',
        marginHorizontal: 8,
    },
    activeLang: {
        color: '#1a5f2a',
        fontWeight: 'bold',
    },
    actionButton: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1a5f2a',
    },
    actionButtonText: {
        color: '#1a5f2a',
        fontWeight: '600',
        fontSize: 16,
    },
    logoutButton: {
        backgroundColor: '#d32f2f',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
