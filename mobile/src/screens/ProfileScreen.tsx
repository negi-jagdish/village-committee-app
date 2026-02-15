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
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, logout, clearAuth, setLanguage, persistLanguage, setUser } from '../store';
import { membersAPI } from '../api/client';
import i18n from '../i18n';
import { launchImageLibrary, launchCamera, Asset } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 200;

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
    const [uploadingProfile, setUploadingProfile] = useState(false);
    const [uploadingBackground, setUploadingBackground] = useState(false);

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

    const toggleLanguage = async () => {
        const newLang = language === 'en' ? 'hi' : 'en';
        dispatch(setLanguage(newLang));
        await persistLanguage(newLang);
        i18n.changeLanguage(newLang);
    };

    const formatCurrency = (amount: number) => {
        return `₹${parseFloat(String(amount)).toLocaleString('en-IN')}`;
    };

    const compressImage = async (uri: string, maxSizeMB: number): Promise<string> => {
        try {
            // Start with high quality and reduce if needed
            let quality = 90;
            let width = maxSizeMB === 2 ? 800 : 1920; // Profile: 800px, Background: 1920px
            let height = maxSizeMB === 2 ? 800 : 1080;

            const resized = await ImageResizer.createResizedImage(
                uri,
                width,
                height,
                'JPEG',
                quality,
                0,
                undefined,
                false,
                { mode: 'contain', onlyScaleDown: true }
            );

            return resized.uri;
        } catch (error) {
            console.error('Image compression error:', error);
            return uri; // Return original if compression fails
        }
    };

    const selectImage = (type: 'profile' | 'background') => {
        const maxSize = type === 'profile' ? 2 : 5; // MB

        Alert.alert(
            type === 'profile' ? 'Profile Picture' : 'Background Picture',
            'Choose an option',
            [
                {
                    text: '📷 Camera',
                    onPress: () => captureFromCamera(type, maxSize),
                },
                {
                    text: '🖼️ Gallery',
                    onPress: () => pickFromGallery(type, maxSize),
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const captureFromCamera = async (type: 'profile' | 'background', maxSizeMB: number) => {
        const result = await launchCamera({
            mediaType: 'photo',
            quality: 0.8,
        });

        if (result.didCancel) return;
        if (result.errorCode) {
            Alert.alert('Error', result.errorMessage || 'Failed to capture image');
            return;
        }

        if (result.assets && result.assets[0]) {
            await uploadImage(result.assets[0], type, maxSizeMB);
        }
    };

    const pickFromGallery = async (type: 'profile' | 'background', maxSizeMB: number) => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
        });

        if (result.didCancel) return;
        if (result.errorCode) {
            Alert.alert('Error', result.errorMessage || 'Failed to pick image');
            return;
        }

        if (result.assets && result.assets[0]) {
            await uploadImage(result.assets[0], type, maxSizeMB);
        }
    };

    const uploadImage = async (asset: Asset, type: 'profile' | 'background', maxSizeMB: number) => {
        if (!user || !asset.uri) return;

        const setUploading = type === 'profile' ? setUploadingProfile : setUploadingBackground;
        setUploading(true);

        try {
            // Compress image
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

            // Update user in store
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

    const totalPending = pendingDues.reduce((sum, d) => sum + d.amount_pending, 0);

    return (
        <ScrollView style={styles.container}>
            {/* Profile Header with Background */}
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
                        <TouchableOpacity style={styles.editBackgroundHint}>
                            <Text style={styles.editHintText}>📷 Tap to change background</Text>
                        </TouchableOpacity>
                    </View>
                </ImageBackground>
            </TouchableOpacity>

            {/* Profile Picture */}
            <View style={styles.profilePictureContainer}>
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
                        <View style={styles.avatarLoading}>
                            <ActivityIndicator size="small" color="#1a5f2a" />
                        </View>
                    ) : (
                        <View style={styles.cameraIcon}>
                            <Text style={styles.cameraIconText}>📷</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{user?.name}</Text>
                <Text style={styles.userRole}>
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
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
        backgroundColor: 'rgba(26, 95, 42, 0.6)',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 10,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBackgroundHint: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    editHintText: {
        color: '#fff',
        fontSize: 12,
    },
    profilePictureContainer: {
        alignItems: 'center',
        marginTop: -50,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#1a5f2a',
    },
    avatarLoading: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1a5f2a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    cameraIconText: {
        fontSize: 14,
    },
    userInfo: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    userRole: {
        fontSize: 14,
        color: '#1a5f2a',
        marginTop: 4,
        fontWeight: '600',
    },
    userContact: {
        fontSize: 14,
        color: '#666',
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
