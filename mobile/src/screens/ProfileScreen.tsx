import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    Image,
    ActivityIndicator,
    Platform,
    Dimensions,
    ImageBackground,
    Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, logout, clearAuth, setLanguage, persistLanguage, setUser, setThemeMode, persistTheme } from '../store';
import { membersAPI, reportsAPI, authAPI } from '../api/client';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 180;

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

type TabKey = 'overview' | 'history' | 'settings';

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    president: { bg: '#FFF3E0', text: '#E65100', label: '🏛️ President' },
    secretary: { bg: '#E3F2FD', text: '#1565C0', label: '📋 Secretary' },
    cashier: { bg: '#E8F5E9', text: '#2E7D32', label: '💰 Cashier' },
    reporter: { bg: '#F3E5F5', text: '#7B1FA2', label: '📰 Reporter' },
    member: { bg: '#ECEFF1', text: '#455A64', label: '👤 Member' },
};

export default function ProfileScreen({ navigation }: any) {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.auth.user);
    const language = useSelector((state: RootState) => state.app.language);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [pendingDues, setPendingDues] = useState<PendingDue[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [uploadingProfile, setUploadingProfile] = useState(false);
    const [uploadingBackground, setUploadingBackground] = useState(false);
    const [showAllDues, setShowAllDues] = useState(false);
    const { colors, isDark, themeMode } = useTheme();

    const toggleTheme = async (mode: 'system' | 'light' | 'dark') => {
        dispatch(setThemeMode(mode));
        await persistTheme(mode);
    };

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

    useFocusEffect(
        useCallback(() => {
            fetchContributions();
        }, [user])
    );

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

    const handleRecalculateBalances = async () => {
        Alert.alert(
            'Recalculate Balances',
            'This will rebuild the Cash Book from all transaction history. Use this if you see incorrect balances.\n\nAre you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Recalculate',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const response = await reportsAPI.recalculateBalances();
                            Alert.alert('Success', `Balances Updated:\nCash: ₹${response.data.balances.cash}\nBank: ₹${response.data.balances.bank}`);
                        } catch (error: any) {
                            console.error('Recalculate error:', error);
                            Alert.alert('Error', 'Failed to recalculate balances');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const toggleLanguage = async () => {
        const newLang = language === 'en' ? 'hi' : 'en';
        await AsyncStorage.setItem('language', newLang);
        i18n.changeLanguage(newLang);
        dispatch(setLanguage(newLang)); // Changed from setLanguage(newLang) to dispatch(setLanguage(newLang))
    };

    const handleSetMpin = async () => {
        Alert.prompt(
            'Set MPIN',
            'Enter a 4-digit PIN for quick login',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Set PIN',
                    onPress: async (mpin?: string) => {
                        if (mpin && mpin.length === 4 && !isNaN(Number(mpin))) {
                            try {
                                setLoading(true);
                                await authAPI.setMpin(mpin);
                                Alert.alert('Success', 'MPIN set successfully');
                            } catch (error) {
                                Alert.alert('Error', 'Failed to set MPIN');
                            } finally {
                                setLoading(false);
                            }
                        } else {
                            Alert.alert('Invalid MPIN', 'Please enter a 4-digit number');
                        }
                    },
                },
            ],
            'plain-text',
            '',
            'numeric'
        );
    };

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const compressImage = async (uri: string, maxSizeMB: number): Promise<string> => {
        try {
            let quality = 90;
            let width = maxSizeMB === 2 ? 800 : 1920;
            let height = maxSizeMB === 2 ? 800 : 1080;
            const resized = await ImageResizer.createResizedImage(
                uri, width, height, 'JPEG', quality, 0, undefined, false,
                { mode: 'contain', onlyScaleDown: true }
            );
            return resized.uri;
        } catch (error) {
            console.error('Image compression error:', error);
            return uri;
        }
    };

    const selectImage = (type: 'profile' | 'background') => {
        const maxSize = type === 'profile' ? 2 : 5;
        Alert.alert(
            type === 'profile' ? 'Profile Picture' : 'Background Picture',
            'Choose an option',
            [
                { text: '📷 Camera', onPress: () => captureFromCamera(type, maxSize) },
                { text: '🖼️ Gallery', onPress: () => pickFromGallery(type, maxSize) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const captureFromCamera = async (type: 'profile' | 'background', maxSizeMB: number) => {
        const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
        if (result.didCancel) return;
        if (result.errorCode) { Alert.alert('Error', result.errorMessage || 'Failed to capture image'); return; }
        if (result.assets && result.assets[0]) await uploadImage(result.assets[0], type, maxSizeMB);
    };

    const pickFromGallery = async (type: 'profile' | 'background', maxSizeMB: number) => {
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
        if (result.didCancel) return;
        if (result.errorCode) { Alert.alert('Error', result.errorMessage || 'Failed to pick image'); return; }
        if (result.assets && result.assets[0]) await uploadImage(result.assets[0], type, maxSizeMB);
    };

    const uploadImage = async (asset: Asset, type: 'profile' | 'background', maxSizeMB: number) => {
        if (!user || !asset.uri) return;
        const setUploading = type === 'profile' ? setUploadingProfile : setUploadingBackground;
        setUploading(true);
        try {
            const compressedUri = await compressImage(asset.uri, maxSizeMB);
            const formData = new FormData();
            const file: any = {
                uri: Platform.OS === 'ios' ? compressedUri.replace('file://', '') : compressedUri,
                type: 'image/jpeg',
                name: type === 'profile' ? 'profile.jpg' : 'background.jpg',
            };
            formData.append(type === 'profile' ? 'profile_picture' : 'background_picture', file);
            const response = type === 'profile'
                ? await membersAPI.uploadProfilePicture(user.id, formData)
                : await membersAPI.uploadBackgroundPicture(user.id, formData);
            const updatedUser = {
                ...user,
                [type === 'profile' ? 'profile_picture' : 'background_picture']:
                    response.data[type === 'profile' ? 'profile_picture' : 'background_picture'],
            };
            dispatch(setUser(updatedUser));
            Alert.alert('Success', `${type === 'profile' ? 'Profile' : 'Background'} picture updated!`);
        } catch (error: any) {
            console.error('Upload error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    // Computed values
    const totalPending = pendingDues.reduce((sum, d) => sum + d.amount_pending, 0);
    const totalPaid = contributions.reduce((sum, c) => sum + c.amount, 0);
    const roleInfo = ROLE_COLORS[user?.role || 'member'] || ROLE_COLORS.member;
    const visibleDues = showAllDues ? pendingDues : pendingDues.slice(0, 3);

    // ─── Tab Content Renderers ───

    const renderOverviewTab = () => (
        <View style={styles.tabContent}>
            {/* Stat Cards Row */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statIcon]}>💰</Text>
                    <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(totalPaid)}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.totalPaid') || 'Total Paid'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statIcon]}>{pendingDues.length > 0 ? '⏳' : '✅'}</Text>
                    <Text style={[styles.statValue, { color: pendingDues.length > 0 ? '#FF9800' : colors.primary }]}>
                        {pendingDues.length > 0 ? formatCurrency(totalPending) : 'Clear!'}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.pendingDues') || 'Pending'}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statIcon]}>📊</Text>
                    <Text style={[styles.statValue, { color: '#2196F3' }]}>{contributions.length}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.payments') || 'Payments'}</Text>
                </View>
            </View>

            {/* Pending Dues with Progress Bars */}
            {pendingDues.length > 0 && (
                <View style={[styles.duesCard, { backgroundColor: colors.card }]}>
                    <View style={styles.duesHeader}>
                        <Text style={[styles.duesTitle, { color: colors.text }]}>⚠️ {t('profile.pendingDues') || 'Pending Dues'}</Text>
                        <View style={[styles.duesTotalBadge, { backgroundColor: colors.background }]}>
                            <Text style={styles.duesTotalText}>{formatCurrency(totalPending)}</Text>
                        </View>
                    </View>
                    {visibleDues.map((due) => {
                        const progress = due.amount_required > 0 ? (due.amount_paid / due.amount_required) : 0;
                        return (
                            <View key={due.drive_id || 'legacy'} style={styles.dueItem}>
                                <View style={styles.dueItemHeader}>
                                    <Text style={[styles.dueDriveTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {language === 'hi' && due.drive_title_hi ? due.drive_title_hi : due.drive_title}
                                    </Text>
                                    <Text style={[styles.dueAmountText, { color: colors.textTertiary }]}>
                                        {formatCurrency(due.amount_paid)} / {formatCurrency(due.amount_required)}
                                    </Text>
                                </View>
                                <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                                    <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                                </View>
                            </View>
                        );
                    })}
                    {pendingDues.length > 3 && (
                        <TouchableOpacity
                            style={styles.showAllButton}
                            onPress={() => setShowAllDues(!showAllDues)}
                        >
                            <Text style={styles.showAllText}>
                                {showAllDues ? 'Show Less ▲' : `Show All (${pendingDues.length}) ▼`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Quick Actions */}
            <View style={[styles.quickActionsCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.quickActionsTitle, { color: colors.text }]}>⚡ Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => navigation.navigate('AddMember', { member: user, isEdit: true })}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
                            <Text style={styles.quickActionEmoji}>✏️</Text>
                        </View>
                        <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>{t('profile.editProfile') || 'Edit Profile'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickAction}
                        onPress={() => navigation.navigate('ChangePassword')}
                    >
                        <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={styles.quickActionEmoji}>🔒</Text>
                        </View>
                        <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>{t('profile.changePassword') || 'Password'}</Text>
                    </TouchableOpacity>
                    {(user?.role === 'secretary' || user?.role === 'president') && (
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => navigation.navigate('MembersList')}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
                                <Text style={styles.quickActionEmoji}>👥</Text>
                            </View>
                            <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>{t('members.title') || 'Members'}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Recent Contributions (max 5) */}
            {contributions.length > 0 && (
                <View style={[styles.recentCard, { backgroundColor: colors.card }]}>
                    <View style={styles.recentHeader}>
                        <Text style={[styles.recentTitle, { color: colors.text }]}>📋 Recent Payments</Text>
                        <TouchableOpacity onPress={() => setActiveTab('history')}>
                            <Text style={styles.viewAllText}>View All →</Text>
                        </TouchableOpacity>
                    </View>
                    {contributions.slice(0, 5).map((c) => (
                        <View key={c.id} style={[styles.recentItem, { borderBottomColor: colors.border }]}>
                            <View style={styles.recentItemLeft}>
                                <View style={styles.recentDot} />
                                <View>
                                    <Text style={[styles.recentDrive, { color: colors.text }]} numberOfLines={1}>
                                        {language === 'hi' && c.drive_title_hi ? c.drive_title_hi : c.drive_title || 'General'}
                                    </Text>
                                    <Text style={[styles.recentDate, { color: colors.textSecondary }]}>
                                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.recentAmount}>{formatCurrency(c.amount)}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    const renderHistoryTab = () => (
        <View style={styles.tabContent}>
            {loading ? (
                <ActivityIndicator size="large" color="#1a5f2a" style={{ marginTop: 40 }} />
            ) : contributions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyTitle}>No Contributions Yet</Text>
                    <Text style={styles.emptySubtitle}>Your payment history will appear here</Text>
                </View>
            ) : (
                contributions.map((c, index) => (
                    <View key={c.id} style={styles.historyItem}>
                        <View style={styles.historyTimeline}>
                            <View style={[styles.historyDot, index === 0 && styles.historyDotActive]} />
                            {index < contributions.length - 1 && <View style={styles.historyLine} />}
                        </View>
                        <View style={[styles.historyCard, { backgroundColor: colors.card }]}>
                            <View style={styles.historyCardHeader}>
                                <Text style={[styles.historyDrive, { color: colors.text }]} numberOfLines={1}>
                                    {language === 'hi' && c.drive_title_hi ? c.drive_title_hi : c.drive_title || 'General'}
                                </Text>
                                <View style={[
                                    styles.statusBadge,
                                    c.status === 'approved' ? { backgroundColor: '#E8F5E9' } : { backgroundColor: '#FFF3E0' }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        c.status === 'approved' ? styles.statusTextApproved : styles.statusTextPending
                                    ]}>
                                        {c.status === 'approved' ? '✓' : '⏳'} {c.status}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.historyCardFooter}>
                                <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                                    {new Date(c.created_at).toLocaleDateString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    })}
                                </Text>
                                <Text style={styles.historyAmount}>{formatCurrency(c.amount)}</Text>
                            </View>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderSettingsTab = () => (
        <View style={styles.tabContent}>
            {/* Language */}
            <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>🌐 {t('profile.language') || 'Language'}</Text>
                <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                    <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>English / हिंदी</Text>
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
                </View>
            </View>

            {/* Theme */}
            <View style={styles.settingsSection}>
                <Text style={[styles.settingsSectionTitle, { color: colors.textTertiary }]}>🎨 Theme</Text>
                <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                    <View style={styles.themeRow}>
                        {(['system', 'light', 'dark'] as const).map((mode) => {
                            const isActive = themeMode === mode;
                            const label = mode === 'system' ? '📱 System' : mode === 'light' ? '☀️ Light' : '🌙 Dark';
                            return (
                                <TouchableOpacity
                                    key={mode}
                                    style={[
                                        styles.themeOption,
                                        { borderColor: colors.border },
                                        isActive && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                                    ]}
                                    onPress={() => toggleTheme(mode)}
                                >
                                    <Text style={[
                                        styles.themeOptionText,
                                        { color: colors.textSecondary },
                                        isActive && { color: colors.primary, fontWeight: '700' }
                                    ]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>

            {/* Account */}
            <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>👤 Account</Text>
                <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => navigation.navigate('AddMember', { member: user, isEdit: true })}
                    >
                        <View style={styles.settingRowLeft}>
                            <Text style={styles.settingIcon}>✏️</Text>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profile.editProfile') || 'Edit Profile'}</Text>
                        </View>
                        <Text style={styles.settingArrow}>›</Text>
                    </TouchableOpacity>
                    <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
                    <TouchableOpacity
                        style={styles.settingRow}
                        onPress={() => navigation.navigate('ChangePassword')}
                    >
                        <View style={styles.settingRowLeft}>
                            <Text style={styles.settingIcon}>🔒</Text>
                            <Text style={[styles.settingLabel, { color: colors.text }]}>{t('profile.changePassword') || 'Change Password'}</Text>
                        </View>
                        <Text style={styles.settingArrow}>›</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Management (role-based) */}
            {(user?.role === 'secretary' || user?.role === 'president' || user?.role === 'cashier') && (
                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>🏛️ Management</Text>
                    <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
                        {(user?.role === 'secretary' || user?.role === 'president') && (
                            <TouchableOpacity
                                style={styles.settingRow}
                                onPress={() => navigation.navigate('MembersList')}
                            >
                                <View style={styles.settingRowLeft}>
                                    <Text style={styles.settingIcon}>👥</Text>
                                    <Text style={[styles.settingLabel, { color: colors.text }]}>{t('members.title') || 'Manage Members'}</Text>
                                </View>
                                <Text style={styles.settingArrow}>›</Text>
                            </TouchableOpacity>
                        )}

                        {(user?.role === 'president' || user?.role === 'cashier') && (
                            <>
                                {user?.role === 'president' && <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />}
                                <TouchableOpacity
                                    style={styles.settingRow}
                                    onPress={handleRecalculateBalances}
                                >
                                    <View style={styles.settingRowLeft}>
                                        <Text style={styles.settingIcon}>🔄</Text>
                                        <Text style={[styles.settingLabel, { color: colors.text }]}>Fix/Recalculate Balances</Text>
                                    </View>
                                    <Text style={styles.settingArrow}>›</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            )}

            {/* Logout */}
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.error }]} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>🚪 {t('auth.logout')}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Fixed Profile Header */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => selectImage('background')}
                disabled={uploadingBackground}
            >
                <ImageBackground
                    source={user?.background_picture ? { uri: user.background_picture } : undefined}
                    style={styles.headerBackground}
                    imageStyle={styles.backgroundImage}
                >
                    <View style={styles.headerOverlay}>
                        {uploadingBackground && (
                            <View style={styles.uploadingOverlay}>
                                <ActivityIndicator size="small" color="#fff" />
                            </View>
                        )}
                        <View style={styles.headerContent}>
                            {/* Avatar */}
                            <TouchableOpacity
                                style={styles.avatarContainer}
                                onPress={() => selectImage('profile')}
                                disabled={uploadingProfile}
                            >
                                {user?.profile_picture ? (
                                    <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarText}>
                                            {user?.name?.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                )}
                                {uploadingProfile ? (
                                    <View style={styles.avatarBadge}>
                                        <ActivityIndicator size="small" color="#1a5f2a" />
                                    </View>
                                ) : (
                                    <View style={styles.cameraBadge}>
                                        <Text style={{ fontSize: 12 }}>📷</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                            {/* Info */}
                            <View style={styles.headerInfo}>
                                <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
                                <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                                    <Text style={[styles.roleBadgeText, { color: roleInfo.text }]}>
                                        {roleInfo.label}
                                    </Text>
                                </View>
                                <Text style={styles.userContact}>📞 {user?.contact}</Text>
                            </View>
                        </View>
                    </View>
                </ImageBackground>
            </TouchableOpacity>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'overview' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
                    onPress={() => setActiveTab('overview')}
                >
                    <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'overview' && { color: colors.primary, fontWeight: '700' }]}>
                        📊 Overview
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'history' && { color: colors.primary, fontWeight: '700' }]}>
                        📋 History
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'settings' && [styles.tabActive, { borderBottomColor: colors.primary }]]}
                    onPress={() => setActiveTab('settings')}
                >
                    <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'settings' && { color: colors.primary, fontWeight: '700' }]}>
                        ⚙️ Settings
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                {activeTab === 'overview' && renderOverviewTab()}
                {activeTab === 'history' && renderHistoryTab()}
                {activeTab === 'settings' && renderSettingsTab()}
                <View style={{ height: 30 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6FA',
    },

    // ─── Header ───
    headerBackground: {
        width: SCREEN_WIDTH,
        height: HEADER_HEIGHT,
        backgroundColor: '#1a5f2a',
    },
    backgroundImage: {
        resizeMode: 'cover',
    },
    headerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(20, 80, 35, 0.75)',
        justifyContent: 'flex-end',
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    uploadingOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        borderWidth: 3, borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#fff',
    },
    avatarText: {
        fontSize: 28, fontWeight: 'bold', color: '#1a5f2a',
    },
    avatarBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    cameraBadge: {
        position: 'absolute', bottom: -2, right: -2,
        width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#1a5f2a', justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    headerInfo: {
        marginLeft: 14, flex: 1,
    },
    userName: {
        fontSize: 20, fontWeight: 'bold', color: '#fff',
    },
    roleBadge: {
        alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3,
        borderRadius: 12, marginTop: 4,
    },
    roleBadgeText: {
        fontSize: 11, fontWeight: '700',
    },
    userContact: {
        fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4,
    },

    // ─── Tab Bar ───
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 4,
        paddingHorizontal: 8,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
        marginHorizontal: 4,
    },
    tabActive: {
        backgroundColor: '#E8F5E9',
    },
    tabText: {
        fontSize: 13, fontWeight: '600', color: '#999',
    },
    tabTextActive: {
        color: '#1a5f2a',
    },
    scrollArea: {
        flex: 1,
    },
    tabContent: {
        padding: 16,
    },

    // ─── Stats Row ───
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3,
    },
    statIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 16, fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 11, color: '#666', marginTop: 2,
    },

    // ─── Dues Card ───
    duesCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FF9800',
        elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3,
    },
    duesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    duesTitle: {
        fontSize: 15, fontWeight: '700', color: '#333',
    },
    duesTotalBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 12,
    },
    duesTotalText: {
        fontSize: 13, fontWeight: '700', color: '#E65100',
    },
    dueItem: {
        marginBottom: 12,
    },
    dueItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    dueDriveTitle: {
        fontSize: 13, color: '#555', flex: 1, marginRight: 8,
    },
    dueAmountText: {
        fontSize: 12, color: '#888',
    },
    progressBarBg: {
        height: 6, backgroundColor: '#EEEEEE', borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 3,
    },
    showAllButton: {
        alignItems: 'center', paddingTop: 8,
    },
    showAllText: {
        fontSize: 13, color: '#1a5f2a', fontWeight: '600',
    },

    // ─── Quick Actions ───
    quickActionsCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3,
    },
    quickActionsTitle: {
        fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 14,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    quickAction: {
        alignItems: 'center',
        flex: 1,
    },
    quickActionIcon: {
        width: 48, height: 48, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 6,
    },
    quickActionEmoji: {
        fontSize: 22,
    },
    quickActionLabel: {
        fontSize: 12, color: '#555', textAlign: 'center',
    },

    // ─── Recent Payments ───
    recentCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3,
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    recentTitle: {
        fontSize: 15, fontWeight: '700', color: '#333',
    },
    viewAllText: {
        fontSize: 13, color: '#1a5f2a', fontWeight: '600',
    },
    recentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    recentItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    recentDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#4CAF50',
        marginRight: 10,
    },
    recentDrive: {
        fontSize: 14, fontWeight: '500', color: '#333',
    },
    recentDate: {
        fontSize: 11, color: '#999', marginTop: 2,
    },
    recentAmount: {
        fontSize: 15, fontWeight: 'bold', color: '#2E7D32',
    },

    // ─── History Tab ───
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyEmoji: {
        fontSize: 48, marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 18, fontWeight: '600', color: '#333',
    },
    emptySubtitle: {
        fontSize: 14, color: '#999', marginTop: 4,
    },
    historyItem: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    historyTimeline: {
        width: 24,
        alignItems: 'center',
    },
    historyDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#C8E6C9',
        marginTop: 14,
    },
    historyDotActive: {
        backgroundColor: '#4CAF50',
        width: 12, height: 12, borderRadius: 6,
    },
    historyLine: {
        width: 2, flex: 1,
        backgroundColor: '#E0E0E0',
        marginTop: 4,
    },
    historyCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginLeft: 8,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyDrive: {
        fontSize: 14, fontWeight: '600', color: '#333', flex: 1, marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 10,
    },
    statusApproved: {
        backgroundColor: '#E8F5E9',
    },
    statusPending: {
        backgroundColor: '#FFF3E0',
    },
    statusText: {
        fontSize: 11, fontWeight: '600', textTransform: 'capitalize',
    },
    statusTextApproved: {
        color: '#2E7D32',
    },
    statusTextPending: {
        color: '#E65100',
    },
    historyCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    historyDate: {
        fontSize: 12, color: '#999',
    },
    historyAmount: {
        fontSize: 16, fontWeight: 'bold', color: '#2E7D32',
    },

    // ─── Settings Tab ───
    settingsSection: {
        marginBottom: 20,
    },
    settingsSectionTitle: {
        fontSize: 13, fontWeight: '700', color: '#888',
        marginBottom: 8, marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    settingsCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingIcon: {
        fontSize: 18,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 15, color: '#333',
    },
    settingArrow: {
        fontSize: 22, color: '#CCC', fontWeight: '300',
    },
    settingDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginLeft: 46,
    },
    languageToggle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    langText: {
        fontSize: 14, color: '#999', marginHorizontal: 6,
    },
    activeLang: {
        color: '#1a5f2a', fontWeight: 'bold',
    },

    // ─── Logout ───
    logoutButton: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#EF5350',
        marginTop: 8,
    },
    logoutButtonText: {
        color: '#EF5350',
        fontWeight: 'bold',
        fontSize: 15,
    },
    themeRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    themeOption: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    themeOptionText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
